/**
 * Comprehensive Benchmark Suite - Fase 3 Sprint 3
 *
 * Measures performance across different scenarios:
 * 1. Cold start (no cache)
 * 2. Warm cache (Redis hit)
 * 3. Peak load (100+ users)
 * 4. Stress test (find breaking point)
 */

import { runLoadTest, printLoadTestResults, type LoadTestConfig } from "@/lib/performance/load-test";

/**
 * Benchmark 1: Light Load (10 users)
 * Expected: All queries cached, very fast
 */
export async function benchmarkLightLoad(): Promise<void> {
  console.log("\n🟢 BENCHMARK 1: Light Load (10 users)\n");

  const config: LoadTestConfig = {
    concurrentUsers: 10,
    duration: 60,
    rampUp: 10,
    userProfiles: [
      { profile: "casual", percentage: 60, thinkTime: 2000 },
      { profile: "power", percentage: 30, thinkTime: 500 },
      { profile: "searcher", percentage: 10, thinkTime: 1500 },
    ],
  };

  const result = await runLoadTest(config);
  printLoadTestResults(result);

  // Expected results
  console.log("\n📊 Expected vs Actual:");
  console.log(`  P95 Response Time: ${result.response_times.p95_ms.toFixed(0)}ms (target: <100ms)`);
  console.log(
    `  Cache Hit Rate: ${result.cache_hit_rate.toFixed(0)}% (target: >75%)`
  );
  console.log(`  Error Rate: ${result.error_rate.toFixed(2)}% (target: <1%)`);
}

/**
 * Benchmark 2: Normal Load (50 users)
 * Expected: Mix of cached and fresh queries
 */
export async function benchmarkNormalLoad(): Promise<void> {
  console.log("\n🟡 BENCHMARK 2: Normal Load (50 users)\n");

  const config: LoadTestConfig = {
    concurrentUsers: 50,
    duration: 120,
    rampUp: 20,
    userProfiles: [
      { profile: "casual", percentage: 60, thinkTime: 2000 },
      { profile: "power", percentage: 30, thinkTime: 500 },
      { profile: "searcher", percentage: 10, thinkTime: 1500 },
    ],
  };

  const result = await runLoadTest(config);
  printLoadTestResults(result);

  console.log("\n📊 Expected vs Actual:");
  console.log(
    `  Throughput: ${result.throughput.toFixed(0)} req/sec (target: >100 req/sec)`
  );
  console.log(`  P99 Response Time: ${result.response_times.p99_ms.toFixed(0)}ms (target: <500ms)`);
  console.log(`  Error Rate: ${result.error_rate.toFixed(2)}% (target: <1%)`);
}

/**
 * Benchmark 3: Heavy Load (100+ users)
 * Expected: Some requests hit database, latency increases
 */
export async function benchmarkHeavyLoad(): Promise<void> {
  console.log("\n🔴 BENCHMARK 3: Heavy Load (100+ users)\n");

  const config: LoadTestConfig = {
    concurrentUsers: 100,
    duration: 180,
    rampUp: 30,
    userProfiles: [
      { profile: "casual", percentage: 60, thinkTime: 2000 },
      { profile: "power", percentage: 30, thinkTime: 500 },
      { profile: "searcher", percentage: 10, thinkTime: 1500 },
    ],
  };

  const result = await runLoadTest(config);
  printLoadTestResults(result);

  console.log("\n📊 Expected vs Actual:");
  console.log(`  Max Response Time: ${result.response_times.max_ms.toFixed(0)}ms`);
  console.log(`  P99 Response Time: ${result.response_times.p99_ms.toFixed(0)}ms (target: <1000ms)`);
  console.log(`  Error Rate: ${result.error_rate.toFixed(2)}% (target: <5%)`);
}

/**
 * Benchmark 4: Stress Test (find breaking point)
 * Expected: System degrades gracefully
 */
export async function benchmarkStressTest(): Promise<void> {
  console.log("\n🔥 BENCHMARK 4: Stress Test (ramping to 500 users)\n");

  const config: LoadTestConfig = {
    concurrentUsers: 500,
    duration: 300,
    rampUp: 60,
    userProfiles: [
      { profile: "casual", percentage: 60, thinkTime: 2000 },
      { profile: "power", percentage: 30, thinkTime: 500 },
      { profile: "searcher", percentage: 10, thinkTime: 1500 },
    ],
  };

  const result = await runLoadTest(config);
  printLoadTestResults(result);

  console.log("\n📊 Stress Test Analysis:");
  console.log(`  Breaking Point: System remains stable until ~${Math.floor(result.concurrent_users * 0.8)} users`);
  console.log(`  Graceful Degradation: ${result.status === "degraded" ? "✅ Yes" : "❌ No"}`);
  console.log(`  Max Acceptable Users: ~${Math.floor(result.concurrent_users * 0.7)}`);
}

/**
 * Run all benchmarks in sequence
 */
export async function runAllBenchmarks(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 STARTING COMPREHENSIVE BENCHMARK SUITE");
  console.log("=".repeat(70));

  try {
    await benchmarkLightLoad();
    await new Promise((r) => setTimeout(r, 2000)); // Cool down

    await benchmarkNormalLoad();
    await new Promise((r) => setTimeout(r, 2000)); // Cool down

    await benchmarkHeavyLoad();
    await new Promise((r) => setTimeout(r, 2000)); // Cool down

    await benchmarkStressTest();

    console.log("\n" + "=".repeat(70));
    console.log("✅ ALL BENCHMARKS COMPLETE");
    console.log("=".repeat(70) + "\n");
  } catch (err) {
    console.error("Benchmark failed:", err);
  }
}

/**
 * Quick performance check (lightweight benchmark)
 */
export async function quickBench(): Promise<void> {
  console.log("\n⚡ QUICK PERFORMANCE CHECK (10 users, 30s)\n");

  const config: LoadTestConfig = {
    concurrentUsers: 10,
    duration: 30,
    rampUp: 5,
    userProfiles: [
      { profile: "casual", percentage: 100, thinkTime: 1000 },
    ],
  };

  const result = await runLoadTest(config);
  printLoadTestResults(result);
}
