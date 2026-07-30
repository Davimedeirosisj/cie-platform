/**
 * Presence Hook - Fase 4 Sprint 1
 *
 * Manages user presence in real-time
 * Tracks active users viewing same campaign
 * Updates cursor positions and location changes
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserPresence } from "@/lib/realtime/websocket-server";

export type PresenceHookOptions = {
  userId: string;
  userName: string;
  campanhaId: string;
  location: string;
  updateInterval?: number; // ms between cursor position updates
};

export function usePresence({
  userId,
  userName,
  campanhaId,
  location,
  updateInterval = 500,
}: PresenceHookOptions) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Join campaign on mount
  useEffect(() => {
    // Simulate joining
    console.log(`[Presence] ${userName} joined ${campanhaId} at ${location}`);

    // In production with real WebSockets:
    // const ws = new WebSocket(...);
    // ws.send(JSON.stringify({
    //   type: 'presence',
    //   data: { type: 'join', userId, userName, campanhaId, location }
    // }));

    setIsConnected(true);

    // Fetch initial presence
    fetchPresence(campanhaId);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      console.log(`[Presence] Heartbeat from ${userName}`);
      fetchPresence(campanhaId);
    }, updateInterval);

    return () => {
      clearInterval(heartbeat);
      // Notify leave
      console.log(`[Presence] ${userName} left ${campanhaId}`);
    };
  }, [userId, userName, campanhaId, location, updateInterval]);

  const fetchPresence = useCallback(
    async (id: string) => {
      try {
        // In production, fetch from WebSocket server
        // For now, mock data
        const mockPresence: UserPresence[] = [
          {
            userId: "user-1",
            userName: "Alice",
            campanhaId: id,
            location: "/dashboard",
            lastSeen: Date.now(),
            color: "#FF6B6B",
          },
          {
            userId: "user-2",
            userName: "Bob",
            campanhaId: id,
            location: "/rankings",
            lastSeen: Date.now(),
            color: "#4ECDC4",
          },
        ];

        setActiveUsers(mockPresence);
      } catch (err) {
        console.error("Failed to fetch presence:", err);
      }
    },
    []
  );

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    // Send to WebSocket
    console.log(`[Cursor] ${userName} at (${x}, ${y})`);
    // ws.send(JSON.stringify({
    //   type: 'cursor',
    //   data: { userId, x, y }
    // }));
  }, [userId, userName]);

  // Update location
  const updateLocation = useCallback((newLocation: string) => {
    // Send to WebSocket
    console.log(`[Location] ${userName} moved to ${newLocation}`);
    // ws.send(JSON.stringify({
    //   type: 'presence',
    //   data: { type: 'update', userId, campanhaId, location: newLocation }
    // }));
  }, [userId, campanhaId, userName]);

  return {
    activeUsers,
    isConnected,
    updateCursor,
    updateLocation,
  };
}

/**
 * Component to display active users
 */
export function ActiveUsersIndicator({ users }: { users: UserPresence[] }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
      <div className="text-xs font-medium text-slate-600">
        {users.length} active
      </div>
      <div className="flex gap-1">
        {users.map((user) => (
          <div
            key={user.userId}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: user.color }}
            title={`${user.userName} at ${user.location}`}
          >
            {user.userName[0]}
          </div>
        ))}
      </div>
    </div>
  );
}
