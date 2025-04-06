import React, { useState, useEffect, useCallback } from 'react';
import {
    Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download,
    LayoutGrid, CalendarDays
} from "lucide-react";
import { toast } from "sonner";

// Import Firebase Auth & Firestore functions and the configured instances
import { auth, db } from './firebaseConfig'; // Assuming db is exported from firebaseConfig.js
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import {
    collection, // Reference a collection
    doc,        // Reference a document
    onSnapshot, // Listen for real-time updates
    addDoc,     // Add a new document (auto-ID)
    setDoc,     // Create or overwrite a document (specific ID)
    deleteDoc,  // Delete a document
    query,      // Create a query
    orderBy,    // Order query results
    Timestamp   // Firestore Timestamp type
    // serverTimestamp // Useful for created/updated fields (optional)
} from "firebase/firestore";

// Import UI Components
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster as SonnerToaster } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import Custom Components
import MedicationGrid from './components/MedicationGrid';
import LogList from './components/LogList';
import AddEditMedicationDialog from './components/AddEditMedicationDialog';
import MedicationCalendarView from './components/MedicationCalendarView';

// Import Helpers
import { formatTime } from '@/lib/utils';

// --- Constants ---
const LOGS_PER_PAGE = 25;
// --- End Constants ---

/**
 * Main application component for MedTracker.
 * Manages state via Firestore and renders child components.
 */
