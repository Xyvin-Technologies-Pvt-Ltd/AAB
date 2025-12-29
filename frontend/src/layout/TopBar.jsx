import { useState } from "react";
import { LogOut, User, Lock, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/Avatar";
import { SidebarToggle } from "./Sidebar";
import { TimeTracker } from "@/components/TimeTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { AccountDetailsDialog } from "@/components/AccountDetailsDialog";

export const TopBar = () => {
  const { user, logout } = useAuthStore();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const displayName =
    user?.employeeId?.name || user?.email || user?.name || "User";
  const profilePictureUrl = user?.employeeId?.profilePicture?.url;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 gap-4">
          <SidebarToggle />
          <div className="flex-1" />
          <div className="w-80">
            <TimeTracker />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <Avatar name={displayName} src={profilePictureUrl} size="sm" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900">
                    {displayName}
                  </span>
                  {user?.role && (
                    <span className="text-xs text-gray-500">{user?.role}</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
