import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar />

        {/* Main content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
