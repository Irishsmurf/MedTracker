import React, { useState, useEffect, useCallback } from 'react'; // Keep useState for App-specific UI state
import {
  LayoutGrid, CalendarDays, Bell, BellOff // Icons needed for App.jsx
} from "lucide-react";
import { toast } from "sonner";
// Pill, Sun, Moon, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download, LogOut are moved to sub-components

// Import Firebase instances (db might be needed for some direct operations if any remain, auth is used by hooks)
import { db } from './firebaseConfig'; // Assuming you created this file in Step 2
// Firebase functions like Timestamp, collection, doc, addDoc, setDoc, deleteDoc might still be needed for handlers in App.jsx
import {
  collection, doc, addDoc, setDoc, deleteDoc, Timestamp
} from "firebase/firestore";


// Import Custom Hooks
import useAuth from './hooks/useAuth';
import useFirestoreData from './hooks/useFirestoreData';
import useNotifications from './hooks/useNotifications';

// Import UI Components
import { Button } from "@/components/ui/button"; // Still needed for Sign In button
import { Toaster as SonnerToaster } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Still needed for notification button logic

// Import Custom Components
// MedicationGrid and LogList are now part of DashboardTab
import AppHeader from './components/AppHeader'; // New component
import DashboardTab from './components/DashboardTab'; // New component
import AddEditMedicationDialog from './components/AddEditMedicationDialog';
import MedicationCalendarView from './components/MedicationCalendarView';
import { ThemeProvider, useTheme } from './components/ThemeProvider'; // Import useTheme hook



// Import Helpers
import { formatTime } from '@/lib/utils';

// --- Constants ---
const LOGS_PER_PAGE = 25;
// --- End Constants ---

/**
 * Main application component for MedTracker.
 * Manages state via Firestore, Auth, and renders child components.
 */
