import { useEffect, useRef, useCallback } from 'react';
import type { DoclePlaygroundProps, DocleResult } from './types';

/**
 * Embeddable code playground component
 * 
 * @example
 * ```tsx
 * <DoclePlayground
 *   lang="python"
 *   code="print('Hello, World!')"
 *   onRun={(result) => console.log(result)}
 * />
 * ```
 */
export function DoclePlayground({
  lang = 'python',
  theme = 'dark',
  code = '',
  readonly = false,
  showOutput = true,
  autorun = false,
  height = '400px',
  width = '100%',
  endpoint,
  onReady,
  onRun,
  onError,
  className,
  style
}: DoclePlaygroundProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle messages from iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Only process messages from our iframe
    if (event.source !== iframeRef.current?.contentWindow) return;

    const { type, data } = event.data;

    switch (type) {
      case 'docle-ready':
        onReady?.(data);
        break;
      case 'docle-result':
        onRun?.(data as DocleResult);
        break;
      case 'docle-error':
        onError?.(data);
        break;
    }
  }, [onReady, onRun, onError]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Build iframe URL
  const baseUrl = endpoint || (typeof window !== 'undefined' && (window as any).DOCLE_ENDPOINT) || 'https://api.docle.co';
  const params = new URLSearchParams({
    lang,
    theme,
    code,
    readonly: String(readonly),
    showOutput: String(showOutput),
    autorun: String(autorun)
  });
  const src = `${baseUrl}/embed?${params}`;

  // Normalize height/width
  const normalizedHeight = typeof height === 'number' ? `${height}px` : height;
  const normalizedWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div 
      className={className}
      style={{
        width: normalizedWidth,
        height: normalizedHeight,
        ...style
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          display: 'block'
        }}
        allow="cross-origin-isolated"
        title="Docle Code Playground"
      />
    </div>
  );
}

