import type { Sandbox } from '@cloudflare/sandbox';
import type { CollabSession } from './collab';

export type Env = { 
  RUNS: KVNamespace; 
  SANDBOX?: DurableObjectNamespace<Sandbox>; // Cloudflare Sandbox binding (Production only)
  COLLAB_SESSION: DurableObjectNamespace<CollabSession>; // Collaborative editing sessions
  DB: D1Database; // D1 database for users, projects, API keys
  APP_NAME: string;
  APP_URL?: string;
  RESEND_API_KEY?: string; // Resend API key for sending magic link emails
  EMAIL_FROM?: string; // Email sender address (e.g. "Docle <onboarding@docle.co>")
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

