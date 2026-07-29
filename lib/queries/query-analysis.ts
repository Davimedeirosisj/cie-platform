/**
 * Query Analysis Tools - Fase 3 Sprint 1
 *
 * Utilities for analyzing query performance and identifying bottlenecks
 * Uses Supabase's EXPLAIN ANALYZE to get query plans
 */

import { createClient } from "@/lib/supabase/client";

export type QueryPlan = {
  plan: string;
  duration_ms: number;
  rows_returned: number;
  sequential_scan_count: number;
  index_scan_count: number;
  sort_count: number;
  is_optimized: boolean;
  recommendations: string[];
};

export type QueryMetrics = {
  query: string;
  execution_time_ms: number;
  rows_affected: number;
  indexes_used: string[];
  full_scans: number;
  status: "fast" | "slow" | "critical";
};

/**
 * Analyze a query using EXPLAIN ANALYZE
 * Returns execution plan and performance metrics
 */
export async function analyzeQuery(sql: string): Promise<QueryPlan> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc("explain_analyze", {
      p_sql: sql,
    });

    if (error) throw error;

    const plan_text = data?.[0]?.QUERY_PLAN ?? "";
    return parseQueryPlan(plan_text);
  } catch (err) {
    console.error("Query analysis error:", err);
    return {
      plan: "Error analyzing query",
      duration_ms: 0,
      rows_returned: 0,
      sequential_scan_count: 0,
      index_scan_count: 0,
      sort_count: 0,
      is_optimized: false,
      recommendations: ["Failed to analyze query"],
    };
  }
}

/**
 * Parse PostgreSQL EXPLAIN output
 */
