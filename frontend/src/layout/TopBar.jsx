import { useState } from "react";
import { User, Lock, ChevronDown, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/Avatar";
import { SidebarToggle } from "./Sidebar";
import { CompactTimer } from "@/components/CompactTimer";
import { Greeting } from "@/components/Greeting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { AccountDetailsDialog } from "@/components/AccountDetailsDialog";
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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <SidebarToggle />

          {/* Greeting and Time */}
          <div className="flex-1 hidden md:flex justify-start">
            <Greeting name={firstName} />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <CompactTimer />

            {/* Settings Button - Only show for ADMIN */}
            {canAccessSettings && (
              <Link
                to="/settings"
                className={cn(
                  "p-2 rounded-lg transition-colors hover:bg-gray-100",
                  location.pathname === "/settings"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <Avatar
                    name={displayName}
                    src={profilePictureUrl}
                    size="sm"
                  />
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900">
                      {firstName}
                    </span>
                    {user?.role && (
                      <span className="text-xs text-gray-500">
                        {user?.role}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
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
