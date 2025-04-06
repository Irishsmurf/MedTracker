import React from 'react';
import { PlusCircle } from "lucide-react";
import MedicationCard from './MedicationCard'; // Import the card component
// Import Card and its necessary sub-components (for empty state)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // For the empty state button

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

  // Debugging Log (can be removed later)
  // console.log(`Rendering MedicationGrid, Manage Mode: ${isManageMode}, handleAddNew prop exists: ${!!handleAddNewMedication}`);

  return (
    <>
      {/* Display message or placeholder if no medications exist */}
      {medications.length === 0 ? ( // Show empty state if no medications exist (regardless of manage mode)
         <Card className="text-center py-8 border-dashed col-span-1 sm:col-span-2 lg:col-span-3">
             <CardHeader>
                 <CardTitle className="text-muted-foreground">No Medications Added</CardTitle>
             </CardHeader>
             <CardContent>
                 <Button
                   // Debugging Log (can be removed later)
                   onClick={() => { console.log("Add First Medication button clicked"); handleAddNewMedication(); }}
                 >
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
               // Pass down handlers from App.jsx
               onTake={handleTakeMedication}
               onEdit={handleEditMedication}
               isManageMode={isManageMode}
               onDelete={handleDeleteMedication}
             />
           ))}
           {}
         </div>
      )}
    </>
  );
};

export default MedicationGrid;
