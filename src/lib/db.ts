/**
 * Database wrapper for D1 operations
 * Handles projects, API keys, usage tracking, magic links, and sessions
 */

import type { Env } from "./kv";

export type Project = {
  id: string;
  name: string;
  email: string | null;
  api_key: string;
  plan: "free" | "pro" | "enterprise";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiKey = {
  id: string;
  project_id: string;
  key_prefix: string;
  key_hash: string;
  name: string | null;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
};

export type Usage = {
  id: string;
  project_id: string;
  api_key_id: string | null;
  runs: number;
  cpu_ms: number;
  mem_mb: number;
  duration_ms: number;
  cost: number;
  period: string;
  created_at: string;
};

export type MagicLink = {
  id: string;
  email: string;
  token: string;
  project_id: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  project_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

// =====================
// PROJECTS
// =====================

export async function createProject(
  env: Env,
  data: { name: string; email?: string; plan?: string }
): Promise<Project> {
  const id = crypto.randomUUID();
  const apiKey = generateApiKey();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO projects (id, name, email, api_key, plan, created_at, updated_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(id, data.name, data.email || null, apiKey, data.plan || "free", now, now)
    .run();

  return {
    id,
    name: data.name,
    email: data.email || null,
    api_key: apiKey,
    plan: (data.plan as any) || "free",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getProjectById(env: Env, id: string): Promise<Project | null> {
  const result = await env.DB.prepare("SELECT * FROM projects WHERE id = ?1")
    .bind(id)
    .first<Project>();
  return result || null;
}

export async function getProjectByEmail(env: Env, email: string): Promise<Project | null> {
  const result = await env.DB.prepare("SELECT * FROM projects WHERE email = ?1")
    .bind(email)
    .first<Project>();
  return result || null;
}

export async function updateProject(
  env: Env,
  id: string,
  data: Partial<Project>
): Promise<void> {
  const now = new Date().toISOString();
  const fields = Object.keys(data)
    .filter((k) => k !== "id" && k !== "created_at")
    .map((k) => `${k} = ?`);
  
  if (fields.length === 0) return;

  const values = Object.entries(data)
    .filter(([k]) => k !== "id" && k !== "created_at")
    .map(([_, v]) => v);

  await env.DB.prepare(
    `UPDATE projects SET ${fields.join(", ")}, updated_at = ? WHERE id = ?`
  )
    .bind(...values, now, id)
    .run();
}

export async function listProjects(env: Env, limit = 50): Promise<Project[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM projects ORDER BY created_at DESC LIMIT ?1"
  )
    .bind(limit)
    .all<Project>();
  return result.results || [];
}

// =====================
// API KEYS
// =====================

export async function createApiKey(
  env: Env,
  projectId: string,
  name?: string
): Promise<{ key: string; record: ApiKey }> {
  const id = crypto.randomUUID();
  const key = generateApiKey();
  const keyHash = await hashApiKey(key);
  const keyPrefix = key.substring(0, 12); // e.g., "sk_live_abcd"

  await env.DB.prepare(
    `INSERT INTO api_keys (id, project_id, key_prefix, key_hash, name, is_active, created_at) 
     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)`
  )
    .bind(id, projectId, keyPrefix, keyHash, name || null, new Date().toISOString())
    .run();

  return {
    key, // Return plaintext key ONCE
    record: {
      id,
      project_id: projectId,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      name: name || null,
      is_active: 1,
      last_used_at: null,
      created_at: new Date().toISOString(),
    },
  };
}

export async function getProjectByApiKey(env: Env, key: string): Promise<Project | null> {
  const keyHash = await hashApiKey(key);

  const result = await env.DB.prepare(
    `SELECT p.* FROM projects p
     JOIN api_keys ak ON p.id = ak.project_id
     WHERE ak.key_hash = ?1 AND ak.is_active = 1`
  )
    .bind(keyHash)
    .first<Project>();

  // Update last_used_at
  if (result) {
    await env.DB.prepare(
      "UPDATE api_keys SET last_used_at = ?1 WHERE key_hash = ?2"
    )
      .bind(new Date().toISOString(), keyHash)
      .run();
  }

  return result || null;
}

export async function listApiKeys(env: Env, projectId: string): Promise<ApiKey[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM api_keys WHERE project_id = ?1 ORDER BY created_at DESC"
  )
    .bind(projectId)
    .all<ApiKey>();
  return result.results || [];
}

export async function revokeApiKey(env: Env, keyId: string): Promise<void> {
  await env.DB.prepare("UPDATE api_keys SET is_active = 0 WHERE id = ?1")
    .bind(keyId)
    .run();
}

// =====================
// USAGE TRACKING
// =====================

export async function recordUsage(
  env: Env,
  data: {
    projectId: string;
    apiKeyId?: string;
    runs?: number;
    cpuMs?: number;
    memMb?: number;
    durationMs?: number;
    cost?: number;
  }
): Promise<void> {
  const id = crypto.randomUUID();
  const period = new Date().toISOString().substring(0, 7); // YYYY-MM
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO usage (id, project_id, api_key_id, runs, cpu_ms, mem_mb, duration_ms, cost, period, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  )
    .bind(
      id,
      data.projectId,
      data.apiKeyId || null,
      data.runs || 0,
      data.cpuMs || 0,
      data.memMb || 0,
      data.durationMs || 0,
      data.cost || 0,
      period,
      now
    )
    .run();
}

export async function getUsageByProject(
  env: Env,
  projectId: string,
  limit = 100
): Promise<Usage[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM usage WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2"
  )
    .bind(projectId, limit)
    .all<Usage>();
  return result.results || [];
}

export async function getUsageByPeriod(
  env: Env,
  projectId: string,
  period: string
): Promise<Usage[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM usage WHERE project_id = ?1 AND period = ?2 ORDER BY created_at DESC"
  )
    .bind(projectId, period)
    .all<Usage>();
  return result.results || [];
}

export async function getAggregatedUsage(
  env: Env,
  projectId: string,
  period: string
): Promise<{
  totalRuns: number;
  totalCpuMs: number;
  totalMemMb: number;
  totalDurationMs: number;
  totalCost: number;
}> {
  const result = await env.DB.prepare(
    `SELECT 
      COALESCE(SUM(runs), 0) as totalRuns,
      COALESCE(SUM(cpu_ms), 0) as totalCpuMs,
      COALESCE(SUM(mem_mb), 0) as totalMemMb,
      COALESCE(SUM(duration_ms), 0) as totalDurationMs,
      COALESCE(SUM(cost), 0) as totalCost
     FROM usage 
     WHERE project_id = ?1 AND period = ?2`
  )
    .bind(projectId, period)
    .first<any>();

  return {
    totalRuns: Number(result?.totalRuns || 0),
    totalCpuMs: Number(result?.totalCpuMs || 0),
    totalMemMb: Number(result?.totalMemMb || 0),
    totalDurationMs: Number(result?.totalDurationMs || 0),
    totalCost: Number(result?.totalCost || 0),
  };
}

// =====================
// MAGIC LINKS
// =====================

export async function createMagicLink(
  env: Env,
  email: string
): Promise<MagicLink> {
  const id = crypto.randomUUID();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO magic_links (id, email, token, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(id, email, token, expiresAt, now)
    .run();

  return {
    id,
    email,
    token,
    project_id: null,
    expires_at: expiresAt,
    used_at: null,
    created_at: now,
  };
}

export async function getMagicLink(env: Env, token: string): Promise<MagicLink | null> {
  const result = await env.DB.prepare(
    "SELECT * FROM magic_links WHERE token = ?1"
  )
    .bind(token)
    .first<MagicLink>();
  return result || null;
}

export async function useMagicLink(env: Env, token: string, projectId: string): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE magic_links SET used_at = ?1, project_id = ?2 WHERE token = ?3"
  )
    .bind(now, projectId, token)
    .run();
}

// =====================
// SESSIONS
// =====================

export async function createSession(env: Env, projectId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (id, project_id, token, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(id, projectId, token, expiresAt, now)
    .run();

  return {
    id,
    project_id: projectId,
    token,
    expires_at: expiresAt,
    created_at: now,
  };
}

export async function getSession(env: Env, token: string): Promise<Session | null> {
  const result = await env.DB.prepare(
    "SELECT * FROM sessions WHERE token = ?1 AND expires_at > ?2"
  )
    .bind(token, new Date().toISOString())
    .first<Session>();
  return result || null;
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?1")
    .bind(token)
    .run();
}

// =====================
// HELPERS
// =====================

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sk_live_${key}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

