/**
 * Real-time Notifications - Fase 4 Sprint 3
 *
 * Event-driven notification system
 * Notifies users of important changes and activities
 */

export type NotificationType =
  | "import_complete"
  | "goal_updated"
  | "vote_changed"
  | "user_joined"
  | "conflict_detected"
  | "sync_error";

export type Notification = {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    url: string;
  };
  timestamp: number;
  read: boolean;
};

export type ActivityLogEntry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  targetType: "campanha" | "meta" | "territorio" | "voto" | "user";
  targetId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: number;
  ipAddress?: string;
};

/**
 * Notification Manager
 * Handles real-time notifications
 */
export class NotificationManager {
  private notifications = new Map<string, Notification[]>(); // userId -> notifications
  private listeners = new Map<string, Set<(n: Notification) => void>>(); // userId -> callbacks

  /**
   * Send notification to user
   */
  sendNotification(notification: Omit<Notification, "id" | "timestamp" | "read">): Notification {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false,
    };

    // Store notification
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.push(fullNotification);

    // Notify listeners
    const listeners = this.listeners.get(notification.userId);
    if (listeners) {
      listeners.forEach((callback) => callback(fullNotification));
    }

    return fullNotification;
  }

  /**
   * Subscribe to notifications for user
   */
  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }

    this.listeners.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(userId)?.delete(callback);
    };
  }

  /**
   * Get unread notifications
   */
  getUnread(userId: string): Notification[] {
    return (this.notifications.get(userId) ?? []).filter((n) => !n.read);
  }

  /**
   * Mark as read
   */
  markRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notif = userNotifications.find((n) => n.id === notificationId);
      if (notif) {
        notif.read = true;
      }
    }
  }

  /**
   * Clear all notifications for user
   */
  clearAll(userId: string): void {
    this.notifications.delete(userId);
  }
}

/**
 * Activity Logger
 * Tracks all user actions for audit trail
 */
export class ActivityLogger {
  private activities: ActivityLogEntry[] = [];

  /**
   * Log an activity
   */
  logActivity(activity: Omit<ActivityLogEntry, "id" | "timestamp">): ActivityLogEntry {
    const entry: ActivityLogEntry = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    this.activities.push(entry);
    return entry;
  }

  /**
   * Get activity log for user
   */
  getUserActivity(userId: string, limit = 50): ActivityLogEntry[] {
    return this.activities
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get activity log for campaign
   */
  getCampaignActivity(campaignId: string, limit = 100): ActivityLogEntry[] {
    return this.activities
      .filter((a) => a.targetId === campaignId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get full audit trail
   */
  getAuditTrail(filters?: { userId?: string; targetType?: string; startTime?: number }): ActivityLogEntry[] {
    return this.activities
      .filter((a) => {
        if (filters?.userId && a.userId !== filters.userId) return false;
        if (filters?.targetType && a.targetType !== filters.targetType) return false;
        if (filters?.startTime && a.timestamp < filters.startTime) return false;
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const notificationManager = new NotificationManager();
export const activityLogger = new ActivityLogger();

/**
 * Trigger notifications for common events
 */
export const NotificationEvents = {
  importComplete: (campaignName: string) =>
    notificationManager.sendNotification({
      type: "import_complete",
      userId: "", // Set by caller
      title: "Import Complete",
      message: `Successfully imported data for ${campaignName}`,
      icon: "✅",
      action: {
        label: "View Rankings",
        url: "/rankings",
      },
    }),

  goalUpdated: (goalLevel: string, newValue: number) =>
    notificationManager.sendNotification({
      type: "goal_updated",
      userId: "", // Set by caller
      title: "Goal Updated",
      message: `${goalLevel} goal set to ${newValue.toLocaleString("pt-BR")} votes`,
      icon: "🎯",
    }),

  voteChanged: (userName: string, field: string) =>
    notificationManager.sendNotification({
      type: "vote_changed",
      userId: "", // Set by caller
      title: "Vote Data Changed",
      message: `${userName} updated ${field}`,
      icon: "📊",
    }),

  conflictDetected: (field: string) =>
    notificationManager.sendNotification({
      type: "conflict_detected",
      userId: "", // Set by caller
      title: "Edit Conflict",
      message: `Concurrent edit detected on ${field}. Changes merged automatically.`,
      icon: "⚠️",
    }),

  userJoined: (userName: string, campaignName: string) =>
    notificationManager.sendNotification({
      type: "user_joined",
      userId: "", // Set by caller
      title: "Team Member Online",
      message: `${userName} is now viewing ${campaignName}`,
      icon: "👥",
    }),

  syncError: (errorMessage: string) =>
    notificationManager.sendNotification({
      type: "sync_error",
      userId: "", // Set by caller
      title: "Sync Failed",
      message: `Failed to sync changes: ${errorMessage}`,
      icon: "❌",
      action: {
        label: "Retry",
        url: "/retry",
      },
    }),
};
