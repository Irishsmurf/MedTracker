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
// initializeApp(); // REMOVE or comment out this line

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
            } else {
              logger.warn(`No FCM tokens found for user ${userId} during fetch.`);
            }
        } catch(tokenError) {
            logger.error(`Failed to fetch tokens for user ${userId}:`, tokenError); // Enhanced logging
            if(tokensToNotifyByUser[userId]) { tokensToNotifyByUser[userId].tokens = []; }
        }
      });
      await Promise.all(tokenPromises);

      // 3. Prepare and Send notifications (using 'messaging' instance)
      // Define the message structure type, using the imported Notification type
      type MessageToSend = { notification: Notification, token: string, userId: string, _reminderId: string }; // Added userId
      const messagesToSend: Array<MessageToSend> = [];

      userIds.forEach(userId => {
        const userData = tokensToNotifyByUser[userId];
        if (userData?.tokens?.length > 0) {
          logger.info(`Preparing ${userData.tokens.length} notification(s) for ${userData.medName} to user ${userId}.`);
          userData.tokens.forEach(token => {
              messagesToSend.push({
                  notification: { title: "Medication Reminder", body: `Time to take ${userData.medName}!` },
                  token: token,
                  userId: userId, // Populate userId
                  _reminderId: userData.reminderId // _reminderId is kept for context if needed, but not directly used for new token deletion
              });
          });
        } else if (userData) {
          logger.warn(`No FCM tokens found for user ${userId} when preparing messages. Cannot send reminder for ${userData.medName}.`);
        } else {
          logger.warn(`User data not found for user ID: ${userId} when preparing messages. This might indicate an earlier issue.`);
        }
      });

      const tokensToDeleteByUserId: { [userId: string]: string[] } = {};

      if (messagesToSend.length > 0) {
          logger.info(`Attempting to send ${messagesToSend.length} messages.`);
          // Use 'messaging' instance here
          const response = await messaging.sendEach(messagesToSend.map(msg => ({
               notification: msg.notification,
               token: msg.token,
          })));

          logger.info(`Successfully sent ${response.successCount} messages.`);

          if (response.failureCount > 0) {
            logger.warn(`${response.failureCount} messages failed to send.`);
            response.results.forEach((result, index) => {
              if (result.error) {
                const failedMessage = messagesToSend[index];
                const failedToken = failedMessage.token;
                const userId = failedMessage.userId;

                logger.warn(`Failed to send notification to token: ${failedToken} for user ${userId}. Error:`, result.error);

                // Check for error codes indicating an invalid or unregistered token
                const errorCode = result.error.code;
                if (errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token') {
                  if (!tokensToDeleteByUserId[userId]) {
                    tokensToDeleteByUserId[userId] = [];
                  }
                  // Avoid duplicate token entries for deletion
                  if (!tokensToDeleteByUserId[userId].includes(failedToken)) {
                    tokensToDeleteByUserId[userId].push(failedToken);
                    logger.info(`Marking token ${failedToken} for user ${userId} for deletion due to error: ${errorCode}`);
                  }
                }
              }
            });
          }
      } else {
        logger.info("No messages to send in this interval.");
      }

      // 4. Delete processed reminders and invalid tokens (using 'db' instance)
      // Use the imported WriteResult type
      const deletePromises: Promise<WriteResult>[] = [];

      dueRemindersSnapshot.forEach(doc => {
          const reminderId = doc.id;
          logger.info(`Adding delete promise for processed reminder: ${reminderId}`);
          deletePromises.push(db.collection("scheduledReminders").doc(reminderId).delete());
      });

      // New logic for deleting invalid tokens
      Object.entries(tokensToDeleteByUserId).forEach(([userId, tokens]) => {
        if (tokens.length > 0) {
          logger.info(`Preparing to delete ${tokens.length} invalid token(s) for user ${userId}.`);
          tokens.forEach(token => {
            logger.info(`Adding delete promise for invalid token: ${token} for user ${userId}`);
            deletePromises.push(
              db.collection("users").doc(userId).collection("fcmTokens").doc(token).delete()
            );
          });
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        logger.info(`Successfully executed ${deletePromises.length} delete operations for reminders and invalid tokens.`);
      } else {
        logger.info("No reminders or tokens to delete in this interval.");
      }

      logger.info(`Cleaned up ${dueRemindersSnapshot.size} processed reminders and attempted deletion of invalid tokens based on messaging failures.`);

      return; // Return void

    } catch (error) {
      logger.error("Error in sendMedicationReminders function:", error);
      return; // Return void
    }
  }
);

