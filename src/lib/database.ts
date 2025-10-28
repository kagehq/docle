/**
 * Database operations for Docle SaaS
 */

import type { Env } from "./kv";

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type ApiKey = {
  id: string;
  project_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  allowed_domains: string | null;
  rate_limit_per_minute: number;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

export type MagicLink = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  used: number;
  created_at: string;
};

// =====================
// USERS
// =====================

export async function createUser(env: Env, email: string): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO users (id, email, created_at) VALUES (?1, ?2, ?3)"
  )
    .bind(id, email, now)
    .run();

  return { id, email, created_at: now };
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const result = await env.DB.prepare("SELECT * FROM users WHERE email = ?1")
    .bind(email)
    .first<User>();
  return result || null;
}

export async function getUserById(env: Env, id: string): Promise<User | null> {
  const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?1")
    .bind(id)
    .first<User>();
  return result || null;
}

// =====================
// PROJECTS
// =====================

export async function createProject(
  env: Env,
  userId: string,
  name: string
): Promise<Project> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO projects (id, user_id, name, created_at) VALUES (?1, ?2, ?3, ?4)"
  )
    .bind(id, userId, name, now)
    .run();

  return { id, user_id: userId, name, created_at: now };
}

export async function getProjectsByUser(env: Env, userId: string): Promise<Project[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM projects WHERE user_id = ?1 ORDER BY created_at DESC"
  )
    .bind(userId)
    .all<Project>();
  return result.results || [];
}

export async function getProjectById(env: Env, projectId: string): Promise<Project | null> {
  const result = await env.DB.prepare("SELECT * FROM projects WHERE id = ?1")
    .bind(projectId)
    .first<Project>();
  return result || null;
}

// =====================
// API KEYS
// =====================

export async function createApiKey(
  env: Env,
  projectId: string,
  name?: string,
  allowedDomains?: string[],
  rateLimitPerMinute?: number
): Promise<{ key: string; record: ApiKey }> {
  const id = crypto.randomUUID();
  const key = generateApiKey();
  const keyHash = await hashKey(key);
  const keyPrefix = key.substring(0, 12);
  const now = new Date().toISOString();
  const domainsJson = allowedDomains && allowedDomains.length > 0 ? JSON.stringify(allowedDomains) : null;
  const rateLimit = rateLimitPerMinute || 60; // Default: 60 requests per minute

  await env.DB.prepare(
    "INSERT INTO api_keys (id, project_id, key_hash, key_prefix, name, allowed_domains, rate_limit_per_minute, is_active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)"
  )
    .bind(id, projectId, keyHash, keyPrefix, name || null, domainsJson, rateLimit, now)
    .run();

  return {
    key,
    record: {
      id,
      project_id: projectId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name || null,
      allowed_domains: domainsJson,
      rate_limit_per_minute: rateLimit,
      is_active: 1,
      last_used_at: null,
      created_at: now,
    },
  };
}

export async function validateApiKey(env: Env, key: string, origin?: string): Promise<{ project: Project; allowedDomains: string[] | null; rateLimitPerMinute: number } | null> {
  const keyHash = await hashKey(key);
  const now = new Date().toISOString();

  const result = await env.DB.prepare(
    `SELECT p.*, ak.allowed_domains, ak.rate_limit_per_minute, ak.key_hash FROM projects p
     JOIN api_keys ak ON p.id = ak.project_id
     WHERE ak.key_hash = ?1 AND ak.is_active = 1`
  )
    .bind(keyHash)
    .first<Project & { allowed_domains: string | null; rate_limit_per_minute: number; key_hash: string }>();

  if (!result) {
    return null;
  }

  // Parse allowed domains
  const allowedDomains = result.allowed_domains ? JSON.parse(result.allowed_domains) : null;

  // Check domain restrictions if configured
  if (allowedDomains && allowedDomains.length > 0) {
    // If domains are restricted but no origin provided, reject the request
    if (!origin) {
      return null;
    }

    const originHostname = new URL(origin).hostname;
    const isAllowed = allowedDomains.some((domain: string) => {
      // Support wildcard domains like *.example.com
      if (domain.startsWith('*.')) {
        const domainSuffix = domain.slice(2);
        return originHostname === domainSuffix || originHostname.endsWith('.' + domainSuffix);
      }
      return originHostname === domain;
    });

    if (!isAllowed) {
      return null;
    }
  }

  // Update last_used_at
  await env.DB.prepare("UPDATE api_keys SET last_used_at = ?1 WHERE key_hash = ?2")
    .bind(now, keyHash)
    .run();

  // Remove extra fields from project object
  const { allowed_domains, rate_limit_per_minute, key_hash, ...project } = result;

  return {
    project: project as Project,
    allowedDomains,
    rateLimitPerMinute: rate_limit_per_minute
  };
}

export async function getApiKeysByProject(env: Env, projectId: string): Promise<ApiKey[]> {
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
// SESSIONS
// =====================

export async function createSession(env: Env, userId: string): Promise<Session> {
  const id = crypto.randomUUID();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
  )
    .bind(id, userId, token, expiresAt, now)
    .run();

  return { id, user_id: userId, token, expires_at: expiresAt, created_at: now };
}

