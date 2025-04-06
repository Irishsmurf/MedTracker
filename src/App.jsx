import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download } from "lucide-react";
import { toast } from "sonner";

// Import UI Components
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster as SonnerToaster } from "sonner";

// Import Custom Components
import MedicationGrid from './components/MedicationGrid';
import LogList from './components/LogList';
import AddEditMedicationDialog from './components/AddEditMedicationDialog';

// Import Helpers
import { formatTime } from '@/lib/utils'; // Assuming utils.ts/js contains formatTime

// --- Constants ---
const LOGS_PER_PAGE = 25;
// --- End Constants ---

/**
 * Main application component for MedTracker.
 * Manages state and renders child components.
 */
const App = () => {
  // --- State Initialization ---
  // Load initial state from localStorage with error handling
  const [medications, setMedications] = useState(() => {
    try {
      const savedMeds = localStorage.getItem('medications');
      // Provide more robust default data or structure validation if needed
      return savedMeds ? JSON.parse(savedMeds) : [
        { id: 'codeine-1', name: 'Codeine', interval: 6 },
        { id: 'ibuprofen-2', name: 'Ibuprofen', interval: 8 },
        { id: 'augmentin-3', name: 'Augmentin', interval: 8 },
      ];
    } catch (e) { console.error("Failed to parse medications from localStorage", e); return []; }
  });

  const [medLogs, setMedLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('medLogs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (e) { console.error("Failed to parse medLogs from localStorage", e); return []; }
  });

  const [nextDueTimes, setNextDueTimes] = useState(() => {
    try {
      const savedNextDueTimes = localStorage.getItem('nextDueTimes');
      return savedNextDueTimes ? JSON.parse(savedNextDueTimes) : {};
    } catch (e) { console.error("Failed to parse nextDueTimes from localStorage", e); return {}; }
  });

  // UI State
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null); // Medication object being edited, or null for adding
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleLogCount, setVisibleLogCount] = useState(LOGS_PER_PAGE);
  // --- End State Initialization ---

  // --- Effects ---
  // Update current time every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer); // Cleanup timer on unmount
  }, []);

  // Save state changes to localStorage
  useEffect(() => { localStorage.setItem('medications', JSON.stringify(medications)); }, [medications]);
  useEffect(() => { localStorage.setItem('medLogs', JSON.stringify(medLogs)); }, [medLogs]);
  useEffect(() => { localStorage.setItem('nextDueTimes', JSON.stringify(nextDueTimes)); }, [nextDueTimes]);

  // Reset pagination when logs change significantly (e.g., cleared, initial load)
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length]);
  // --- End Effects ---

  // --- Core Logic Handlers ---
  // Passed down to MedicationCard via MedicationGrid
  const handleTakeMedication = useCallback((med) => {
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    const logEntry = {
      id: Date.now(), // Simple unique ID
      medicationId: med.id,
      medicationName: med.name,
      takenAt: now.toISOString(),
      nextDueAt: nextDue.toISOString()
    };
    // Prepend new log entry
    setMedLogs(prevLogs => [logEntry, ...prevLogs]);
    // Update next due time for this medication
    setNextDueTimes(prevTimes => ({ ...prevTimes, [med.id]: nextDue.toISOString() }));
    // Show confirmation toast
    toast.info("Medication Taken", {
      description: `${med.name} logged at ${formatTime(now.toISOString())}. Next dose at ${formatTime(nextDue.toISOString())}.`
    });
  }, []); // Empty dependency array as it doesn't depend on component state directly

  // Passed down to AddEditMedicationDialog
  const handleSaveMedication = useCallback((medData, isEditing) => {
    if (isEditing) {
      // Update existing medication
      setMedications(prevMeds => prevMeds.map(m => m.id === medData.id ? medData : m));
    } else {
      // Add new medication
      setMedications(prevMeds => [...prevMeds, medData]);
    }
    setEditingMedication(null); // Clear editing state after save
    // Toast is handled within the Dialog component upon successful save
  }, []); // Empty dependency array

  // Passed down to MedicationCard via MedicationGrid
  const handleDeleteMedication = useCallback((medIdToDelete) => {
    const medToDelete = medications.find(med => med.id === medIdToDelete);
    const medName = medToDelete ? medToDelete.name : 'Medication';

    // Remove medication from list
    setMedications(prevMeds => prevMeds.filter(med => med.id !== medIdToDelete));

    // Remove associated next due time
    setNextDueTimes(prevTimes => {
      const updatedTimes = { ...prevTimes };
      delete updatedTimes[medIdToDelete];
      return updatedTimes;
    });

    // Optional: Consider clearing logs associated with the deleted medication
    // setMedLogs(prevLogs => prevLogs.filter(log => log.medicationId !== medIdToDelete));

    // Show confirmation toast
    toast.error("Medication Deleted", {
      description: `${medName} has been removed.`
    });
  }, [medications]); // Depends on medications to find the name

  // --- UI Control Handlers ---
  // Passed down to MedicationCard/MedicationGrid
  const handleEditMedication = useCallback((med) => {
    setEditingMedication(med); // Set the medication to be edited
    setIsDialogOpen(true); // Open the dialog
  }, []);

  // Passed down to MedicationGrid and header button
  const handleAddNewMedication = useCallback(() => {
    setEditingMedication(null); // Ensure editing state is null for adding
    setIsDialogOpen(true); // Open the dialog
  }, []);

  // Passed down to AddEditMedicationDialog
  const handleDialogChange = useCallback((open) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingMedication(null); // Clear editing state when dialog closes
    }
  }, []);

  // Passed down to LogList
  const handleLoadMoreLogs = useCallback(() => {
    setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE);
  }, []);

  // --- Log Action Handlers ---
  // Kept in App.jsx as they operate on the full medLogs state
  const handleCopyLog = useCallback(() => {
    if (medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to copy." });
      return;
    }
    // Format log data for clipboard (more readable with date)
    const formattedLog = medLogs
      .map(log => `${log.medicationName} - Taken: ${formatTime(log.takenAt, true)} - Next Due: ${formatTime(log.nextDueAt, true)}`)
      .join('\n');

    navigator.clipboard.writeText(formattedLog)
      .then(() => { toast.success("Log copied to clipboard!"); })
      .catch(err => { console.error('Failed to copy log: ', err); toast.error("Failed to copy log", { description: "Could not access clipboard." }); });
  }, [medLogs]); // Depends on medLogs

  const handleExportCSV = useCallback(() => {
    if (medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to export." });
      return;
    }
    // CSV Header and Rows
    const header = ['Medication Name', 'Taken At (ISO)', 'Next Due At (ISO)'];
    const rows = medLogs.map(log => [ `"${log.medicationName.replace(/"/g, '""')}"`, log.takenAt, log.nextDueAt ]);
    const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
    // Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `medication_log_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Log exported as CSV!");
    } else {
      toast.error("Export failed", { description: "CSV export is not supported." });
    }
  }, [medLogs]); // Depends on medLogs
  // --- End Handlers ---

  // --- Render Logic ---
  return (
    <>
      {/* Toast container */}
      <SonnerToaster position="top-center" richColors />

      {/* Main App Layout */}
      <div className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen font-sans">

        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
            <Pill className="text-primary" /> MedTracker
          </h1>
          <p className="text-muted-foreground">Your personal medication schedule</p>
        </header>

        {/* Medication Grid Section */}
        <section className="mb-8">
          {/* Section Header with Manage/Add Buttons */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
            <div className="flex gap-2">
              <Button variant={isManageMode ? "default" : "outline"} onClick={() => setIsManageMode(!isManageMode)}>
                {isManageMode ? <Check size={16} className="mr-2" /> : <Edit size={16} className="mr-2" />}
                {isManageMode ? 'Done Managing' : 'Manage'}
              </Button>
              {/* Show "Add New" only in manage mode */}
              {isManageMode && (
                <Button variant="outline" onClick={handleAddNewMedication}>
                  <PlusCircle size={16} className="mr-2" /> Add New
                </Button>
              )}
            </div>
          </div>
          {/* Render the Medication Grid Component */}
          <MedicationGrid
            medications={medications}
            nextDueTimes={nextDueTimes}
            currentTime={currentTime}
            handleTakeMedication={handleTakeMedication}
            handleEditMedication={handleEditMedication}
            isManageMode={isManageMode}
            handleDeleteMedication={handleDeleteMedication}
            handleAddNewMedication={handleAddNewMedication} // Pass handler for placeholder card
          />
        </section>

        {/* Medication History Section */}
        <section>
          {/* Section Header with Action Dropdown */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Medication History</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={medLogs.length === 0}>
                  <MoreHorizontal className="h-4 w-4 mr-2" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Log Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyLog}>
                  <ClipboardCopy className="mr-2 h-4 w-4" /><span>Copy Full Log</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" /><span>Export as CSV</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Render the Log List Component */}
          <LogList
            medLogs={medLogs}
            visibleLogCount={visibleLogCount}
            handleLoadMoreLogs={handleLoadMoreLogs}
            logsPerPage={LOGS_PER_PAGE} // Pass constant for footer logic
          />
        </section>

        {/* Render the Add/Edit Dialog Component */}
        <AddEditMedicationDialog
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
          medication={editingMedication} // Pass the medication object to edit, or null to add
          onSave={handleSaveMedication}
          medications={medications} // Pass full list for duplicate checking
        />
      </div>
    </>
  );
};

export default App;
