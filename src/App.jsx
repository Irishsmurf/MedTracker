import React, { useState, useEffect } from 'react';
import { PlusCircle, X, Edit, Check, Clock } from "lucide-react";

const MedicationTracker = () => {
  // Initialize medications from localStorage
  const [medications, setMedications] = useState(() => {
    const savedMeds = localStorage.getItem('medications');
    return savedMeds ? JSON.parse(savedMeds) : [
      { id: 'codeine', name: 'Codeine', interval: 6 },
      { id: 'ibuprofen', name: 'Ibuprofen', interval: 8 },
      { id: 'augmentin', name: 'Augmentin', interval: 8 },
    ];
  });

  const [isEditing, setIsEditing] = useState(false);
  const [newMedication, setNewMedication] = useState({ name: '', interval: 8 });
  const [editingMedication, setEditingMedication] = useState(null);
  const [medLogs, setMedLogs] = useState(() => {
    const savedLogs = localStorage.getItem('medLogs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });
  const [nextDueTimes, setNextDueTimes] = useState(() => {
    const savedNextDueTimes = localStorage.getItem('nextDueTimes');
    return savedNextDueTimes ? JSON.parse(savedNextDueTimes) : {};
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [exportMessage, setExportMessage] = useState('');

  // Save medications to localStorage when they change
  useEffect(() => {
    localStorage.setItem('medications', JSON.stringify(medications));
  }, [medications]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Update every 10 seconds for smoother progress
    
    return () => clearInterval(timer);
  }, []);

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

  // Function to calculate time remaining and progress
  const getTimeRemaining = (dueTimeString, interval) => {
    if (!dueTimeString) return { hours: 0, minutes: 0, isOverdue: false, progress: 0 };
    
    const dueTime = new Date(dueTimeString);
    const takenTime = new Date(dueTime - interval * 60 * 60 * 1000);
    const totalDuration = interval * 60 * 60 * 1000;
    const elapsed = currentTime - takenTime;
    const diff = dueTime - currentTime;
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, isOverdue: true, progress: 100 };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    return { hours, minutes, isOverdue: false, progress };
  };

  const addMedication = () => {
    if (!newMedication.name.trim()) {
      setExportMessage('Please enter a medication name');
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }

    const id = newMedication.name.toLowerCase().replace(/\s+/g, '-');
    
    if (medications.some(med => med.name.toLowerCase() === newMedication.name.toLowerCase())) {
      setExportMessage('A medication with this name already exists');
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }
    
    const newMed = {
      id,
      name: newMedication.name,
      interval: parseInt(newMedication.interval, 10) || 8
    };
    
    setMedications([...medications, newMed]);
    setNewMedication({ name: '', interval: 8 });
    setIsEditing(false);
  };

  const startEditMedication = (med) => {
    setEditingMedication({ ...med });
  };

  const saveEditedMedication = () => {
    if (!editingMedication.name.trim()) {
      setExportMessage('Medication name cannot be empty');
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }

    setMedications(medications.map(med => 
      med.id === editingMedication.id ? editingMedication : med
    ));
    setEditingMedication(null);
  };

  const deleteMedication = (medId) => {
    setMedications(medications.filter(med => med.id !== medId));
    
    const updatedNextDueTimes = { ...nextDueTimes };
    delete updatedNextDueTimes[medId];
    setNextDueTimes(updatedNextDueTimes);
  };

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Medication Tracker</h1>
        
        {/* Medication Management UI */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Your Medications</h2>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 flex items-center text-sm"
            >
              {isEditing ? 'Done' : 'Manage'}
            </button>
          </div>
          
          {/* Medication cards */}
          <div className="grid grid-cols-2 gap-4">
            {medications.map((med) => {
              const timeInfo = getTimeRemaining(nextDueTimes[med.id], med.interval);
              const progressColor = timeInfo.isOverdue 
                ? "stroke-red-500" 
                : timeInfo.progress < 30 ? "stroke-green-500" 
                : timeInfo.progress < 70 ? "stroke-yellow-500" 
                : "stroke-orange-500";
              
              return (
                <div key={med.id} className="flex flex-col">
                  {isEditing ? (
                    // Edit mode
                    <div className="border border-gray-300 rounded-lg p-2 bg-white h-full flex flex-col">
                      {editingMedication && editingMedication.id === med.id ? (
                        // Editing this specific medication
                        <>
                          <input
                            type="text"
                            value={editingMedication.name}
                            onChange={(e) => setEditingMedication({...editingMedication, name: e.target.value})}
                            className="border border-gray-300 rounded p-1 mb-1 text-sm"
                            placeholder="Medication name"
                          />
                          <div className="flex items-center mb-1">
                            <label className="text-xs mr-1">Hours:</label>
                            <input
                              type="number"
                              value={editingMedication.interval}
                              onChange={(e) => setEditingMedication({...editingMedication, interval: parseInt(e.target.value) || 1})}
                              className="border border-gray-300 rounded p-1 w-full text-sm"
                              min="1"
                              max="72"
                            />
                          </div>
                          <div className="flex justify-between mt-auto pt-1">
                            <button 
                              onClick={() => setEditingMedication(null)}
                              className="p-1 text-gray-500 rounded"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={saveEditedMedication}
                              className="p-1 text-green-500 rounded"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        // Display with edit/delete options
                        <>
                          <div className="font-medium mb-1 truncate">{med.name}</div>
                          <div className="text-xs text-gray-500 mb-1">Every {med.interval} hours</div>
                          <div className="flex justify-between mt-auto pt-1">
                            <button 
                              onClick={() => deleteMedication(med.id)}
                              className="p-1 text-red-500 rounded"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={() => startEditMedication(med)}
                              className="p-1 text-blue-500 rounded"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    // Normal mode with circular progress indicator
                    <div className="relative">
                      {/* Circular progress background */}
                      <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="transparent"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        {nextDueTimes[med.id] && (
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            className={progressColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * timeInfo.progress / 100)}
                          />
                        )}
                      </svg>
                      
                      {/* Button inside circle */}
                      <button
                        onClick={() => takeMedication(med)}
                        className="relative w-full h-32 bg-white rounded-full flex flex-col items-center justify-center border-2 shadow-sm overflow-hidden"
                      >
                        <span className="font-bold text-lg">{med.name}</span>
                        
                        {timeInfo.isOverdue ? (
                          <span className="text-red-600 font-bold text-sm">TAKE NOW</span>
                        ) : nextDueTimes[med.id] ? (
                          <div className="mt-2 text-center text-sm flex items-center justify-center">
                            <Clock size={14} className="mr-1" />
                            <span>
                              {timeInfo.hours}h {timeInfo.minutes}m
                            </span>
                          </div>
                        ) : (
                          <span className="mt-1 text-sm text-gray-500">Not taken yet</span>
                        )}
                        
                        <span className="text-xs text-gray-400 mt-1">
                          Every {med.interval}h
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Add new medication button/form */}
            {isEditing && (
              <div className="border border-gray-300 border-dashed rounded-lg p-2 flex flex-col items-center justify-center bg-white h-32">
                {newMedication.name || newMedication.interval !== 8 ? (
                  // Show form if user has started entering data
                  <div className="w-full">
                    <input
                      type="text"
                      value={newMedication.name}
                      onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                      className="border border-gray-300 rounded p-1 mb-1 w-full text-sm"
                      placeholder="Medication name"
                    />
                    <div className="flex items-center mb-2">
                      <label className="text-xs mr-1">Hours:</label>
                      <input
                        type="number"
                        value={newMedication.interval}
                        onChange={(e) => setNewMedication({...newMedication, interval: parseInt(e.target.value) || 1})}
                        className="border border-gray-300 rounded p-1 w-full text-sm"
                        min="1"
                        max="72"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={addMedication}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  // Show just the add button initially
                  <button 
                    onClick={() => setNewMedication({name: '', interval: 8})}
                    className="flex flex-col items-center text-blue-500"
                  >
                    <PlusCircle size={24} />
                    <span className="text-xs mt-1">Add Medication</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Simplified Medication Log */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Doses</h2>
        </div>
        
        {exportMessage && (
          <div className="mb-3 bg-green-100 text-green-800 p-2 rounded text-center text-sm">
            {exportMessage}
          </div>
        )}
        
        {medLogs.length === 0 ? (
          <p className="text-gray-500 text-center">No medications logged yet</p>
        ) : (
          <div className="space-y-2">
            {medLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between">
                <div>
                  <span className="font-medium">{log.medicationName}</span>
                  <div className="text-xs text-gray-500">
                    {new Date(log.takenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="text-xs text-right">
                  <div className="text-gray-400">Next dose</div>
                  <div>{formatTime(log.nextDueAt)}</div>
                </div>
              </div>
            ))}
            {medLogs.length > 3 && (
              <div className="text-center text-sm text-blue-500">
                {medLogs.length - 3} more entries...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicationTracker;