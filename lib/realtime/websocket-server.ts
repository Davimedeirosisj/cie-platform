/**
 * WebSocket Server - Fase 4 Sprint 1
 *
 * Real-time presence and collaboration
 * Uses Vercel WebSockets (via @vercel/functions)
 *
 * Features:
 * - User presence tracking (who's viewing what)
 * - Live cursor positions
 * - Real-time notifications
 * - Connection management
 */

import type { NextApiRequest, NextApiResponse } from "next";

export type PresenceUpdate = {
  type: "join" | "leave" | "update" | "cursor" | "action";
  userId: string;
  userName: string;
  campanhaId: string;
  location: string; // Current page/view
  data?: {
    cursorX?: number;
    cursorY?: number;
    selectedItem?: string;
    action?: string;
  };
};

export type UserPresence = {
  userId: string;
  userName: string;
  campanhaId: string;
  location: string;
  lastSeen: number;
  cursorX?: number;
  cursorY?: number;
  color?: string; // For UI differentiation
};

/**
 * In-memory presence store
 * In production, use Redis for multi-instance support
 */
class PresenceManager {
  private users = new Map<string, UserPresence>();
  private campanhaSubscribers = new Map<string, Set<string>>(); // campaignId -> userIds

  joinCampanha(userId: string, userName: string, campanhaId: string, location: string): void {
    const presence: UserPresence = {
      userId,
      userName,
      campanhaId,
      location,
      lastSeen: Date.now(),
      color: this.generateUserColor(userId),
    };

    this.users.set(userId, presence);

    // Track subscribers per campaign
    if (!this.campanhaSubscribers.has(campanhaId)) {
      this.campanhaSubscribers.set(campanhaId, new Set());
    }
    this.campanhaSubscribers.get(campanhaId)!.add(userId);
  }

  leaveCampanha(userId: string): void {
    const presence = this.users.get(userId);
    if (!presence) return;

    this.users.delete(userId);
    this.campanhaSubscribers.get(presence.campanhaId)?.delete(userId);
  }

  updatePresence(userId: string, update: Partial<UserPresence>): void {
    const presence = this.users.get(userId);
    if (!presence) return;

    Object.assign(presence, update, { lastSeen: Date.now() });
  }

  getPresence(userId: string): UserPresence | undefined {
    return this.users.get(userId);
  }

  getCampanhaPresence(campanhaId: string): UserPresence[] {
    const userIds = this.campanhaSubscribers.get(campanhaId) ?? new Set();
    return Array.from(userIds)
      .map((id) => this.users.get(id))
      .filter((p): p is UserPresence => p !== undefined && Date.now() - p.lastSeen < 30000); // Active in last 30s
  }

  cleanupInactive(): number {
    let removed = 0;
    const now = Date.now();
    const timeout = 60000; // 1 minute

    for (const [userId, presence] of this.users) {
      if (now - presence.lastSeen > timeout) {
        this.leaveCampanha(userId);
        removed++;
      }
    }

    return removed;
  }

  private generateUserColor(userId: string): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];

    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

export const presenceManager = new PresenceManager();

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: "presence"; data: PresenceUpdate }
  | { type: "notification"; data: { title: string; message: string; icon?: string } }
  | { type: "sync"; data: { action: string; payload: any } }
  | { type: "cursor"; data: { userId: string; x: number; y: number } }
  | { type: "pong" };

/**
 * Broadcast presence to all users in a campaign
 */
export function broadcastPresence(campanhaId: string, presence: UserPresence[]): void {
  // In production with real WebSockets:
  // presence.forEach(user => {
  //   socket.emit('presence_update', presence);
  // });

  console.log(`[Presence] Broadcasting ${presence.length} users in campaign ${campanhaId}`);
}

/**
 * Notify user of real-time event
 */
export function notifyUser(userId: string, notification: { title: string; message: string }): void {
  // In production:
  // socket.emit('notification', notification);

  console.log(`[Notification] ${userId}: ${notification.title}`);
}

/**
 * Clean up inactive users periodically
 */
export function startPresenceCleanup(interval = 30000): NodeJS.Timer {
  return setInterval(() => {
    const removed = presenceManager.cleanupInactive();
    if (removed > 0) {
      console.log(`[Cleanup] Removed ${removed} inactive users`);
    }
  }, interval);
}
