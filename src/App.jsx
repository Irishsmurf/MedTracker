import React, { useState, useEffect, useCallback } from 'react';
import {
  Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download,
  LayoutGrid, CalendarDays, Bell, BellOff, LogOut, Sun, Moon // Icons
} from "lucide-react";
import { toast } from "sonner";

// Import Firebase Auth, Firestore, & Messaging functions and instances
import { db } from './firebaseConfig'; // db is still needed for FCM token storage
import { doc, setDoc, Timestamp } from "firebase/firestore"; // Kept for FCM token storage
import { getMessaging, getToken, isSupported } from "firebase/messaging"; // Messaging imports

// Import UI Components
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster as SonnerToaster } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import Custom Components
import MedicationGrid from './components/MedicationGrid';
import LogList from './components/LogList';
import AddEditMedicationDialog from './components/AddEditMedicationDialog';
import MedicationCalendarView from './components/MedicationCalendarView';
import { ThemeProvider, useTheme } from './components/ThemeProvider'; // Import useTheme hook
import useAuth from './hooks/useAuth'; // Import the useAuth hook
import useMedicationData from './hooks/useMedicationData'; // Import the useMedicationData hook


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
  // --- Auth State (from hook) ---
  const { user, loadingAuth, handleSignIn, handleSignOut } = useAuth();

  // --- Medication Data State (from hook) ---
  const {
    medications,
    medLogs,
    loadingData,
    nextDueTimes,
    addMedicationLog,
    saveMedication,
    deleteMedicationFromDb
  } = useMedicationData(user);

  // --- UI State ---
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleLogCount, setVisibleLogCount] = useState(LOGS_PER_PAGE);
  // FCM/Notification State
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isFcmSupported, setIsFcmSupported] = useState(false);
  // --- End State ---

  const { setTheme, resolvedTheme } = useTheme(); // Get theme functions/state

  // --- Effects ---
  // Check FCM support and initial permission status
  useEffect(() => {
    console.log("Checking FCM support...");
    isSupported().then((supported) => {
      setIsFcmSupported(supported);
      if (supported) {
        console.log("FCM is supported. Initial permission:", Notification.permission);
        setNotificationPermission(Notification.permission);
      } else {
        console.log("FCM is not supported in this browser.");
      }
    }).catch(err => {
      console.error("Error checking FCM support:", err);
      setIsFcmSupported(false); // Assume not supported on error
    });
  }, []);

  // Effect to reset UI state when user logs out (data state is handled in useMedicationData)
  useEffect(() => {
    if (!user) {
      // medications, medLogs, nextDueTimes, loadingData are reset by useMedicationData or its deps
      setIsManageMode(false);
      setVisibleLogCount(LOGS_PER_PAGE);
      // Notification permission is user-dependent but not strictly "app data" cleared on logout
    } else {
      // Ensure notification permission is checked/updated when user logs IN
      if (isFcmSupported) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, [user, isFcmSupported]);

  // Update current time
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 10000); return () => clearInterval(timer); }, []);
  // Reset pagination
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length]);
  // --- End Effects ---

  // --- Notification Handler ---
  const handleRequestNotificationPermission = useCallback(async () => {
    console.log("handleRequestNotificationPermission called.");
    if (!isFcmSupported) { toast.error("Notifications not supported"); return; }
    if (!user) { toast.error("Please sign in first."); return; }
    console.log("Requesting notification permission...");
    try {
      const permission = await Notification.requestPermission();
      console.log("Notification permission result:", permission);
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.info("Permission granted. Getting FCM token...");
        const messaging = getMessaging();
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) { console.error("VAPID key missing!"); toast.error("Configuration error"); return; }
        console.log("Attempting to get FCM token...");
        const currentToken = await getToken(messaging, { vapidKey: vapidKey });
        if (currentToken) {
          console.log('FCM Token received:', currentToken);
          const tokenDocRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
          console.log("Saving token to Firestore...");
          await setDoc(tokenDocRef, { createdAt: Timestamp.now(), userAgent: navigator.userAgent });
          console.log("Token saved.");
          toast.success("Notifications enabled!");
        } else { console.warn('No FCM registration token available.'); toast.warning("Could not get token."); }
      } else if (permission === 'denied') { toast.error("Notifications blocked"); }
      else { toast.info("Permission dismissed."); }
    } catch (error) { console.error('Error during notification setup:', error); toast.error("Failed to enable notifications"); }
  }, [user, isFcmSupported]);
  // --- End Notification Handler ---

  // Core Logic Handlers now use functions from useMedicationData and useAuth hooks
  const handleTakeMedication = useCallback(async (med) => {
    console.log("App: handleTakeMedication triggered for", med?.name);
    if (!user) {
      toast.error("Please sign in.");
      return;
    }
    try {
      await addMedicationLog(med); // Call hook function
      toast.info("Medication Taken", { description: `${med.name} logged.` });
    } catch (error) {
      console.error("App: Error logging med and scheduling reminder:", error);
      toast.error("Failed to log med", { description: error.message });
    }
  }, [user, addMedicationLog]); // addMedicationLog is from hook

  const handleSaveMedication = useCallback(async (medData, isEditing) => {
    console.log(`App: handleSaveMedication triggered (${isEditing ? 'Edit' : 'Add'}) for`, medData?.name);
    if (!user) {
      toast.error("Please sign in.");
      return;
    }
    // The Dialog component will generate an ID for new medications before calling this.
    // So, medData.id should always be present.
    if (!medData.id) {
        console.error("App: medData.id is missing in handleSaveMedication.");
        toast.error(`Failed to ${isEditing ? 'update' : 'add'} medication`, { description: "Medication ID was missing." });
        return;
    }
    try {
      await saveMedication(medData); // Call hook function
      // Success toast is usually handled by the dialog calling this, if applicable
      // For example, AddEditMedicationDialog might call toast.success after onSave completes.
      // If not, add success toast here:
      // toast.success(`Medication ${isEditing ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error("App: Error saving med:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} medication`, { description: error.message });
    }
  }, [user, saveMedication]); // saveMedication is from hook

  const handleDeleteMedication = useCallback(async (medIdToDelete) => {
    console.log("App: handleDeleteMedication triggered for ID:", medIdToDelete);
    if (!user) {
      toast.error("Please sign in.");
      return;
    }
    const medToDelete = medications.find(med => med.id === medIdToDelete);
    const medName = medToDelete ? medToDelete.name : 'Medication';
    try {
      await deleteMedicationFromDb(medIdToDelete); // Call hook function
      toast.error("Medication Deleted", { description: `${medName} removed.` }); // Using toast.error for "deleted" type notifications as per original
    } catch (error) {
      console.error("App: Error deleting med:", error);
      toast.error("Failed to delete med", { description: error.message });
    }
  }, [user, medications, deleteMedicationFromDb]); // deleteMedicationFromDb is from hook, medications for medName

  // --- UI Control Handlers ---
  const handleEditMedication = useCallback((med) => {
    console.log("App: handleEditMedication triggered for", med?.name); // Debug Log
    setEditingMedication(med);
    setIsDialogOpen(true);
  }, []);

  const handleAddNewMedication = useCallback(() => {
    console.log("App: handleAddNewMedication triggered"); // Debug Log
    setEditingMedication(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open) => { setIsDialogOpen(open); if (!open) { setEditingMedication(null); } }, []);
  const handleLoadMoreLogs = useCallback(() => { setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE); }, []);
  // --- Log Action Handlers (medLogs is now from useMedicationData) ---

  const handleCopyLog = useCallback(() => {
    // ... (implementation remains the same, medLogs is from the hook)
    console.log("handleCopyLog triggered.");
    if (!medLogs || medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to copy." });
      return;
    }
    try {
      const formattedLog = medLogs
        .map(log => {
          const takenTime = log.takenAt ? formatTime(log.takenAt, true) : 'N/A';
          const dueTime = log.nextDueAt ? formatTime(log.nextDueAt, true) : 'N/A';
          const medName = log.medicationName || 'Unknown Medication';
          return `${medName} - Taken: ${takenTime} - Next Due: ${dueTime}`;
        })
        .join('\n');
      if (!formattedLog) {
        toast.error("Copy failed", { description: "Could not format log data." });
        return;
      }
      navigator.clipboard.writeText(formattedLog)
        .then(() => toast.success("Log copied to clipboard!"))
        .catch(err => {
          console.error('CopyLog: writeText failed: ', err);
          toast.error("Copy failed", { description: "Could not access clipboard." });
        });
    } catch (error) {
      console.error("CopyLog: Error during formatting or copy:", error);
      toast.error("Copy failed", { description: "An unexpected error occurred." });
    }
  }, [medLogs]);

  const handleExportCSV = useCallback(() => {
    // ... (implementation remains the same, medLogs is from the hook)
    console.log("handleExportCSV triggered.");
    if (!medLogs || medLogs.length === 0) {
      toast.warning("Log is empty", { description: "There are no medication logs to export." });
      return;
    }
    try {
      const header = ['Medication Name', 'Taken At (ISO)', 'Next Due At (ISO)'];
      const rows = medLogs.map(log => {
        const name = log.medicationName || '';
        const takenAt = log.takenAt || '';
        const nextDueAt = log.nextDueAt || '';
        return [`"${name.replace(/"/g, '""')}"`, takenAt, nextDueAt];
      });
      const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
      if (!csvContent) {
        toast.error("Export failed", { description: "Could not generate CSV data." });
        return;
      }
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
        toast.error("Export failed", { description: "CSV export is not supported by browser." });
      }
    } catch (error) {
      console.error("ExportCSV: Error during CSV generation or download:", error);
      toast.error("Export failed", { description: "An unexpected error occurred." });
    }
  }, [medLogs]);

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
        {/* Header */}
        <header className="mb-6 pb-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1 flex justify-start order-2 md:order-1">
            {notificationButton}
          </div>
          <div className="text-center order-1 md:order-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
              <Pill className="text-primary" /> MedTracker
            </h1>
            <p className="text-muted-foreground text-sm">
              {user ? `Tracking for ${user.displayName || 'User'}` : 'Your personal medication schedule'}
            </p>
          </div>
          <div className="flex-1 flex justify-end order-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  {/* Show Sun or Moon based on the currently RESOLVED theme */}
                  {resolvedTheme === 'dark' ? (
                    <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
                  ) : (
                    <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Call setTheme with the user's PREFERENCE */}
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user && (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            )}
          </div>
        </header>

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
            {/* Dashboard Content */}
            <TabsContent value="dashboard">
              <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
                  <div className="flex gap-2">
                    {/* Manage Button */}
                    <Button variant={isManageMode ? "default" : "outline"} onClick={() => { console.log("Toggle Manage Mode clicked"); setIsManageMode(!isManageMode); }}>
                      {isManageMode ? <Check size={16} className="mr-2" /> : <Edit size={16} className="mr-2" />}
                      {isManageMode ? 'Done Managing' : 'Manage'}
                    </Button>
                    {/* Add New Button (in header) */}
                    {isManageMode && (<Button variant="outline" onClick={() => { console.log("Header Add New button clicked"); handleAddNewMedication(); }}> <PlusCircle size={16} className="mr-2" /> Add New </Button>)}
                  </div>
                </div>
                <MedicationGrid
                  medications={medications} nextDueTimes={nextDueTimes} currentTime={currentTime}
                  handleTakeMedication={handleTakeMedication} handleEditMedication={handleEditMedication}
                  isManageMode={isManageMode} handleDeleteMedication={handleDeleteMedication}
                  handleAddNewMedication={handleAddNewMedication}
                />
              </section>
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Medication History</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={medLogs.length === 0}><MoreHorizontal className="h-4 w-4 mr-2" /> Actions</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Log Actions</DropdownMenuLabel><DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleCopyLog}><ClipboardCopy className="mr-2 h-4 w-4" /><span>Copy Full Log</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /><span>Export as CSV</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <LogList
                  medLogs={medLogs} visibleLogCount={visibleLogCount}
                  handleLoadMoreLogs={handleLoadMoreLogs} logsPerPage={LOGS_PER_PAGE}
                />
              </section>
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
