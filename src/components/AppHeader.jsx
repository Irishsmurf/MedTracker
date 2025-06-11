import React from 'react';
import { Pill, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AppHeader = ({ user, resolvedTheme, setTheme, handleSignOut, notificationButton }) => {
  return (
    <header className="mb-6 pb-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex-1 flex justify-start order-2 md:order-1">
        {notificationButton}
      </div>
      <div className="text-center order-1 md:order-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center justify-center gap-2">
          <Pill className="text-primary" /> MedTracker
        </h1>
        <p className="text-muted-foreground text-sm">
          {user ? `Tracking for ${user.displayName || 'User'}` : 'Your personal medication schedule'}
        </p>
      </div>
      <div className="flex-1 flex justify-end items-center order-3 space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              {resolvedTheme === 'dark' ? (
                <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
              ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {user && (
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
