import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Footer } from "@/components/Footer";

export const AppLayout = ({ children, fullHeight = false }) => {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <TopBar />

        {/* Main content */}
        {fullHeight ? (
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">{children}</div>
            <Footer />
          </main>
        )}
      </div>
    </div>
  );
};
