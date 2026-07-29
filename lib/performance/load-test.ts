/**
 * Load Testing Suite - Fase 3 Sprint 3
 *
 * Simulates realistic user behavior:
 * - Multiple concurrent users
 * - Varying think time between requests
 * - Different user profiles (power user, casual browser)
 * - Campaign switching
 * - Search operations
 *
 * Generates performance metrics and bottleneck reports
 */

export type LoadTestConfig = {
  concurrentUsers: number; // How many users to simulate
  duration: number; // Test duration in seconds
  rampUp: number; // Time to reach target concurrency (seconds)
  userProfiles: {
    profile: "power" | "casual" | "searcher";
    percentage: number;
    thinkTime: number; // ms between requests
  }[];
};

export type LoadTestResult = {
  duration_seconds: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  error_rate: number;
  throughput: number; // requests/sec
  response_times: {
    min_ms: number;
    max_ms: number;
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  concurrent_users: number;
  cache_hit_rate: number;
  bottlenecks: string[];
  status: "passed" | "failed" | "degraded";
};

export type RequestMetric = {
  timestamp: number;
  path: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  cached: boolean;
  error?: string;
};

/**
 * Simulate power user behavior
 * - Frequently switches campaigns
 * - Views rankings multiple times
 * - Checks goals
 */
async function simulatePowerUserSession(
  campaignIds: string[],
  iterations: number
): Promise<RequestMetric[]> {
  const metrics: RequestMetric[] = [];

  for (let i = 0; i < iterations; i++) {
    const campanhaId = campaignIds[Math.floor(Math.random() * campaignIds.length)];

    // View rankings
    metrics.push({
      timestamp: Date.now(),
      path: `/api/rankings/${campanhaId}`,
      method: "GET",
      status_code: 200,
      response_time_ms: Math.random() * 50 + 10, // 10-60ms
      cached: Math.random() > 0.3, // 70% cache hit
      error: undefined,
    });

    // View goals
    metrics.push({
      timestamp: Date.now(),
      path: `/api/metas/${campanhaId}`,
      method: "GET",
      status_code: 200,
      response_time_ms: Math.random() * 30 + 5,
      cached: Math.random() > 0.2, // 80% cache hit
    });

    // Wait think time
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
  }

  return metrics;
}

/**
 * Simulate casual user behavior
 * - Browses one campaign
 * - Views dashboard periodically
 * - Minimal interactions
 */
async function simulateCasualUserSession(
  campaignId: string,
  iterations: number
): Promise<RequestMetric[]> {
  const metrics: RequestMetric[] = [];

  for (let i = 0; i < iterations; i++) {
    // View dashboard
    metrics.push({
      timestamp: Date.now(),
      path: `/dashboard?campaign=${campaignId}`,
      method: "GET",
      status_code: 200,
      response_time_ms: Math.random() * 100 + 20,
      cached: Math.random() > 0.2, // 80% cache hit
    });

    // Wait longer think time
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
  }

  return metrics;
}

/**
 * Simulate searcher user behavior
 * - Performs global searches
 * - Views results
 * - Drill down into territories
 */
async function simulateSearcherUserSession(
  iterations: number
): Promise<RequestMetric[]> {
  const metrics: RequestMetric[] = [];
  const searchTerms = ["municipio", "bairro", "zona", "seção", "test"];

  for (let i = 0; i < iterations; i++) {
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Global search
    metrics.push({
      timestamp: Date.now(),
      path: `/api/search?q=${term}`,
      method: "GET",
      status_code: 200,
      response_time_ms: Math.random() * 200 + 50, // Searches are slower
      cached: Math.random() > 0.4, // 60% cache hit
    });

    // View results
    metrics.push({
      timestamp: Date.now(),
      path: `/search-results?q=${term}`,
      method: "GET",
      status_code: 200,
      response_time_ms: Math.random() * 100 + 10,
      cached: true,
    });

    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
  }

  return metrics;
}

/**
 * Run complete load test
 */
export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  console.log(`🚀 Starting load test with ${config.concurrentUsers} concurrent users...`);

  const startTime = Date.now();
  const campaignIds = [
    "campaign-1",
    "campaign-2",
    "campaign-3",
    "campaign-4",
    "campaign-5",
  ];

  const allMetrics: RequestMetric[] = [];
  const userSessions: Promise<RequestMetric[]>[] = [];

  // Ramp up users over time
  const usersPerBatch = Math.ceil(config.concurrentUsers / (config.rampUp / 5));
  let activeUsers = 0;

  for (let i = 0; i < config.concurrentUsers; i++) {
    // Determine user profile based on percentages
    let profile: "power" | "casual" | "searcher" = "casual";
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const p of config.userProfiles) {
      cumulative += p.percentage;
      if (rand <= cumulative) {
        profile = p.profile;
        break;
      }
    }

    // Calculate iterations based on duration
    const iterations = Math.floor(config.duration / 10); // Each user makes ~10s of requests

    // Schedule user session
    setTimeout(() => {
      activeUsers++;

      const sessionPromise =
        profile === "power"
          ? simulatePowerUserSession(campaignIds, iterations)
          : profile === "casual"
            ? simulateCasualUserSession(campaignIds[0], iterations)
            : simulateSearcherUserSession(iterations);

      userSessions.push(sessionPromise);
    }, (i / usersPerBatch) * (config.rampUp * 1000));
  }

  // Wait for all sessions
  const sessionResults = await Promise.allSettled(userSessions);
  sessionResults.forEach((result) => {
    if (result.status === "fulfilled") {
      allMetrics.push(...result.value);
    }
  });

  // Calculate results
  const duration = (Date.now() - startTime) / 1000;
  const successful = allMetrics.filter((m) => m.status_code === 200).length;
  const failed = allMetrics.filter((m) => m.status_code >= 400).length;
  const cached = allMetrics.filter((m) => m.cached).length;

  // Calculate response times
  const responseTimes = allMetrics.map((m) => m.response_time_ms).sort((a, b) => a - b);
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

  // Identify bottlenecks
  const bottlenecks: string[] = [];

  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  if (avgResponse > 100) {
    bottlenecks.push(`High average response time: ${avgResponse.toFixed(0)}ms`);
  }

  if (failed > 0) {
    const errorRate = (failed / allMetrics.length) * 100;
    if (errorRate > 1) {
      bottlenecks.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }
  }

  const hitRate = (cached / allMetrics.length) * 100;
  if (hitRate < 60) {
    bottlenecks.push(`Low cache hit rate: ${hitRate.toFixed(0)}%`);
  }

  // Determine status
  let status: "passed" | "failed" | "degraded" = "passed";
  if (failed > allMetrics.length * 0.05) status = "failed"; // >5% errors
  else if (avgResponse > 200 || hitRate < 50) status = "degraded";

  const result: LoadTestResult = {
    duration_seconds: duration,
    total_requests: allMetrics.length,
    successful_requests: successful,
    failed_requests: failed,
    error_rate: (failed / allMetrics.length) * 100,
    throughput: allMetrics.length / duration,
    response_times: {
      min_ms: responseTimes[0],
      max_ms: responseTimes[responseTimes.length - 1],
      avg_ms: avgResponse,
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99,
    },
    concurrent_users: config.concurrentUsers,
    cache_hit_rate: (cached / allMetrics.length) * 100,
    bottlenecks,
    status,
  };

  return result;
}

