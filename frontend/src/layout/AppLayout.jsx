import { Sidebar, SidebarToggle } from './Sidebar';
import { TimeTracker } from '@/components/TimeTracker';

export const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 gap-4">
            <SidebarToggle />
            <div className="flex-1" />
            <div className="w-80">
              <TimeTracker />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
