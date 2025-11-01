import { getSandbox } from '@cloudflare/sandbox';
import type { Env } from './kv';
import type { FileEntry } from './schema';

type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  usage?: { cpuMs?: number; memMB?: number; durationMs?: number }
};

export type SandboxPolicy = {
  timeoutMs: number;
  allowNetwork?: boolean;        // Enable network access (default: false)
  allowedHosts?: string[];       // Whitelist of allowed domains (supports wildcards like *.example.com)
  maxOutputBytes?: number;       // Max combined stdout + stderr size (default: 1MB)
};

export type SandboxRunOptions = {
  code?: string;
  files?: FileEntry[];
  entrypoint?: string;
  packages?: string[];
};

/**
 * Generate network access control wrapper for Node.js
 */
function generateNodeNetworkWrapper(allowedHosts: string[]): string {
  return `
const originalFetch = globalThis.fetch;
const allowedHosts = ${JSON.stringify(allowedHosts)};

globalThis.fetch = function(url, options) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  const isAllowed = allowedHosts.some(pattern => {
    if (pattern.startsWith('*.')) {
      // Wildcard subdomain: *.example.com matches api.example.com, sub.example.com
      const domain = pattern.slice(2);
      return hostname === domain || hostname.endsWith('.' + domain);
    } else if (pattern.startsWith('*')) {
      // Wildcard prefix: *example.com matches example.com, apiexample.com
      return hostname.endsWith(pattern.slice(1));
    } else {
      // Exact match
      return hostname === pattern;
    }
  });
  
  if (!isAllowed) {
    throw new Error(\`Network access denied: \${hostname} is not in allowed hosts list\`);
  }
  
  return originalFetch(url, options);
};
`;
}

/**
 * Generate network access control wrapper for Python
 */
function generatePythonNetworkWrapper(allowedHosts: string[]): string {
  return `
import urllib.request
import urllib.error
from urllib.parse import urlparse

_original_urlopen = urllib.request.urlopen
_allowed_hosts = ${JSON.stringify(allowedHosts)}

def _is_host_allowed(hostname):
    for pattern in _allowed_hosts:
        if pattern.startswith('*.'):
            domain = pattern[2:]
            if hostname == domain or hostname.endswith('.' + domain):
                return True
        elif pattern.startswith('*'):
            if hostname.endswith(pattern[1:]):
                return True
        else:
            if hostname == pattern:
                return True
    return False

def _checked_urlopen(url, *args, **kwargs):
    parsed = urlparse(url) if isinstance(url, str) else urlparse(url.full_url)
    hostname = parsed.netloc.split(':')[0]  # Remove port if present
    
    if not _is_host_allowed(hostname):
        raise urllib.error.URLError(f"Network access denied: {hostname} is not in allowed hosts list")
    
    return _original_urlopen(url, *args, **kwargs)

urllib.request.urlopen = _checked_urlopen

# Also patch requests library if available
try:
    import requests
    _original_request = requests.request
    
    def _checked_request(method, url, *args, **kwargs):
        parsed = urlparse(url)
        hostname = parsed.netloc.split(':')[0]
        
        if not _is_host_allowed(hostname):
            raise requests.exceptions.ConnectionError(f"Network access denied: {hostname} is not in allowed hosts list")
        
        return _original_request(method, url, *args, **kwargs)
    
    requests.request = _checked_request
except ImportError:
    pass
`;
}

/**
 * Execute code in a secure Cloudflare Sandbox with multi-file and package support.
 * Docs: https://developers.cloudflare.com/sandbox/
 */
