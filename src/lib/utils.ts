import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Existing cn function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Moved Helper Functions ---

/**
 * Formats an ISO date string into a locale time string.
 * @param {string | undefined} dateString - The ISO date string.
 * @param {boolean} [includeDate=false] - Whether to include the date part.
 * @returns {string} - Formatted time string or '--:--'.
 */
export const formatTime = (dateString, includeDate = false) => {
  if (!dateString) return '--:--';
  try {
    const date = new Date(dateString);
    // Add 'as const' to infer specific literal types
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true } as const;
    if (includeDate) {
      // Add 'as const' here too
      const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' } as const;
      // Now the combined options object should satisfy DateTimeFormatOptions
      return date.toLocaleString([], { ...dateOptions, ...timeOptions });
    }
    // Pass options directly here
    return date.toLocaleTimeString([], timeOptions);
  } catch (e) {
    console.error("Error formatting time:", e);
    return '--:--'; // Return fallback on error
  }
};

/**
 * Calculates time remaining, progress, and overdue status for a medication dose.
 * @param {string | undefined} dueTimeString - ISO string of the next due time.
 * @param {number} intervalHours - The medication interval in hours.
 * @param {Date} currentTime - The current time object.
 * @returns {{hours: number, minutes: number, isOverdue: boolean, progress: number, takenAt: Date | null}} - Time information.
 */
export const calculateTimeInfo = (dueTimeString, intervalHours, currentTime) => {
  // Input validation remains the same
  if (!dueTimeString || !intervalHours || !currentTime) {
      return { hours: 0, minutes: 0, isOverdue: false, progress: 0, takenAt: null };
  }

  try {
      const dueTime = new Date(dueTimeString);
      const validIntervalHours = Math.max(1, intervalHours);
      const intervalMillis = validIntervalHours * 60 * 60 * 1000;
      const takenTime = new Date(dueTime.getTime() - intervalMillis);
      const validCurrentTime = currentTime instanceof Date ? currentTime : new Date();
      const totalDuration = intervalMillis;
      const elapsed = validCurrentTime.getTime() - takenTime.getTime();
      const diff = dueTime.getTime() - validCurrentTime.getTime();

      if (diff <= 0) {
          return { hours: 0, minutes: 0, isOverdue: true, progress: 100, takenAt: takenTime };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100 || 0));

      return { hours, minutes, isOverdue: false, progress, takenAt: takenTime };
  } catch (e) {
      console.error("Error calculating time info:", e);
      return { hours: 0, minutes: 0, isOverdue: false, progress: 0, takenAt: null };
  }
};

// --- End Moved Helper Functions ---