function parseQueryPlan(plan_text: string): QueryPlan {
  const lines = plan_text.split("\n");
  const sequentialScans = lines.filter((l) => l.includes("Seq Scan")).length;
  const indexScans = lines.filter((l) => l.includes("Index")).length;
  const sorts = lines.filter((l) => l.includes("Sort")).length;

  // Extract execution time (look for "Execution Time: X.XXX ms")
  const timeMatch = plan_text.match(/Execution Time: ([\d.]+) ms/);
  const duration_ms = timeMatch ? parseFloat(timeMatch[1]) : 0;

  // Extract planning time
  const planningMatch = plan_text.match(/Planning Time: ([\d.]+) ms/);
  const planning_ms = planningMatch ? parseFloat(planningMatch[1]) : 0;

  // Generate recommendations based on plan
  const recommendations: string[] = [];

  if (sequentialScans > 0) {
    recommendations.push(
      `${sequentialScans} sequential table scans found - consider adding indexes`
    );
  }

  if (duration_ms > 100) {
    recommendations.push(
      `Query execution time (${duration_ms.toFixed(1)}ms) is high - optimize with indexes or query structure`
    );
  }

  if (sorts > 0 && indexScans === 0) {
    recommendations.push(`${sorts} sort operations without index scans - add indexes for ORDER BY columns`);
  }

  if (planning_ms > duration_ms / 2) {
    recommendations.push(`High planning time (${planning_ms.toFixed(1)}ms) - query plan may be complex`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Query appears well-optimized");
  }

  const is_optimized = sequentialScans === 0 && duration_ms < 50;

  return {
    plan: plan_text,
    duration_ms,
    rows_returned: 0, // Would need to parse from EXPLAIN output
    sequential_scan_count: sequentialScans,
    index_scan_count: indexScans,
    sort_count: sorts,
    is_optimized,
    recommendations,
  };
}

/**
 * Benchmark critical queries for dashboard
 * Measures execution time under realistic conditions
 */
export async function benchmarkDashboardQueries(
  campanhaId: string
): Promise<QueryMetrics[]> {
  const supabase = createClient();
  const metrics: QueryMetrics[] = [];

  // Query 1: Top municipalities (critical path)
  const t1 = performance.now();
  await supabase
    .from("vw_ranking_municipio")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("ranking")
    .limit(5);
  const d1 = performance.now() - t1;

  metrics.push({
    query: "Top 5 Municipalities (ranking)",
    execution_time_ms: d1,
    rows_affected: 5,
    indexes_used: ["vw_ranking_municipio view"],
    full_scans: 0,
    status: d1 < 50 ? "fast" : d1 < 150 ? "slow" : "critical",
  });

  // Query 2: Aggregated bairros votes
  const t2 = performance.now();
  await supabase
    .from("vw_votos_bairro")
    .select("*")
    .eq("campanha_id", campanhaId);
  const d2 = performance.now() - t2;

  metrics.push({
    query: "Votes by Bairro (aggregation)",
    execution_time_ms: d2,
    rows_affected: 0, // Unknown
    indexes_used: ["vw_votos_bairro view"],
    full_scans: 1, // Views aggregate full data
    status: d2 < 100 ? "fast" : d2 < 300 ? "slow" : "critical",
  });

  // Query 3: Metas for campaign
  const t3 = performance.now();
  await supabase
    .from("metas")
    .select("*")
    .eq("campanha_id", campanhaId);
  const d3 = performance.now() - t3;

  metrics.push({
    query: "Goals (Metas) for campaign",
    execution_time_ms: d3,
    rows_affected: 0,
    indexes_used: ["idx_metas_campanha"],
    full_scans: 0,
    status: d3 < 50 ? "fast" : d3 < 150 ? "slow" : "critical",
  });

  // Query 4: Global search (slowest, uses ILIKE)
  const t4 = performance.now();
  await supabase.rpc("fn_busca_global", {
    p_termo: "test",
  });
  const d4 = performance.now() - t4;

  metrics.push({
    query: "Global Search (fn_busca_global)",
    execution_time_ms: d4,
    rows_affected: 0,
    indexes_used: ["trigram indexes on names/numbers"],
    full_scans: 4, // Searches across 4 tables
    status: d4 < 200 ? "fast" : d4 < 500 ? "slow" : "critical",
  });

  return metrics;
}

/**
 * Identify missing indexes based on table statistics
 * Looks for large tables with only FK indexes
 */
export async function identifyMissingIndexes(): Promise<
  Array<{
    table_name: string;
    estimated_rows: number;
    indexes: string[];
    recommendation: string;
  }>
> {
  const supabase = createClient();

  try {
    const { data } = await supabase.rpc("get_table_index_stats");

    if (!data) return [];

    return data
      .filter((t: any) => t.estimated_rows > 1000 && t.indexes.length < 3)
      .map((t: any) => ({
        table_name: t.table_name,
        estimated_rows: t.estimated_rows,
        indexes: t.indexes,
        recommendation: `Table "${t.table_name}" has ${t.estimated_rows} rows but only ${t.indexes.length} indexes`,
      }));
  } catch (err) {
    console.error("Failed to identify missing indexes:", err);
    return [];
  }
}

/**
 * Generate performance report
 */
export async function generateQueryPerformanceReport(
  campanhaId: string
): Promise<string> {
  const benchmarks = await benchmarkDashboardQueries(campanhaId);

  let report = "\n" + "=".repeat(70) + "\n";
  report += "📊 QUERY PERFORMANCE REPORT\n";
  report += "=".repeat(70) + "\n\n";

  benchmarks.forEach((metric) => {
    const emoji =
      metric.status === "fast" ? "✅" : metric.status === "slow" ? "⚠️" : "❌";
    report += `${emoji} ${metric.query}\n`;
    report += `   Time: ${metric.execution_time_ms.toFixed(1)}ms\n`;
    report += `   Indexes: ${metric.indexes_used.join(", ")}\n`;
    report += `   Full Scans: ${metric.full_scans}\n\n`;
  });

  const slowQueries = benchmarks.filter((m) => m.status !== "fast").length;
  report += `-`.repeat(70) + "\n";
  report += `Summary: ${slowQueries} slow queries detected\n`;
  report += `Total dashboard query time: ${benchmarks.reduce((sum, m) => sum + m.execution_time_ms, 0).toFixed(1)}ms\n`;
  report += "=".repeat(70) + "\n\n";

  return report;
}

/**
 * Export metrics for monitoring
 */
export function exportMetricsJSON(metrics: QueryMetrics[]): string {
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        total_queries: metrics.length,
        fast: metrics.filter((m) => m.status === "fast").length,
        slow: metrics.filter((m) => m.status === "slow").length,
        critical: metrics.filter((m) => m.status === "critical").length,
        avg_time_ms: metrics.reduce((sum, m) => sum + m.execution_time_ms, 0) / metrics.length,
      },
    },
    null,
    2
  );
}
