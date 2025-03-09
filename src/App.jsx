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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('medLogs', JSON.stringify(medLogs));
  }, [medLogs]);

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

  // Function to export medication logs as CSV
  const exportLogsAsCSV = () => {
    if (medLogs.length === 0) {
      alert("No medication logs to export");
      return;
    }
    
    // CSV header
    const csvHeader = ["Medication", "Taken At", "Next Due At"];
    
    // Format logs for CSV
    const csvData = medLogs.map(log => [
      log.medicationName,
      new Date(log.takenAt).toLocaleString(),
      new Date(log.nextDueAt).toLocaleString()
    ]);
    
    // Combine header and data
    const csvContent = [
      csvHeader.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Set up download attributes
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    link.setAttribute("href", url);
    link.setAttribute("download", `medication-log-${dateStr}.csv`);
    
    // Append to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Post-Op Medication Tracker</h1>
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
          
          {/* Export button */}
          {medLogs.length > 0 && (
            <button
              onClick={exportLogsAsCSV}
              className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export CSV
            </button>
          )}
        </div>
        
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