import React, { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/react"

const MedicationTracker = () => {
  // Medication definitions with names and intervals in hours
  const medications = [
    { id: 'codeine', name: 'Codeine', interval: 6 },
    { id: 'ibuprofen', name: 'Ibuprofen', interval: 8 },
    { id: 'diclac', name: 'Diclac', interval: 16 }
  ];

  // Initialize state with data from localStorage
  const [medLogs, setMedLogs] = useState(() => {
    const savedLogs = localStorage.getItem('medLogs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });

  const [nextDueTimes, setNextDueTimes] = useState(() => {
    const savedNextDueTimes = localStorage.getItem('nextDueTimes');
    return savedNextDueTimes ? JSON.parse(savedNextDueTimes) : {};
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedMeds, setNotifiedMeds] = useState(() => {
    const savedNotifiedMeds = localStorage.getItem('notifiedMeds');
    return savedNotifiedMeds ? JSON.parse(savedNotifiedMeds) : {};
  });

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return false;
    }
    
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return true;
    }
    
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabled(granted);
      return granted;
    }
    
    return false;
  };

  // Enable notifications
  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      // Create a test notification
      new Notification("Medication Tracker", {
        body: "Notifications enabled successfully!",
        icon: "/favicon.ico"
      });
    }
  };

  // Update current time every minute and check for due medications
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check for medications that are due
      if (notificationsEnabled) {
        Object.entries(nextDueTimes).forEach(([medId, dueTimeStr]) => {
          const dueTime = new Date(dueTimeStr);
          const medication = medications.find(med => med.id === medId);
          
          // If medication is due and we haven't notified for this specific due time
          if (now >= dueTime && (!notifiedMeds[medId] || notifiedMeds[medId] !== dueTimeStr)) {
            new Notification(`Time to take ${medication.name}`, {
              body: `Your ${medication.name} is now due.`,
              icon: "/favicon.ico"
            });
            
            // Mark as notified
            setNotifiedMeds(prev => ({
              ...prev,
              [medId]: dueTimeStr
            }));
          }
        });
      }
    }, 10000); // Check every 10 seconds for more responsive notifications
    
    return () => clearInterval(timer);
  }, [nextDueTimes, notificationsEnabled, notifiedMeds]);

  // Save notified meds to localStorage
  useEffect(() => {
    localStorage.setItem('notifiedMeds', JSON.stringify(notifiedMeds));
  }, [notifiedMeds]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('medLogs', JSON.stringify(medLogs));
  }, [medLogs]);

  useEffect(() => {
    localStorage.setItem('nextDueTimes', JSON.stringify(nextDueTimes));
  }, [nextDueTimes]);

  // Function to handle taking medication
  const takeMedication = (med) => {
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    
    // Create a log entry
    const logEntry = {
      id: Date.now(),
      medicationId: med.id,
      medicationName: med.name,
      takenAt: now.toISOString(),
      nextDueAt: nextDue.toISOString()
    };
    
    // Update state
    setMedLogs([logEntry, ...medLogs]);
    setNextDueTimes({
      ...nextDueTimes,
      [med.id]: nextDue.toISOString()
    });
  };

  // Helper function to format date
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Function to calculate time remaining
  const getTimeRemaining = (dueTimeString) => {
    if (!dueTimeString) return { hours: 0, minutes: 0, isOverdue: false };
    
    const dueTime = new Date(dueTimeString);
    const diff = dueTime - currentTime;
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, isOverdue: true };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, isOverdue: false };
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Post-Op Medication Tracker</h1>
        
        {/* Notification permission button */}
        {!notificationsEnabled && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              Enable notifications to be alerted when medications are due.
            </p>
            <button
              onClick={enableNotifications}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded"
            >
              Enable Notifications
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          {medications.map((med) => {
            const timeRemaining = getTimeRemaining(nextDueTimes[med.id]);
            const buttonClass = timeRemaining.isOverdue 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-blue-500 hover:bg-blue-600";
            
            return (
              <div key={med.id} className="flex flex-col items-center">
                <button
                  onClick={() => takeMedication(med)}
                  className={`${buttonClass} text-white font-bold py-3 px-4 rounded-lg w-full`}
                >
                  {med.name}
                </button>
                <div className="mt-2 text-center text-sm">
                  {nextDueTimes[med.id] ? (
                    timeRemaining.isOverdue ? (
                      <span className="text-red-600 font-bold">TAKE NOW</span>
                    ) : (
                      <span>
                        {timeRemaining.hours}h {timeRemaining.minutes}m left
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">Not taken yet</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Every {med.interval} hours
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Medication Log</h2>
        {medLogs.length === 0 ? (
          <p className="text-gray-500 text-center">No medications logged yet</p>
        ) : (
          <div className="space-y-3">
            {medLogs.map((log) => (
              <div key={log.id} className="bg-white p-3 rounded-md shadow-sm">
                <div className="font-medium">{log.medicationName}</div>
                <div className="text-sm">
                  <span className="text-gray-600">Taken: </span>
                  {formatTime(log.takenAt)}
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Next dose: </span>
                  {formatTime(log.nextDueAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Analytics />
    </div>
  );
};

export default MedicationTracker;