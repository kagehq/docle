import { ref } from 'vue';
import { runSandbox, type RunOptions, type RunResponse } from '@docle/sdk';

export interface UseDocleOptions {
  endpoint?: string;
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
        endpoint: options?.endpoint || opts.endpoint
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

