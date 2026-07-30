/**
 * Notifications Hook - Fase 4 Sprint 3
 *
 * Subscribe to and display real-time notifications
 * Integrates with notification manager for live updates
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { notificationManager, type Notification } from "@/lib/realtime/notifications";

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to notifications
  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(
    (notificationId: string) => {
      notificationManager.markRead(userId, notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [userId]
  );

  // Clear all notifications
  const clearAll = useCallback(() => {
    notificationManager.clearAll(userId);
    setNotifications([]);
    setUnreadCount(0);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

/**
 * Notification Toast Component
 */
export function NotificationToast({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColor: Record<string, string> = {
    import_complete: "bg-green-50 border-green-200",
    goal_updated: "bg-blue-50 border-blue-200",
    vote_changed: "bg-purple-50 border-purple-200",
    user_joined: "bg-cyan-50 border-cyan-200",
    conflict_detected: "bg-amber-50 border-amber-200",
    sync_error: "bg-red-50 border-red-200",
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 ${bgColor[notification.type] || "bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {notification.icon && <span className="text-lg">{notification.icon}</span>}
          <div>
            <div className="font-medium text-sm">{notification.title}</div>
            <div className="text-sm text-slate-600 mt-1">{notification.message}</div>
            {notification.action && (
              <a
                href={notification.action.url}
                className="text-xs font-medium text-blue-600 hover:underline mt-2 inline-block"
              >
                {notification.action.label} →
              </a>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 text-lg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Notification Center (full list)
 */
export function NotificationCenter({
  userId,
  maxHeight = "max-h-96",
}: {
  userId: string;
  maxHeight?: string;
}) {
  const { notifications, markAsRead, clearAll } = useNotifications(userId);

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Notifications</h2>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className={`${maxHeight} overflow-y-auto space-y-2`}>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No notifications yet
          </p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded border cursor-pointer hover:bg-slate-50 ${
                notif.read ? "opacity-60" : "bg-blue-50 border-blue-200"
              }`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{notif.icon} {notif.title}</div>
                  <div className="text-xs text-slate-600 mt-1 truncate">
                    {notif.message}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {new Date(notif.timestamp).toLocaleTimeString("pt-BR")}
                  </div>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Notification Bell (header icon)
 */
export function NotificationBell({ userId }: { userId: string }) {
  const { unreadCount } = useNotifications(userId);

  return (
    <div className="relative">
      <button className="p-2 hover:bg-slate-100 rounded-lg">
        🔔
      </button>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
