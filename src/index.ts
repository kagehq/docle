import { Hono } from "hono";
import { cors } from "hono/cors";
import { RunRequest, RunResult } from "./lib/schema";
import { saveRun, Env } from "./lib/kv";
import { runInSandbox, simulateExec } from "./lib/sandbox";
import { CollabSession } from "./lib/collab";

// Authentication middleware
import { requireAuth, requireSession, checkRateLimit } from "./api/auth";

// Magic link auth handlers
import {
  requestMagicLink,
  verifyMagicLink,
  logout,
  getCurrentUser,
} from "./api/magic-link";

// Usage tracking
import { recordExecutionUsage } from "./api/usage";

// Billing
import { handleStripeWebhook } from "./api/billing";

// Database functions
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getProjectById,
  type Project,
  type Session,
} from "./lib/db";

// Stripe functions
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
} from "./lib/stripe";

// UI templates
import { dashboardHTML, billingHTML, loginHTML } from "./lib/ui";

// Usage helpers
import { getUsageSummary, getUsageTrends } from "./api/usage";

// Export Sandbox Durable Object for Container integration (Production only)
// Required for production deploys
export { Sandbox } from "@cloudflare/sandbox";

// Define context variables type
type ContextVariables = {
  project?: Project;
  session?: Session;
  authenticated?: boolean;
};

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();
app.use("*", cors());

// Middleware to prevent compression issues with proxy
app.use("*", async (c, next) => {
  await next();
  // Remove any compression headers that might conflict with the proxy
  c.res.headers.delete("Content-Encoding");
});

// =============================================
// PUBLIC ROUTES
// =============================================

// Health check / API info
app.get("/", (c) => {
  return c.json({
    name: "Docle API",
    version: "2.0.0",
    description: "Secure code execution API powered by Cloudflare Sandbox",
    endpoints: {
      "POST /api/run": "Execute code (requires API key)",
      "GET /api/run/:id": "Get execution result by ID",
      "GET /embed.js": "CDN embed script",
      "POST /auth/magic-link": "Request magic link login",
      "GET /auth/verify": "Verify magic link",
      "GET /dashboard": "Web dashboard (requires session)",
    },
    playground: "https://app.docle.co",
    docs: "https://github.com/kagehq/docle",
  });
});

// Serve CDN embed script
app.get("/embed.js", async (c) => {
  try {
    // In production, serve the built embed.js from KV or inline
    // For now, redirect to unpkg or serve inline
    const embedScript = c.env.EMBED_JS || (await c.env.RUNS.get("embed.js"));

    if (embedScript) {
      return c.body(embedScript, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
      });
    }

    // Fallback: return a simple redirect or error
    return c.text("Embed script not found. Build and upload embed.js first.", 404);
  } catch (e: any) {
    return c.text(`Error serving embed script: ${e.message}`, 500);
  }
});

// =============================================
// AUTHENTICATION ROUTES (Magic Link)
// =============================================

// Login page
app.get("/login", (c) => {
  return c.html(loginHTML());
});

// Request magic link
app.post("/auth/magic-link", requestMagicLink);

// Verify magic link and create session
app.get("/auth/verify", verifyMagicLink);

// Logout
app.post("/auth/logout", logout);

// Get current user
app.get("/auth/me", requireSession, getCurrentUser);

// =============================================
// DASHBOARD ROUTES (Session Auth)
// =============================================

app.get("/dashboard", requireSession, async (c) => {
  const project = c.get("project")!;

  // Get API keys
  const apiKeys = await listApiKeys(c.env, project.id);

  // Get current month usage
  const usage = await getUsageSummary(c.env, project.id);

  // Get usage trends
  const trends = await getUsageTrends(c.env, project.id, 6);

  return c.html(
    dashboardHTML({
      project,
      apiKeys,
      usage,
      trends,
    })
  );
});

// Billing page
app.get("/dashboard/billing", requireSession, async (c) => {
  const project = c.get("project")!;

  // Get current usage
  const usage = await getUsageSummary(c.env, project.id);

  // Get invoices
  const invoices = await c.env.DB.prepare(
    "SELECT * FROM invoices WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 12"
  )
    .bind(project.id)
    .all();

  // Generate Stripe URLs if needed
  let checkoutUrl;
  let portalUrl;

  if (project.plan === "free") {
    // Create checkout URL for upgrade
    const customerId = await getOrCreateStripeCustomer(c.env, project);
    checkoutUrl = await createCheckoutSession(
      c.env,
      customerId,
      project.id,
      `${c.env.APP_URL}/dashboard/billing?success=true`,
      `${c.env.APP_URL}/dashboard/billing?cancelled=true`
    );
  } else if (project.stripe_customer_id) {
    // Create portal URL for subscription management
    portalUrl = await createPortalSession(
      c.env,
      project.stripe_customer_id,
      `${c.env.APP_URL}/dashboard/billing`
    );
  }

  return c.html(
    billingHTML({
      project,
      usage,
      invoices: invoices.results || [],
      checkoutUrl,
      portalUrl,
    })
  );
});

// =============================================
// API KEY MANAGEMENT (Session Auth)
// =============================================

// Create new API key
app.post("/api/keys", requireSession, async (c) => {
  const project = c.get("project")!;
  const body = await c.req.json();
  const { name } = body;

  const result = await createApiKey(c.env, project.id, name);

  return c.json({
    message: "API key created successfully",
    key: result.key, // Only returned once!
    id: result.record.id,
    prefix: result.record.key_prefix,
  });
});

