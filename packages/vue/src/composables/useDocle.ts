import { ref } from 'vue';
import { runSandbox, type RunOptions, type RunResponse } from '@doclehq/sdk';

export interface UseDocleOptions {
  endpoint?: string;
  apiKey?: string; // NEW: Optional API key for authenticated access
  userContext?: {
    id: string;
    email?: string;
    name?: string;
    tier?: 'free' | 'pro' | 'enterprise';
    metadata?: Record<string, unknown>;
  };
}

export function useDocle(options?: UseDocleOptions) {
  const result = ref<RunResponse | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const run = async (code: string, opts: RunOptions): Promise<RunResponse> => {
    loading.value = true;
    error.value = null;

    try {
      const res = await runSandbox(code, {
        ...opts,
        endpoint: options?.endpoint || opts.endpoint,
        apiKey: options?.apiKey || opts.apiKey, // Pass API key if provided
        userContext: options?.userContext || opts.userContext // Pass user context if provided
      });
      result.value = res;
      return res;
    } catch (e: any) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  return {
    run,
    result,
    loading,
    error
  };
}

