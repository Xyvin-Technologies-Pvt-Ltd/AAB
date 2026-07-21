import { useState } from "react";
import { User, Lock, ChevronDown, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/Avatar";
import { SidebarToggle } from "./Sidebar";
import { CompactTimer } from "@/components/CompactTimer";
import { Greeting } from "@/components/Greeting";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { AccountDetailsDialog } from "@/components/AccountDetailsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export const TopBar = () => {
  const location = useLocation();
  const { user, canAccess } = useAuthStore();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  // Get first name from employee name and capitalize first letter
  const getFirstName = () => {
    const fullName = user?.employeeId?.name || user?.name;
    if (fullName) {
      const firstName = fullName.split(" ")[0];
      return (
        firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    }
    const emailName = user?.email?.split("@")[0];
    if (emailName) {
      return (
        emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase()
      );
    }
    return "User";
  };

  const firstName = getFirstName();
  const displayName =
    user?.employeeId?.name ||
    user?.email?.split("@")[0] ||
    user?.name ||
    "User";
  const profilePictureUrl = user?.employeeId?.profilePicture?.url;

  // Check if user can access settings (ADMIN only)
  const canAccessSettings = canAccess("settings", "view");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <SidebarToggle />

            {/* Greeting and Time */}
            <div className="hidden md:flex">
              <Greeting name={firstName} />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CompactTimer />

            <ThemeToggle />

            <NotificationBell />

            {/* Settings Button - Only show for ADMIN */}
            {canAccessSettings && (
              <Link
                to="/settings"
                aria-label="Settings"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  location.pathname === "/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}

            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <Avatar
                    name={displayName}
                    src={profilePictureUrl}
                    size="sm"
                  />
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-sm font-medium text-foreground">
                      {firstName}
                    </span>
                    {user?.role && (
                      <span className="text-xs capitalize text-muted-foreground">
                        {user?.role?.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setAccountDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-2" />
                  Account Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPasswordDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
      <AccountDetailsDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
      />
    </>
  );
};
