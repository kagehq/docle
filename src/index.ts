import { Hono } from "hono";
import { cors } from "hono/cors";
import { RunRequest, RunResult } from "./lib/schema";
import { listRuns, saveRun, Env } from "./lib/kv";
import { runInSandbox, simulateExec } from "./lib/sandbox";
import { playgroundHTML, dashboardHTML, embedPlaygroundHTML, advancedPlaygroundHTML } from "./lib/html";
import { collaborativePlaygroundHTML } from "./lib/html-collab";

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

app.get("/", (c) => c.redirect("/playground"));
app.get("/playground", (c) => c.html(playgroundHTML()));
app.get("/playground/advanced", (c) => c.html(advancedPlaygroundHTML()));
app.get("/playground/collab", (c) => {
  const sessionId = crypto.randomUUID();
  return c.redirect(`/playground/collab/${sessionId}`);
});
app.get("/playground/collab/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  return c.html(collaborativePlaygroundHTML(sessionId));
});
app.get("/dashboard", async (c) => c.html(dashboardHTML(await listRuns(c.env, 50))));

// CDN embed script
app.get("/embed.js", (c) => {
  const script = `(function(){class DocleEmbed{constructor(e,t={}){this.element=e,this.options={lang:t.lang||"python",theme:t.theme||"dark",code:t.code||e.textContent?.trim()||"",readonly:t.readonly||!1,showOutput:!1!==t.showOutput,autorun:t.autorun||!1,height:t.height||"400px",...t},this.iframe=this.createIframe(),this.setupMessageListener(),this.render()}createIframe(){const e=document.createElement("iframe"),t=new URLSearchParams({lang:this.options.lang,theme:this.options.theme,code:this.options.code,readonly:String(this.options.readonly),showOutput:String(this.options.showOutput),autorun:String(this.options.autorun)});return e.src=\`\${window.DOCLE_ENDPOINT||window.location.origin}/embed?\${t}\`,e.style.width="100%",e.style.height=this.options.height,e.style.border="none",e.style.borderRadius="8px",e.setAttribute("allow","cross-origin-isolated"),e}setupMessageListener(){window.addEventListener("message",e=>{if(e.source!==this.iframe.contentWindow)return;const{type:t,data:o}=e.data;"docle-ready"===t&&this.options.onReady&&this.options.onReady(o),"docle-result"===t&&this.options.onRun&&this.options.onRun(o),"docle-error"===t&&this.options.onError&&this.options.onError(o)})}render(){this.element.innerHTML="",this.element.appendChild(this.iframe)}run(){this.iframe.contentWindow?.postMessage({type:"docle-run"},"*")}setCode(e){this.iframe.contentWindow?.postMessage({type:"docle-set-code",code:e},"*")}getIframe(){return this.iframe}}function initDocle(){document.querySelectorAll("[data-docle]").forEach(e=>{if(e.dataset.docleInit)return;const t={lang:e.dataset.lang||"python",theme:e.dataset.theme||"dark",code:e.dataset.code||e.textContent?.trim(),readonly:"true"===e.dataset.readonly,showOutput:"false"!==e.dataset.showOutput,autorun:"true"===e.dataset.autorun,height:e.dataset.height||"400px"};new DocleEmbed(e,t),e.dataset.docleInit="1"})}window.DocleEmbed=DocleEmbed,window.initDocleEmbeds=initDocle,"loading"===document.readyState?document.addEventListener("DOMContentLoaded",initDocle):initDocle()})();`;
  
  return c.text(script, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=31536000', // 1 year
    'Access-Control-Allow-Origin': '*'
  });
});

// Embeddable playground
app.get("/embed", (c) => {
  const lang = c.req.query("lang") || "python";
  const theme = c.req.query("theme") || "dark";
  const code = c.req.query("code") || 'print("Hello, Docle!")';
  const readonly = c.req.query("readonly") === "true";
  const showOutput = c.req.query("showOutput") !== "false"; // default true
  
  return c.html(embedPlaygroundHTML({
    lang,
    theme,
    code: decodeURIComponent(code),
    readonly,
    showOutput
  }), 200, {
    "X-Frame-Options": "ALLOWALL",
    "Content-Security-Policy": "frame-ancestors *"
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
app.all("/collab/:sessionId/*", (c) => {
  const sessionId = c.req.param("sessionId");
  const id = c.env.COLLAB_SESSION?.idFromName(sessionId);
  if (!id) {
    return c.text("Collaborative editing not available (Durable Objects not configured)", 503);
  }
  const stub = c.env.COLLAB_SESSION.get(id);
  return stub.fetch(c.req.raw);
});

export default app;
export { CollabSession } from "./lib/collab";

