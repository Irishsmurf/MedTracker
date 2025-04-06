import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, X, Edit, Check, Clock, Trash2, Pill } from "lucide-react";
import { cn } from "@/lib/utils"; // [cite: 17]

// --- Shadcn/ui Components ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// --- Sonner Toast Components ---
import { Toaster as SonnerToaster, toast } from "sonner";
// --- End Sonner Toast Components ---

// --- Helper Functions ---
const formatTime = (dateString) => {
  if (!dateString) return '--:--';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const calculateTimeInfo = (dueTimeString, intervalHours, currentTime) => {
  if (!dueTimeString) return { hours: 0, minutes: 0, isOverdue: false, progress: 0, takenAt: null };

  const dueTime = new Date(dueTimeString);
  const intervalMillis = intervalHours * 60 * 60 * 1000;
  const takenTime = new Date(dueTime.getTime() - intervalMillis);
  const totalDuration = intervalMillis;
  const elapsed = currentTime.getTime() - takenTime.getTime();
  const diff = dueTime.getTime() - currentTime.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, isOverdue: true, progress: 100, takenAt: takenTime };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  return { hours, minutes, isOverdue: false, progress, takenAt: takenTime };
};
// --- End Helper Functions ---

// --- Child Components ---

// Medication Card Component (No changes here)
const MedicationCard = React.memo(({ med, nextDueTimes, currentTime, onTake, onEdit, isManageMode, onDelete }) => {
  const timeInfo = calculateTimeInfo(nextDueTimes[med.id], med.interval, currentTime);

  const getProgressColorClass = () => {
    if (timeInfo.isOverdue) return "stroke-destructive";
    if (!nextDueTimes[med.id]) return "stroke-muted";
    if (timeInfo.progress < 30) return "stroke-[--chart-2]";
    if (timeInfo.progress < 70) return "stroke-[--chart-5]";
    return "stroke-[--chart-1]";
  };

  const progressColorClass = getProgressColorClass();

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md flex flex-col h-full">
      {/* Circular Progress SVG */}
      <svg className="absolute top-0 left-0 w-full h-full -rotate-90 opacity-20 pointer-events-none" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-border" strokeWidth="6" />
        {nextDueTimes[med.id] && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            className={cn(progressColorClass, "transition-all duration-500 ease-linear")}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * timeInfo.progress / 100)}
          />
        )}
      </svg>

      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{med.name}</span>
          {isManageMode && (
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(med)}>
                <Edit size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(med.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>Every {med.interval} hours</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 flex-grow flex flex-col items-center justify-center text-center pb-4">
        {timeInfo.isOverdue ? (
          <span className="text-destructive font-bold text-lg animate-pulse">TAKE NOW</span>
        ) : nextDueTimes[med.id] ? (
          <div className="text-center">
            <div className="text-2xl font-semibold tabular-nums">
              {timeInfo.hours}h {timeInfo.minutes}m
            </div>
            <div className="text-xs text-muted-foreground">
              until next dose at {formatTime(nextDueTimes[med.id])}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground italic">Ready to take first dose</span>
        )}
      </CardContent>
      <CardFooter className="relative z-10 pt-0">
        <Button
          onClick={() => onTake(med)}
          className="w-full"
          variant={timeInfo.isOverdue ? "destructive" : "default"}
          disabled={isManageMode}
        >
          <Check size={16} className="mr-2" />
          Take {med.name}
        </Button>
      </CardFooter>
    </Card>
  );
});

