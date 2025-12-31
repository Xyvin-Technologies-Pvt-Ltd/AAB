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
  Users2,
  LogOut,
  Package,
} from "lucide-react";
import { Button } from "@/ui/button";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/Logo_1.png";

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
    path: "/packages",
    label: "Packages",
    icon: Package,
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
    roles: ["ADMIN"],
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
  const { user, logout } = useAuthStore();

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

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
            <div className="flex items-center space-x-3">
              <img src={logoImg} alt="Authentic Accounting" className="h-10 object-contain" />
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

          {/* Logout Section */}
          <div className="p-4 border-t border-indigo-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-indigo-100 hover:bg-indigo-700 hover:text-white"
            >
              <LogOut className="h-5 w-5 text-indigo-300" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
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
