import React from 'react';
import { Edit, Trash2, Pill, Check } from "lucide-react";
import { cn, formatTime, calculateTimeInfo } from "@/lib/utils"; // Import helpers
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Component to display a single medication card, now including default dosage.
 */
const MedicationCard = React.memo(({ med, nextDueTimes, currentTime, onTake, onEdit, isManageMode, onDelete }) => {
  // Calculate time remaining info
  const currentDueTime = nextDueTimes[med.id]; // Get the specific due time
  const timeInfo = calculateTimeInfo(currentDueTime, med.interval, currentTime);

  // --- Debugging Logs ---
  console.log(`[MedCard: ${med.name}]`, {
      medId: med.id,
      interval: med.interval,
      currentTime: currentTime.toISOString(),
      currentDueTime: currentDueTime || 'N/A', // Log the due time being used
      calculatedTimeInfo: timeInfo // Log the whole timeInfo object
  });
  // --- End Debugging Logs ---

  const getProgressColorClass = () => {
    if (timeInfo.isOverdue) return "stroke-destructive";
    if (!currentDueTime) return "stroke-muted"; // Check specific due time
    // Use progress from calculated timeInfo
    if (timeInfo.progress < 30) return "stroke-[--chart-2]";
    if (timeInfo.progress < 70) return "stroke-[--chart-5]";
    return "stroke-[--chart-1]";
  };
  const progressColorClass = getProgressColorClass();
  const circumference = 2 * Math.PI * 45; // r=45
  // Calculate offset, ensuring progress is valid number between 0-100
  const progressPercent = (typeof timeInfo.progress === 'number' && !isNaN(timeInfo.progress))
      ? Math.max(0, Math.min(100, timeInfo.progress))
      : 0; // Default to 0 if progress is invalid
  const strokeDashoffset = circumference - (circumference * progressPercent / 100);

  // --- Debugging Log for SVG ---
  console.log(`[MedCard: ${med.name}] SVG Params:`, {
      progressPercent: progressPercent,
      strokeDashoffset: strokeDashoffset,
      circumference: circumference,
      progressColorClass: progressColorClass,
      shouldRenderProgress: !!currentDueTime // Log if the progress circle should render
  });
  // --- End Debugging Log ---


  // Format dosage string for display
  const dosageString = med.dosageAmount && med.dosageUnit
      ? `${med.dosageAmount} ${med.dosageUnit}`
      : med.dosageAmount ? `${med.dosageAmount}` : null;

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md flex flex-col h-full">
      {/* SVG Progress */}
      <svg className="absolute top-0 left-0 w-full h-full -rotate-90 opacity-20 pointer-events-none" viewBox="0 0 100 100">
         <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-border" strokeWidth="6" />
         {/* Render progress circle only if a due time exists */}
         {currentDueTime && (
             <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                className={cn(progressColorClass, "transition-all duration-500 ease-linear")}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset} // Use calculated offset
             />
         )}
      </svg>

      {/* Card Header */}
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate" title={med.name}>{med.name}</span>
           {isManageMode && ( <div className="flex items-center space-x-1"> {/* Edit/Delete Buttons */} <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(med)} aria-label={`Edit ${med.name}`}><Edit size={16} /></Button></TooltipTrigger><TooltipContent><p>Edit {med.name}</p></TooltipContent></Tooltip></TooltipProvider> <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(med.id)} aria-label={`Delete ${med.name}`}><Trash2 size={16} /></Button></TooltipTrigger><TooltipContent><p>Delete {med.name}</p></TooltipContent></Tooltip></TooltipProvider> </div> )}
        </CardTitle>
        <CardDescription className="flex items-center justify-between text-xs flex-wrap gap-x-2 pt-1">
            <span>Every {med.interval} hours</span>
            {dosageString && ( <span className="font-medium text-foreground/80">{dosageString}</span> )}
        </CardDescription>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="relative z-10 flex-grow flex flex-col items-center justify-center text-center pb-4">
         {timeInfo.isOverdue ? ( <span className="text-destructive font-bold text-lg animate-pulse">TAKE NOW</span> )
          : currentDueTime ? ( <div className="text-center"> <div className="text-2xl font-semibold tabular-nums">{timeInfo.hours}h {timeInfo.minutes}m</div> <div className="text-xs text-muted-foreground">until next dose at {formatTime(currentDueTime)}</div> </div> )
          : ( <span className="text-muted-foreground italic">Ready to take first dose</span> )}
      </CardContent>

      {/* Card Footer */}
      <CardFooter className="relative z-10 pt-0 justify-center">
         <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
               <Button onClick={() => onTake(med)} variant={timeInfo.isOverdue ? "destructive" : "default"} disabled={isManageMode} size="lg" aria-label={`Take ${med.name}`}><Pill size={18} /> </Button>
         </TooltipTrigger><TooltipContent><p>Take {med.name}</p></TooltipContent></Tooltip></TooltipProvider>
      </CardFooter>
    </Card>
  );
});

export default MedicationCard;
MedicationCard.displayName = "MedicationCard"; // Set display name for debugging