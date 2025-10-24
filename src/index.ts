import { Hono } from "hono";
import { cors } from "hono/cors";
import { RunRequest, RunResult } from "./lib/schema";
import { saveRun, Env } from "./lib/kv";
import { runInSandbox, simulateExec } from "./lib/sandbox";
import { CollabSession } from "./lib/collab";

// Export Sandbox Durable Object from @cloudflare/sandbox
import { Sandbox as CloudflareSandbox } from '@cloudflare/sandbox';
export const Sandbox = CloudflareSandbox;

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

// Middleware to prevent compression issues with proxy
app.use("*", async (c, next) => {
  await next();
  // Remove any compression headers that might conflict with the proxy
  c.res.headers.delete("Content-Encoding");
});

// Health check / API info
app.get("/", (c) => {
  return c.json({
    name: "Docle API",
    version: "1.0.0",
    description: "Secure code execution API powered by Cloudflare Sandbox",
    endpoints: {
      "POST /api/run": "Execute code",
      "GET /api/run/:id": "Get execution result by ID"
    },
    playground: "https://docle.dev", // Update with your deployed Nuxt URL
    docs: "https://github.com/kagehq/docle"
  });
});

app.post("/api/run", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = RunRequest.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid payload", issues: parsed.error.flatten() }, 400);
    }
    const { code, files, entrypoint, packages, lang, policy: raw } = parsed.data;
    const policy = {
      timeoutMs: raw?.timeoutMs ?? 3000,
      memoryMB: raw?.memoryMB ?? 256,
      allowNet: raw?.allowNet ?? false
    };
    const id = crypto.randomUUID();
    
    // Prepare sandbox options
    const sandboxOptions = {
      code,
      files,
      entrypoint,
      packages: packages?.packages
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
      createdAt: new Date().toISOString()
    };
    await saveRun(c.env, result, id);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, 500);
  }
});

app.get("/api/run/:id", async (c) => {
  const raw = await c.env.RUNS.get(`runs:${c.req.param("id")}`);
  if (!raw) return c.json({ error: "not found" }, 404);
  return c.json(JSON.parse(raw));
});

// Collaborative editing endpoints
app.all("/collab/:sessionId/*", async (c) => {
  const sessionId = c.req.param("sessionId");
  
  if (!c.env.COLLAB_SESSION) {
    return c.json({ error: "Collaborative editing not available" }, 503);
  }
  
  const id = c.env.COLLAB_SESSION.idFromName(sessionId);
  const stub = c.env.COLLAB_SESSION.get(id);
  
  // Forward the request to the Durable Object
  return stub.fetch(c.req.raw);
});

export default app;
export { CollabSession };

