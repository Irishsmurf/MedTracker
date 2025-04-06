import React from 'react';
import { Clock, Pill, Plus } from "lucide-react";
import { cn, formatTime } from "@/lib/utils"; // Import helpers
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

/**
 * Component to display the paginated list of medication logs.
 * @param {object} props
 * @param {Array} props.medLogs - The full array of medication log entries.
 * @param {number} props.visibleLogCount - The number of logs currently visible.
 * @param {Function} props.handleLoadMoreLogs - Callback to load more log entries.
 * @param {number} props.logsPerPage - The number of logs loaded per page/click.
 */
const LogList = ({ medLogs, visibleLogCount, handleLoadMoreLogs, logsPerPage }) => {
  // Slice the logs to get only the currently visible ones
  const visibleLogs = medLogs.slice(0, visibleLogCount);
  // Determine if more logs can be loaded
  const canLoadMore = visibleLogCount < medLogs.length;

  return (
    <>
      {/* Display placeholder or the list */}
      {medLogs.length === 0 ? (
        // Empty state card
        <Card className="text-center py-6 border-dashed">
            <CardContent className="flex flex-col items-center justify-center">
                <Clock size={32} className="text-muted-foreground mb-3"/>
                <p className="text-muted-foreground italic">No doses logged yet.</p>
            </CardContent>
        </Card>
      ) : (
        // Card containing the log list
        <Card>
            <CardContent className="p-0"> {/* No padding on content to allow items to fill */}
                {/* Scrollable container for log items */}
                <div className="space-y-0 max-h-[400px] overflow-y-auto"> {/* Adjust max-h as needed */}
                    {visibleLogs.map((log, index) => (
                        // Individual log item row
                        <div
                            key={log.id}
                            className={cn(
                                "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                                // Add border bottom to all but the last visible item
                                index < visibleLogs.length - 1 && "border-b"
                            )}
                        >
                            {/* Pill Icon with conditional background */}
                            <div className={cn(
                                "p-2 rounded-full flex-shrink-0", // Ensure icon doesn't shrink
                                log.medicationId?.includes('codeine') ? 'bg-red-100 dark:bg-red-900/50' :
                                log.medicationId?.includes('ibuprofen') ? 'bg-blue-100 dark:bg-blue-900/50' :
                                'bg-green-100 dark:bg-green-900/50' // Default or other types
                            )}>
                                <Pill size={16} className={cn(
                                    log.medicationId?.includes('codeine') ? 'text-red-600 dark:text-red-400' :
                                    log.medicationId?.includes('ibuprofen') ? 'text-blue-600 dark:text-blue-400' :
                                    'text-green-600 dark:text-green-400'
                                )} />
                            </div>

                            {/* Medication Name and Taken Time */}
                            <div className="flex-grow min-w-0"> {/* Allow text to grow and wrap */}
                                <p className="font-semibold text-foreground truncate" title={log.medicationName}> {/* Truncate long names */}
                                    {log.medicationName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Taken: {formatTime(log.takenAt)}
                                </p>
                            </div>

                            {/* Next Dose Time (Aligned Right) */}
                            <div className="ml-auto text-right flex-shrink-0 pl-4">
                                <p className="text-base font-medium text-foreground tabular-nums">
                                    {formatTime(log.nextDueAt)}
                                </p>
                                <p className="text-xs text-muted-foreground">Next Dose</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            {/* Footer with Load More button or 'All loaded' message */}
            {/* Only show footer if there were ever more logs than the initial page size */}
            {medLogs.length > logsPerPage && (
                <CardFooter className="pt-4 pb-3 justify-center">
                    {canLoadMore ? (
                        <Button variant="outline" onClick={handleLoadMoreLogs}>
                            <Plus className="mr-2 h-4 w-4" /> Load More ({medLogs.length - visibleLogCount} remaining)
                        </Button>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">All {medLogs.length} entries shown.</p>
                    )}
                </CardFooter>
            )}
        </Card>
      )}
    </>
  );
};

export default LogList;
