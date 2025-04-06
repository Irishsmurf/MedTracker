import React from 'react';
import { PlusCircle } from "lucide-react";
import MedicationCard from './MedicationCard'; // Import the card component
// Import Card and its necessary sub-components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // For the placeholder button

/**
 * Component to render the grid of medication cards.
 */
const MedicationGrid = ({
  medications,
  nextDueTimes,
  currentTime,
  handleTakeMedication,
  handleEditMedication,
  isManageMode,
  handleDeleteMedication,
  handleAddNewMedication // This is the handler for the placeholder card too
}) => {

  // --- Debugging Log ---
  // console.log(`Rendering MedicationGrid, Manage Mode: ${isManageMode}, handleAddNew prop exists: ${!!handleAddNewMedication}`);

  return (
    <>
      {/* Display message or placeholder if no medications exist */}
      {medications.length === 0 && !isManageMode ? (
         <Card className="text-center py-8 border-dashed col-span-1 sm:col-span-2 lg:col-span-3">
             <CardHeader>
                 <CardTitle className="text-muted-foreground">No Medications Added</CardTitle>
             </CardHeader>
             <CardContent>
                 <Button
                   // --- Debugging Log ---
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
           {/* Placeholder card to add medication when not in manage mode (optional) */}
           {!isManageMode && medications.length < 6 && (
              <Card className="border-dashed border-2 hover:border-primary transition-colors flex flex-col items-center justify-center min-h-[200px] aspect-square sm:aspect-auto">
                 <Button
                   variant="ghost" className="text-muted-foreground hover:text-primary h-auto flex-col p-4"
                   // --- Debugging Log ---
                   onClick={() => { console.log("Add Medication placeholder clicked"); handleAddNewMedication(); }}
                 >
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
