export interface DoclePlaygroundProps {
  lang?: 'python' | 'node';
  code?: string;
  theme?: 'dark' | 'light';
  readonly?: boolean;
  showOutput?: boolean;
  autorun?: boolean;
  height?: string;
  endpoint?: string;
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
}

export interface DocleEmitEvents {
  ready: [data: { lang: string }];
  run: [result: DocleRunResult];
  error: [error: { message: string }];
}

