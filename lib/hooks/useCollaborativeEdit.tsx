/**
 * Collaborative Edit Hook - Fase 4 Sprint 2
 *
 * Enables real-time collaborative editing with OT
 * Multiple users can edit same form/field simultaneously
 */

"use client";

import React, { useCallback, useReducer, useRef, useEffect } from "react";
import { OperationalTransformManager, type Operation } from "@/lib/realtime/operational-transform";

export type CollaborativeEditState = {
  data: Record<string, any>;
  pendingChanges: Operation[];
  appliedChanges: Operation[];
  conflicts: Array<{
    local: Operation;
    remote: Operation;
    resolved: boolean;
  }>;
  lastSync: number;
};

type EditAction =
  | { type: "CHANGE"; path: string; value: any; userId: string }
  | { type: "REMOTE_CHANGE"; operation: Operation }
  | { type: "SYNC"; operations: Operation[] }
  | { type: "RESET"; data: Record<string, any> };

function editReducer(state: CollaborativeEditState, action: EditAction): CollaborativeEditState {
  switch (action.type) {
    case "CHANGE": {
      const op: Operation = {
        id: `${action.userId}-${Date.now()}`,
        userId: action.userId,
        timestamp: Date.now(),
        type: "update",
        path: action.path,
        newValue: action.value,
        version: 1,
      };

      return {
        ...state,
        data: { ...state.data, [action.path.split(".")[0]]: action.value },
        pendingChanges: [...state.pendingChanges, op],
      };
    }

    case "REMOTE_CHANGE": {
      return {
        ...state,
        appliedChanges: [...state.appliedChanges, action.operation],
      };
    }

    case "SYNC": {
      return {
        ...state,
        pendingChanges: [],
        lastSync: Date.now(),
      };
    }

    case "RESET": {
      return {
        ...state,
        data: action.data,
        pendingChanges: [],
      };
    }

    default:
      return state;
  }
}

export function useCollaborativeEdit(
  initialData: Record<string, any>,
  userId: string,
  onSync?: (operations: Operation[]) => Promise<void>
) {
  const otManagerRef = useRef(new OperationalTransformManager());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [state, dispatch] = useReducer(editReducer, {
    data: initialData,
    pendingChanges: [],
    appliedChanges: [],
    conflicts: [],
    lastSync: Date.now(),
  });

  // Handle local change
  const handleChange = useCallback(
    (path: string, value: any) => {
      dispatch({ type: "CHANGE", path, value, userId });

      // Apply to OT manager
      const op = otManagerRef.current.applyLocalOperation({
        id: `${userId}-${Date.now()}`,
        userId,
        timestamp: Date.now(),
        type: "update",
        path,
        newValue: value,
      });

      console.log(`[Edit] ${userId} changed ${path} to ${value}`);
    },
    [userId]
  );

  // Handle remote change
  const handleRemoteChange = useCallback((operation: Operation) => {
    const result = otManagerRef.current.applyRemoteOperation(operation);

    if (result.accepted) {
      dispatch({ type: "REMOTE_CHANGE", operation });
      console.log(
        `[Edit] Applied remote change: ${operation.path}${result.conflict ? ` (conflict: ${result.conflict})` : ""}`
      );
    }
  }, []);

  // Sync pending changes to server
  const syncChanges = useCallback(async () => {
    if (state.pendingChanges.length === 0) return;

    try {
      if (onSync) {
        await onSync(state.pendingChanges);
      }

      dispatch({ type: "SYNC", operations: [] });
      console.log(`[Sync] Synced ${state.pendingChanges.length} changes`);
    } catch (err) {
      console.error("[Sync] Failed to sync changes:", err);
    }
  }, [state.pendingChanges, onSync]);

  // Auto-sync every 5 seconds
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      syncChanges();
    }, 5000);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncChanges]);

  // Reset to server data
  const resetToRemote = useCallback((data: Record<string, any>) => {
    dispatch({ type: "RESET", data });
    otManagerRef.current = new OperationalTransformManager();
  }, []);

  return {
    data: state.data,
    pendingChanges: state.pendingChanges,
    hasUnsyncedChanges: state.pendingChanges.length > 0,
    handleChange,
    handleRemoteChange,
    syncChanges,
    resetToRemote,
  };
}

/**
 * Form wrapper with collaborative editing
 */
export function CollaborativeFormWrapper({
  children,
  onSync,
  userId,
  initialData,
}: {
  children: (props: ReturnType<typeof useCollaborativeEdit>) => React.ReactNode;
  onSync?: (operations: Operation[]) => Promise<void>;
  userId: string;
  initialData: Record<string, any>;
}) {
  const props = useCollaborativeEdit(initialData, userId, onSync);

  return (
    <div>
      {/* Show unsync indicator */}
      {props.hasUnsyncedChanges && (
        <div className="text-xs text-amber-600 mb-2">
          💾 {props.pendingChanges.length} unsaved changes
        </div>
      )}

      {children(props)}
    </div>
  );
}
