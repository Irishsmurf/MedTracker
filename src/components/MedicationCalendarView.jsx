import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { formatTime } from '@/lib/utils'; // Import helper

/**
 * Component to display medication logs in a calendar view.
 * @param {object} props
 * @param {Array} props.medLogs - The full array of medication log entries.
 */
const MedicationCalendarView = ({ medLogs }) => {
  const [month, setMonth] = useState(new Date()); // State for the currently displayed month
  const [selectedDate, setSelectedDate] = useState(null); // State for the selected date

  // Memoize processing the logs to group them by date (YYYY-MM-DD format)
  const eventsByDate = useMemo(() => {
    const grouped = {};
    medLogs.forEach(log => {
      try {
        const date = new Date(log.takenAt);
        // Normalize date to YYYY-MM-DD string key, handling potential timezone issues
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(log);
        // Sort logs within the day by time taken
        grouped[dateKey].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
      } catch (e) {
        console.error("Error processing log date:", log, e);
      }
    });
    return grouped;
  }, [medLogs]); // Recalculate only when medLogs changes

  // Create modifiers for react-day-picker: highlight days with events
  const modifiers = useMemo(() => {
    const eventDays = Object.keys(eventsByDate).map(dateStr => {
        // Parse YYYY-MM-DD string back to Date object, assuming local timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        // Month needs to be 0-indexed for Date constructor
        return new Date(year, month - 1, day);
    });
    return { hasEvent: eventDays };
  }, [eventsByDate]);

  // Define class names for the modifiers
  const modifiersClassNames = {
    // Style for days that have events - using a subtle background dot/indicator might be better than full bg
    // Example: A blue dot using Tailwind pseudo-elements
    hasEvent: 'day-with-event relative',
    // Style for the selected day
    selected: 'bg-accent text-accent-foreground rounded-md',
  };

  // Get logs for the currently selected date
  const selectedDayLogs = useMemo(() => {
    if (!selectedDate) return [];
    const year = selectedDate.getFullYear();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Calendar Component */}
      <div className="md:col-span-2">
         {/* Add custom CSS for the dot indicator */}
         <style>{`
           .day-with-event::after {
             content: '';
             position: absolute;
             bottom: 4px; /* Adjust position */
             left: 50%;
             transform: translateX(-50%);
             width: 6px; /* Dot size */
             height: 6px; /* Dot size */
             border-radius: 50%;
             background-color: hsl(var(--primary)); /* Use theme primary color */
             opacity: 0.7; /* Make it slightly transparent */
           }
           .rdp-day_selected.day-with-event::after {
             background-color: hsl(var(--primary-foreground)); /* Change dot color on selected day */
           }
         `}</style>
        <Calendar
          mode="single" // Allow selecting a single day
          selected={selectedDate}
          onSelect={setSelectedDate} // Update selected date state
          month={month}
          onMonthChange={setMonth} // Allow changing month
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
          showOutsideDays // Optionally show days from previous/next month
        />
      </div>

      {/* Selected Day Details */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate
                ? `Doses on ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Select a day'}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] overflow-y-auto"> {/* Fixed height and scroll */}
            {selectedDate ? (
              selectedDayLogs.length > 0 ? (
                <ul className="space-y-3">
                  {selectedDayLogs.map(log => (
                    <li key={log.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{log.medicationName}</span>
                      </div>
                      <Badge variant="outline">{formatTime(log.takenAt)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center pt-4">No doses logged for this day.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground italic text-center pt-4">Select a day on the calendar to see details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MedicationCalendarView;
