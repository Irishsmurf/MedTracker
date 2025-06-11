import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp, // Ensure Timestamp is imported
} from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Assuming firebaseConfig.js is in the parent directory

const useFirestoreData = (user) => {
  const [medications, setMedications] = useState([]);
  const [medLogs, setMedLogs] = useState([]);
  const [nextDueTimes, setNextDueTimes] = useState({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    setLoadingData(true);
    if (!user) {
      setMedications([]);
      setMedLogs([]);
      setLoadingData(false);
      return;
    }

    const medicationsRef = collection(db, `users/${user.uid}/medications`);
    const medLogsRef = collection(db, `users/${user.uid}/medLogs`);

    const unsubscribeMedications = onSnapshot(medicationsRef, (snapshot) => {
      const medsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedications(medsData);
      if (loadingData) setLoadingData(false); // Set loading to false after initial fetch
    }, (error) => {
      console.error("Error fetching medications: ", error);
      setLoadingData(false);
    });

    const qMedLogs = query(medLogsRef, orderBy('takenAt', 'desc'));
    const unsubscribeMedLogs = onSnapshot(qMedLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          takenAt: data.takenAt instanceof Timestamp ? data.takenAt.toDate() : new Date(data.takenAt) // Convert Firestore Timestamp to JS Date
        };
      });
      setMedLogs(logsData);
      if (loadingData) setLoadingData(false); // Set loading to false after initial fetch
    }, (error) => {
      console.error("Error fetching medication logs: ", error);
      setLoadingData(false);
    });

    // Cleanup subscriptions on unmount or when user changes
    return () => {
      unsubscribeMedications();
      unsubscribeMedLogs();
    };
  }, [user]); // Rerun effect if user changes

  useEffect(() => {
    if (!medications.length) {
      setNextDueTimes({});
      return;
    }

    const newNextDueTimes = {};
    medications.forEach(med => {
      const relevantLogs = medLogs.filter(log => log.medicationId === med.id);
      if (relevantLogs.length > 0) {
        // Logs are already sorted by takenAt descending
        const lastLog = relevantLogs[0];
        if (lastLog.takenAt && med.dosageIntervalHours) {
          const nextDueDate = new Date(lastLog.takenAt.getTime() + med.dosageIntervalHours * 60 * 60 * 1000);
          newNextDueTimes[med.id] = nextDueDate;
        }
      } else {
        // If no logs, assume it's due now or handle based on a specific logic e.g., medication start date.
        // For now, let's not set a due time or set it as 'N/A' or new Date()
        newNextDueTimes[med.id] = new Date(); // Or null, or a specific string like 'Not taken yet'
      }
    });
    setNextDueTimes(newNextDueTimes);

  }, [medLogs, medications]);

  return {
    medications,
    medLogs,
    nextDueTimes,
    loadingData,
  };
};

export default useFirestoreData;
