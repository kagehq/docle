export type Policy = { timeoutMs?: number; memoryMB?: number; allowNet?: boolean };
export type RunOptions = { lang: "python" | "node"; policy?: Policy; endpoint?: string };
export type RunResponse = {
  id: string; ok: boolean; exitCode: number; stdout: string; stderr: string;
  usage?: { cpuMs?: number; memMB?: number; durationMs?: number }; createdAt: string;
};

export async function runSandbox(code: string, opts: RunOptions): Promise<RunResponse> {
  const endpoint = opts.endpoint ?? (globalThis as any).DOCLE_ENDPOINT ?? "/api/run";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, lang: opts.lang, policy: opts.policy ?? {} })
  });
  if (!res.ok) throw new Error(`runSandbox failed: ${res.status}`);
  return res.json();
}

