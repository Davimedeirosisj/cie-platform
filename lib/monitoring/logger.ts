/**
 * Structured Logging - Fase 3 Sprint 4
 *
 * Centralized logging for production
 * Integrates with error tracking (Sentry) and monitoring (Vercel Analytics)
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  campanhaId?: string;
  requestId?: string;
  duration_ms?: number;
};

class Logger {
  /**
   * Log entry with structured data
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Console output
    const logFn = level === "critical" || level === "error" ? console.error : console.log;
    logFn(`[${level.toUpperCase()}] ${message}`, context || "");

    // Send to monitoring service if available
    this.sendToMonitoring(entry);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    console.error(`[ERROR] ${message}`, error, context || "");
    this.sendToMonitoring(entry);

    // Send to error tracking (Sentry)
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error || new Error(message));
    }
  }

  critical(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "critical",
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    console.error(`[CRITICAL] ${message}`, error, context || "");
    this.sendToMonitoring(entry);

    // Alert on critical errors
    this.alertCritical(message, error);
  }

  /**
   * Log API request with timing
   */
  request(method: string, path: string, statusCode: number, duration_ms: number): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "debug";

    this.log(level, `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration_ms,
    });
  }

  /**
   * Log cache operation
   */
  cache(operation: "get" | "set" | "delete", key: string, hit: boolean, duration_ms: number): void {
    this.debug(`Cache ${operation}: ${key}`, {
      operation,
      key,
      hit,
      duration_ms,
    });
  }

  /**
   * Log database operation
   */
  database(operation: string, duration_ms: number, rowsAffected?: number): void {
    this.debug(`DB ${operation}`, {
      operation,
      duration_ms,
      rowsAffected,
    });
  }

  /**
   * Send to monitoring service
   */
  private sendToMonitoring(entry: LogEntry): void {
    // Vercel Analytics
    if (typeof process !== "undefined" && process.env.VERCEL) {
      // Could send to custom analytics endpoint
    }

    // Could also send to centralized logging (e.g., Datadog, LogRocket)
  }

  /**
   * Alert on critical errors
   */
  private alertCritical(message: string, error?: Error): void {
    // In production, would send to alerting system
    // e.g., PagerDuty, Slack, email
    console.error(`⚠️ CRITICAL ALERT: ${message}`, error);
  }
}

export const logger = new Logger();

/**
 * Middleware to log requests
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration_ms: number
): void {
  logger.request(method, path, statusCode, duration_ms);
}
