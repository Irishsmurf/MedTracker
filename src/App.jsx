import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download, LayoutGrid, CalendarDays } from "lucide-react"; // Added icons for tabs
import { toast } from "sonner";

// Import UI Components
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster as SonnerToaster } from "sonner";
// Import Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import Custom Components
import MedicationGrid from './components/MedicationGrid';
import LogList from './components/LogList';
import AddEditMedicationDialog from './components/AddEditMedicationDialog';
import MedicationCalendarView from './components/MedicationCalendarView'; // Import the new component

// Import Helpers
import { formatTime } from '@/lib/utils';

// --- Constants ---
const LOGS_PER_PAGE = 25;
// --- End Constants ---

/**
 * Main application component for MedTracker.
 * Manages state and renders child components within Tabs.
 */
const App = () => {
  // --- State (remains largely the same) ---
  const [medications, setMedications] = useState(() => {
    try { const savedMeds = localStorage.getItem('medications'); return savedMeds ? JSON.parse(savedMeds) : [{ id: 'codeine-1', name: 'Codeine', interval: 6 }, { id: 'ibuprofen-2', name: 'Ibuprofen', interval: 8 }, { id: 'augmentin-3', name: 'Augmentin', interval: 8 }]; }
    catch (e) { console.error("Failed to parse medications", e); return []; }
  });
  const [medLogs, setMedLogs] = useState(() => {
    try { const savedLogs = localStorage.getItem('medLogs'); return savedLogs ? JSON.parse(savedLogs) : []; }
    catch (e) { console.error("Failed to parse medLogs", e); return []; }
  });
  const [nextDueTimes, setNextDueTimes] = useState(() => {
    try { const savedNextDueTimes = localStorage.getItem('nextDueTimes'); return savedNextDueTimes ? JSON.parse(savedNextDueTimes) : {}; }
    catch (e) { console.error("Failed to parse nextDueTimes", e); return {}; }
  });
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleLogCount, setVisibleLogCount] = useState(LOGS_PER_PAGE);
  // --- End State ---

  // --- Effects (remain the same) ---
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 10000); return () => clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem('medications', JSON.stringify(medications)); }, [medications]);
  useEffect(() => { localStorage.setItem('medLogs', JSON.stringify(medLogs)); }, [medLogs]);
  useEffect(() => { localStorage.setItem('nextDueTimes', JSON.stringify(nextDueTimes)); }, [nextDueTimes]);
  useEffect(() => { setVisibleLogCount(LOGS_PER_PAGE); }, [medLogs.length]);
  // --- End Effects ---

  // --- Handlers (remain the same) ---
  const handleTakeMedication = useCallback((med) => {
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    const logEntry = { id: Date.now(), medicationId: med.id, medicationName: med.name, takenAt: now.toISOString(), nextDueAt: nextDue.toISOString() };
    setMedLogs(prevLogs => [logEntry, ...prevLogs]);
    setNextDueTimes(prevTimes => ({ ...prevTimes, [med.id]: nextDue.toISOString() }));
    toast.info("Medication Taken", { description: `${med.name} logged at ${formatTime(now.toISOString())}. Next dose at ${formatTime(nextDue.toISOString())}.` });
  }, []);

  const handleSaveMedication = useCallback((medData, isEditing) => {
    if (isEditing) { setMedications(prevMeds => prevMeds.map(m => m.id === medData.id ? medData : m)); }
    else { setMedications(prevMeds => [...prevMeds, medData]); }
    setEditingMedication(null);
  }, []);

   const handleDeleteMedication = useCallback((medIdToDelete) => {
      const medToDelete = medications.find(med => med.id === medIdToDelete);
      const medName = medToDelete ? medToDelete.name : 'Medication';
      setMedications(prevMeds => prevMeds.filter(med => med.id !== medIdToDelete));
      setNextDueTimes(prevTimes => { const updatedTimes = { ...prevTimes }; delete updatedTimes[medIdToDelete]; return updatedTimes; });
      toast.error("Medication Deleted", { description: `${medName} has been removed.` });
   }, [medications]);

  const handleEditMedication = useCallback((med) => { setEditingMedication(med); setIsDialogOpen(true); }, []);
  const handleAddNewMedication = useCallback(() => { setEditingMedication(null); setIsDialogOpen(true); }, []);
  const handleDialogChange = useCallback((open) => { setIsDialogOpen(open); if (!open) { setEditingMedication(null); } }, []);
  const handleLoadMoreLogs = useCallback(() => { setVisibleLogCount(prevCount => prevCount + LOGS_PER_PAGE); }, []);
  const handleCopyLog = useCallback(() => {
    if (medLogs.length === 0) { toast.warning("Log is empty"); return; }
    const formattedLog = medLogs.map(log => `${log.medicationName} - Taken: ${formatTime(log.takenAt, true)} - Next Due: ${formatTime(log.nextDueAt, true)}`).join('\n');
    navigator.clipboard.writeText(formattedLog).then(() => toast.success("Log copied!"), () => toast.error("Copy failed"));
  }, [medLogs]);
  const handleExportCSV = useCallback(() => {
    if (medLogs.length === 0) { toast.warning("Log is empty"); return; }
    const header = ['Medication Name', 'Taken At (ISO)', 'Next Due At (ISO)'];
    const rows = medLogs.map(log => [`"${log.medicationName.replace(/"/g, '""')}"`, log.takenAt, log.nextDueAt]);
    const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `medication_log_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url); toast.success("Log exported!");
    } else { toast.error("Export failed"); }
  }, [medLogs]);
  // --- End Handlers ---

  // --- Render Logic ---
  return (
    <>
      <SonnerToaster position="top-center" richColors />

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen font-sans"> {/* Increased max-width for tabs */}

        {/* Header */}
        <header className="mb-6 text-center"> {/* Reduced margin slightly */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
            <Pill className="text-primary" /> MedTracker
          </h1>
          <p className="text-muted-foreground">Your personal medication schedule</p>
        </header>

        {/* --- Tabs for View Switching --- */}
        <Tabs defaultValue="dashboard" className="w-full">
          {/* Tab Triggers */}
          <TabsList className="grid w-full grid-cols-2 mb-6"> {/* Use grid for equal width */}
            <TabsTrigger value="dashboard">
                <LayoutGrid className="mr-2 h-4 w-4"/> Dashboard
            </TabsTrigger>
            <TabsTrigger value="calendar">
                <CalendarDays className="mr-2 h-4 w-4"/> Calendar View
            </TabsTrigger>
          </TabsList>

          {/* --- Dashboard Tab Content --- */}
          <TabsContent value="dashboard">
            {/* Medication Grid Section */}
            <section className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
                <div className="flex gap-2">
                  <Button variant={isManageMode ? "default" : "outline"} onClick={() => setIsManageMode(!isManageMode)}>
                    {isManageMode ? <Check size={16} className="mr-2" /> : <Edit size={16} className="mr-2" />}
                    {isManageMode ? 'Done Managing' : 'Manage'}
                  </Button>
                  {isManageMode && (
                    <Button variant="outline" onClick={handleAddNewMedication}>
                      <PlusCircle size={16} className="mr-2" /> Add New
                    </Button>
                  )}
                </div>
              </div>
              <MedicationGrid
                medications={medications}
                nextDueTimes={nextDueTimes}
                currentTime={currentTime}
                handleTakeMedication={handleTakeMedication}
                handleEditMedication={handleEditMedication}
                isManageMode={isManageMode}
                handleDeleteMedication={handleDeleteMedication}
                handleAddNewMedication={handleAddNewMedication}
              />
            </section>

            {/* Medication History Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">Medication History</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={medLogs.length === 0}><MoreHorizontal className="h-4 w-4 mr-2" /> Actions</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Log Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCopyLog}><ClipboardCopy className="mr-2 h-4 w-4" /><span>Copy Full Log</span></DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" /><span>Export as CSV</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <LogList
                medLogs={medLogs}
                visibleLogCount={visibleLogCount}
                handleLoadMoreLogs={handleLoadMoreLogs}
                logsPerPage={LOGS_PER_PAGE}
              />
            </section>
          </TabsContent>

          {/* --- Calendar Tab Content --- */}
          <TabsContent value="calendar">
             <MedicationCalendarView medLogs={medLogs} />
          </TabsContent>
        </Tabs>
        {/* --- End Tabs --- */}


        {/* Render the Add/Edit Dialog Component (available from both tabs) */}
        <AddEditMedicationDialog
          open={isDialogOpen}
          onOpenChange={handleDialogChange}
          medication={editingMedication}
          onSave={handleSaveMedication}
          medications={medications}
        />
      </div>
    </>
  );
};

export default App;
