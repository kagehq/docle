export interface DoclePlaygroundProps {
  lang?: 'python' | 'node';
  code?: string;
  theme?: 'dark' | 'light';
  readonly?: boolean;
  showOutput?: boolean;
  autorun?: boolean;
  height?: string;
  endpoint?: string;
  apiKey?: string; // NEW: Optional API key for authenticated access
}

export interface DocleRunResult {
  id: string;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  usage?: {
    cpuMs?: number;
    memMB?: number;
    durationMs?: number;
  };
  createdAt: string;
  demo_mode?: boolean; // NEW: Indicates if running in demo mode
  upgrade_message?: string; // NEW: Message about upgrading
}

export interface DocleEmitEvents {
  ready: [data: { lang: string }];
  run: [result: DocleRunResult];
  error: [error: { message: string }];
}

