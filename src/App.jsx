import React, { useState, useEffect } from 'react';
import { Analytics } from "@vercel/analytics/react"

const MedicationTracker = () => {
  // Medication definitions with names and intervals in hours
  const medications = [
    { id: 'codeine', name: 'Codeine', interval: 6 },
    { id: 'ibuprofen', name: 'Ibuprofen', interval: 8 },
    // { id: 'diclac', name: 'Diclac', interval: 16 },
    { id: 'augmentin', name: 'Augmentin', interval: 8 },
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
  const [swRegistration, setSwRegistration] = useState(null);
  const [exportMessage, setExportMessage] = useState('');

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          setSwRegistration(registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

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

  // Function to schedule a notification
  const scheduleNotification = async (medication, dueTime) => {
    if (!swRegistration || !notificationsEnabled) return;

    // Calculate when to show the notification (at due time)
    const now = new Date();
    const dueDate = new Date(dueTime);
    const delayInMs = Math.max(0, dueDate.getTime() - now.getTime());

    // Store the timer ID so we can cancel it if medication is taken early
    const timerId = setTimeout(() => {
      // Check if still due (might have been taken early)
      const currentDueTime = nextDueTimes[medication.id];
      if (currentDueTime === dueTime) {
        // Show notification directly if browser is open
        if (document.visibilityState === 'visible') {
          new Notification(`Time to take ${medication.name}`, {
            body: `Your ${medication.name} is now due.`,
            icon: "/favicon.ico"
          });
        } 
        // Otherwise use service worker for background notification
        else if (swRegistration.showNotification) {
          swRegistration.showNotification(`Time to take ${medication.name}`, {
            body: `Your ${medication.name} is now due.`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: {
              url: window.location.href
            }
          });
        }
        
        // Mark as notified
        setNotifiedMeds(prev => ({
          ...prev,
          [medication.id]: dueTime
        }));
      }
    }, delayInMs);

    // Store the timer in localStorage to survive page refreshes
    // In a real app, you would use IndexedDB for this
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '{}');
    scheduledNotifications[medication.id] = {
      medicationId: medication.id,
      dueTime: dueTime,
      timerId: timerId.toString()
    };
    localStorage.setItem('scheduledNotifications', JSON.stringify(scheduledNotifications));
  };

  // Enable notifications
  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      // Create a test notification
      if (swRegistration) {
        swRegistration.showNotification("Medication Tracker", {
          body: "Notifications enabled successfully!",
          icon: "/favicon.ico"
        });
      } else {
        new Notification("Medication Tracker", {
          body: "Notifications enabled successfully!",
          icon: "/favicon.ico"
        });
      }

      // Schedule notifications for all currently due medications
      Object.entries(nextDueTimes).forEach(([medId, dueTimeStr]) => {
        const medication = medications.find(med => med.id === medId);
        scheduleNotification(medication, dueTimeStr);
      });
    }
  };

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Save notified meds to localStorage
  useEffect(() => {
    localStorage.setItem('notifiedMeds', JSON.stringify(notifiedMeds));
  }, [notifiedMeds]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('medLogs', JSON.stringify(medLogs));
  }, [medLogs]);

  // When nextDueTimes changes, schedule notifications
  useEffect(() => {
    localStorage.setItem('nextDueTimes', JSON.stringify(nextDueTimes));
    
    // Schedule notifications if enabled
    if (notificationsEnabled && swRegistration) {
      Object.entries(nextDueTimes).forEach(([medId, dueTimeStr]) => {
        const medication = medications.find(med => med.id === medId);
        scheduleNotification(medication, dueTimeStr);
      });
    }
  }, [nextDueTimes, notificationsEnabled, swRegistration]);

  // Function to handle taking medication
  const takeMedication = (med) => {
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    console.log(`Taking ${med.name} at ${now.toISOString()}`)
    
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
  
  // Generate CSV data from medLogs
  const generateCSV = () => {
    if (medLogs.length === 0) return '';
    
    // Define headers
    const headers = ['Medication', 'Taken At', 'Next Due At'];
    
    // Create CSV rows
    const rows = medLogs.map(log => [
      log.medicationName,
      new Date(log.takenAt).toLocaleString(),
      new Date(log.nextDueAt).toLocaleString()
    ]);
    
    // Combine headers and rows
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };
  
  // Generate TSV data from medLogs
  const generateTSV = () => {
    if (medLogs.length === 0) return '';
    
    // Define headers
    const headers = ['Medication', 'Taken At', 'Next Due At'];
    
    // Create TSV rows
    const rows = medLogs.map(log => [
      log.medicationName,
      new Date(log.takenAt).toLocaleString(),
      new Date(log.nextDueAt).toLocaleString()
    ]);
    
    // Combine headers and rows
    return [headers, ...rows].map(row => row.join('\t')).join('\n');
  };
  
  // Export CSV file
  const exportCSV = () => {
    const csvData = generateCSV();
    if (!csvData) {
      setExportMessage('No data to export');
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `medication-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportMessage('CSV exported successfully');
    setTimeout(() => setExportMessage(''), 3000);
  };
  
  // Copy TSV to clipboard
  const copyToClipboard = async () => {
    const tsvData = generateTSV();
    if (!tsvData) {
      setExportMessage('No data to copy');
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }
    
    try {
      await navigator.clipboard.writeText(tsvData);
      setExportMessage('Copied to clipboard');
      setTimeout(() => setExportMessage(''), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setExportMessage('Failed to copy to clipboard');
      setTimeout(() => setExportMessage(''), 3000);
    }
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Medication Log</h2>
          <div className="flex space-x-2">
            <button
              onClick={exportCSV}
              className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded"
              disabled={medLogs.length === 0}
            >
              Export CSV
            </button>
            <button
              onClick={copyToClipboard}
              className="bg-purple-500 hover:bg-purple-600 text-white text-sm py-1 px-3 rounded"
              disabled={medLogs.length === 0}
            >
              Copy TSV
            </button>
          </div>
        </div>
        
        {exportMessage && (
          <div className="mb-3 bg-green-100 text-green-800 p-2 rounded text-center text-sm">
            {exportMessage}
          </div>
        )}
        
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