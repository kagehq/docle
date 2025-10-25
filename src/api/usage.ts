/**
 * Usage tracking and metering helpers
 */

import type { Env } from "../lib/kv";
import type { Project } from "../lib/db";
import { recordUsage } from "../lib/db";
import { calculateCost, reportUsageToStripe } from "../lib/stripe";

/**
 * Record usage for a code execution
 */
export async function recordExecutionUsage(
  env: Env,
  project: Project,
  execution: {
    exitCode: number;
    usage?: {
      cpuMs?: number;
      memMB?: number;
      durationMs?: number;
    };
  }
): Promise<void> {
  const cpuMs = execution.usage?.cpuMs || 0;
  const memMb = execution.usage?.memMB || 0;
  const durationMs = execution.usage?.durationMs || 0;

  // Calculate cost based on usage
  const cost = calculateCost(env, {
    runs: 1,
    cpuMs,
    durationMs,
  });

  // Record in database
  await recordUsage(env, {
    projectId: project.id,
    runs: 1,
    cpuMs,
    memMb,
    durationMs,
    cost,
  });

  // Report to Stripe for metered billing (Pro+ plans only)
  if (project.plan !== "free" && project.stripe_subscription_id) {
    // Report 1 unit per run (can be customized based on pricing model)
    await reportUsageToStripe(env, project, 1);
  }
}

/**
 * Get usage summary for a project
 */
export async function getUsageSummary(
  env: Env,
  projectId: string,
  period?: string
): Promise<{
  period: string;
  runs: number;
  cpuMs: number;
  memMb: number;
  durationMs: number;
  cost: number;
  avgDurationMs: number;
  avgCpuMs: number;
}> {
  const { getAggregatedUsage } = await import("../lib/db");
  const targetPeriod = period || new Date().toISOString().substring(0, 7);
  const usage = await getAggregatedUsage(env, projectId, targetPeriod);

  return {
    period: targetPeriod,
    runs: usage.totalRuns,
    cpuMs: usage.totalCpuMs,
    memMb: usage.totalMemMb,
    durationMs: usage.totalDurationMs,
    cost: usage.totalCost,
    avgDurationMs: usage.totalRuns > 0 ? usage.totalDurationMs / usage.totalRuns : 0,
    avgCpuMs: usage.totalRuns > 0 ? usage.totalCpuMs / usage.totalRuns : 0,
  };
}

/**
 * Get usage trends over multiple periods
 */
export async function getUsageTrends(
  env: Env,
  projectId: string,
  months = 6
): Promise<
  Array<{
    period: string;
    runs: number;
    cost: number;
  }>
> {
  const { getAggregatedUsage } = await import("../lib/db");
  const trends = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = date.toISOString().substring(0, 7);
    const usage = await getAggregatedUsage(env, projectId, period);

    trends.push({
      period,
      runs: usage.totalRuns,
      cost: usage.totalCost,
    });
  }

  return trends.reverse(); // Oldest to newest
}

