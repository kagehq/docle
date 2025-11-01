export type Lang = 'python' | 'node';
export type Theme = 'dark' | 'light';

export interface DoclePolicy {
  timeoutMs?: number;
  allowNetwork?: boolean;
  allowedHosts?: string[];
  maxOutputBytes?: number;
}

export interface UserContext {
  id: string;
  email?: string;
  name?: string;
  tier?: 'free' | 'pro' | 'enterprise';
  metadata?: Record<string, unknown>;
}

export interface DocleRunOptions {
  lang?: Lang; // Optional when repo is provided (auto-detect)
  repo?: string; // GitHub repository URL
  entrypoint?: string; // Optional entrypoint (auto-detect if not provided)
  policy?: DoclePolicy;
  endpoint?: string;
  apiKey?: string; // Optional API key for authenticated access
  userContext?: UserContext; // Optional user context for per-user tracking
}

export interface DocleResult {
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

export interface DoclePlaygroundProps {
  /** Programming language (optional when repo is provided) */
  lang?: Lang;
  /** GitHub repository URL (e.g., "owner/repo" or full URL) */
  repo?: string;
  /** UI theme */
  theme?: 'dark' | 'light';
  /** Initial code (not used when repo is provided) */
  code?: string;
  /** Make editor read-only */
  readonly?: boolean;
  /** Show output panel */
  showOutput?: boolean;
  /** Auto-run on mount */
  autorun?: boolean;
  /** Custom height */
  height?: string | number;
  /** Custom width */
  width?: string | number;
  /** API endpoint override */
  endpoint?: string;
  /** API key for authenticated access */
  apiKey?: string;
  /** Callback when embed is ready */
  onReady?: (data: { lang: Lang }) => void;
  /** Callback when code executes */
  onRun?: (result: DocleResult) => void;
  /** Callback on error */
  onError?: (error: { message: string }) => void;
  /** Custom className */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

export interface UseDocleOptions {
  /** API endpoint override */
  endpoint?: string;
  /** API key for authenticated access */
  apiKey?: string;
  /** User context for per-user tracking */
  userContext?: UserContext;
}

export interface UseDocleReturn {
  /** Execute code */
  run: (code: string, options: DocleRunOptions) => Promise<DocleResult>;
  /** Current result */
  result: DocleResult | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Clear result/error */
  reset: () => void;
}

