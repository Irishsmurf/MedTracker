import React, { useState, useEffect, useCallback } from 'react';
import {
    Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download,
    LayoutGrid, CalendarDays
} from "lucide-react";
import { toast } from "sonner";

// Import Firebase Auth & Firestore functions and the configured instances
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import {
    collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, orderBy, Timestamp
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

  // Application Data State (Loaded from Firestore)
  // Initialize with empty defaults - REMOVED localStorage.getItem logic
  const [medications, setMedications] = useState([]);
  const [medLogs, setMedLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Derived State
  const [nextDueTimes, setNextDueTimes] = useState({});

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
         // Clear data on sign out
         setMedications([]);
         setMedLogs([]);
         setNextDueTimes({});
         setLoadingData(true); // Reset loading state
         setIsManageMode(false);
         setVisibleLogCount(LOGS_PER_PAGE);
      }
      // Firestore listeners are handled in the next effect based on 'user'
    });
    return () => unsubscribeAuth();
  }, []);

  // Listener for Firestore Data Changes
  useEffect(() => {
    if (!user) {
        setLoadingData(false); // No data to load if no user
        // Ensure state is clear if somehow populated before logout finished
        if (medications.length > 0) setMedications([]);
        if (medLogs.length > 0) setMedLogs([]);
        if (Object.keys(nextDueTimes).length > 0) setNextDueTimes({});
        return; // Stop if no user
    }

    setLoadingData(true);

    // Listener for Medications
    const medsCollectionRef = collection(db, 'users', user.uid, 'medications');
    const unsubscribeMeds = onSnapshot(medsCollectionRef, (querySnapshot) => {
      const userMedications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMedications(userMedications);
      setLoadingData(false); // Consider loading complete after first fetch
      console.log("Medications loaded/updated from Firestore");
    }, (error) => {
        console.error("Error fetching medications:", error);
        toast.error("Failed to load medications", { description: error.message });
        setLoadingData(false);
    });

    // Listener for Medication Logs
    const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs');
    const logsQuery = query(logsCollectionRef, orderBy("takenAt", "desc"));
    const unsubscribeLogs = onSnapshot(logsQuery, (querySnapshot) => {
      const userLogs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id, ...data,
            takenAt: data.takenAt?.toDate().toISOString(),
            nextDueAt: data.nextDueAt?.toDate().toISOString()
        };
      });
      setMedLogs(userLogs);
      setLoadingData(false); // Consider loading complete
      console.log("Logs loaded/updated from Firestore");
    }, (error) => {
        console.error("Error fetching logs:", error);
        toast.error("Failed to load medication history", { description: error.message });
        setLoadingData(false);
    });

    // Cleanup listeners
    return () => {
      unsubscribeMeds();
      unsubscribeLogs();
    };
  }, [user]); // Re-run when user changes

  // Effect to derive nextDueTimes from medLogs
  useEffect(() => {
    if (medLogs.length === 0) { setNextDueTimes({}); return; }
    const latestDueTimes = {};
    medLogs.forEach(log => {
      if (!latestDueTimes[log.medicationId] && log.nextDueAt) {
        latestDueTimes[log.medicationId] = log.nextDueAt;
      }
    });
    setNextDueTimes(latestDueTimes);
    console.log("Derived nextDueTimes");
  }, [medLogs]);

  // Update current time periodically
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Reset pagination when logs change
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length]);

  // *** REMOVED useEffect hooks for localStorage.setItem ***

  // --- End Effects ---

  // --- Authentication Handlers (no change needed) ---
  const handleSignIn = useCallback(async () => {
      const provider = new GoogleAuthProvider();
      try { setLoadingAuth(true); await signInWithPopup(auth, provider); toast.success("Signed in successfully!"); }
      catch (error) { console.error("Sign-in error:", error); toast.error("Sign-in failed", { description: error.message }); setLoadingAuth(false); }
  }, []);
  const handleSignOut = useCallback(async () => {
      try { await signOut(auth); toast.info("Signed out."); }
      catch (error) { console.error("Sign-out error:", error); toast.error("Sign-out failed", { description: error.message }); }
  }, []);
  // --- End Authentication Handlers ---

  // --- Core Logic Handlers (Write to Firestore - no change needed from previous step) ---
  const handleTakeMedication = useCallback(async (med) => {
      if (!user) { toast.error("Please sign in."); return; }
      const now = new Date(); const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
      const logEntry = { medicationId: med.id, medicationName: med.name, takenAt: Timestamp.fromDate(now), nextDueAt: Timestamp.fromDate(nextDue) };
      try { const logsCollectionRef = collection(db, 'users', user.uid, 'medLogs'); await addDoc(logsCollectionRef, logEntry); toast.info("Medication Taken", { description: `${med.name} logged.` }); }
      catch (error) { console.error("Error logging med:", error); toast.error("Failed to log med", { description: error.message }); }
  }, [user]);

  const handleSaveMedication = useCallback(async (medData, isEditing) => {
      if (!user) { toast.error("Please sign in."); return; }
      const medDocRef = doc(db, 'users', user.uid, 'medications', medData.id);
      const dataToSave = { name: medData.name, interval: medData.interval };
      try { await setDoc(medDocRef, dataToSave); /* Toast handled in dialog */ }
      catch (error) { console.error("Error saving med:", error); toast.error(`Failed to ${isEditing ? 'update' : 'add'} med`, { description: error.message }); }
  }, [user]);

  const handleDeleteMedication = useCallback(async (medIdToDelete) => {
      if (!user) { toast.error("Please sign in."); return; }
      const medToDelete = medications.find(med => med.id === medIdToDelete); const medName = medToDelete ? medToDelete.name : 'Medication';
      const medDocRef = doc(db, 'users', user.uid, 'medications', medIdToDelete);
      try { await deleteDoc(medDocRef); toast.error("Medication Deleted", { description: `${medName} removed.` }); }
      catch (error) { console.error("Error deleting med:", error); toast.error("Failed to delete med", { description: error.message }); }
  }, [user, medications]);

  // --- UI Control Handlers (no change needed) ---
  const handleEditMedication = useCallback((med) => { setEditingMedication(med); setIsDialogOpen(true); }, []);
  const handleAddNewMedication = useCallback(() => { setEditingMedication(null); setIsDialogOpen(true); }, []);
  const handleDialogChange = useCallback((open) => { setIsDialogOpen(open); if (!open) { setEditingMedication(null); } }, []);
  const handleLoadMoreLogs = useCallback(() => { setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE); }, []);

  // --- Log Action Handlers (no change needed) ---
  const handleCopyLog = useCallback(() => { /* ... */ }, [medLogs]);
  const handleExportCSV = useCallback(() => { /* ... */ }, [medLogs]);
  // --- End Handlers ---

  // --- Render Logic ---
  if (loadingAuth || (user && loadingData && medLogs.length === 0 && medications.length === 0)) { // Refined loading condition
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
          <div className="flex-1"></div>
          <div className="text-center">
             <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2"><Pill className="text-primary" /> MedTracker</h1>
             <p className="text-muted-foreground text-sm">{user ? `Tracking for ${user.displayName || 'User'}` : 'Your personal medication schedule'}</p>
          </div>
          <div className="flex-1 flex justify-end">
             {user && (<Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>)}
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
            <TabsContent value="calendar">
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
               onSave={handleSaveMedication}
               medications={medications}
             />
        )}
      </div>
    </>
  );
};

export default App;
