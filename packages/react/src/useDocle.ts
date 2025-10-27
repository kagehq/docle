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
export function useDocle({ endpoint, apiKey, userContext }: UseDocleOptions = {}): UseDocleReturn {
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
      const effectiveEndpoint = runOptions.endpoint || endpoint || 
        (typeof window !== 'undefined' && (window as any).DOCLE_ENDPOINT) || 
        'https://api.docle.co';

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add API key if provided (priority: runOptions > hook options)
      const effectiveApiKey = runOptions.apiKey || apiKey;
      if (effectiveApiKey) {
        headers['Authorization'] = `Bearer ${effectiveApiKey}`;
      }

      const body: Record<string, unknown> = {
        code,
        lang: runOptions.lang,
        policy: runOptions.policy || {}
      };

      // Include userContext if provided (from hook options or run options)
      const contextToUse = runOptions.userContext || userContext;
      if (contextToUse) {
        body.userContext = contextToUse;
      }

      const response = await fetch(`${effectiveEndpoint}/api/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
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
  }, [endpoint, apiKey, userContext]);

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