const App = () => {
  // --- State Initialization ---
  // Authentication State
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Application Data State (Now loaded from Firestore)
  const [medications, setMedications] = useState([]); // Initialize as empty arrays
  const [medLogs, setMedLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true); // State to track Firestore loading

  // Derived State
  const [nextDueTimes, setNextDueTimes] = useState({}); // Derived from medLogs

  // UI State
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleLogCount, setVisibleLogCount] = useState(LOGS_PER_PAGE);
  // --- End State Initialization ---

  // --- Effects ---
  // Listener for Firebase Authentication state changes
  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      console.log("Auth State Changed:", currentUser ? `User ID: ${currentUser.uid}` : "No user");
      if (!currentUser) {
         // Clear local data on sign out
         setMedications([]);
         setMedLogs([]);
         setNextDueTimes({});
         setLoadingData(true); // Reset loading state for next login
         setIsManageMode(false);
         setVisibleLogCount(LOGS_PER_PAGE);
      }
    });
    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  // Listener for Firestore Data Changes (Medications and Logs)
  useEffect(() => {
    // Don't run if user is not logged in
    if (!user) {
        setLoadingData(false); // Not loading if no user
        return;
    }

    setLoadingData(true); // Start loading data for the logged-in user

    // --- Listener for Medications ---
    // Reference to the user's 'medications' subcollection
    const medsCollectionRef = collection(db, 'users', user.uid, 'medications');
    const unsubscribeMeds = onSnapshot(medsCollectionRef, (querySnapshot) => {
      const userMedications = [];
      querySnapshot.forEach((doc) => {
        // Combine document ID and data
        userMedications.push({ id: doc.id, ...doc.data() });
      });
      setMedications(userMedications); // Update state with medications from Firestore
      setLoadingData(false); // Assume loading finished after first data fetch
      console.log("Medications loaded/updated from Firestore");
    }, (error) => {
        console.error("Error fetching medications:", error);
        toast.error("Failed to load medications", { description: error.message });
        setLoadingData(false);
    });

    // --- Listener for Medication Logs ---
    // Reference and query for the user's 'medLogs', ordered by takenAt descending
    const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
    const logsQuery = query(logsCollectionRef, orderBy("takenAt", "desc")); // Order newest first
    const unsubscribeLogs = onSnapshot(logsQuery, (querySnapshot) => {
      const userLogs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamps back to ISO strings for consistency
        // with existing components (or update components to handle Dates/Timestamps)
        userLogs.push({
            id: doc.id,
            ...data,
            takenAt: data.takenAt?.toDate().toISOString(), // Use optional chaining and convert
            nextDueAt: data.nextDueAt?.toDate().toISOString()
        });
      });
      setMedLogs(userLogs); // Update state with logs from Firestore
      setLoadingData(false); // Assume loading finished
      console.log("Logs loaded/updated from Firestore");
    }, (error) => {
        console.error("Error fetching logs:", error);
        toast.error("Failed to load medication history", { description: error.message });
        setLoadingData(false);
    });

    // Cleanup listeners on component unmount or when user changes
    return () => {
      unsubscribeMeds();
      unsubscribeLogs();
    };
  }, [user]); // Re-run this effect when the user changes

  // Effect to derive nextDueTimes whenever medLogs change
  useEffect(() => {
    if (medLogs.length === 0) {
      setNextDueTimes({});
      return;
    }

    const latestDueTimes = {};
    // Since logs are ordered descending by takenAt, the first entry for each med ID is the latest
    medLogs.forEach(log => {
      if (!latestDueTimes[log.medicationId] && log.nextDueAt) {
        latestDueTimes[log.medicationId] = log.nextDueAt; // Store ISO string
      }
    });
    setNextDueTimes(latestDueTimes);
    console.log("Derived nextDueTimes");

  }, [medLogs]); // Re-run when logs update

  // Update current time periodically (no change)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Reset pagination when logs change (no change)
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length]);

  // *** REMOVED useEffect hooks for localStorage ***

  // --- End Effects ---

  // --- Authentication Handlers (no change) ---
  const handleSignIn = useCallback(async () => { /* ... */ }, []);
  const handleSignOut = useCallback(async () => { /* ... */ }, []);
  // --- End Authentication Handlers ---


  // --- Core Logic Handlers (MODIFIED for Firestore) ---

  // Handle taking a medication - Write to Firestore
  const handleTakeMedication = useCallback(async (med) => {
    if (!user) { toast.error("Please sign in to track medications."); return; }

    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);

    // Prepare log entry with Firestore Timestamps
    const logEntry = {
      medicationId: med.id,
      medicationName: med.name, // Store name for easier log display
      takenAt: Timestamp.fromDate(now), // Use Firestore Timestamp
      nextDueAt: Timestamp.fromDate(nextDue) // Use Firestore Timestamp
    };

    try {
      // Reference to the user's 'medLogs' subcollection
      const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
      // Add the new log document (Firestore auto-generates ID)
      await addDoc(logsCollectionRef, logEntry);
      toast.info("Medication Taken", { description: `${med.name} logged successfully.` });
      // State update (medLogs, nextDueTimes) will happen via the onSnapshot listener
    } catch (error) {
      console.error("Error logging medication:", error);
      toast.error("Failed to log medication", { description: error.message });
    }
  }, [user]); // Depends on user

  // Handle saving (add/edit) a medication - Write to Firestore
  const handleSaveMedication = useCallback(async (medData, isEditing) => {
    if (!user) { toast.error("Please sign in to manage medications."); return; }

    // Reference to the specific medication document using its ID
    // NOTE: We decided in Step 4 to use medData.id as the document ID
    const medDocRef = doc(db, 'users', user.uid, 'medications', medData.id);

    // Data to save (excluding the ID, which is the document key)
    const dataToSave = {
        name: medData.name,
        interval: medData.interval
    };

    try {
      // Use setDoc to create (if new) or overwrite (if editing) the document
      // Using merge: true option with setDoc could also work for updates
      await setDoc(medDocRef, dataToSave);
      // Toast is handled within the Dialog component upon successful save trigger
      // State update (medications) will happen via the onSnapshot listener
    } catch (error) {
      console.error("Error saving medication:", error);
      // Show error toast here as the dialog might close before its own toast shows
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} medication`, { description: error.message });
      // Re-throw or handle so the dialog knows saving failed? For now, just toast.
    }
    // No need to call setEditingMedication(null) here, dialog handles closing
  }, [user]); // Depends on user

  // Handle deleting a medication - Delete from Firestore
  const handleDeleteMedication = useCallback(async (medIdToDelete) => {
    if (!user) { toast.error("Please sign in to manage medications."); return; }

    // Find name for toast before potential state update
    const medToDelete = medications.find(med => med.id === medIdToDelete);
    const medName = medToDelete ? medToDelete.name : 'Medication';

    // Reference to the medication document
    const medDocRef = doc(db, 'users', user.uid, 'medications', medIdToDelete);

    try {
      // Delete the document from Firestore
      await deleteDoc(medDocRef);
      toast.error("Medication Deleted", { description: `${medName} has been removed.` });
      // State update (medications) will happen via the onSnapshot listener
      // Note: Associated logs are NOT deleted automatically. Handle if needed.
    } catch (error) {
        console.error("Error deleting medication:", error);
        toast.error("Failed to delete medication", { description: error.message });
    }
  }, [user, medications]); // Depends on user and medications (to get name)

  // --- UI Control Handlers (no change) ---
  const handleEditMedication = useCallback((med) => { setEditingMedication(med); setIsDialogOpen(true); }, []);
  const handleAddNewMedication = useCallback(() => { setEditingMedication(null); setIsDialogOpen(true); }, []);
  const handleDialogChange = useCallback((open) => { setIsDialogOpen(open); if (!open) { setEditingMedication(null); } }, []);
  const handleLoadMoreLogs = useCallback(() => { setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE); }, []);

  // --- Log Action Handlers (Operate on local state derived from Firestore) ---
  const handleCopyLog = useCallback(() => { /* ... no change needed ... */ }, [medLogs]);
  const handleExportCSV = useCallback(() => { /* ... no change needed ... */ }, [medLogs]);
  // --- End Handlers ---

  // --- Render Logic ---

  // Display loading indicator while checking authentication OR loading initial data
  if (loadingAuth || (user && loadingData)) {
    return (
      <div className="flex justify-center items-center min-h-screen text-muted-foreground">
        {loadingAuth ? "Authenticating..." : "Loading Medication Data..."}
      </div>
    );
  }

  return (
    <>
      <SonnerToaster position="top-center" richColors />

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen font-sans">

        {/* Header */}
        <header className="mb-6 pb-4 border-b flex justify-between items-center gap-4">
          {/* ... header content ... */}
           <div className="flex-1"></div>
           <div className="text-center">
             <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
               <Pill className="text-primary" /> MedTracker
             </h1>
             <p className="text-muted-foreground text-sm">
                 {user ? `Tracking for ${user.displayName || 'User'}` : 'Your personal medication schedule'}
             </p>
           </div>
           <div className="flex-1 flex justify-end">
             {user && (<Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>)}
           </div>
        </header>

        {/* Conditional Content: Sign-In or Main App */}
        {!user ? (
          // Sign-In Prompt
          <div className="text-center py-10">
             <h2 className="text-xl font-semibold mb-4">Welcome to MedTracker</h2>
             <p className="text-muted-foreground mb-6">Sign in with Google to save and sync your medication schedule.</p>
             <Button onClick={handleSignIn} size="lg">Sign In with Google</Button>
          </div>
        ) : (
          // Main Application UI (Tabs)
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dashboard"><LayoutGrid className="mr-2 h-4 w-4"/> Dashboard</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/> Calendar View</TabsTrigger>
            </TabsList>

            {/* Dashboard Content */}
            <TabsContent value="dashboard">
              <section className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
                  <div className="flex gap-2">
                    <Button variant={isManageMode ? "default" : "outline"} onClick={() => setIsManageMode(!isManageMode)}>
                      {isManageMode ? <Check size={16} className="mr-2"/> : <Edit size={16} className="mr-2" />}
                      {isManageMode ? 'Done Managing' : 'Manage'}
                    </Button>
                    {isManageMode && (<Button variant="outline" onClick={handleAddNewMedication}><PlusCircle size={16} className="mr-2" /> Add New</Button>)}
                  </div>
                </div>
                {/* Pass Firestore-synced state and handlers */}
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
                 {/* Pass Firestore-synced state and handlers */}
                <LogList
                  medLogs={medLogs} visibleLogCount={visibleLogCount}
                  handleLoadMoreLogs={handleLoadMoreLogs} logsPerPage={LOGS_PER_PAGE}
                />
              </section>
            </TabsContent>

            {/* Calendar Content */}
            <TabsContent value="calendar">
               {/* Pass Firestore-synced state */}
               <MedicationCalendarView medLogs={medLogs} />
            </TabsContent>
          </Tabs>
        )}

        {/* Add/Edit Dialog (Conditionally rendered) */}
        {user && (
             <AddEditMedicationDialog
               open={isDialogOpen}
               onOpenChange={handleDialogChange}
               medication={editingMedication}
               onSave={handleSaveMedication} // Uses Firestore write
               medications={medications} // Pass current meds for validation
             />
        )}
      </div>
    </>
  );
};

export default App;
