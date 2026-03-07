import { useEffect } from 'react';
import { Plus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { getSessions, deleteSession, getSession } from '@/api/aiChat';
import { formatDistanceToNow } from 'date-fns';

export function ChatSessionList() {
  const {
    sessions, sessionsLoading, activeSessionId,
    setSessions, setSessionsLoading, removeSession, loadSession, hideSessionsList, startNewChat,
  } = useChatStore();

  useEffect(() => {
    const load = async () => {
      setSessionsLoading(true);
      try {
        const data = await getSessions(1, 30);
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setSessionsLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectSession = async (sessionId) => {
    try {
      const session = await getSession(sessionId);
      if (session) loadSession(session);
    } catch (err) {
      console.error('Failed to load session', err);
    }
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      removeSession(sessionId);
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleNewChat = () => {
    startNewChat();
    hideSessionsList();
  };

  return (
    <div className="flex flex-col h-full">
      {/* New chat button */}
      <div className="px-4 py-3 border-b border-border/40">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-violet-500/20"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/70">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Start chatting with Aria</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => {
              const isActive = activeSessionId === session._id;
              return (
                <div
                  key={session._id}
                  onClick={() => handleSelectSession(session._id)}
                  className={`group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-violet-500/10 border border-violet-500/20'
                      : 'hover:bg-muted/60 border border-transparent'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isActive ? 'bg-violet-500/20' : 'bg-muted'
                  }`}>
                    <MessageSquare className={`h-3.5 w-3.5 ${isActive ? 'text-violet-500' : 'text-muted-foreground/60'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-foreground/80'}`}>
                      {session.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {session.messageCount} msg{session.messageCount !== 1 ? 's' : ''} ·{' '}
                      {session.lastMessageAt
                        ? formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: true })
                        : 'recently'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, session._id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
