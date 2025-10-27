/**
 * Docle Embed SDK
 * Automatically embeds code playgrounds via data attributes or programmatic API
 *
 * Usage:
 * <script src="https://api.docle.co/embed.js"></script>
 * <script>window.docleApiKey = 'sk_live_xxx';</script>  // Optional: for authenticated access
 * <div data-docle data-lang="python">print("Hello")</div>
 */

// Extend Window interface for TypeScript
declare global {
  interface Window {
    docleApiKey?: string;
    DOCLE_ENDPOINT?: string;
    DocleEmbed: typeof DocleEmbed;
    initDocleEmbeds: typeof initializeEmbeds;
  }
}

interface DocleOptions {
  lang?: 'python' | 'node';
  theme?: 'dark' | 'light';
  code?: string;
  readonly?: boolean;
  showOutput?: boolean;
  autorun?: boolean;
  height?: string;
  apiKey?: string; // NEW: Optional API key for authenticated access
  onReady?: (data: any) => void;
  onRun?: (result: any) => void;
  onError?: (error: any) => void;
}

class DocleEmbed {
  private iframe: HTMLIFrameElement;
  private element: HTMLElement;
  private options: DocleOptions;

  constructor(element: HTMLElement, options: DocleOptions = {}) {
    this.element = element;
    this.options = {
      lang: options.lang || 'python',
      theme: options.theme || 'dark',
      code: options.code || element.textContent?.trim() || '',
      readonly: options.readonly || false,
      showOutput: options.showOutput !== false,
      autorun: options.autorun || false,
      height: options.height || '400px',
      ...options
    };

    this.iframe = this.createIframe();
    this.setupMessageListener();
    this.render();
  }

  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      lang: this.options.lang!,
      theme: this.options.theme!,
      code: this.options.code!,
      readonly: String(this.options.readonly),
      showOutput: String(this.options.showOutput),
      autorun: String(this.options.autorun)
    });

    // Use current origin in development, production URL in prod
    const baseUrl = window.DOCLE_ENDPOINT || 'https://api.docle.co';
    iframe.src = `${baseUrl}/embed?${params}`;
    iframe.style.width = '100%';
    iframe.style.height = this.options.height!;
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.setAttribute('allow', 'cross-origin-isolated');

    return iframe;
  }

  private setupMessageListener() {
    window.addEventListener('message', (e) => {
      // Only process messages from our iframe
      if (e.source !== this.iframe.contentWindow) return;

      const { type, data } = e.data;

      if (type === 'docle-ready') {
        // Send API key securely via postMessage (priority: options > window.docleApiKey)
        const apiKey = this.options.apiKey || window.docleApiKey;
        if (apiKey) {
          this.iframe.contentWindow?.postMessage({
            type: 'docle-set-apikey',
            apiKey: apiKey
          }, '*');
        }

        if (this.options.onReady) {
          this.options.onReady(data);
        }
      }

      if (type === 'docle-result' && this.options.onRun) {
        this.options.onRun(data);
      }

      if (type === 'docle-error' && this.options.onError) {
        this.options.onError(data);
      }
    });
  }

  private render() {
    // Clear existing content
    this.element.innerHTML = '';
    this.element.appendChild(this.iframe);
  }

  // Public API
  run() {
    this.iframe.contentWindow?.postMessage({ type: 'docle-run' }, '*');
  }

  setCode(code: string) {
    this.iframe.contentWindow?.postMessage({ type: 'docle-set-code', code }, '*');
  }

  getIframe(): HTMLIFrameElement {
    return this.iframe;
  }
}

// Auto-initialize elements with data-docle attribute
function initializeEmbeds() {
  const elements = document.querySelectorAll('[data-docle]');

  elements.forEach((el) => {
    const element = el as HTMLElement;

    // Skip if already initialized
    if (element.dataset.docleInitialized) return;

    const options: DocleOptions = {
      lang: (element.dataset.lang as any) || 'python',
      theme: (element.dataset.theme as any) || 'dark',
      code: element.dataset.code || element.textContent?.trim(),
      readonly: element.dataset.readonly === 'true',
      showOutput: element.dataset.showOutput !== 'false',
      autorun: element.dataset.autorun === 'true',
      height: element.dataset.height || '400px',
      apiKey: element.dataset.apiKey || window.docleApiKey // NEW: Support data-api-key attribute or global
    };

    new DocleEmbed(element, options);
    element.dataset.docleInitialized = 'true';
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEmbeds);
} else {
  initializeEmbeds();
}

// Watch for dynamically added elements
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          if (node.hasAttribute('data-docle')) {
            initializeEmbeds();
          }
          // Check children
          node.querySelectorAll?.('[data-docle]').forEach(() => {
            initializeEmbeds();
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Export for programmatic usage
window.DocleEmbed = DocleEmbed;
window.initDocleEmbeds = initializeEmbeds;

export { DocleEmbed, initializeEmbeds };

