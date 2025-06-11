import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  // addDoc, // Moved to firebaseServices
  // setDoc, // Moved to firebaseServices
  // deleteDoc, // Moved to firebaseServices
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Corrected path
import {
  addMedicationLogToFirestore,
  saveMedicationToFirestore,
  deleteMedicationFromFirestore,
} from '../lib/firebaseServices';

const useMedicationData = (user) => {
  const [medications, setMedications] = useState([]);
  const [medLogs, setMedLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [nextDueTimes, setNextDueTimes] = useState({});

  // Listener for Firestore Data Changes
  useEffect(() => {
    if (!user) {
      setMedications([]);
      setMedLogs([]);
      setNextDueTimes({});
      setLoadingData(false); // Or true, depending on desired state for logged-out user
      return;
    }

    console.log(`Setting up Firestore listeners for user: ${user.uid}`);
    setLoadingData(true);
    let unsubMeds = () => {};
    let unsubLogs = () => {};

    try {
      // Meds listener
      const medsCollectionRef = collection(db, 'users', user.uid, 'medications');
      unsubMeds = onSnapshot(medsCollectionRef, (querySnapshot) => {
        const userMedications = querySnapshot.docs.map(doc => ({
          id: doc.id, ...doc.data(),
          dosageAmount: doc.data().dosageAmount || null,
          dosageUnit: doc.data().dosageUnit || null,
        }));
        setMedications(userMedications);
        console.log("Firestore: Medications updated via useMedicationData.");
        // Consider setting loadingData false only when both listeners have fired once
      }, (error) => {
        console.error("Error fetching medications in useMedicationData:", error);
        // setError(error); // Potentially set an error state to be returned by the hook
        setLoadingData(false);
      });

      // Logs listener
      const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
      const logsQuery = query(logsCollectionRef, orderBy("takenAt", "desc"));
      unsubLogs = onSnapshot(logsQuery, (querySnapshot) => {
        console.log(`useMedicationData: Logs Snapshot received. Size: ${querySnapshot.size}, Empty: ${querySnapshot.empty}`);
        const userLogs = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const takenAtISO = data.takenAt?.toDate ? data.takenAt.toDate().toISOString() : null;
          const nextDueAtISO = data.nextDueAt?.toDate ? data.nextDueAt.toDate().toISOString() : null;
          if (!takenAtISO) { // nextDueAt can be null if not applicable
            console.warn(`Log doc ${doc.id} missing or has invalid takenAt timestamp:`, { takenAt: data.takenAt });
          }
          return {
            id: doc.id,
            ...data,
            takenAt: takenAtISO,
            nextDueAt: nextDueAtISO,
          };
        });
        setMedLogs(userLogs);
        console.log("useMedicationData: Logs loaded/updated from Firestore state set.");
        setLoadingData(false); // Set loading false after logs (assuming meds would have loaded or error by then)
      }, (error) => {
        console.error("Error fetching logs in useMedicationData:", error);
        // setError(error);
        setLoadingData(false);
      });

    } catch (error) {
      console.error("Error setting up Firestore listeners in useMedicationData:", error);
      // setError(error);
      setLoadingData(false);
    }

    // Cleanup listeners
    return () => {
      console.log(`Cleaning up Firestore listeners in useMedicationData for user: ${user.uid}`);
      unsubMeds();
      unsubLogs();
    };
  }, [user]); // Re-run when user changes

  // Derive nextDueTimes
  useEffect(() => {
    if (medLogs.length === 0) {
      setNextDueTimes({});
      return;
    }
    const latest = {};
    medLogs.forEach(log => {
      if (!latest[log.medicationId] && log.nextDueAt) {
        latest[log.medicationId] = log.nextDueAt;
      }
    });
    setNextDueTimes(latest);
    console.log("useMedicationData: nextDueTimes derived.", latest);
  }, [medLogs]);

  const addMedicationLog = useCallback(async (med) => {
    if (!user) {
      console.error("addMedicationLog: No user, aborting.");
      throw new Error("User not authenticated.");
    }
    console.log("useMedicationData: addMedicationLog triggered for", med?.name);
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    const logEntry = {
      medicationId: med.id,
      medicationName: med.name,
      takenAt: Timestamp.fromDate(now),
      nextDueAt: Timestamp.fromDate(nextDue),
    };
    const reminderEntry = {
      userId: user.uid,
      medicationName: med.name,
      dueAt: Timestamp.fromDate(nextDue),
    };

    try {
      // Firestore Timestamps are prepared here before calling the service
      await addMedicationLogToFirestore(user.uid, logEntry, reminderEntry);
      console.log("useMedicationData: Call to addMedicationLogToFirestore successful.");
    } catch (error) {
      console.error("useMedicationData: Error calling addMedicationLogToFirestore:", error);
      throw error; // Re-throw for App.jsx to handle UI feedback
    }
  }, [user]);

  const saveMedication = useCallback(async (medData) => {
    if (!user) {
      console.error("saveMedication: No user, aborting.");
      throw new Error("User not authenticated.");
    }
    // If medData.id is undefined/null, doc() will auto-generate an ID for the new document path.
    // This ID can then be used if needed, but often for 'add' operations, we let Firestore handle it.
    // However, the original App.jsx used setDoc with medData.id, implying ID was pre-generated.
    // We will stick to that, requiring medData.id to be present.
    if (!medData.id) {
        // This check is also in firebaseServices, but good to have early exit if possible
        console.error("useMedicationData: medData.id is missing.");
        throw new Error("Medication ID is required to save.");
    }
    // The medData object, including its 'id', is passed to the service.
    // The service (saveMedicationToFirestore) will use medData.id for the doc path
    // and internally exclude 'id' from the fields saved in the document.
    console.log("useMedicationData: Calling saveMedicationToFirestore for medId:", medData.id);
    try {
      await saveMedicationToFirestore(user.uid, medData);
      console.log("useMedicationData: Call to saveMedicationToFirestore successful for medId:", medData.id);
    } catch (error) {
      console.error("useMedicationData: Error calling saveMedicationToFirestore for medId:", medData.id, error);
      throw error;
    }
  }, [user]);

  const deleteMedicationFromDb = useCallback(async (medicationId) => {
    if (!user) {
      console.error("useMedicationData: No user, aborting.");
      throw new Error("User not authenticated.");
    }
    console.log("useMedicationData: Calling deleteMedicationFromFirestore for ID:", medicationId);
    try {
      await deleteMedicationFromFirestore(user.uid, medicationId);
      console.log("useMedicationData: Call to deleteMedicationFromFirestore successful for ID:", medicationId);
    } catch (error) {
      console.error("useMedicationData: Error calling deleteMedicationFromFirestore for ID:", medicationId, error);
      throw error;
    }
  }, [user]);

  return {
    medications,
    medLogs,
    loadingData,
    nextDueTimes,
    addMedicationLog,
    saveMedication,
    deleteMedicationFromDb,
  };
};

export default useMedicationData;
