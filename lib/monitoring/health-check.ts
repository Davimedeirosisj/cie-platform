/**
 * Health Check System - Fase 3 Sprint 4
 *
 * Monitors system health and reports status
 * Tracks:
 * - Database connectivity
 * - Redis cache connectivity
 * - Response latency
 * - Error rates
 * - Resource usage
 */

import { createClient } from "@/lib/supabase/client";
import { cacheHealthCheck } from "@/lib/redis/redis-client";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthCheckResult = {
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: {
      status: HealthStatus;
      latency_ms?: number;
      error?: string;
    };
    redis: {
      status: HealthStatus;
      latency_ms?: number;
      error?: string;
    };
    memory: {
      status: HealthStatus;
      usage_mb: number;
      available_mb?: number;
    };
  };
  metrics: {
    uptime_seconds: number;
    request_count: number;
    error_count: number;
    error_rate: number;
  };
};

class HealthMonitor {
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;

  recordRequest(error?: Error): void {
    this.requestCount++;
    if (error) this.errorCount++;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.checkMemory(),
    };

    // Determine overall status
    const statuses = Object.values(checks).map((c) => c.status);
    const hasUnhealthy = statuses.includes("unhealthy");
    const hasDegraded = statuses.includes("degraded");
    const status: HealthStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

    return {
      status,
      timestamp,
      checks,
      metrics: {
        uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        request_count: this.requestCount,
        error_count: this.errorCount,
        error_rate: this.requestCount === 0 ? 0 : (this.errorCount / this.requestCount) * 100,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult["checks"]["database"]> {
    try {
      const start = performance.now();
      const supabase = createClient();

      // Simple connectivity check
      await supabase.auth.getSession();

      const latency = performance.now() - start;

      return {
        status: latency < 100 ? "healthy" : latency < 500 ? "degraded" : "unhealthy",
        latency_ms: Math.round(latency),
      };
    } catch (err) {
      return {
        status: "unhealthy",
        error: err instanceof Error ? err.message : "Unknown database error",
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult["checks"]["redis"]> {
    try {
      const start = performance.now();
      const isHealthy = await cacheHealthCheck();

      const latency = performance.now() - start;

      return {
        status: isHealthy ? (latency < 50 ? "healthy" : "degraded") : "unhealthy",
        latency_ms: Math.round(latency),
      };
    } catch (err) {
      return {
        status: "degraded", // Redis is optional
        error: err instanceof Error ? err.message : "Redis check failed",
      };
    }
  }

  private checkMemory(): HealthCheckResult["checks"]["memory"] {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return {
        status: "healthy",
        usage_mb: 0,
      };
    }

    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const percentUsed = (usedMB / totalMB) * 100;

    return {
      status: percentUsed > 90 ? "unhealthy" : percentUsed > 75 ? "degraded" : "healthy",
      usage_mb: usedMB,
      available_mb: totalMB - usedMB,
    };
  }
}

export const healthMonitor = new HealthMonitor();

/**
 * API endpoint for health checks
 * GET /api/health
 */
export async function handleHealthCheck(): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const result = await healthMonitor.performHealthCheck();

  return {
    statusCode: result.status === "healthy" ? 200 : result.status === "degraded" ? 503 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
    body: JSON.stringify(result),
  };
}

/**
 * Format health check for logging
 */
export function formatHealthStatus(result: HealthCheckResult): string {
  return `
Health Status: ${result.status.toUpperCase()}
Timestamp: ${result.timestamp}

Database: ${result.checks.database.status} ${result.checks.database.latency_ms}ms
Redis: ${result.checks.redis.status} ${result.checks.redis.latency_ms}ms
Memory: ${result.checks.memory.status} (${result.checks.memory.usage_mb}MB used)

Uptime: ${result.metrics.uptime_seconds}s
Requests: ${result.metrics.request_count}
Errors: ${result.metrics.error_count}
Error Rate: ${result.metrics.error_rate.toFixed(2)}%
`;
}
