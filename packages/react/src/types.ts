export type Lang = 'python' | 'node';
export type Theme = 'dark' | 'light';

export interface DoclePolicy {
  timeoutMs?: number;
  memoryMB?: number;
  allowNet?: boolean;
}

export interface DocleRunOptions {
  lang: Lang;
  policy?: DoclePolicy;
  endpoint?: string;
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
}

export interface DoclePlaygroundProps {
  /** Programming language */
  lang?: Lang;
  /** UI theme */
  theme?: 'dark' | 'light';
  /** Initial code */
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