export async function runInSandbox(
  env: Env,
  options: SandboxRunOptions,
  lang: "python" | "node",
  policy: SandboxPolicy,
  sessionId: string
): Promise<ExecResult> {
  const start = Date.now();

  try {
    // Get sandbox instance for this session
    const sandbox = getSandbox(env.SANDBOX, sessionId);

    // Multi-file or single-file mode
    let entrypoint = options.entrypoint;

    if (options.files && options.files.length > 0) {
      // Multi-file mode: write all files
      for (const file of options.files) {
        const filepath = `/workspace/${file.path}`;
        await sandbox.writeFile(filepath, file.content);
      }

      // Default entrypoint if not specified
      if (!entrypoint) {
        entrypoint = lang === "python" ? "main.py" : "main.js";
      }
    } else if (options.code) {
      // Single-file mode (legacy)
      const filename = lang === "python" ? "main.py" : "main.js";
      entrypoint = filename;
      await sandbox.writeFile(`/workspace/${filename}`, options.code);
    } else {
      throw new Error("No code or files provided");
    }

    // Install packages if specified
    if (options.packages && options.packages.length > 0) {
      const installResult = await installPackages(
        sandbox,
        lang,
        options.packages,
        policy.timeoutMs
      );

      if (installResult.exitCode !== 0) {
        return {
          stdout: installResult.stdout,
          stderr: `Package installation failed:\n${installResult.stderr}`,
          exitCode: installResult.exitCode,
          usage: { durationMs: Date.now() - start }
        };
      }
    }

    // Setup network access controls if enabled
    if (policy.allowNetwork && policy.allowedHosts && policy.allowedHosts.length > 0) {
      if (lang === "python") {
        const wrapperCode = generatePythonNetworkWrapper(policy.allowedHosts);
        await sandbox.writeFile('/workspace/__network_guard__.py', wrapperCode);
      } else {
        const wrapperCode = generateNodeNetworkWrapper(policy.allowedHosts);
        await sandbox.writeFile('/workspace/__network_guard__.js', wrapperCode);
      }
    }

    // Determine command based on language
    const filepath = `/workspace/${entrypoint}`;
    let command: string;
    
    if (lang === "python") {
      // For Python: import network guard before running main file
      if (policy.allowNetwork && policy.allowedHosts && policy.allowedHosts.length > 0) {
        // Create a wrapper that imports network guard then runs the main file
        const wrapperScript = `import __network_guard__\nexec(open('${filepath}').read())`;
        await sandbox.writeFile('/workspace/__main_wrapper__.py', wrapperScript);
        command = `python3 /workspace/__main_wrapper__.py`;
      } else {
        command = `python3 ${filepath}`;
      }
    } else {
      // For Node: require network guard before running main file
      if (policy.allowNetwork && policy.allowedHosts && policy.allowedHosts.length > 0) {
        command = `node -r /workspace/__network_guard__.js ${filepath}`;
      } else {
        command = `node ${filepath}`;
      }
    }

    // Execute with timeout
    const result = await sandbox.exec(command, {
      timeout: policy.timeoutMs
    });

    const durationMs = Date.now() - start;

    // Apply output size limits if specified
    let stdout = result.stdout || "";
    let stderr = result.stderr || "";
    const maxBytes = policy.maxOutputBytes || 1024 * 1024; // Default 1MB
    
    const totalOutputSize = new TextEncoder().encode(stdout + stderr).length;
    
    if (totalOutputSize > maxBytes) {
      // Truncate output to stay within limit
      const truncateMessage = `\n\n... (output truncated: ${totalOutputSize} bytes exceeds limit of ${maxBytes} bytes)`;
      const availableBytes = maxBytes - new TextEncoder().encode(truncateMessage).length;
      
      const combined = stdout + stderr;
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      const encoded = encoder.encode(combined);
      
      if (encoded.length > availableBytes) {
        const truncated = decoder.decode(encoded.slice(0, availableBytes));
        stdout = truncated + truncateMessage;
        stderr = "";
      }
    }

    return {
      stdout,
      stderr,
      exitCode: result.exitCode,
      usage: {
        durationMs,
        cpuMs: undefined,
        memMB: undefined
      }
    };

  } catch (error: any) {
    const durationMs = Date.now() - start;

    // Enhanced error logging
    console.error('Sandbox execution error:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
      status: error?.status,
      response: error?.response
    });

    return {
      stdout: "",
      stderr: `SandboxError: ${error?.message || String(error)}${error?.cause ? `\nCause: ${error.cause}` : ''}`,
      exitCode: error?.name === "TimeoutError" ? 124 : 1,
      usage: { durationMs }
    };
  }
}

/**
 * Install packages in the sandbox
 */
async function installPackages(
  sandbox: any,
  lang: "python" | "node",
  packages: string[],
  timeoutMs: number
): Promise<ExecResult> {
  try {
    if (lang === "python") {
      // Create requirements.txt
      const requirements = packages.join('\n');
      await sandbox.writeFile('/workspace/requirements.txt', requirements);

      // Run pip install
      const result = await sandbox.exec(
        "pip3 install -r /workspace/requirements.txt --quiet",
        { timeout: Math.min(timeoutMs, 60000) } // Max 60s for installation
      );

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode
      };
    } else {
      // Node.js: npm install
      const packageJson = {
        name: "docle-sandbox",
        version: "1.0.0",
        dependencies: packages.reduce((acc, pkg) => {
          const [name, version] = pkg.split('@');
          acc[name] = version || 'latest';
          return acc;
        }, {} as Record<string, string>)
      };

      await sandbox.writeFile(
        '/workspace/package.json',
        JSON.stringify(packageJson, null, 2)
      );

      // Run npm install
      const result = await sandbox.exec(
        "npm install --silent",
        { timeout: Math.min(timeoutMs, 60000) }
      );

      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode
      };
    }
  } catch (error: any) {
    return {
      stdout: "",
      stderr: error?.message || String(error),
      exitCode: 1
    };
  }
}

/**
 * Fallback simulation for when Sandbox binding is not available.
 * This provides a preview of what the code would execute.
 */
export async function simulateExec(
  options: SandboxRunOptions,
  lang: "python" | "node",
  policy: SandboxPolicy
): Promise<ExecResult> {
  const start = Date.now();

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  if (policy.timeoutMs < 1) {
    stderr = "timeout";
    exitCode = 124;
  } else {
    // Simulate execution
    const code = options.code || options.files?.map(f => f.content).join('\n') || '';
    const fileInfo = options.files ? ` (${options.files.length} files)` : '';
    const pkgInfo = options.packages && options.packages.length > 0
      ? `\n Packages: ${options.packages.join(', ')}`
      : '';

    stdout = `Docle Sandbox (Preview Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Language: ${lang}${fileInfo}${pkgInfo}
Timeout: ${policy.timeoutMs}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sandbox is running in preview mode.
To enable real code execution:
1. Request beta access: https://cloudflare.com/sandbox-beta
2. Enable Containers in wrangler.toml
3. Redeploy your Worker

Your code will execute:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${code}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  const durationMs = Date.now() - start;

  return {
    stdout,
    stderr,
    exitCode,
    usage: { cpuMs: 0, memMB: 0, durationMs }
  };
}

