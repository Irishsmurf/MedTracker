import React from 'react';
import { PlusCircle } from "lucide-react";
import MedicationCard from './MedicationCard'; // Import the card component
import { Card } from "@/components/ui/card"; // For the placeholder card
import { Button } from "@/components/ui/button"; // For the placeholder button

/**
 * Component to render the grid of medication cards.
 * @param {object} props
 * @param {Array} props.medications - Array of medication objects.
 * @param {object} props.nextDueTimes - Object mapping med ID to next due ISO string.
 * @param {Date} props.currentTime - The current time object.
 * @param {Function} props.handleTakeMedication - Callback for taking medication.
 * @param {Function} props.handleEditMedication - Callback for editing medication.
 * @param {boolean} props.isManageMode - Flag indicating if manage mode is active.
 * @param {Function} props.handleDeleteMedication - Callback for deleting medication.
 * @param {Function} props.handleAddNewMedication - Callback to open the add medication dialog.
 */
const MedicationGrid = ({
  medications,
  nextDueTimes,
  currentTime,
  handleTakeMedication,
  handleEditMedication,
  isManageMode,
  handleDeleteMedication,
  handleAddNewMedication
}) => {
  return (
    <>
      {/* Display message or placeholder if no medications exist */}
      {medications.length === 0 && !isManageMode ? ( // Only show if not managing and empty
         <Card className="text-center py-8 border-dashed col-span-1 sm:col-span-2 lg:col-span-3"> {/* Span full width */}
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
         // Render the grid with medication cards
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
           {/* Placeholder card to add medication when not in manage mode (optional) */}
           {/* You might remove this if the "Add New" button in the header is sufficient */}
           {!isManageMode && medications.length < 6 && ( // Example condition: show if less than 6 meds
              <Card className="border-dashed border-2 hover:border-primary transition-colors flex flex-col items-center justify-center min-h-[200px] aspect-square sm:aspect-auto">
                 <Button variant="ghost" className="text-muted-foreground hover:text-primary h-auto flex-col p-4" onClick={handleAddNewMedication}>
                     <PlusCircle size={32} className="mb-2"/>
                     Add Medication
                 </Button>
              </Card>
           )}
         </div>
      )}
    </>
  );
};

export default MedicationGrid;
