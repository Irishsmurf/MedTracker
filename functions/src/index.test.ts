import { jest } from '@jest/globals';

// Mock Firebase Admin SDK and Logger
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(), // Though not used in the refactored code, good to have if other parts use it
}));

const firestoreMock = {
  collection: jest.fn(),
  doc: jest.fn(),
  where: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  Timestamp: { // Mock Timestamp if needed for complex queries, though not strictly for current tests
    now: jest.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toMillis: () => date.getTime(), toDate: () => date })),
  },
};
firestoreMock.collection.mockReturnThis(); // Return `this` to allow chaining like db.collection().doc()
firestoreMock.doc.mockReturnThis(); // Return `this` for chaining like db.collection().doc().delete() or .collection()
firestoreMock.where.mockReturnThis(); // Return `this` for chaining like db.collection().where().where()


jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
  Timestamp: firestoreMock.Timestamp, // Export Timestamp
}));

const messagingMock = {
  sendEach: jest.fn(),
};
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => messagingMock),
}));

const loggerMock = {
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('firebase-functions/logger', () => loggerMock);

// Import the function to test AFTER setting up mocks
import { sendMedicationReminders } from '../src/index';

describe('sendMedicationReminders', () => {
  // Define mock functions for chained Firestore calls
  let remindersQueryGetMock: jest.Mock;
  let userFcmTokensQueryGetMock: jest.Mock;
  let docDeleteMock: jest.Mock;
  let reminderCollectionMock: jest.Mock;
  let userCollectionMock: jest.Mock;
  let userDocMock: jest.Mock;
  let fcmTokensCollectionMock: jest.Mock;
  let tokenDocMock: jest.Mock;


  beforeEach(() => {
    jest.clearAllMocks();

    // Setup specific mock implementations for chained calls
    remindersQueryGetMock = jest.fn();
    userFcmTokensQueryGetMock = jest.fn();
    docDeleteMock = jest.fn().mockResolvedValue({}); // Default successful delete

    // Re-initialize mocks for firestore structure
    // getFirestore().collection('scheduledReminders')
    firestoreMock.collection.mockImplementation((path: string) => {
      if (path === 'scheduledReminders') {
        reminderCollectionMock = jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(), // Supports multiple .where calls
          get: remindersQueryGetMock,
          doc: jest.fn((docId: string) => ({ // Mock for db.collection('scheduledReminders').doc(reminderId)
            delete: docDeleteMock,
            id: docId,
          })),
        });
        return reminderCollectionMock();
      }
      if (path === 'users') {
        userCollectionMock = jest.fn().mockReturnValue({
          doc: jest.fn((userId: string) => { // Mock for db.collection('users').doc(userId)
            userDocMock = jest.fn().mockReturnValue({
              collection: jest.fn((subPath: string) => { // Mock for .collection('fcmTokens')
                if (subPath === 'fcmTokens') {
                  fcmTokensCollectionMock = jest.fn().mockReturnValue({
                    get: userFcmTokensQueryGetMock,
                    doc: jest.fn((tokenId: string) => { // Mock for .doc(tokenId)
                      tokenDocMock = jest.fn().mockReturnValue({
                        delete: docDeleteMock,
                        id: tokenId,
                      });
                      return tokenDocMock();
                    }),
                  });
                  return fcmTokensCollectionMock();
                }
                return { get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) }; // Default for other sub-collections
              }),
              id: userId,
            });
            return userDocMock();
          }),
        });
        return userCollectionMock();
      }
      // Fallback for any other collection calls
      return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        doc: jest.fn().mockReturnThis(),
        delete: jest.fn().mockResolvedValue({}),
      };
    });

    // Mock Timestamp.now() and Timestamp.fromDate() to control the time window
    // This makes tests deterministic regarding time.
    const mockNow = new Date('2024-01-01T10:00:00.000Z');
    const mockLookahead = new Date(mockNow.getTime() + 5 * 60 * 1000); // 5 minutes ahead
    firestoreMock.Timestamp.now.mockReturnValue({
        toDate: () => mockNow,
        toMillis: () => mockNow.getTime()
    });
    firestoreMock.Timestamp.fromDate.mockImplementation((date: Date) => ({
        toDate: () => date,
        toMillis: () => date.getTime(),
    }));


  });

  test('No Reminders Due', async () => {
    remindersQueryGetMock.mockResolvedValue({ empty: true, docs: [] });

    await sendMedicationReminders({});

    expect(loggerMock.log).toHaveBeenCalledWith("No reminders due in this interval.");
    expect(messagingMock.sendEach).not.toHaveBeenCalled();
    expect(docDeleteMock).not.toHaveBeenCalled(); // No reminder deletions
  });

  describe('With Reminders Due', () => {
    const mockReminder1 = {
      id: 'reminder123',
      data: () => ({
        userId: 'user1',
        medicationName: 'TestMed1',
        dueAt: firestoreMock.Timestamp.fromDate(new Date('2024-01-01T10:02:00.000Z')), // Due within 5 min window
      }),
    };
    const mockReminder2 = {
      id: 'reminder456',
      data: () => ({
        userId: 'user2',
        medicationName: 'TestMed2',
        dueAt: firestoreMock.Timestamp.fromDate(new Date('2024-01-01T10:03:00.000Z')),
      }),
    };
    const mockTokenUser1 = { id: 'tokenUser1-abc', data: () => ({}) };
    const mockTokenUser2 = { id: 'tokenUser2-xyz', data: () => ({}) };

    test('Happy Path - Reminders Due, Valid Tokens', async () => {
      remindersQueryGetMock.mockResolvedValue({
        empty: false,
        docs: [mockReminder1, mockReminder2],
        size: 2,
      });
      userFcmTokensQueryGetMock
        .mockResolvedValueOnce({ empty: false, docs: [mockTokenUser1] }) // User1 tokens
        .mockResolvedValueOnce({ empty: false, docs: [mockTokenUser2] }); // User2 tokens
      messagingMock.sendEach.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: true, messageId: 'msg2' },
        ],
      });

      await sendMedicationReminders({});

      expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('Found 2 reminders to process.'));
      expect(messagingMock.sendEach).toHaveBeenCalledTimes(1);
      expect(messagingMock.sendEach).toHaveBeenCalledWith([
        { notification: { title: "Medication Reminder", body: "Time to take TestMed1!" }, token: mockTokenUser1.id },
        { notification: { title: "Medication Reminder", body: "Time to take TestMed2!" }, token: mockTokenUser2.id },
      ]);
      expect(docDeleteMock).toHaveBeenCalledTimes(2); // Both reminders deleted
      // Check if specific reminder docs were targeted for deletion
      expect(firestoreMock.collection).toHaveBeenCalledWith('scheduledReminders');

      // To check specific doc IDs, we need to refine the mock setup for .doc(id).delete()
      // This current setup calls the same docDeleteMock for all .delete() calls.
      // For now, we check the number of calls. A more specific check would require
      // ensuring db.collection('scheduledReminders').doc('reminder123').delete() was called, etc.

      expect(loggerMock.info).not.toHaveBeenCalledWith(expect.stringContaining('Marking token'));
    });

    test('Reminders Due, Some Invalid Tokens', async () => {
      remindersQueryGetMock.mockResolvedValue({
        empty: false,
        docs: [mockReminder1],
        size: 1,
      });
      userFcmTokensQueryGetMock.mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: 'validToken1', data: () => ({}) },
          { id: 'invalidToken1', data: () => ({}) },
        ],
      }); // User1 tokens (valid and invalid)
      messagingMock.sendEach.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        ],
      });

      await sendMedicationReminders({});

      expect(messagingMock.sendEach).toHaveBeenCalledTimes(1);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        `Failed to send notification to token: invalidToken1 for user user1. Error:`,
        expect.objectContaining({ code: 'messaging/registration-token-not-registered' })
      );
      expect(loggerMock.info).toHaveBeenCalledWith(
        "Marking token invalidToken1 for user user1 for deletion due to error: messaging/registration-token-not-registered"
      );
      expect(docDeleteMock).toHaveBeenCalledTimes(2); // 1 reminder + 1 invalid token
      // This implies one call to delete a reminder and one to delete a token.
      // Need to verify the paths for these delete calls.
      // Example check:
      // expect(firestoreMock.collection('scheduledReminders').doc('reminder123').delete).toHaveBeenCalled();
      // expect(firestoreMock.collection('users').doc('user1').collection('fcmTokens').doc('invalidToken1').delete).toHaveBeenCalled();
      // This level of detail requires more specific mock setups for the doc().delete() chain.
      // The current generic docDeleteMock is called for both.
    });

    test('Reminders Due, User Has No FCM Tokens', async () => {
      remindersQueryGetMock.mockResolvedValue({
        empty: false,
        docs: [mockReminder1], // Reminder for user1
        size: 1,
      });
      userFcmTokensQueryGetMock.mockResolvedValueOnce({ empty: true, docs: [] }); // User1 has no tokens

      await sendMedicationReminders({});

      expect(loggerMock.warn).toHaveBeenCalledWith("No FCM tokens found for user user1 during fetch.");
      // Depending on subsequent logic, another warning might appear if messages are prepared
      expect(loggerMock.warn).toHaveBeenCalledWith("No FCM tokens found for user user1 when preparing messages. Cannot send reminder for TestMed1.");
      expect(messagingMock.sendEach).not.toHaveBeenCalled();
      expect(docDeleteMock).toHaveBeenCalledTimes(1); // Only the reminder should be deleted
    });
  });

  test('Firestore Error When Fetching Reminders', async () => {
    const firestoreError = new Error("Firestore unavailable");
    remindersQueryGetMock.mockRejectedValue(firestoreError);

    await sendMedicationReminders({});

    expect(loggerMock.error).toHaveBeenCalledWith("Error in sendMedicationReminders function:", firestoreError);
    expect(messagingMock.sendEach).not.toHaveBeenCalled();
  });

  // Additional test: Firestore error when fetching tokens for a specific user
  test('Firestore Error When Fetching Tokens for a User', async () => {
    const mockReminder = {
      id: 'reminder789',
      data: () => ({
        userId: 'userWithTokenError',
        medicationName: 'TestMed3',
        dueAt: firestoreMock.Timestamp.fromDate(new Date('2024-01-01T10:01:00.000Z')),
      }),
    };
    remindersQueryGetMock.mockResolvedValue({
      empty: false,
      docs: [mockReminder],
      size: 1,
    });
    const tokenFetchingError = new Error("Failed to fetch tokens");
    userFcmTokensQueryGetMock.mockRejectedValueOnce(tokenFetchingError); // Error for userWithTokenError

    messagingMock.sendEach.mockResolvedValue({ successCount: 0, failureCount: 0, responses: [] });


    await sendMedicationReminders({});

    expect(loggerMock.error).toHaveBeenCalledWith("Failed to fetch tokens for user userWithTokenError:", tokenFetchingError);
    expect(messagingMock.sendEach).not.toHaveBeenCalled(); // No messages should be sent if tokens can't be fetched
    expect(docDeleteMock).toHaveBeenCalledTimes(1); // The reminder should still be deleted
  });

  // Test for multiple reminders for the same user, ensuring medication names are concatenated
  test('Multiple Reminders for Same User - Medication Names Concatenated', async () => {
    const user3 = 'user3';
    const reminderUser3Med1 = {
      id: 'user3med1',
      data: () => ({ userId: user3, medicationName: 'MedA', dueAt: firestoreMock.Timestamp.fromDate(new Date('2024-01-01T10:02:00.000Z')) }),
    };
    const reminderUser3Med2 = {
      id: 'user3med2',
      data: () => ({ userId: user3, medicationName: 'MedB', dueAt: firestoreMock.Timestamp.fromDate(new Date('2024-01-01T10:03:00.000Z')) }),
    };
    remindersQueryGetMock.mockResolvedValue({
      empty: false,
      docs: [reminderUser3Med1, reminderUser3Med2],
      size: 2,
    });
    userFcmTokensQueryGetMock.mockResolvedValueOnce({ empty: false, docs: [{ id: 'user3token1', data: () => ({}) }] });
    messagingMock.sendEach.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });

    await sendMedicationReminders({});

    expect(messagingMock.sendEach).toHaveBeenCalledWith([
      expect.objectContaining({
        notification: { title: "Medication Reminder", body: "Time to take MedA & MedB!" },
        token: 'user3token1',
      }),
    ]);
    expect(docDeleteMock).toHaveBeenCalledTimes(2); // Both reminders deleted
  });

});
