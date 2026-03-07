import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';

/**
 * Derives a human-readable page context string from the current route.
 */
const getPageContext = (pathname) => {
  if (pathname.match(/^\/clients\/([^/]+)$/)) {
    const id = pathname.split('/')[2];
    return `client:${id}`;
  }
  if (pathname.match(/^\/tasks/)) return 'tasks';
  if (pathname.match(/^\/analytics/)) return 'analytics';
  if (pathname.match(/^\/employees\/([^/]+)$/)) {
    const id = pathname.split('/')[2];
    return `employee:${id}`;
  }
  if (pathname.match(/^\/invoices/)) return 'invoices';
  if (pathname.match(/^\/packages\/([^/]+)$/)) {
    const id = pathname.split('/')[2];
    return `package:${id}`;
  }
  if (pathname === '/alerts') return 'compliance-alerts';
  if (pathname === '/dashboard') return 'dashboard';
  return null;
};

export function AIChatButton() {
  const location = useLocation();
  const { isOpen, toggleChat, setPageContext } = useChatStore();

  useEffect(() => {
    const ctx = getPageContext(location.pathname);
    setPageContext(ctx);
  }, [location.pathname]);

  const handleClick = () => {
    const ctx = getPageContext(location.pathname);
    toggleChat(ctx);
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
        isOpen
          ? 'bg-muted/90 text-muted-foreground border border-border w-10 h-10 justify-center hover:bg-muted'
          : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white pl-4 pr-5 h-11 hover:shadow-xl hover:shadow-violet-500/30 hover:from-violet-400 hover:to-indigo-500'
      }`}
      title={isOpen ? 'Close Aria' : 'Ask Aria'}
    >
      {isOpen ? (
        <X className="h-4 w-4" />
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold tracking-tight">Ask Aria</span>
        </>
      )}
    </button>
  );
}
