import type { Sandbox } from '@cloudflare/sandbox';
import type { CollabSession } from './collab';

export type Env = { 
  RUNS: KVNamespace; 
  SANDBOX?: DurableObjectNamespace<Sandbox>; // Cloudflare Sandbox binding (Production only)
  COLLAB_SESSION: DurableObjectNamespace<CollabSession>; // Collaborative editing sessions
  DB: D1Database; // D1 database for projects, keys, usage
  
  // App configuration
  APP_NAME: string;
  APP_URL?: string;
  ENVIRONMENT?: string;
  
  // Stripe configuration
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_ID: string; // Metered price ID from Stripe
  STRIPE_PRICE_PER_RUN?: string; // Default: 0.001
  STRIPE_PRICE_PER_CPU_MS?: string; // Default: 0.00001
  
  // Free tier limits
  FREE_TIER_RUNS_LIMIT?: string; // Default: 100
  
  // Email configuration (for magic links)
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  
  // Optional: Embed script
  EMBED_JS?: string;
};

const RUN_INDEX_KEY = "runs:index";

export async function saveRun(env: Env, result: unknown, id: string) {
  await env.RUNS.put(`runs:${id}`, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 7 });
  const idxRaw = await env.RUNS.get(RUN_INDEX_KEY);
  const idx = idxRaw ? (JSON.parse(idxRaw) as string[]) : [];
  idx.unshift(id);
  const trimmed = idx.slice(0, 200);
  await env.RUNS.put(RUN_INDEX_KEY, JSON.stringify(trimmed));
}

export async function getRun(env: Env, id: string) {
  const raw = await env.RUNS.get(`runs:${id}`);
  return raw ? JSON.parse(raw) : null;
}

export async function listRuns(env: Env, limit = 50) {
  const idxRaw = await env.RUNS.get(RUN_INDEX_KEY);
  const idx = idxRaw ? (JSON.parse(idxRaw) as string[]) : [];
  const ids = idx.slice(0, limit);
  const items = await Promise.all(ids.map((id) => getRun(env, id)));
  return items.filter(Boolean);
}

