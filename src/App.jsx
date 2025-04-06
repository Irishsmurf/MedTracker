import React, { useState, useEffect, useCallback } from 'react';
import {
  Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download,
  LayoutGrid, CalendarDays, Bell, BellOff, LogOut, Sun, Moon // Icons
} from "lucide-react";
import { toast } from "sonner";

// Import Firebase Auth, Firestore, & Messaging functions and instances
import { auth, db } from './firebaseConfig'; // Assuming you created this file in Step 2
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import {
  collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, orderBy, Timestamp
} from "firebase/firestore";
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
  // --- State ---
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [medications, setMedications] = useState([]);
  const [medLogs, setMedLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [nextDueTimes, setNextDueTimes] = useState({});
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

  // Auth listener
  useEffect(() => {
    setLoadingAuth(true);
    console.log("Setting up Auth listener...");
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser ? currentUser.uid : "null");
      setUser(currentUser);
      setLoadingAuth(false);
      if (!currentUser) {
        setMedications([]); setMedLogs([]); setNextDueTimes({}); setLoadingData(true);
        setIsManageMode(false); setVisibleLogCount(LOGS_PER_PAGE);
      } else {
        if (isFcmSupported) { setNotificationPermission(Notification.permission); }
      }
    });
    return () => { console.log("Cleaning up Auth listener."); unsubscribeAuth(); };
  }, [isFcmSupported]);

  // Firestore listeners
  useEffect(() => {
    if (!user) { setLoadingData(false); return; }
    console.log(`Setting up Firestore listeners for user: ${user.uid}`);
    setLoadingData(true);
    let unsubMeds = () => { };
    let unsubLogs = () => { };
    try {
      const medsCollectionRef = collection(db, 'users', user.uid, 'medications');
      unsubMeds = onSnapshot(medsCollectionRef, (snap) => {
        setMedications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingData(false); console.log("Firestore: Medications updated.");
      }, (err) => { console.error("Firestore meds listener error:", err); toast.error("Failed to load meds"); setLoadingData(false); });
      const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
      const logsQuery = query(logsCollectionRef, orderBy("takenAt", "desc"));
      unsubLogs = onSnapshot(logsQuery, (snap) => {
        setMedLogs(snap.docs.map(doc => { const d = doc.data(); return { id: doc.id, ...d, takenAt: d.takenAt?.toDate().toISOString(), nextDueAt: d.nextDueAt?.toDate().toISOString() }; }));
        setLoadingData(false); console.log("Firestore: Logs updated.");
      }, (err) => { console.error("Firestore logs listener error:", err); toast.error("Failed to load history"); setLoadingData(false); });
    } catch (error) { console.error("Error setting up Firestore listeners:", error); setLoadingData(false); toast.error("Error connecting to database."); }
    return () => { console.log(`Cleaning up Firestore listeners for user: ${user.uid}`); unsubMeds(); unsubLogs(); };
  }, [user]);

  // Derive nextDueTimes
  useEffect(() => {
    if (medLogs.length === 0) { setNextDueTimes({}); return; }
    const latest = {}; medLogs.forEach(log => { if (!latest[log.medicationId] && log.nextDueAt) latest[log.medicationId] = log.nextDueAt; });
    setNextDueTimes(latest);
  }, [medLogs]);

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


  // --- Auth Handlers ---
  const handleSignIn = useCallback(async () => {
    console.log("Sign-in button clicked!"); // Debug Log
    const provider = new GoogleAuthProvider();
    try {
      setLoadingAuth(true);
      console.log("Attempting signInWithPopup..."); // Debug Log
      await signInWithPopup(auth, provider);
      console.log("signInWithPopup successful (or popup closed)"); // Debug Log
      toast.success("Signed in successfully!");
    } catch (error) {
      console.error("Sign-in error:", error); // Keep detailed error log
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') { toast.info("Sign-in cancelled."); }
      else { toast.error("Sign-in failed", { description: error.message }); }
      setLoadingAuth(false);
    }
  }, [setLoadingAuth]); // Dependency added

  const handleSignOut = useCallback(async () => {
    console.log("App: handleSignOut triggered"); // Debug Log
    try { await signOut(auth); toast.info("Signed out."); }
    catch (error) { console.error("Sign-out error:", error); toast.error("Sign-out failed"); }
  }, []);
  // --- End Auth Handlers ---

  // --- Core Logic Handlers (with Debugging Logs) ---
  const handleTakeMedication = useCallback(async (med) => {
    console.log("App: handleTakeMedication triggered for", med?.name); // Debug Log
    if (!user) { console.log("TakeMed: No user, aborting."); toast.error("Please sign in."); return; }
    const now = new Date(); const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    const logEntry = { medicationId: med.id, medicationName: med.name, takenAt: Timestamp.fromDate(now), nextDueAt: Timestamp.fromDate(nextDue) };
    const reminderEntry = {
      userId: user.uid, // Associate with the current user
      medicationName: med.name,
      dueAt: Timestamp.fromDate(nextDue), // When the reminder should be sent
    };
    try { 
      const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');     
      const remindersCollectionRef = collection(db, "scheduledReminders");

      await Promise.all([
        addDoc(logsCollectionRef, logEntry),
        addDoc(remindersCollectionRef, reminderEntry)
      ]);
      toast.info("Medication Taken", { description: `${med.name} logged.` }); 
    }
    catch (error) { 
      console.error("Error logging med and scheduling reminder:", error); 
      toast.error("Failed to log med", { description: error.message });
    }
  }, [user]);

  const handleSaveMedication = useCallback(async (medData, isEditing) => {
    console.log(`App: handleSaveMedication triggered (${isEditing ? 'Edit' : 'Add'}) for`, medData?.name); // Debug Log
    if (!user) { console.log("SaveMed: No user, aborting."); toast.error("Please sign in."); return; }
    const medDocRef = doc(db, 'users', user.uid, 'medications', medData.id);
    const dataToSave = { name: medData.name, interval: medData.interval };
    try { await setDoc(medDocRef, dataToSave); /* Toast handled in dialog */ }
    catch (error) { console.error("Error saving med:", error); toast.error(`Failed to ${isEditing ? 'update' : 'add'} med`, { description: error.message }); }
  }, [user]);

  const handleDeleteMedication = useCallback(async (medIdToDelete) => {
    console.log("App: handleDeleteMedication triggered for ID:", medIdToDelete); // Debug Log
    if (!user) { console.log("DeleteMed: No user, aborting."); toast.error("Please sign in."); return; }
    const medToDelete = medications.find(med => med.id === medIdToDelete); const medName = medToDelete ? medToDelete.name : 'Medication';
    const medDocRef = doc(db, 'users', user.uid, 'medications', medIdToDelete);
    try { await deleteDoc(medDocRef); toast.error("Medication Deleted", { description: `${medName} removed.` }); }
    catch (error) { console.error("Error deleting med:", error); toast.error("Failed to delete med", { description: error.message }); }
  }, [user, medications]);

  // --- UI Control Handlers (with Debugging Logs) ---
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
  // --- Log Action Handlers ---
  // --- Log Action Handlers (with Debugging Logs) ---

  const handleCopyLog = useCallback(() => {
    console.log("handleCopyLog triggered."); // Log: Start
    console.log("Current medLogs:", medLogs); // Log: Data Input

    if (!medLogs || medLogs.length === 0) {
        console.log("CopyLog: Log is empty or invalid.");
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

        console.log("CopyLog: Formatted log string length:", formattedLog.length); // Log: Formatted data
        // console.log("CopyLog: Formatted log content:\n", formattedLog); // Log: Uncomment to see full content

        if (!formattedLog) {
             console.error("CopyLog: Formatted log string is empty!");
             toast.error("Copy failed", { description: "Could not format log data."});
             return;
        }

        // Use Clipboard API
        navigator.clipboard.writeText(formattedLog)
            .then(() => {
                console.log("CopyLog: writeText successful."); // Log: Success
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
    console.log("handleExportCSV triggered."); // Log: Start
    console.log("Current medLogs:", medLogs); // Log: Data Input

    if (!medLogs || medLogs.length === 0) {
        console.log("ExportCSV: Log is empty or invalid.");
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
        console.log("ExportCSV: Generated CSV content length:", csvContent.length); // Log: Generated CSV
        // console.log("ExportCSV: CSV content:\n", csvContent); // Log: Uncomment to see full content

        if (!csvContent) {
            console.error("ExportCSV: Generated CSV content is empty!");
            toast.error("Export failed", { description: "Could not generate CSV data."});
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
            console.log("ExportCSV: Triggering download link click..."); // Log: Before click
            link.click();
            console.log("ExportCSV: Download link clicked."); // Log: After click
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
