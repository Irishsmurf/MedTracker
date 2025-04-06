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
 * Component to display a single medication card with progress and actions.
 * @param {object} props
 * @param {object} props.med - The medication object { id, name, interval }.
 * @param {object} props.nextDueTimes - Object mapping med ID to next due ISO string.
 * @param {Date} props.currentTime - The current time object.
 * @param {Function} props.onTake - Callback function when "Take" button is clicked.
 * @param {Function} props.onEdit - Callback function when "Edit" button is clicked.
 * @param {boolean} props.isManageMode - Flag indicating if manage mode is active.
 * @param {Function} props.onDelete - Callback function when "Delete" button is clicked.
 */
const MedicationCard = React.memo(({ med, nextDueTimes, currentTime, onTake, onEdit, isManageMode, onDelete }) => {
  // Calculate time info using the helper function
  const timeInfo = calculateTimeInfo(nextDueTimes[med.id], med.interval, currentTime);

  // Determine progress color based on theme variables and time remaining
  const getProgressColorClass = () => {
    if (timeInfo.isOverdue) return "stroke-destructive";
    if (!nextDueTimes[med.id]) return "stroke-muted"; // Not taken yet
    // Adjust thresholds and theme variable names as needed
    if (timeInfo.progress < 30) return "stroke-[--chart-2]";
    if (timeInfo.progress < 70) return "stroke-[--chart-5]";
    return "stroke-[--chart-1]";
  };

  const progressColorClass = getProgressColorClass();
  const circumference = 2 * Math.PI * 45; // r=45 from SVG

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md flex flex-col h-full">
      {/* Circular Progress SVG */}
      <svg className="absolute top-0 left-0 w-full h-full -rotate-90 opacity-20 pointer-events-none" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-border" strokeWidth="6" />
        {/* Only render progress circle if the medication has been taken at least once */}
        {nextDueTimes[med.id] && (
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            className={cn(progressColorClass, "transition-all duration-500 ease-linear")}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            // Calculate dash offset, ensuring it's between 0 and circumference
            strokeDashoffset={Math.max(0, Math.min(circumference, circumference - (circumference * timeInfo.progress / 100)))}
          />
        )}
      </svg>

      {/* Card Header */}
      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate" title={med.name}>{med.name}</span> {/* Added title attribute */}
          {isManageMode && (
            <div className="flex items-center space-x-1">
              {/* Edit Button */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(med)} aria-label={`Edit ${med.name}`}>
                      <Edit size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit {med.name}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Delete Button */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(med.id)} aria-label={`Delete ${med.name}`}>
                       <Trash2 size={16} />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Delete {med.name}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </CardTitle>
        <CardDescription>Every {med.interval} hours</CardDescription>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="relative z-10 flex-grow flex flex-col items-center justify-center text-center pb-4">
        {timeInfo.isOverdue ? (
          <span className="text-destructive font-bold text-lg animate-pulse">TAKE NOW</span>
        ) : nextDueTimes[med.id] ? (
          <div className="text-center">
            <div className="text-2xl font-semibold tabular-nums">{timeInfo.hours}h {timeInfo.minutes}m</div>
            <div className="text-xs text-muted-foreground">until next dose at {formatTime(nextDueTimes[med.id])}</div>
          </div>
        ) : (
          <span className="text-muted-foreground italic">Ready to take first dose</span>
        )}
      </CardContent>

      {/* Card Footer */}
      <CardFooter className="relative z-10 pt-0 justify-center">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => onTake(med)}
                variant={timeInfo.isOverdue ? "destructive" : "default"}
                disabled={isManageMode}
                size="lg"
                aria-label={`Take ${med.name}`}
              >
                <Pill size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Take {med.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
});

export default MedicationCard;
