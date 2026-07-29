/**
 * Operational Transformation - Fase 4 Sprint 2
 *
 * Enables collaborative editing with automatic conflict resolution
 * Allows concurrent edits from multiple users without conflicts
 *
 * Concepts:
 * - Operation: Edit action (insert, update, delete)
 * - Transform: Adjust operations when conflicts occur
 * - Vector Clock: Track causality across distributed edits
 */

export type Operation = {
  id: string; // Unique operation ID
  userId: string; // Who made the edit
  timestamp: number; // When it was made
  type: "insert" | "update" | "delete";
  path: string; // JSON path to field (e.g., "metas[0].valor_meta")
  oldValue?: any; // Previous value
  newValue?: any; // New value
  version: number; // Vector clock version for this user
};

export type OperationHistory = {
  operations: Operation[];
  vectorClock: Record<string, number>; // userId -> version
  lastApplied: number; // Latest operation index applied
};

/**
 * Operational Transform Manager
 * Handles concurrent edits and conflict resolution
 */
export class OperationalTransformManager {
  private history: OperationHistory = {
    operations: [],
    vectorClock: {},
    lastApplied: -1,
  };

  /**
   * Apply a local operation (user's own edit)
   */
  applyLocalOperation(operation: Omit<Operation, "version">): Operation {
    const version = (this.history.vectorClock[operation.userId] ?? 0) + 1;
    const fullOp: Operation = {
      ...operation,
      version,
    };

    this.history.operations.push(fullOp);
    this.history.vectorClock[operation.userId] = version;

    return fullOp;
  }

  /**
   * Apply a remote operation (from another user)
   * Handles conflict resolution via transformation
   */
  applyRemoteOperation(remoteOp: Operation): {
    accepted: boolean;
    transformed?: Operation;
    conflict?: string;
  } {
    // Check for conflicts with pending local operations
    const conflicts = this.detectConflicts(remoteOp);

    if (conflicts.length === 0) {
      // No conflicts, apply directly
      this.history.operations.push(remoteOp);
      this.history.vectorClock[remoteOp.userId] = Math.max(
        remoteOp.version,
        this.history.vectorClock[remoteOp.userId] ?? 0
      );

      return { accepted: true };
    }

    // Conflicts detected, transform the operation
    let transformedOp = { ...remoteOp };

    for (const conflict of conflicts) {
      transformedOp = this.transform(transformedOp, conflict);
    }

    this.history.operations.push(transformedOp);

    return {
      accepted: true,
      transformed: transformedOp,
      conflict: conflicts.map((c) => c.id).join(","),
    };
  }

  /**
   * Detect conflicts between operations
   * Conflict = operations affecting same field in different orders
   */
  private detectConflicts(remoteOp: Operation): Operation[] {
    return this.history.operations
      .slice(this.history.lastApplied + 1)
      .filter((op) => {
        // Same field being edited
        if (op.path === remoteOp.path) {
          // Different users
          if (op.userId !== remoteOp.userId) {
            // Different logical order (not causally dependent)
            return !this.isCausallyDependent(op, remoteOp);
          }
        }
        return false;
      });
  }

  /**
   * Check if one operation happened-before another
   * Uses vector clock for causality detection
   */
  private isCausallyDependent(op1: Operation, op2: Operation): boolean {
    // If op2's version > op1's version for op1's user, then op1 happened before op2
    const op1UserVersion = this.history.vectorClock[op1.userId] ?? 0;
    return op2.version > op1UserVersion;
  }

  /**
   * Transform: adjust operation based on concurrent change
   * Ensures converging state across all clients
   */
  private transform(remoteOp: Operation, localOp: Operation): Operation {
    // Different fields: no transformation needed
    if (remoteOp.path !== localOp.path) {
      return remoteOp;
    }

    // Same field: apply transformation rules
    return this.transformSamePath(remoteOp, localOp);
  }

  /**
   * Transformation rules for same field
   */
  private transformSamePath(remoteOp: Operation, localOp: Operation): Operation {
    // Last-write-wins strategy for simple conflicts
    if (remoteOp.timestamp > localOp.timestamp) {
      // Remote is newer, keep it
      return remoteOp;
    }

    if (remoteOp.timestamp < localOp.timestamp) {
      // Local is newer, transform remote to not conflict
      return {
        ...remoteOp,
        // Mark as stale but keep for history
        type: "delete",
      };
    }

    // Same timestamp: use user ID as tiebreaker (deterministic)
    if (remoteOp.userId < localOp.userId) {
      return remoteOp;
    } else {
      return {
        ...remoteOp,
        type: "delete",
      };
    }
  }

  /**
   * Get current state by applying all non-deleted operations
   */
  getState(basePath: string): Record<string, any> {
    const state: Record<string, any> = {};

    for (const op of this.history.operations) {
      if (op.type === "delete") continue;

      if (op.path.startsWith(basePath)) {
        this.setAtPath(state, op.path, op.newValue);
      }
    }

    return state;
  }

  /**
   * Utility to set value at JSON path
   */
  private setAtPath(obj: any, path: string, value: any): void {
    const parts = path.split(".");
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Get operation history for sync
   */
  getHistory(fromIndex: number = 0): Operation[] {
    return this.history.operations.slice(fromIndex);
  }

  /**
   * Mark operations as applied locally
   */
  markApplied(upToIndex: number): void {
    this.history.lastApplied = Math.max(this.history.lastApplied, upToIndex);
  }

  /**
   * Get vector clock for replication
   */
  getVectorClock(): Record<string, number> {
    return { ...this.history.vectorClock };
  }
}

export const otManager = new OperationalTransformManager();

/**
 * Example: Two users editing same field
 *
 * Initial state: { meta: { valor: 1000 } }
 *
 * User A (10:30:00): changes valor from 1000 → 1100
 * User B (10:30:02): changes valor from 1000 → 1050
 *
 * Result (after OT):
 * - User A's change applied (newer timestamp)
 * - User B's change transformed (older timestamp becomes no-op)
 * - Final state: { meta: { valor: 1100 } }
 */
