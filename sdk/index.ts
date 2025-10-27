export type Policy = { timeoutMs?: number; memoryMB?: number; allowNet?: boolean };
export type RunOptions = { 
  lang: "python" | "node"; 
  policy?: Policy; 
  endpoint?: string;
  apiKey?: string; // NEW: Optional API key for authenticated access
};
export type RunResponse = {
  id: string; ok: boolean; exitCode: number; stdout: string; stderr: string;
  usage?: { cpuMs?: number; memMB?: number; durationMs?: number }; createdAt: string;
  demo_mode?: boolean; // NEW: Indicates if running in demo mode
  upgrade_message?: string; // NEW: Message about upgrading
};

export async function runSandbox(code: string, opts: RunOptions): Promise<RunResponse> {
  const endpoint = opts.endpoint ?? (globalThis as any).DOCLE_ENDPOINT ?? "/api/run";
  
  // Build headers
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  
  // Add Authorization header if API key provided
  if (opts.apiKey) {
    headers["authorization"] = `Bearer ${opts.apiKey}`;
  }
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ code, lang: opts.lang, policy: opts.policy ?? {} })
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`runSandbox failed: ${res.status} - ${error.error || error.message || "Unknown error"}`);
  }
  
  return res.json();
}