// Add/Edit Medication Dialog Component (No changes here)
const AddEditMedicationDialog = ({ open, onOpenChange, medication, onSave, medications }) => {
  const [name, setName] = useState('');
  const [interval, setIntervalValue] = useState(8);
  const [error, setError] = useState('');
  const isEditing = medication !== null;

  useEffect(() => {
    if (medication) {
      setName(medication.name);
      setIntervalValue(medication.interval);
      setError('');
    } else {
      setName('');
      setIntervalValue(8);
      setError('');
    }
  }, [medication, open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Medication name cannot be empty.');
      return;
    }
    if (!interval || interval < 1 || interval > 72) {
        setError('Interval must be between 1 and 72 hours.');
        return;
    }

    const existingMed = medications.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingMed && (!isEditing || existingMed.id !== medication.id)) {
        setError('A medication with this name already exists.');
        return;
    }

    const medData = {
      id: isEditing ? medication.id : trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: trimmedName,
      interval: parseInt(interval, 10),
    };

    onSave(medData, isEditing);
    toast.success(`Medication ${isEditing ? 'updated' : 'added'}`, {
        description: `${medData.name} (every ${medData.interval} hours) has been saved.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Update the details for ${medication?.name}.` : 'Enter the details for the new medication.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Input fields remain the same */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              className="col-span-3"
              placeholder="e.g., Ibuprofen"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="interval" className="text-right">
              Interval (hrs)
            </Label>
            <Input
              id="interval"
              type="number"
              value={interval}
              onChange={(e) => { setIntervalValue(parseInt(e.target.value) || 1); setError(''); }}
              className="col-span-3"
              min="1"
              max="72"
            />
          </div>
          {error && <p className="col-span-4 text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Main App Component ---
const MedicationTracker = () => {

  // --- State Initialization (remains the same) ---
  const [medications, setMedications] = useState(() => {
    try {
      const savedMeds = localStorage.getItem('medications');
      return savedMeds ? JSON.parse(savedMeds) : [
        { id: 'codeine-1', name: 'Codeine', interval: 6 },
        { id: 'ibuprofen-2', name: 'Ibuprofen', interval: 8 },
        { id: 'augmentin-3', name: 'Augmentin', interval: 8 },
      ];
    } catch (e) { console.error("Failed to parse medications", e); return []; }
  });

  const [medLogs, setMedLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('medLogs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (e) { console.error("Failed to parse medLogs", e); return []; }
  });

  const [nextDueTimes, setNextDueTimes] = useState(() => {
    try {
      const savedNextDueTimes = localStorage.getItem('nextDueTimes');
      return savedNextDueTimes ? JSON.parse(savedNextDueTimes) : {};
    } catch (e) { console.error("Failed to parse nextDueTimes", e); return {}; }
  });

  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  // --- End State Initialization ---

  // --- Effects (remain the same) ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { localStorage.setItem('medications', JSON.stringify(medications)); }, [medications]);
  useEffect(() => { localStorage.setItem('medLogs', JSON.stringify(medLogs)); }, [medLogs]);
  useEffect(() => { localStorage.setItem('nextDueTimes', JSON.stringify(nextDueTimes)); }, [nextDueTimes]);
  // --- End Effects ---

  // --- Event Handlers (remain the same) ---
  const handleTakeMedication = useCallback((med) => {
    const now = new Date();
    const nextDue = new Date(now.getTime() + med.interval * 60 * 60 * 1000);
    const logEntry = { id: Date.now(), medicationId: med.id, medicationName: med.name, takenAt: now.toISOString(), nextDueAt: nextDue.toISOString() };
    setMedLogs(prevLogs => [logEntry, ...prevLogs]);
    setNextDueTimes(prevTimes => ({ ...prevTimes, [med.id]: nextDue.toISOString() }));
    toast.info("Medication Taken", { description: `${med.name} logged at ${formatTime(now.toISOString())}. Next dose at ${formatTime(nextDue.toISOString())}.` });
  }, []);

  const handleSaveMedication = useCallback((medData, isEditing) => {
    if (isEditing) {
      setMedications(prevMeds => prevMeds.map(m => m.id === medData.id ? medData : m));
    } else {
      setMedications(prevMeds => [...prevMeds, medData]);
    }
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
  // --- End Event Handlers ---


  // --- Render Logic ---
  const lastThreeLogs = medLogs.slice(0, 3);

  return (
    <>
      {/* SonnerToaster component */}
      <SonnerToaster position="top-center" richColors /> 
      
      <div className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8 bg-background min-h-screen font-sans">
        
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
             <Pill className="text-primary" /> MedTracker
          </h1>
          <p className="text-muted-foreground">Your personal medication schedule</p>
        </header>

        {/* Medication Grid Section (No changes here) */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
            <div className="flex gap-2">
               <Button variant={isManageMode ? "default" : "outline"} onClick={() => setIsManageMode(!isManageMode)}>
                 {isManageMode ? <Check size={16} className="mr-2"/> : <Edit size={16} className="mr-2" />}
                 {isManageMode ? 'Done Managing' : 'Manage'}
               </Button>
              {isManageMode && (
                 <Button variant="outline" onClick={handleAddNewMedication}>
                   <PlusCircle size={16} className="mr-2" /> Add New
                 </Button>
              )}
            </div>
          </div>

          {medications.length === 0 ? (
             <Card className="text-center py-8">
                 <CardHeader>
                     <CardTitle className="text-muted-foreground">No Medications Added</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <Button onClick={handleAddNewMedication}>
                         <PlusCircle size={16} className="mr-2" /> Add Your First Medication
                     </Button>
                 </CardContent>
             </Card>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {medications.map((med) => (
                 <MedicationCard
                   key={med.id}
                   med={med}
                   nextDueTimes={nextDueTimes}
                   currentTime={currentTime}
                   onTake={handleTakeMedication}
                   onEdit={handleEditMedication}
                   isManageMode={isManageMode}
                   onDelete={handleDeleteMedication}
                 />
               ))}
               {!isManageMode && medications.length < 6 && (
                  <Card className="border-dashed border-2 hover:border-primary transition-colors flex flex-col items-center justify-center min-h-[200px]">
                     <Button variant="ghost" className="text-muted-foreground hover:text-primary h-auto flex-col p-4" onClick={handleAddNewMedication}>
                         <PlusCircle size={32} className="mb-2"/>
                         Add Medication
                     </Button>
                  </Card>
               )}
             </div>
          )}
        </section>

        {/* --- Recent Doses Log Section (MODIFIED) --- */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Doses</h2>
          {medLogs.length === 0 ? (
            <Card className="text-center py-6 border-dashed">
                <CardContent className="flex flex-col items-center justify-center">
                    <Clock size={32} className="text-muted-foreground mb-3"/>
                    <p className="text-muted-foreground italic">No doses logged yet.</p>
                </CardContent>
            </Card>
          ) : (
            // Use a standard Card component to wrap the list
            <Card> 
                <CardContent className="p-0"> {/* Remove padding from CardContent */}
                    <div className="space-y-0"> {/* Remove vertical space between items */}
                        {lastThreeLogs.map((log, index) => (
                            <div 
                                key={log.id} 
                                // Add border between items, except for the last one
                                className={cn(
                                    "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                                    index < lastThreeLogs.length - 1 && "border-b" 
                                )}
                            >
                                {/* Pill Icon */}
                                <div className={cn(
                                    "p-2 rounded-full",
                                    log.medicationId.includes('codeine') ? 'bg-red-100 dark:bg-red-900/50' : 
                                    log.medicationId.includes('ibuprofen') ? 'bg-blue-100 dark:bg-blue-900/50' : 
                                    'bg-green-100 dark:bg-green-900/50'
                                )}>
                                    <Pill size={16} className={cn(
                                        log.medicationId.includes('codeine') ? 'text-red-600 dark:text-red-400' : 
                                        log.medicationId.includes('ibuprofen') ? 'text-blue-600 dark:text-blue-400' : 
                                        'text-green-600 dark:text-green-400'
                                    )} />
                                </div>
                                
                                {/* Medication Name and Taken Time */}
                                <div className="flex-grow"> {/* Allow this div to grow */}
                                    <p className="font-semibold text-foreground">{log.medicationName}</p>
                                    <p className="text-sm text-muted-foreground">
                                    Taken: {formatTime(log.takenAt)}
                                    </p>
                                </div>

                                {/* Next Dose Time (Pushed to the right) */}
                                <div className="ml-auto text-right flex-shrink-0 pl-4"> {/* Use ml-auto, ensure it doesn't shrink, add padding */}
                                    <p className="text-base font-medium text-foreground tabular-nums">{formatTime(log.nextDueAt)}</p>
                                    <p className="text-xs text-muted-foreground">Next Dose</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                {/* Show more entries indicator if applicable */}
                {medLogs.length > 3 && (
                    <CardFooter className="pt-3 pb-3 justify-center">
                         <p className="text-center text-sm text-muted-foreground">
                             ... and {medLogs.length - 3} older entries
                         </p>
                    </CardFooter>
                )}
            </Card>
          )}
        </section>
        {/* --- End Recent Doses Log Section --- */}


        {/* Add/Edit Dialog */}
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

export default MedicationTracker;