const App = () => {
  // --- Custom Hooks ---
  const { user, loadingAuth, handleSignIn, handleSignOut: authSignOut } = useAuth();
  const { medications, medLogs, nextDueTimes, loadingData } = useFirestoreData(user);
  const { notificationPermission, handleRequestNotificationPermission, isFcmSupported } = useNotifications(user);
  // --- End Custom Hooks ---

  // --- App-specific UI State ---
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleLogCount, setVisibleLogCount] = useState(LOGS_PER_PAGE);
  // --- End App-specific UI State ---

  const { setTheme, resolvedTheme } = useTheme(); // Get theme functions/state

  // --- Effects specific to App.jsx ---
  // Update current time
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 10000); return () => clearInterval(timer); }, []);
  // Reset pagination when medLogs change or user changes (new set of logs)
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length, user]);
  // Clear manage mode and dialogs if user signs out
  useEffect(() => {
    if (!user) {
      setIsManageMode(false);
      setIsDialogOpen(false);
      setEditingMedication(null);
    }
  }, [user]);
  // --- End Effects ---

  // Renaming handleSignOut from useAuth to avoid conflict if any local one was defined,
  // though it's being removed. Using authSignOut for clarity.
  const handleSignOut = useCallback(async () => {
    try {
      await authSignOut(); // Call the signout from useAuth hook
      toast.info("Signed out.");
    } catch (error) {
      console.error("Sign-out error:", error);
      toast.error("Sign-out failed");
    }
  }, [authSignOut]);


  // --- Core Logic Handlers (with Debugging Logs) ---
  // These handlers now use `user` from `useAuth` and `medications` from `useFirestoreData`
  const handleTakeMedication = useCallback(async (med) => {
    if (!user) { toast.error("Please sign in."); return; }
    // Ensure med.interval is used, which should be dosageIntervalHours from the hook if that's the intended field
    // Assuming med.interval is the correct field name from the medication object.
    // If it's med.dosageIntervalHours, then that should be used.
    // For this refactor, I'll assume med.interval is what's passed and correct.
    // If med.dosageIntervalHours is defined in medications state from useFirestoreData, use that.
    // Let's assume 'med.interval' is the correct prop passed to this handler from MedicationGrid.
    // It might need to be med.dosageIntervalHours if that's the field name in the medications state.
    const intervalHours = med.dosageIntervalHours || med.interval; // Prefer specific field if available
    if (typeof intervalHours !== 'number' || intervalHours <= 0) {
      console.error("Invalid or missing dosage interval for medication:", med.name);
      toast.error("Invalid Interval", { description: `Cannot log ${med.name} due to missing or invalid interval.`});
      return;
    }

    const now = new Date();
    const nextDue = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    const logEntry = {
      medicationId: med.id,
      medicationName: med.name,
      takenAt: Timestamp.fromDate(now),
      nextDueAt: Timestamp.fromDate(nextDue), // This will be used by useFirestoreData to calculate nextDueTimes
      dosageAmount: med.dosageAmount || null,
      dosageUnit: med.dosageUnit || null,
    };
    // The reminderEntry logic might be better suited for a backend function triggered by new log entries.
    // For now, keeping it here if it's essential for client-side logic, but be aware of limitations.
    const reminderEntry = {
      userId: user.uid,
      medicationName: med.name,
      dueAt: Timestamp.fromDate(nextDue),
    };
    try {
      const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
      // Consider moving reminder scheduling to a Firebase Function for reliability
      const remindersCollectionRef = collection(db, "scheduledReminders");

      await Promise.all([
        addDoc(logsCollectionRef, logEntry),
        addDoc(remindersCollectionRef, reminderEntry) // This might be removed if backend handles reminders
      ]);
      toast.info("Medication Taken", { description: `${med.name} logged.` });
    } catch (error) {
      console.error("Error logging med and scheduling reminder:", error);
      toast.error("Failed to log med", { description: error.message });
    }
  }, [user, db]); // db is now an explicit dependency if used directly

  const handleSaveMedication = useCallback(async (medData, isEditing) => {
    if (!user) { toast.error("Please sign in."); return; }

    // medData.id should be present for editing, and generated/present for adding
    // If adding a new medication, medData.id might need to be generated here or in the dialog
    // Assuming medData.id is correctly handled by AddEditMedicationDialog (e.g., using doc(collectionRef).id for new)
    const medDocRef = medData.id ?
      doc(db, 'users', user.uid, 'medications', medData.id) :
      doc(collection(db, 'users', user.uid, 'medications')); // Auto-generate ID for new medication

    const dataToSave = {
      name: medData.name,
      dosageIntervalHours: parseFloat(medData.dosageIntervalHours) || null, // Ensure it's a number
      dosageAmount: medData.dosageAmount || null,
      dosageUnit: medData.dosageUnit || null,
      // 'interval' field was used before, standardizing to 'dosageIntervalHours' from useFirestoreData
    };
    try {
      await setDoc(medDocRef, dataToSave, { merge: true }); // Use merge if creating new or partially updating
      toast.success(`Medication ${isEditing ? 'updated' : 'added'} successfully!`);
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Error saving med:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} medication`, { description: error.message });
    }
  }, [user, db]); // db is now an explicit dependency

  const handleDeleteMedication = useCallback(async (medIdToDelete) => {
    if (!user) { toast.error("Please sign in."); return; }
    const medToDelete = medications.find(med => med.id === medIdToDelete);
    const medName = medToDelete ? medToDelete.name : 'Medication';
    const medDocRef = doc(db, 'users', user.uid, 'medications', medIdToDelete);
    try {
      await deleteDoc(medDocRef);
      toast.error("Medication Deleted", { description: `${medName} removed.` }); // Using error style for delete confirmation
    } catch (error) {
      console.error("Error deleting med:", error);
      toast.error("Failed to delete med", { description: error.message });
    }
  }, [user, medications, db]); // db and medications are dependencies

  // --- UI Control Handlers (with Debugging Logs) ---
  // These remain largely the same but rely on state managed by App.jsx
  const handleEditMedication = useCallback((med) => {
    setEditingMedication(med);
    setIsDialogOpen(true);
  }, []);

  const handleAddNewMedication = useCallback(() => {
    setEditingMedication(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open) => { setIsDialogOpen(open); if (!open) { setEditingMedication(null); } }, []);
  const handleLoadMoreLogs = useCallback(() => { setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE); }, []);
  // --- Log Action Handlers ---
  // --- Log Action Handlers (with Debugging Logs) ---

  const handleCopyLog = useCallback(() => {
    if (!medLogs || medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to copy." });
      return;
    }

    try {
      // Format log data for clipboard (more readable with date)
      const formattedLog = medLogs
        .map((log, index) => {
          // Log individual log item data being processed
          // console.log(`CopyLog Item ${index}:`, { name: log.medicationName, taken: log.takenAt, due: log.nextDueAt });
          // Ensure dates are valid before formatting
          const takenTime = log.takenAt ? formatTime(log.takenAt, true) : 'N/A';
          const dueTime = log.nextDueAt ? formatTime(log.nextDueAt, true) : 'N/A';
          // Ensure medicationName exists
          const medName = log.medicationName || 'Unknown Medication';
          return `${medName} - Taken: ${takenTime} - Next Due: ${dueTime}`;
        })
        .join('\n'); // Newline separated

      if (!formattedLog) {
        console.error("CopyLog: Formatted log string is empty!");
        toast.error("Copy failed", { description: "Could not format log data." });
        return;
      }

      // Use Clipboard API
      navigator.clipboard.writeText(formattedLog)
        .then(() => {
          toast.success("Log copied to clipboard!");
        })
        .catch(err => {
          console.error('CopyLog: writeText failed: ', err); // Log: Error
          toast.error("Copy failed", { description: "Could not access clipboard. Check browser permissions." });
        });

    } catch (error) {
      console.error("CopyLog: Error during formatting or copy:", error);
      toast.error("Copy failed", { description: "An unexpected error occurred." });
    }

  }, [medLogs]); // Depends on medLogs

  const handleExportCSV = useCallback(() => {
    if (!medLogs || medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to export." });
      return;
    }

    try {
      // CSV Header
      const header = ['Medication Name', 'Taken At (ISO)', 'Next Due At (ISO)'];
      // CSV Rows
      const rows = medLogs.map((log, index) => {
        // Log individual log item data being processed
        // console.log(`ExportCSV Item ${index}:`, { name: log.medicationName, taken: log.takenAt, due: log.nextDueAt });
        // Ensure values exist, default to empty string if not
        const name = log.medicationName || '';
        const takenAt = log.takenAt || ''; // These should be ISO strings from Firestore listener
        const nextDueAt = log.nextDueAt || ''; // These should be ISO strings
        // Quote name and escape quotes within name
        return [`"${name.replace(/"/g, '""')}"`, takenAt, nextDueAt];
      });

      // Combine header and rows
      const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');

      if (!csvContent) {
        console.error("ExportCSV: Generated CSV content is empty!");
        toast.error("Export failed", { description: "Could not generate CSV data." });
        return;
      }

      // Create Blob and Download Link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");

      // Check for download attribute support
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `medication_log_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Release object URL memory
        toast.success("Log exported as CSV!");
      } else {
        console.error("ExportCSV: link.download attribute not supported.");
        toast.error("Export failed", { description: "CSV export is not supported in this browser." });
      }
    } catch (error) {
      console.error("ExportCSV: Error during CSV generation or download:", error);
      toast.error("Export failed", { description: "An unexpected error occurred." });
    }
  }, [medLogs]); // Depends on medLogs

  // --- End Log Action Handlers ---

  // --- End Handlers ---

  // --- Render Logic ---
  if (loadingAuth || (user && loadingData && medLogs.length === 0 && medications.length === 0)) {
    return (<div className="flex justify-center items-center min-h-screen text-muted-foreground"> {loadingAuth ? "Authenticating..." : "Loading Medication Data..."} </div>);
  }

  // Notification Button UI Logic
  let notificationButton = null;
  if (isFcmSupported && user) {
    let buttonText = "Enable Notifications"; let buttonIcon = <Bell className="mr-2 h-4 w-4" />; let buttonDisabled = false; let tooltipText = "Click to allow medication reminders";
    if (notificationPermission === 'granted') { buttonText = "Notifications On"; buttonIcon = <Bell className="mr-2 h-4 w-4 text-green-500" />; buttonDisabled = true; tooltipText = "Notifications are active"; }
    else if (notificationPermission === 'denied') { buttonText = "Notifications Off"; buttonIcon = <BellOff className="mr-2 h-4 w-4" />; buttonDisabled = true; tooltipText = "Notifications blocked by browser"; }
    notificationButton = (<TooltipProvider delayDuration={100}><Tooltip> <TooltipTrigger asChild><span tabIndex={buttonDisabled ? 0 : -1}> <Button variant="outline" size="sm" onClick={handleRequestNotificationPermission} disabled={buttonDisabled} aria-label={tooltipText}> {buttonIcon} {buttonText} </Button> </span></TooltipTrigger> <TooltipContent><p>{tooltipText}</p></TooltipContent> </Tooltip></TooltipProvider>);
  }

  return (
    <>
      <SonnerToaster position="top-center" richColors />
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen font-sans">
        <AppHeader
          user={user}
          resolvedTheme={resolvedTheme}
          setTheme={setTheme}
          handleSignOut={handleSignOut}
          notificationButton={notificationButton}
        />

        {/* Conditional Content: Sign-In or Main App */}
        {!user ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold mb-4">Welcome to MedTracker</h2>
            <p className="text-muted-foreground mb-6">Sign in with Google to save and sync your medication schedule.</p>
            <Button onClick={handleSignIn} size="lg">Sign In with Google</Button>
          </div>
        ) : (
          // Main Application UI (Tabs)
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dashboard"><LayoutGrid className="mr-2 h-4 w-4" /> Dashboard</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Calendar View</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <DashboardTab
                medications={medications}
                nextDueTimes={nextDueTimes}
                currentTime={currentTime}
                handleTakeMedication={handleTakeMedication}
                handleEditMedication={handleEditMedication}
                isManageMode={isManageMode}
                setIsManageMode={setIsManageMode}
                handleDeleteMedication={handleDeleteMedication}
                handleAddNewMedication={handleAddNewMedication}
                medLogs={medLogs}
                visibleLogCount={visibleLogCount}
                handleLoadMoreLogs={handleLoadMoreLogs}
                logsPerPage={LOGS_PER_PAGE}
                handleCopyLog={handleCopyLog}
                handleExportCSV={handleExportCSV}
              />
            </TabsContent>
            {/* Calendar Content */}
            <TabsContent value="calendar"> <MedicationCalendarView medLogs={medLogs} /> </TabsContent>
          </Tabs>
        )}

        {/* Add/Edit Dialog */}
        {user && (<AddEditMedicationDialog open={isDialogOpen} onOpenChange={handleDialogChange} medication={editingMedication} onSave={handleSaveMedication} medications={medications} />)}
      </div>
    </>
  );
};

export default App;
