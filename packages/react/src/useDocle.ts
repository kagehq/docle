import { useState, useCallback } from 'react';
import type { UseDocleOptions, UseDocleReturn, DocleResult, DocleRunOptions } from './types';

/**
 * Headless hook for programmatic code execution
 * 
 * @example
 * ```tsx
 * function MyEditor() {
 *   const { run, result, loading, error } = useDocle();
 *   
 *   const handleRun = async () => {
 *     await run('print("Hello")', { lang: 'python' });
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleRun} disabled={loading}>Run</button>
 *       {result && <pre>{result.stdout}</pre>}
 *       {error && <div>Error: {error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocle(options: UseDocleOptions = {}): UseDocleReturn {
  const [result, setResult] = useState<DocleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async (
    code: string,
    runOptions: DocleRunOptions
  ): Promise<DocleResult> => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = runOptions.endpoint || options.endpoint || 
        (typeof window !== 'undefined' && (window as any).DOCLE_ENDPOINT) || 
        'https://docle.workers.dev';

      const response = await fetch(`${endpoint}/api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          lang: runOptions.lang,
          policy: runOptions.policy || {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DocleResult = await response.json();
      setResult(data);
      return data;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [options.endpoint]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    run,
    result,
    loading,
    error,
    reset
  };
}

