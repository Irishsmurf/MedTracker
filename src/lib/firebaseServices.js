import { db } from '../firebaseConfig'; // Assuming firebaseConfig.js is in src/
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  // Timestamp is not directly used here if prepared by caller
} from 'firebase/firestore';

/**
 * Adds a medication log and a scheduled reminder to Firestore.
 * @param {string} userId - The ID of the user.
 * @param {object} logEntry - The medication log entry data (should include Firestore Timestamps).
 * @param {object} reminderEntry - The reminder entry data (should include Firestore Timestamps).
 * @returns {Promise} A promise that resolves when both documents have been added.
 */
export const addMedicationLogToFirestore = async (userId, logEntry, reminderEntry) => {
  console.log("firebaseServices: addMedicationLogToFirestore called for userId:", userId);
  try {
    const logsCollectionRef = collection(db, 'users', userId, 'medLogs');
    const remindersCollectionRef = collection(db, "scheduledReminders"); // Global reminders collection

    const logPromise = addDoc(logsCollectionRef, logEntry);
    const reminderPromise = addDoc(remindersCollectionRef, reminderEntry);

    await Promise.all([logPromise, reminderPromise]);
    console.log("firebaseServices: Medication log and reminder scheduled successfully.");
    // No explicit return needed if just awaiting, or return Promise.all if caller needs its result
  } catch (error) {
    console.error("firebaseServices: Error in addMedicationLogToFirestore:", error);
    throw error; // Re-throw for the caller (useMedicationData) to handle
  }
};

/**
 * Saves (adds or updates) a medication document in Firestore.
 * The medData object must contain an 'id' field for the document ID.
 * @param {string} userId - The ID of the user.
 * @param {object} medData - The medication data, including its 'id'.
 * @returns {Promise} A promise that resolves when the document has been set.
 */
export const saveMedicationToFirestore = async (userId, medData) => {
  console.log("firebaseServices: saveMedicationToFirestore called for userId:", userId, "medId:", medData.id);
  if (!medData.id) {
    console.error("firebaseServices: medData.id is missing. Document ID is required for setDoc.");
    throw new Error("Medication ID is required to save.");
  }
  const medDocRef = doc(db, 'users', userId, 'medications', medData.id);
  const { id, ...dataToSave } = medData; // Exclude 'id' from the data being saved in the document body

  try {
    await setDoc(medDocRef, dataToSave);
    console.log("firebaseServices: Medication saved successfully to Firestore for ID:", medData.id);
  } catch (error) {
    console.error("firebaseServices: Error in saveMedicationToFirestore for ID:", medData.id, error);
    throw error;
  }
};

/**
 * Deletes a medication document from Firestore.
 * @param {string} userId - The ID of the user.
 * @param {string} medId - The ID of the medication to delete.
 * @returns {Promise} A promise that resolves when the document has been deleted.
 */
export const deleteMedicationFromFirestore = async (userId, medId) => {
  console.log("firebaseServices: deleteMedicationFromFirestore called for userId:", userId, "medId:", medId);
  const medDocRef = doc(db, 'users', userId, 'medications', medId);
  try {
    await deleteDoc(medDocRef);
    console.log("firebaseServices: Medication deleted successfully from Firestore for ID:", medId);
  } catch (error) {
    console.error("firebaseServices: Error in deleteMedicationFromFirestore for ID:", medId, error);
    throw error;
  }
};
