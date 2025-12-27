import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
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
  LogOut,
  Bell,
  Settings,
} from 'lucide-react';
import { Button } from '@/ui/button';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/employees', label: 'Employees', icon: UserCog },
  { path: '/time-entries', label: 'Time Entries', icon: Clock },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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
          'fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64 lg:w-64'
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
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-white text-indigo-900 shadow-lg'
                      : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-indigo-600' : 'text-indigo-300')} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-indigo-700">
            <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-indigo-700/50 mb-2">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
                <p className="text-xs text-indigo-300">{user?.role || 'Employee'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-indigo-100 hover:bg-indigo-700 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
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

