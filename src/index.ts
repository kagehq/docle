import { Hono } from "hono";
import { cors } from "hono/cors";
import { RunRequest, RunResult } from "./lib/schema";
import { saveRun, Env } from "./lib/kv";
import { runInSandbox, simulateExec } from "./lib/sandbox";
import { CollabSession } from "./lib/collab";
import { checkIPRateLimit, formatIPResetTime } from "./lib/ip-rate-limit";
import { checkRateLimit, formatResetTime } from "./lib/rate-limit";

// Database operations
import {
  createUser,
  getUserByEmail,
  getUserById,
  createProject,
  getProjectsByUser,
  getProjectById,
  createApiKey,
  validateApiKey,
  getApiKeysByProject,
  revokeApiKey,
  createSession,
  getSession,
  deleteSession,
  createMagicLink,
  getMagicLink,
  markMagicLinkUsed,
  trackUsage,
  getUsageCount,
  getProjectUsageStats,
  getProjectTotalUsage,
  hashKey,
  type User,
  type Project,
} from "./lib/database";

// UI pages removed - Nuxt handles all UI now

type Variables = {
  user?: User;
  project?: Project;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS Configuration
app.use("*", cors({
  origin: (origin) => {
    // Allow development origins
    const devOrigins = ['http://localhost:3001', 'http://localhost:8787', 'http://127.0.0.1:3001'];

    // Allow production origins - UPDATE THESE WITH YOUR ACTUAL DOMAINS
    const prodOrigins = [
      'https://app.docle.co',     // Your frontend domain
      'https://api.docle.co',     // Your API domain
      'https://docle.co',         // Root domain (if needed)
      // Example wildcards for subdomains (if needed):
      // 'https://staging.docle.co',
    ];

    const allowedOrigins = [...devOrigins, ...prodOrigins];

    // Allow if origin is in the list, or if no origin (same-origin requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return origin || '*';
    }

    // Allow Cloudflare Pages preview URLs (e.g., https://abc123.docle.pages.dev)
    if (origin && origin.match(/^https:\/\/[a-f0-9]+\.docle\.pages\.dev$/)) {
      return origin;
    }

    // Default: deny
    return allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-nuxt-api', 'accept-encoding'],
  exposeHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 600
}));

// Middleware to prevent compression issues with proxy
app.use("*", async (c, next) => {
  await next();
  c.res.headers.delete("Content-Encoding");
});

// Security: Request size limit (1MB)
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength) > 1_000_000) {
    return c.json({ error: "Request too large", max_size: "1MB" }, 413);
  }
  await next();
});

// Security: Content Security Policy headers
app.use("*", async (c, next) => {
  await next();
  c.res.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.docle.co; frame-ancestors *;");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "SAMEORIGIN");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
});

// =============================================
// PUBLIC ROUTES
// =============================================

// API info (root endpoint)
app.get("/", (c) => {
  return c.json({
    name: "Docle API",
    version: "2.0.0",
    message: "SaaS Code Execution Platform",
    dashboard: `${c.env.APP_URL || "http://localhost:3001"}/login`,
    docs: "https://github.com/kagehq/docle"
  });
});

