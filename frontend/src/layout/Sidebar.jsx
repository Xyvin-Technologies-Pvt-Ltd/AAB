import { Link, useLocation, useNavigate } from "react-router-dom";
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
  FileText,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Avatar } from "@/components/Avatar";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/Logo_1.png";

const ALL_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE"];

// Nav grouped into labelled sections. A section only renders if the
// current user can see at least one of its items.
const navSections = [
  {
    label: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
      { path: "/analytics", label: "Analytics", icon: BarChart3, roles: ALL_ROLES },
      { path: "/alerts", label: "Alerts", icon: Bell, roles: ALL_ROLES },
    ],
  },
  {
    label: "Workspace",
    items: [
      { path: "/clients", label: "Clients", icon: Users, roles: ALL_ROLES },
      { path: "/tasks", label: "Tasks", icon: CheckSquare, roles: ALL_ROLES },
      { path: "/calendar", label: "Calendar", icon: Calendar, roles: ALL_ROLES },
      { path: "/time-entries", label: "Time Entries", icon: Clock, roles: ALL_ROLES },
    ],
  },
  {
    label: "Administration",
    items: [
      { path: "/employees", label: "Employees", icon: UserCog, roles: ["ADMIN"] },
      { path: "/invoices", label: "Invoices", icon: FileText, roles: ["ADMIN"] },
      { path: "/teams", label: "Teams", icon: Users2, roles: ["ADMIN"] },
    ],
  },
];

const NavItem = ({ item, isActive, onNavigate }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
      )}
    >
      {/* Active indicator bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all",
          isActive ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive
            ? "text-sidebar-primary"
            : "text-sidebar-muted group-hover:text-sidebar-foreground"
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const closeOnMobile = () => setSidebarOpen(false);

  const displayName =
    user?.employeeId?.name || user?.email?.split("@")[0] || user?.name || "User";
  const profilePictureUrl = user?.employeeId?.profilePicture?.url;

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => user && item.roles.includes(user.role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeOnMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <img
            src={logoImg}
            alt="Authentic Accounting"
            className="h-9 object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white lg:hidden"
            onClick={closeOnMobile}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={location.pathname === item.path}
                    onNavigate={closeOnMobile}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={displayName} src={profilePictureUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs capitalize text-sidebar-muted">
                {user?.role?.toLowerCase() || "member"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const SidebarToggle = () => {
  const { setSidebarOpen } = useUIStore();

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