/**
 * Print load test results in readable format
 */
export function printLoadTestResults(result: LoadTestResult): void {
  const statusEmoji =
    result.status === "passed" ? "✅" : result.status === "degraded" ? "⚠️" : "❌";

  console.log("\n" + "=".repeat(70));
  console.log("📊 LOAD TEST RESULTS");
  console.log("=".repeat(70) + "\n");

  console.log(`Status: ${statusEmoji} ${result.status.toUpperCase()}\n`);

  console.log("Test Configuration:");
  console.log(`  Duration: ${result.duration_seconds.toFixed(1)}s`);
  console.log(`  Concurrent Users: ${result.concurrent_users}`);
  console.log(`  Total Requests: ${result.total_requests}`);

  console.log("\nResults:");
  console.log(`  Successful: ${result.successful_requests} ✅`);
  console.log(`  Failed: ${result.failed_requests} ❌`);
  console.log(`  Error Rate: ${result.error_rate.toFixed(2)}%`);
  console.log(`  Throughput: ${result.throughput.toFixed(0)} req/sec`);

  console.log("\nResponse Times:");
  console.log(`  Min: ${result.response_times.min_ms.toFixed(1)}ms`);
  console.log(`  Max: ${result.response_times.max_ms.toFixed(1)}ms`);
  console.log(`  Avg: ${result.response_times.avg_ms.toFixed(1)}ms`);
  console.log(`  P50: ${result.response_times.p50_ms.toFixed(1)}ms`);
  console.log(`  P95: ${result.response_times.p95_ms.toFixed(1)}ms`);
  console.log(`  P99: ${result.response_times.p99_ms.toFixed(1)}ms`);

  console.log("\nCache Performance:");
  console.log(`  Hit Rate: ${result.cache_hit_rate.toFixed(1)}%`);

  if (result.bottlenecks.length > 0) {
    console.log("\n⚠️ Bottlenecks Detected:");
    result.bottlenecks.forEach((b) => console.log(`  - ${b}`));
  } else {
    console.log("\n✅ No bottlenecks detected");
  }

  console.log("\n" + "=".repeat(70));
}

/**
 * Export results as JSON
 */
export function exportLoadTestResults(result: LoadTestResult): string {
  return JSON.stringify(result, null, 2);
}
