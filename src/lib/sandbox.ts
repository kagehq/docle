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
};

export type SandboxRunOptions = {
  code?: string;
  files?: FileEntry[];
  entrypoint?: string;
  packages?: string[];
};

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

    // Determine command based on language
    const filepath = `/workspace/${entrypoint}`;
    const command = lang === "python"
      ? `python3 ${filepath}`
      : `node ${filepath}`;

    // Execute with timeout
    const result = await sandbox.exec(command, {
      timeout: policy.timeoutMs
    });

    const durationMs = Date.now() - start;

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
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

