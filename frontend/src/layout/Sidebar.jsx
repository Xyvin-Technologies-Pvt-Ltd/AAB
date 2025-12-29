import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  UserCog,
  Clock,
  BarChart3,
  Calendar,
  Menu,
  X,
  Bell,
  Settings,
  Users2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const allMenuItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/clients",
    label: "Clients",
    icon: Users,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/alerts",
    label: "Alerts",
    icon: Bell,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/calendar",
    label: "Calendar",
    icon: Calendar,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/employees",
    label: "Employees",
    icon: UserCog,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/time-entries",
    label: "Time Entries",
    icon: Clock,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER"],
  },
  { path: "/teams", label: "Teams", icon: Users2, roles: ["ADMIN"] },
];

export const Sidebar = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, canAccess } = useAuthStore();

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  // Check if user can access settings (ADMIN only)
  const canAccessSettings = canAccess("settings", "view");

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "w-64 lg:w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-indigo-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Accounting</h1>
                <p className="text-xs text-indigo-300">Platform</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-indigo-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-white text-indigo-900 shadow-lg"
                      : "text-indigo-100 hover:bg-indigo-700 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-indigo-600" : "text-indigo-300"
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Settings Section - Only show for ADMIN */}
          {canAccessSettings && (
            <div className="p-4 border-t border-indigo-700">
              <Link
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                  location.pathname === "/settings"
                    ? "bg-white text-indigo-900 shadow-lg"
                    : "text-indigo-100 hover:bg-indigo-700 hover:text-white"
                )}
              >
                <Settings
                  className={cn(
                    "h-5 w-5",
                    location.pathname === "/settings"
                      ? "text-indigo-600"
                      : "text-indigo-300"
                  )}
                />
                <span className="font-medium">Settings</span>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export const SidebarToggle = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={() => setSidebarOpen(true)}
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
};
