import React, { useState, useEffect } from 'react';
import { toast } from "sonner"; // Use Sonner toast
import { Button } from "@/components/ui/button";
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

/**
 * Dialog component for adding or editing a medication.
 * @param {object} props
 * @param {boolean} props.open - Controls if the dialog is open.
 * @param {Function} props.onOpenChange - Callback when dialog open state changes.
 * @param {object | null} props.medication - The medication object to edit, or null to add.
 * @param {Function} props.onSave - Callback function to save medication data.
 * @param {Array} props.medications - The current list of all medications (for duplicate check).
 */
const AddEditMedicationDialog = ({ open, onOpenChange, medication, onSave, medications }) => {
  const [name, setName] = useState('');
  const [interval, setIntervalValue] = useState(8);
  const [error, setError] = useState('');
  const isEditing = medication !== null;

  // Effect to populate form when editing or reset when adding
  useEffect(() => {
    if (open) { // Only update form when dialog opens
        if (medication) {
            // Editing: Populate with existing data
            setName(medication.name);
            setIntervalValue(medication.interval);
            setError(''); // Clear previous errors
        } else {
            // Adding: Reset to defaults
            setName('');
            setIntervalValue(8);
            setError(''); // Clear previous errors
        }
    }
  }, [medication, open]); // Depend on medication object and open state

  // Handler for the save button click
  const handleSave = () => {
    const trimmedName = name.trim();
    // Validation
    if (!trimmedName) {
      setError('Medication name cannot be empty.');
      return;
    }
    if (!interval || interval < 1 || interval > 72) { // Example range, adjust if needed
      setError('Interval must be between 1 and 72 hours.');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const existingMed = medications.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingMed && (!isEditing || existingMed.id !== medication.id)) {
      setError('A medication with this name already exists.');
      return;
    }

    // Prepare medication data for saving
    const medData = {
      id: isEditing ? medication.id : trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), // Generate ID if adding
      name: trimmedName,
      interval: parseInt(interval, 10), // Ensure interval is an integer
    };

    // Call the onSave prop passed from App.jsx
    onSave(medData, isEditing);

    // Show success toast
    toast.success(`Medication ${isEditing ? 'updated' : 'added'}`, {
      description: `${medData.name} (every ${medData.interval} hours) has been saved.`,
    });

    // Close the dialog
    onOpenChange(false);
  };

  return (
    // Dialog component structure
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Update the details for ${medication?.name}.` : 'Enter the details for the new medication.'}
          </DialogDescription>
        </DialogHeader>
        {/* Form Fields */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-name" className="text-right">
              Name
            </Label>
            <Input
              id="med-name" // Unique ID for label association
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }} // Clear error on change
              className="col-span-3"
              placeholder="e.g., Ibuprofen"
              aria-required="true" // Accessibility
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-interval" className="text-right">
              Interval (hrs)
            </Label>
            <Input
              id="med-interval" // Unique ID
              type="number"
              value={interval}
              onChange={(e) => { setIntervalValue(parseInt(e.target.value) || 1); setError(''); }} // Ensure it's a number, clear error
              className="col-span-3"
              min="1"
              max="72" // Consistent with validation
              aria-required="true" // Accessibility
            />
          </div>
          {/* Display error message if present */}
          {error && <p className="col-span-4 text-sm text-destructive text-center">{error}</p>}
        </div>
        {/* Dialog Actions */}
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

export default AddEditMedicationDialog;
