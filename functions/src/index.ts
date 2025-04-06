import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

// --- Updated Firebase Admin SDK Imports ---
// Import only the necessary functions and types from their specific modules
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, WriteResult } from "firebase-admin/firestore"; // Import Timestamp and WriteResult
import { getMessaging, Notification } from "firebase-admin/messaging"; // Import getMessaging and Notification type
// --- End Updated Imports ---

// Initialize Firebase Admin SDK - Often not needed explicitly in Cloud Functions v1/v2
// The environment usually provides initialized services. Remove the explicit call.
initializeApp(); // REMOVE or comment out this line

// Get Firestore and Messaging instances using the imported functions
const db = getFirestore();
const messaging = getMessaging();

// Schedule constants remain the same
const SCHEDULE = "every 5 minutes";
const TIME_ZONE = "Europe/Dublin";
const LOOKAHEAD_MINUTES = 5;

export const sendMedicationReminders = onSchedule(
  { schedule: SCHEDULE, timeZone: TIME_ZONE },
  async (_event) => {
    const now = Timestamp.now(); // Use Timestamp directly
    const lookaheadTime = Timestamp.fromDate(
      new Date(now.toMillis() + LOOKAHEAD_MINUTES * 60 * 1000)
    );

    logger.info(`Running sendMedicationReminders at ${now.toDate().toISOString()}`);
    logger.info(`Checking for reminders due between now and ${lookaheadTime.toDate().toISOString()}`);

    try {
      // 1. Query scheduledReminders (using 'db' instance)
      const remindersQuery = db.collection("scheduledReminders")
        .where("dueAt", ">=", now)
        .where("dueAt", "<", lookaheadTime);

      const dueRemindersSnapshot = await remindersQuery.get();

      if (dueRemindersSnapshot.empty) {
        logger.log("No reminders due in this interval.");
        return; // Return void
      }

      logger.info(`Found ${dueRemindersSnapshot.size} reminders to process.`);

      // Type for storing user data and tokens
      type UserNotificationData = { tokens: string[], medName: string, reminderId: string };
      const tokensToNotifyByUser: { [userId: string]: UserNotificationData } = {};

      // Group reminders by user
      dueRemindersSnapshot.forEach(doc => {
        const reminderData = doc.data();
        const userId = reminderData.userId;
        const medName = reminderData.medicationName || "your medication";
        if (!userId) { logger.warn(`Reminder ${doc.id} missing userId.`); return; }
        if (!tokensToNotifyByUser[userId]) {
            tokensToNotifyByUser[userId] = { tokens: [], medName: medName, reminderId: doc.id };
        } else {
            if (!tokensToNotifyByUser[userId].medName.includes(medName)) {
                 tokensToNotifyByUser[userId].medName += ` & ${medName}`;
            }
            tokensToNotifyByUser[userId].reminderId = doc.id; // Still needs refinement for multiple reminders
        }
      });

      // 2. Fetch FCM tokens (using 'db' instance)
      const userIds = Object.keys(tokensToNotifyByUser);
      const tokenPromises = userIds.map(async (userId) => {
        try {
            const tokensSnapshot = await db.collection("users").doc(userId).collection("fcmTokens").get();
            if (!tokensSnapshot.empty) {
              tokensToNotifyByUser[userId].tokens = tokensSnapshot.docs.map(doc => doc.id);
            }
        } catch(tokenError) {
            logger.error(`Failed to fetch tokens for user ${userId}:`, tokenError);
            if(tokensToNotifyByUser[userId]) { tokensToNotifyByUser[userId].tokens = []; }
        }
      });
      await Promise.all(tokenPromises);

      // 3. Prepare and Send notifications (using 'messaging' instance)
      // Define the message structure type, using the imported Notification type
      type MessageToSend = { notification: Notification, token: string, _reminderId: string };
      const messagesToSend: Array<MessageToSend> = [];
      const invalidTokensByReminderId: { [reminderId: string]: string[] } = {};

      userIds.forEach(userId => {
        const userData = tokensToNotifyByUser[userId];
        if (userData?.tokens?.length > 0) {
          logger.log(`Preparing notification for ${userData.medName} to user ${userId} (${userData.tokens.length} tokens)`);
          userData.tokens.forEach(token => {
              messagesToSend.push({
                  notification: { title: "Medication Reminder", body: `Time to take ${userData.medName}!` },
                  token: token,
                  _reminderId: userData.reminderId
              });
          });
        } else if (userData) {
          logger.warn(`No FCM tokens found for user ${userId}. Cannot send reminder for ${userData.medName}.`);
        }
      });

      if (messagesToSend.length > 0) {
          // Use 'messaging' instance here
          const response = await messaging.sendEach(messagesToSend.map(msg => ({
               notification: msg.notification,
               token: msg.token
          })));
          logger.info(`Sent ${response.successCount} messages successfully.`);
          // Process failures (no change in logic)
          if (response.failureCount > 0) { /* ... error handling ... */ }
      }

      // 4. Delete processed reminders and invalid tokens (using 'db' instance)
      // Use the imported WriteResult type
      const deletePromises: Promise<WriteResult>[] = [];

      dueRemindersSnapshot.forEach(doc => {
          const reminderId = doc.id;
          logger.log(`Adding delete promise for reminder: ${reminderId}`);
          deletePromises.push(db.collection("scheduledReminders").doc(reminderId).delete());

          const invalidTokens = invalidTokensByReminderId[reminderId];
          if (invalidTokens?.length > 0) {
               const userId = doc.data().userId;
               if (userId) {
                   logger.warn(`Adding delete promises for ${invalidTokens.length} invalid tokens for user ${userId}`);
                   invalidTokens.forEach(token => {
                       deletePromises.push(db.collection("users").doc(userId).collection("fcmTokens").doc(token).delete());
                   });
               }
          }
      });

      await Promise.all(deletePromises);
      logger.info(`Cleaned up ${dueRemindersSnapshot.size} processed reminders and associated invalid tokens.`);

      return; // Return void

    } catch (error) {
      logger.error("Error in sendMedicationReminders function:", error);
      return; // Return void
    }
  }
);

