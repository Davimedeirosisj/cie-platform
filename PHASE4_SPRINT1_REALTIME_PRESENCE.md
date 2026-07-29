# Fase 4, Sprint 1: Real-time Presence & Collaboration 💬

## Overview

**Objective:** Implement real-time presence tracking for collaborative features

**Goals:**
1. Track active users per campaign
2. Display user presence with avatars and colors
3. Show who's viewing what
4. Enable cursor position tracking
5. Prepare for live editing in Sprint 2

---

## Implementation

### WebSocket Server (`lib/realtime/websocket-server.ts`)

**PresenceManager Class:**
```typescript
// Join campaign
presenceManager.joinCampanha(userId, userName, campanhaId, location);

// Get active users in campaign
const users = presenceManager.getCampanhaPresence(campanhaId);
// [
//   { userId, userName, location, color, lastSeen },
//   { userId, userName, location, color, lastSeen }
// ]

// Update user location
presenceManager.updatePresence(userId, { location: "/rankings" });

// Clean up inactive users (auto, 30s)
presenceManager.cleanupInactive();
```

**Features:**
- In-memory presence store (Redis ready for multi-instance)
- User color assignment (8 colors for avatars)
- Automatic cleanup of inactive users
- Campaign subscriber tracking

### Presence Hook (`lib/hooks/usePresence.ts`)

**Usage in Components:**
```typescript
const { activeUsers, isConnected, updateCursor, updateLocation } = usePresence({
  userId: "user-123",
  userName: "Alice",
  campanhaId: "campaign-1",
  location: "/dashboard",
  updateInterval: 500, // Update every 500ms
});

// Render active users
<ActiveUsersIndicator users={activeUsers} />

// Update on route change
router.push("/rankings");
updateLocation("/rankings");

// Track mouse position
document.onmousemove = (e) => {
  updateCursor(e.clientX, e.clientY);
};
```

---

## User Presence Display

### Avatar Ring

Each active user gets a colored avatar with initials:

```
┌─ Active Users Indicator ─┐
│ 3 active                 │
│ [A] [B] [C]              │
│                          │
│ A = Alice @ /dashboard   │
│ B = Bob @ /rankings      │
│ C = Carol @ /mapa        │
└──────────────────────────┘
```

### Color Assignment

8 unique colors for visual differentiation:
- #FF6B6B (Red)
- #4ECDC4 (Teal)
- #45B7D1 (Blue)
- #FFA07A (Coral)
- #98D8C8 (Mint)
- #F7DC6F (Yellow)
- #BB8FCE (Purple)
- #85C1E2 (Light Blue)

Color is deterministic (same user always gets same color).

---

## Real-time Message Types

```typescript
type WebSocketMessage =
  | {
      type: "presence";
      data: {
        type: "join" | "leave" | "update" | "cursor" | "action";
        userId: string;
        userName: string;
        campanhaId: string;
        location: string;
        data?: { cursorX, cursorY, selectedItem, action };
      };
    }
  | {
      type: "notification";
      data: { title: string; message: string };
    }
  | {
      type: "sync";
      data: { action: string; payload: any };
    }
  | {
      type: "pong"; // Keep-alive heartbeat
    };
```

---

## Integration Points

### In Dashboard Component

```typescript
// Show who else is viewing dashboard
<div className="border-b pb-4">
  <ActiveUsersIndicator users={activeUsers} />
</div>

// Update location on mount
useEffect(() => {
  updateLocation("/dashboard");
}, []);
```

### In Rankings Component

```typescript
// Track who's viewing rankings
usePresence({
  userId: userId,
  userName: userName,
  campanhaId: selectedCampanhaId,
  location: "/rankings",
});

// Display active users
<ActiveUsersIndicator users={activeUsers} />
```

### In Territory Management

```typescript
// Track editing activity
const { activeUsers, updateLocation } = usePresence({
  userId: userId,
  userName: userName,
  campanhaId: campanhaId,
  location: "/territorio",
  updateInterval: 1000, // Update once per second
});

// Show who's editing same territory
<div className="text-xs text-slate-500">
  Editing by: {activeUsers.map(u => u.userName).join(", ")}
</div>
```

---

## Performance Considerations

### Presence Update Frequency

**Default:** 500ms (2 updates/second per user)
- Fast enough to see cursor movement
- Not too chatty on network

**Adjust by location:**
```typescript
// High-traffic pages: 1000ms (1 update/sec)
usePresence({ ..., updateInterval: 1000 });

// Real-time editing: 250ms (4 updates/sec)
usePresence({ ..., updateInterval: 250 });
```

### Cleanup Strategy

**Automatic cleanup:**
- Inactive for 60s → removed from presence list
- Cleanup runs every 30s
- Prevents stale user entries

**Manual cleanup:**
```typescript
// On logout
presenceManager.leaveCampanha(userId);
```

---

## Scaling for Multi-Instance

**Current (single server):**
- In-memory presence store
- Works for <100 concurrent users

**Production (multi-instance):**
```typescript
// Use Redis instead of Map
import { redis } from "@/lib/redis/redis-client";

// Store presence in Redis
await redis.set(
  `presence:${userId}`,
  JSON.stringify(presence),
  "EX",
  60 // Expires in 60s
);

// Broadcast to all instances
await redis.publish(`presence:${campanhaId}`, JSON.stringify(update));
```

---

## Testing Presence

### Simulate Multiple Users

```typescript
// Simulate Alice joining
presenceManager.joinCampanha("user-1", "Alice", "campaign-1", "/dashboard");

// Simulate Bob joining same campaign
presenceManager.joinCampanha("user-2", "Bob", "campaign-1", "/rankings");

// Get active users
const active = presenceManager.getCampanhaPresence("campaign-1");
// Returns: [Alice, Bob]

// Alice moves to rankings
presenceManager.updatePresence("user-1", { location: "/rankings" });

// Get updated presence
const updated = presenceManager.getCampanhaPresence("campaign-1");
// Returns: [Alice (now at /rankings), Bob]
```

---

## Next Steps (Sprint 2)

**Live Editing & Conflict Resolution:**
- Operational transformation (OT) for concurrent edits
- Conflict resolution strategies
- Undo/redo across distributed users
- Change tracking and merge

**Features:**
- Live text field editing
- Vote entry collaboration
- Goal (meta) updates in real-time
- Automatic conflict detection

---

## Files Created

```
lib/realtime/websocket-server.ts (200 LOC)
├─ PresenceManager class
├─ Message types
└─ Broadcasting utilities

lib/hooks/usePresence.ts (150 LOC)
├─ usePresence hook
├─ ActiveUsersIndicator component
└─ Cursor tracking

PHASE4_SPRINT1_REALTIME_PRESENCE.md (this file)
```

---

## Summary

✅ **Sprint 1 Complete: Real-time Presence System**

| Feature | Status | Performance |
|---------|--------|-------------|
| Presence tracking | ✅ | <500ms updates |
| User avatars | ✅ | Deterministic colors |
| Location tracking | ✅ | Automatic cleanup |
| Active user display | ✅ | Live indicator |
| Cursor tracking | ✅ | Ready for Sprint 2 |

**Ready for Sprint 2: Live Editing & Collaboration**
