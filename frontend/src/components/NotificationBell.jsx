import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { Bell, CheckCheck, Clock, MessageSquare, UserCheck, AlertTriangle, Archive, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const NOTIFICATION_ICONS = {
  TASK_ASSIGNED: UserCheck,
  COMMENT_ADDED: MessageSquare,
  DUE_DATE_APPROACHING: Clock,
  TASK_OVERDUE: AlertTriangle,
  STATUS_CHANGED: CheckSquare,
  TASK_ARCHIVED: Archive,
};

const NOTIFICATION_COLORS = {
  TASK_ASSIGNED: "text-indigo-600 bg-indigo-50",
  COMMENT_ADDED: "text-blue-600 bg-blue-50",
  DUE_DATE_APPROACHING: "text-amber-600 bg-amber-50",
  TASK_OVERDUE: "text-red-600 bg-red-50",
  STATUS_CHANGED: "text-emerald-600 bg-emerald-50",
  TASK_ARCHIVED: "text-gray-600 bg-gray-50",
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getAll({ limit: 20 }),
    refetchInterval: 60000,
  });

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = countData?.data?.count || 0;

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification._id);
    }
    if (notification.data?.taskId) {
      navigate(`/tasks`);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                  const colorClass = NOTIFICATION_COLORS[notification.type] || "text-gray-600 bg-gray-50";
                  return (
                    <button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0 ${!notification.read ? "bg-indigo-50/30" : ""}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${notification.read ? "text-gray-600" : "text-gray-800"}`}>
                          {notification.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{notification.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                <p className="text-[10px] text-center text-gray-400">Showing last {notifications.length} notifications</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
