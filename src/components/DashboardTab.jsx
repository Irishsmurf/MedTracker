import React from 'react';
import { Check, Edit, PlusCircle, MoreHorizontal, ClipboardCopy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MedicationGrid from './MedicationGrid';
import LogList from './LogList';

const DashboardTab = ({
  medications,
  nextDueTimes,
  currentTime,
  handleTakeMedication,
  handleEditMedication,
  isManageMode,
  setIsManageMode,
  handleDeleteMedication,
  handleAddNewMedication,
  medLogs,
  visibleLogCount,
  handleLoadMoreLogs,
  logsPerPage,
  handleCopyLog,
  handleExportCSV
}) => {
  return (
    <>
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Your Medications</h2>
          <div className="flex gap-2">
            <Button variant={isManageMode ? "default" : "outline"} onClick={() => { setIsManageMode(!isManageMode); }}>
              {isManageMode ? <Check size={16} className="mr-2" /> : <Edit size={16} className="mr-2" />}
              {isManageMode ? 'Done Managing' : 'Manage'}
            </Button>
            {isManageMode && (
              <Button variant="outline" onClick={() => { handleAddNewMedication(); }}>
                <PlusCircle size={16} className="mr-2" /> Add New
              </Button>
            )}
          </div>
        </div>
        <MedicationGrid
          medications={medications}
          nextDueTimes={nextDueTimes}
          currentTime={currentTime}
          handleTakeMedication={handleTakeMedication}
          handleEditMedication={handleEditMedication}
          isManageMode={isManageMode}
          handleDeleteMedication={handleDeleteMedication}
          handleAddNewMedication={handleAddNewMedication}
        />
      </section>
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">Medication History</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={medLogs.length === 0}>
                <MoreHorizontal className="h-4 w-4 mr-2" /> Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Log Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyLog}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                <span>Copy Full Log</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <LogList
          medLogs={medLogs}
          visibleLogCount={visibleLogCount}
          handleLoadMoreLogs={handleLoadMoreLogs}
          logsPerPage={logsPerPage}
        />
      </section>
    </>
  );
};

export default DashboardTab;