// Request magic link
app.post("/auth/request", async (c) => {
  try {
    // IP-based rate limiting to prevent email bombing
    const ipAddress = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
    const ipRateLimit = await checkIPRateLimit(c.env, ipAddress, "auth-request", 5, 15);

    if (!ipRateLimit.allowed) {
      return c.json({
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again in ${formatIPResetTime(ipRateLimit.resetAt)}.`,
        retry_after: Math.ceil((ipRateLimit.resetAt - Date.now()) / 1000)
      }, 429);
    }

    const { email } = await c.req.json();

    if (!email || !isValidEmail(email)) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    // Create magic link
    const magicLink = await createMagicLink(c.env, email);

    // Magic link should point to the frontend URL (which proxies /auth to backend)
    // This ensures cookies are set on the frontend origin
    const verifyUrl = `${c.env.APP_URL || "http://localhost:3001"}/auth/verify?token=${magicLink.token}`;

    // Send email (in dev, just log it)
    if (c.env.RESEND_API_KEY) {
      await sendEmail(c.env, email, verifyUrl);
    } else {
      // Local dev: log to terminal
      console.log('\n' + '='.repeat(80));
      console.log('🔗  MAGIC LINK FOR LOCAL DEVELOPMENT');
      console.log('='.repeat(80));
      console.log(`📧  Email: ${email}`);
      console.log(`🔗  Link:  ${verifyUrl}`);
      console.log('='.repeat(80) + '\n');
    }

    return c.json({
      message: "Magic link sent! Check your email (or console in dev mode).",
    });
  } catch (error: any) {
    console.error("Error sending magic link:", error);
    return c.json({ error: "Failed to send magic link" }, 500);
  }
});

// Verify magic link and create session
app.get("/auth/verify", async (c) => {
  try {
    const rawToken = c.req.query("token");
    const token = rawToken ? rawToken.split(/[?#]/)[0] : undefined;

    if (!token) {
      return c.redirect(`${c.env.APP_URL || "http://localhost:3001"}/login?error=notoken`);
    }

    const magicLink = await getMagicLink(c.env, token);

    if (!magicLink || magicLink.used === 1) {
      return c.redirect(`${c.env.APP_URL || "http://localhost:3001"}/login?error=invalid`);
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(magicLink.expires_at);

    if (now > expiresAt) {
      return c.redirect(`${c.env.APP_URL || "http://localhost:3001"}/login?error=expired`);
    }

    // Get or create user
    let user = await getUserByEmail(c.env, magicLink.email);
    if (!user) {
      user = await createUser(c.env, magicLink.email);
    }

  // Mark magic link as used
  await markMagicLinkUsed(c.env, token);

  // Create session
  const session = await createSession(c.env, user.id);

    // Always set the cookie (important for production static deployments)
    const isProduction = c.env.APP_URL?.startsWith('https://');
    const cookieFlags = `HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=None; Max-Age=${30 * 24 * 60 * 60}; Path=/`;
    const cookieHeader = `docle_session=${session.token}; ${cookieFlags}`;

    // Check if this is an API call (from Nuxt server) or direct browser access
    const nuxtApiHeader = c.req.header('x-nuxt-api') || c.req.header('X-Nuxt-Api');
    const isApiCall = nuxtApiHeader === 'true';

    if (isApiCall) {
      // Return JSON response with cookie set
      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email
        }
      }, 200, {
        "Set-Cookie": cookieHeader,
      });
    } else {
      // Direct browser access - set cookie and redirect
      return c.redirect(`${c.env.APP_URL || "http://localhost:3001"}/`, 302, {
        "Set-Cookie": cookieHeader,
      });
    }
  } catch (error: any) {
    console.error("Error verifying magic link:", error);
    return c.redirect(`${c.env.APP_URL || "http://localhost:3001"}/login?error=failed`);
  }
});

// Logout (JSON API)
app.get("/api/logout", async (c) => {
  const sessionToken = getSessionToken(c);
  if (sessionToken) {
    await deleteSession(c.env, sessionToken);
  }

  const isProduction = c.env.APP_URL?.startsWith('https://');
  const cookieFlags = `HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0; Path=/`;

  return c.json(
    { message: "Logged out successfully" },
    200,
    {
      "Set-Cookie": `docle_session=; ${cookieFlags}`,
    }
  );
});

// =============================================
// AUTHENTICATED WEB ROUTES (Session required)
// =============================================

// Middleware: Require session
async function requireSession(c: any, next: Function) {
  const sessionToken = getSessionToken(c);
  const isApiRequest = c.req.path.startsWith('/api/');

  if (!sessionToken) {
    return isApiRequest ? c.json({ error: 'Unauthorized' }, 401) : c.redirect("/");
  }

  const session = await getSession(c.env, sessionToken);
  if (!session) {
    return isApiRequest ? c.json({ error: 'Unauthorized' }, 401) : c.redirect("/");
  }

  const user = await getUserById(c.env, session.user_id);
  if (!user) {
    return isApiRequest ? c.json({ error: 'Unauthorized' }, 401) : c.redirect("/");
  }

  c.set("user", user);
  await next();
}

// Get user dashboard data (JSON API)
app.get("/api/dashboard", requireSession, async (c) => {
  const user = c.get("user")!;
  const projects = await getProjectsByUser(c.env, user.id);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    projects,
  });
});

// Create project (JSON API)
app.post("/api/projects", requireSession, async (c) => {
  try {
    const user = c.get("user")!;
    const { name } = await c.req.json();

    if (!name || name.trim().length === 0) {
      return c.json({ error: "Project name is required" }, 400);
    }

    const project = await createProject(c.env, user.id, name.trim());

    return c.json({ project });
  } catch (error: any) {
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// Get project detail (JSON API)
app.get("/api/projects/:id", requireSession, async (c) => {
  const user = c.get("user")!;
  const projectId = c.req.param("id");

  const project = await getProjectById(c.env, projectId);

  if (!project || project.user_id !== user.id) {
    return c.json({ error: "Project not found" }, 404);
  }

  const apiKeys = await getApiKeysByProject(c.env, projectId);

  return c.json({
    project,
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      is_active: k.is_active === 1,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
    })),
  });
});

// Get project usage/analytics (JSON API)
app.get("/api/projects/:id/usage", requireSession, async (c) => {
  const user = c.get("user")!;
  const projectId = c.req.param("id");

  const project = await getProjectById(c.env, projectId);

  if (!project || project.user_id !== user.id) {
    return c.json({ error: "Project not found" }, 404);
  }

  const stats = await getProjectUsageStats(c.env, projectId);

  return c.json(stats);
});

// Get or create playground API key (JSON API)
app.post("/api/playground/key", requireSession, async (c) => {
  try {
    const user = c.get("user")!;

    // Check if user has a "Playground" project
    const projects = await getProjectsByUser(c.env, user.id);
    let playgroundProject = projects.find((p) => p.name === "Playground");

    // Create playground project if it doesn't exist
    if (!playgroundProject) {
      playgroundProject = await createProject(c.env, user.id, "Playground");
    }

    // Check if playground project has an active API key
    const apiKeys = await getApiKeysByProject(c.env, playgroundProject.id);
    let activeKey = apiKeys.find((k) => k.is_active === 1 && k.name === "Playground Key");

    // Create API key if none exists
    if (!activeKey) {
      const result = await createApiKey(c.env, playgroundProject.id, "Playground Key");
      return c.json({
        apiKey: result.key,
        projectId: playgroundProject.id,
        created: true
      });
    }

    // Return existing key prefix (we can't return the full key again for security)
    return c.json({
      apiKey: null, // We can't retrieve the full key, only the prefix
      projectId: playgroundProject.id,
      keyPrefix: activeKey.key_prefix,
      created: false,
      message: "Playground key already exists. Check your project for the full key."
    });
  } catch (error: any) {
    console.error("Playground key error:", error);
    return c.json({ error: "Failed to get/create playground key" }, 500);
  }
});

// Generate API key (JSON API)
app.post("/api/projects/:id/keys", requireSession, async (c) => {
  try {
    const user = c.get("user")!;
    const projectId = c.req.param("id");

    const project = await getProjectById(c.env, projectId);

    if (!project || project.user_id !== user.id) {
      return c.json({ error: "Project not found" }, 404);
    }

    const { name, allowedDomains, rateLimitPerMinute } = await c.req.json();
    const result = await createApiKey(c.env, projectId, name, allowedDomains, rateLimitPerMinute);

    return c.json({ key: result.key, id: result.record.id });
  } catch (error: any) {
    return c.json({ error: "Failed to generate API key" }, 500);
  }
});

// Revoke API key (JSON API)
app.delete("/api/keys/:id", requireSession, async (c) => {
  try {
    const user = c.get("user")!;
    const keyId = c.req.param("id");

    // Verify key belongs to user's project
    const projects = await getProjectsByUser(c.env, user.id);
    let found = false;

    for (const project of projects) {
      const keys = await getApiKeysByProject(c.env, project.id);
      if (keys.some((k) => k.id === keyId)) {
        found = true;
        break;
      }
    }

    if (!found) {
      return c.json({ error: "API key not found" }, 404);
    }

    await revokeApiKey(c.env, keyId);

    return c.json({ message: "API key revoked" });
  } catch (error: any) {
    return c.json({ error: "Failed to revoke API key" }, 500);
  }
});

// =============================================
// API ROUTES (Hybrid: Public + Authenticated)
// =============================================

// Execute code (API key required)
app.post("/api/run", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = RunRequest.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid payload", issues: parsed.error.flatten() }, 400);
    }

    const { code, files, entrypoint, packages, lang, policy: raw, userContext } = parsed.data;
    const policy = {
      timeoutMs: raw?.timeoutMs ?? 3000,
    };

    // API key is required for all requests
    const apiKey = c.req.header("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return c.json(
        {
          error: "API key required",
          message: "Sign in and create a project to get your API key",
          signup_url: `${c.env.APP_URL || "http://localhost:3001"}/login`,
        },
        401
      );
    }

    // Get origin from request headers
    const origin = c.req.header("origin") || c.req.header("referer");

    const validation = await validateApiKey(c.env, apiKey, origin);
    if (!validation) {
      return c.json({
        error: "Invalid or revoked API key, or domain not allowed",
        message: origin ? `Origin ${origin} is not in your allowed domains list` : "No origin provided"
      }, 401);
    }

    const project = validation.project;
    const rateLimitPerMinute = validation.rateLimitPerMinute;

    // Rate limiting check
    const apiKeyHash = await hashKey(apiKey);
    const rateLimit = await checkRateLimit(c.env, apiKeyHash, rateLimitPerMinute);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', rateLimitPerMinute.toString());
    c.header('X-RateLimit-Remaining', rateLimit.remaining.toString());
    c.header('X-RateLimit-Reset', rateLimit.resetAt.toString());

    if (!rateLimit.allowed) {
      return c.json({
        error: "Rate limit exceeded",
        message: `You have exceeded your rate limit of ${rateLimitPerMinute} requests per minute. Please try again in ${formatResetTime(rateLimit.resetAt)}.`,
        limit: rateLimitPerMinute,
        remaining: 0,
        reset_at: rateLimit.resetAt
      }, 429);
    }

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

    // Track usage with detailed info (including userContext if provided)
    const status = exec.exitCode === 0 ? 'success' : 'error';
    const executionTimeMs = exec.usage?.cpuMs || 0;

    // If userContext is provided, track per-user usage
    const userId = userContext?.id || null;
    const userEmail = userContext?.email || null;

    await trackUsage(c.env, project.id, userId, lang, code, status, exec.exitCode, executionTimeMs, userEmail);

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

// Serve CDN embed script
app.get("/embed.js", async (c) => {
  try {
    const embedScript = c.env.EMBED_JS || (await c.env.RUNS.get("embed.js"));

    if (embedScript) {
      return c.body(embedScript, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      });
    }

    return c.text("Embed script not found. Build and upload embed.js first.", 404);
  } catch (e: any) {
    return c.text(`Error serving embed script: ${e.message}`, 500);
  }
});

// =============================================
// COLLABORATIVE EDITING (WebSocket)
// =============================================

app.get("/collab/test", (c) => {
  return c.json({
    message: "Collab routing works!",
    hasBinding: !!c.env.COLLAB_SESSION,
  });
});

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

    const url = new URL(c.req.url);
    url.pathname = "/websocket";

    const doRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
      // @ts-ignore
      duplex: "half",
    });

    return stub.fetch(doRequest);
  } catch (e: any) {
    return c.json({ error: e.message, sessionId }, 500);
  }
});

app.get("/collab/:sessionId/state", async (c) => {
  const sessionId = c.req.param("sessionId");

  if (!c.env.COLLAB_SESSION) {
    return c.json({ error: "Collaborative editing not available" }, 503);
  }

  try {
    const id = c.env.COLLAB_SESSION.idFromName(sessionId);
    const stub = c.env.COLLAB_SESSION.get(id);

    const url = new URL(c.req.url);
    url.pathname = "/state";

    const doRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
    });

    return stub.fetch(doRequest);
  } catch (e: any) {
    return c.json({ error: e.message, sessionId }, 500);
  }
});

// =============================================
// HELPERS
// =============================================

function getSessionToken(c: any): string | null {
  const cookieHeader = c.req.header("cookie") || "";
  const match = cookieHeader.match(/docle_session=([^;]+)/);
  return match ? match[1] : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail(env: Env, email: string, verifyUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const emailFrom = env.EMAIL_FROM || 'Docle <noreply@docle.co>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: email,
      subject: 'Sign in to Docle',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #000000;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border-radius: 8px; border: 1px solid #222222;">
                    <tr>
                      <td style="padding: 40px;">
                        <!-- Header -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom: 30px;">
                              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Docle</h1>
                              <p style="margin: 10px 0 0 0; color: #999999; font-size: 14px;">Run code safely in the cloud</p>
                            </td>
                          </tr>
                        </table>

                        <!-- Content -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 20px 0;">
                              <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; line-height: 24px;">
                                Click the button below to sign in to your Docle account:
                              </p>

                              <!-- Button -->
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="padding: 20px 0;">
                                    <a href="${verifyUrl}" style="display: inline-block; background-color: #60a5fa; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                      Sign in to Docle
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 20px;">
                                Or copy and paste this link into your browser:
                              </p>
                              <p style="margin: 10px 0 0 0; color: #60a5fa; font-size: 12px; word-break: break-all;">
                                ${verifyUrl}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Footer -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-top: 30px; border-top: 1px solid #222222;">
                              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 18px;">
                                This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend API error:', error);
    throw new Error(`Failed to send email: ${response.statusText}`);
  }
}

export default app;
export { CollabSession };
