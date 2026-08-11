import { lazy, Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Footer } from "@/components/Footer";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";
import { useChatStore } from "@/store/chatStore";

// ChatPanel pulls in react-markdown + remark-gfm (~97KB gzip). AppLayout
// wraps every authenticated route, so a static import here put that whole
// markdown parser on the critical path for every page, not just when the
// chat panel is actually opened. Lazy-load it, and only mount it while
// open - isOpen starts false, so the chunk isn't fetched on initial page
// load. All ChatPanel state lives in useChatStore (not local component
// state), so unmounting on close and remounting on reopen loses nothing;
// an in-flight stream also isn't tied to the component's mount status,
// since its callbacks just write into the store.
const ChatPanel = lazy(() =>
  import("@/components/ai-chat/ChatPanel").then((m) => ({ default: m.ChatPanel }))
);

export const AppLayout = ({ children, fullHeight = false }) => {
  const isChatOpen = useChatStore((s) => s.isOpen);

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

      {/* AI Chat floating button + panel */}
      <AIChatButton />
      {isChatOpen && (
        <Suspense fallback={null}>
          <ChatPanel />
        </Suspense>
      )}
    </div>
  );
};