export async function getSession(env: Env, token: string): Promise<Session | null> {
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "SELECT * FROM sessions WHERE token = ?1 AND expires_at > ?2"
  )
    .bind(token, now)
    .first<Session>();
  return result || null;
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?1")
    .bind(token)
    .run();
}

// =====================
// MAGIC LINKS
// =====================

export async function createMagicLink(env: Env, email: string): Promise<MagicLink> {
  const id = crypto.randomUUID();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO magic_links (id, email, token, expires_at, used, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)"
  )
    .bind(id, email, token, expiresAt, now)
    .run();

  return { id, email, token, expires_at: expiresAt, used: 0, created_at: now };
}

export async function getMagicLink(env: Env, token: string): Promise<MagicLink | null> {
  const result = await env.DB.prepare("SELECT * FROM magic_links WHERE token = ?1")
    .bind(token)
    .first<MagicLink>();
  return result || null;
}

export async function markMagicLinkUsed(env: Env, token: string): Promise<void> {
  await env.DB.prepare("UPDATE magic_links SET used = 1 WHERE token = ?1")
    .bind(token)
    .run();
}

// =====================
// USAGE TRACKING
// =====================

export async function trackUsage(
  env: Env,
  projectId: string | null,
  ipAddress: string | null,
  language: string,
  codeSnippet: string,
  status: string,
  exitCode: number,
  executionTimeMs?: number
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Truncate code snippet to 500 chars
  const truncatedCode = codeSnippet.length > 500 ? codeSnippet.substring(0, 500) + '...' : codeSnippet;

  await env.DB.prepare(
    "INSERT INTO usage (id, project_id, ip_address, language, code_snippet, status, exit_code, execution_time_ms, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
  )
    .bind(id, projectId, ipAddress, language, truncatedCode, status, exitCode, executionTimeMs || 0, now)
    .run();
}

export async function getUsageCount(
  env: Env,
  projectId: string | null,
  ipAddress: string | null,
  date: string
): Promise<number> {
  let query: string;
  let bindings: any[];

  if (projectId) {
    query = "SELECT COUNT(*) as total FROM usage WHERE project_id = ?1 AND DATE(created_at) = ?2";
    bindings = [projectId, date];
  } else {
    query = "SELECT COUNT(*) as total FROM usage WHERE ip_address = ?1 AND DATE(created_at) = ?2";
    bindings = [ipAddress, date];
  }

  const result = await env.DB.prepare(query)
    .bind(...bindings)
    .first<{ total: number }>();

  return result?.total || 0;
}

export async function getProjectUsageStats(
  env: Env,
  projectId: string
): Promise<{
  total_runs: number;
  python_runs: number;
  nodejs_runs: number;
  success_rate: number;
  history: Array<{
    id: string;
    language: string;
    code_snippet: string;
    status: string;
    exit_code: number;
    execution_time_ms: number;
    created_at: string;
  }>;
}> {
  // Total runs
  const totalResult = await env.DB.prepare(
    "SELECT COUNT(*) as total_runs FROM usage WHERE project_id = ?1"
  )
    .bind(projectId)
    .first<{ total_runs: number }>();

  // Python runs
  const pythonResult = await env.DB.prepare(
    "SELECT COUNT(*) as python_runs FROM usage WHERE project_id = ?1 AND language = 'python'"
  )
    .bind(projectId)
    .first<{ python_runs: number }>();

  // Node.js runs
  const nodejsResult = await env.DB.prepare(
    "SELECT COUNT(*) as nodejs_runs FROM usage WHERE project_id = ?1 AND language = 'node'"
  )
    .bind(projectId)
    .first<{ nodejs_runs: number }>();

  // Success rate
  const successResult = await env.DB.prepare(
    "SELECT COUNT(*) as success_count FROM usage WHERE project_id = ?1 AND status = 'success'"
  )
    .bind(projectId)
    .first<{ success_count: number }>();

  const totalRuns = totalResult?.total_runs || 0;
  const successCount = successResult?.success_count || 0;
  const successRate = totalRuns > 0 ? (successCount / totalRuns) * 100 : 0;

  // Recent history (last 50 runs)
  const historyResult = await env.DB.prepare(
    "SELECT id, language, code_snippet, status, exit_code, execution_time_ms, created_at FROM usage WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 50"
  )
    .bind(projectId)
    .all<{
      id: string;
      language: string;
      code_snippet: string;
      status: string;
      exit_code: number;
      execution_time_ms: number;
      created_at: string;
    }>();

  return {
    total_runs: totalRuns,
    python_runs: pythonResult?.python_runs || 0,
    nodejs_runs: nodejsResult?.nodejs_runs || 0,
    success_rate: Math.round(successRate * 10) / 10, // Round to 1 decimal
    history: historyResult.results || [],
  };
}

export async function getProjectTotalUsage(
  env: Env,
  projectId: string
): Promise<{ total_runs: number }> {
  const result = await env.DB.prepare(
    "SELECT COUNT(*) as total_runs FROM usage WHERE project_id = ?1"
  )
    .bind(projectId)
    .first<{ total_runs: number }>();

  return result || { total_runs: 0 };
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

export async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