// List API keys
app.get("/api/keys", requireSession, async (c) => {
  const project = c.get("project")!;
  const keys = await listApiKeys(c.env, project.id);

  return c.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix,
      is_active: k.is_active === 1,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
  });
});

// Revoke API key
app.delete("/api/keys/:id", requireSession, async (c) => {
  const project = c.get("project")!;
  const keyId = c.req.param("id");

  // Verify key belongs to project
  const keys = await listApiKeys(c.env, project.id);
  const key = keys.find((k) => k.id === keyId);

  if (!key) {
    return c.json({ error: "API key not found" }, 404);
  }

  await revokeApiKey(c.env, keyId);

  return c.json({ message: "API key revoked successfully" });
});

// =============================================
// USAGE & STATS (Session Auth)
// =============================================

// Get usage stats
app.get("/api/usage", requireSession, async (c) => {
  const project = c.get("project")!;
  const period = c.req.query("period"); // Optional: YYYY-MM

  const usage = await getUsageSummary(c.env, project.id, period);

  return c.json(usage);
});

// Get usage trends
app.get("/api/usage/trends", requireSession, async (c) => {
  const project = c.get("project")!;
  const months = parseInt(c.req.query("months") || "6");

  const trends = await getUsageTrends(c.env, project.id, months);

  return c.json({ trends });
});

// =============================================
// CODE EXECUTION (API Key Auth)
// =============================================

// Execute code (authenticated with API key)
app.post("/api/run", requireAuth, checkRateLimit, async (c) => {
  try {
    const project = c.get("project")!;
    const body = await c.req.json();
    const parsed = RunRequest.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid payload", issues: parsed.error.flatten() }, 400);
    }

    const { code, files, entrypoint, packages, lang, policy: raw } = parsed.data;
    const policy = {
      timeoutMs: raw?.timeoutMs ?? 3000,
      memoryMB: raw?.memoryMB ?? 256,
      allowNet: raw?.allowNet ?? false,
    };
    const id = crypto.randomUUID();

    // Prepare sandbox options
    const sandboxOptions = {
      code,
      files,
      entrypoint,
      packages: packages?.packages,
    };

    // Use real Sandbox if available (production), otherwise simulate (local dev)
    const exec = c.env.SANDBOX
      ? await runInSandbox(c.env, sandboxOptions, lang, policy, id)
      : await simulateExec(sandboxOptions, lang, policy);

    const result: RunResult = {
      id,
      ok: exec.exitCode === 0,
      exitCode: exec.exitCode,
      stdout: exec.stdout,
      stderr: exec.stderr,
      usage: exec.usage,
      createdAt: new Date().toISOString(),
    };

    // Save run result
    await saveRun(c.env, result, id);

    // Record usage for billing
    await recordExecutionUsage(c.env, project, exec);

    return c.json(result);
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, 500);
  }
});

// Get execution result by ID
app.get("/api/run/:id", async (c) => {
  const raw = await c.env.RUNS.get(`runs:${c.req.param("id")}`);
  if (!raw) return c.json({ error: "not found" }, 404);
  return c.json(JSON.parse(raw));
});

// =============================================
// STRIPE WEBHOOKS
// =============================================

app.post("/api/stripe/webhook", handleStripeWebhook);

// =============================================
// COLLABORATIVE EDITING (WebSocket)
// =============================================

// Debug endpoint
app.get("/collab/test", (c) => {
  return c.json({
    message: "Collab routing works!",
    hasBinding: !!c.env.COLLAB_SESSION,
  });
});

// Collaborative editing WebSocket endpoint
app.get("/collab/:sessionId/websocket", async (c) => {
  const sessionId = c.req.param("sessionId");

  if (!c.env.COLLAB_SESSION) {
    return c.json(
      {
        error: "Collaborative editing not available",
        sessionId,
        hasBinding: false,
      },
      503
    );
  }

  try {
    const id = c.env.COLLAB_SESSION.idFromName(sessionId);
    const stub = c.env.COLLAB_SESSION.get(id);

    // Create a new request with just /websocket path for the DO
    // We need to preserve all headers, especially WebSocket upgrade headers
    const url = new URL(c.req.url);
    url.pathname = "/websocket";

    const doRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
      // @ts-ignore - WebSocket property
      duplex: "half",
    });

    // Forward the WebSocket upgrade request to the Durable Object
    return stub.fetch(doRequest);
  } catch (e: any) {
    return c.json({ error: e.message, sessionId }, 500);
  }
});

// Collaborative editing state endpoint
app.get("/collab/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");

  if (!c.env.COLLAB_SESSION) {
    return c.json({ error: "Collaborative editing not available" }, 503);
  }

  try {
    const id = c.env.COLLAB_SESSION.idFromName(sessionId);
    const stub = c.env.COLLAB_SESSION.get(id);

    // Create a new request with just /state path for the DO
    const url = new URL(c.req.url);
    url.pathname = "/state";

    const doRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
    });

    // Forward the state request to the Durable Object
    return stub.fetch(doRequest);
  } catch (e: any) {
    return c.json({ error: e.message, sessionId }, 500);
  }
});

export default app;
export { CollabSession };
