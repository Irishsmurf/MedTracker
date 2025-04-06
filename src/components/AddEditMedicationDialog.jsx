import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
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
 * Dialog component for adding or editing a medication, now including dosage info.
 */
const AddEditMedicationDialog = ({ open, onOpenChange, medication, onSave, medications }) => {
  const [name, setName] = useState('');
  const [interval, setIntervalValue] = useState(8);
  // --- New State for Dosage ---
  const [dosageAmount, setDosageAmount] = useState(''); // Store as string to handle empty input
  const [dosageUnit, setDosageUnit] = useState('');
  // --- End New State ---
  const [error, setError] = useState('');
  const isEditing = medication !== null;

  useEffect(() => {
    if (open) {
        if (medication) {
            // Editing: Populate with existing data
            setName(medication.name);
            setIntervalValue(medication.interval);
            setDosageAmount(medication.dosageAmount || ''); // Handle undefined/null
            setDosageUnit(medication.dosageUnit || '');   // Handle undefined/null
            setError('');
        } else {
            // Adding: Reset to defaults
            setName('');
            setIntervalValue(8);
            setDosageAmount(''); // Reset dosage
            setDosageUnit('');   // Reset dosage
            setError('');
        }
    }
  }, [medication, open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const amount = dosageAmount ? parseFloat(dosageAmount) : null; // Convert to number or null
    const unit = dosageUnit.trim() || null; // Use null if empty string

    // Validation
    if (!trimmedName) { setError('Medication name cannot be empty.'); return; }
    if (!interval || interval < 1 || interval > 72) { setError('Interval must be between 1 and 72 hours.'); return; }
    if (dosageAmount && isNaN(amount)) { setError('Dosage amount must be a number.'); return; }
    if (amount !== null && amount <= 0) { setError('Dosage amount must be positive.'); return; }
    if (amount !== null && unit === null) { setError('Please provide a unit if specifying a dosage amount.'); return; }
    if (amount === null && unit !== null) { setError('Please provide a dosage amount if specifying a unit.'); return; }


    const existingMed = medications.find(m => m.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingMed && (!isEditing || existingMed.id !== medication.id)) { setError('A medication with this name already exists.'); return; }

    // Prepare medication data including optional dosage
    const medData = {
      id: isEditing ? medication.id : trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: trimmedName,
      interval: parseInt(interval, 10),
      // Include dosage fields, using null if not provided
      dosageAmount: amount,
      dosageUnit: unit,
    };

    onSave(medData, isEditing);
    // Toast is handled in parent or here upon success if needed
    // toast.success(...) // Already handled in parent App.jsx's handler via dialog callback
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Update details for ${medication?.name}.` : 'Enter details for the new medication.'} Dosage is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-name" className="text-right">Name</Label>
            <Input id="med-name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className="col-span-3" placeholder="e.g., Ibuprofen" aria-required="true"/>
          </div>
          {/* Interval Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-interval" className="text-right">Interval (hrs)</Label>
            <Input id="med-interval" type="number" value={interval} onChange={(e) => { setIntervalValue(parseInt(e.target.value) || 1); setError(''); }} className="col-span-3" min="1" max="72" aria-required="true"/>
          </div>
          {/* --- Dosage Amount Input --- */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-dosage-amount" className="text-right">Dosage Amt</Label>
            <Input
                id="med-dosage-amount"
                type="number" // Use number input
                value={dosageAmount}
                onChange={(e) => { setDosageAmount(e.target.value); setError(''); }}
                className="col-span-3"
                placeholder="e.g., 400 (Optional)"
                min="0" // Allow zero, but validation checks for positive if set
                step="any" // Allow decimals if needed
            />
          </div>
          {/* --- Dosage Unit Input --- */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="med-dosage-unit" className="text-right">Dosage Unit</Label>
            <Input
                id="med-dosage-unit"
                value={dosageUnit}
                onChange={(e) => { setDosageUnit(e.target.value); setError(''); }}
                className="col-span-3"
                placeholder="e.g., mg, ml, pill(s) (Optional)"
            />
          </div>
          {/* --- End Dosage Inputs --- */}
          {error && <p className="col-span-4 text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditMedicationDialog;
