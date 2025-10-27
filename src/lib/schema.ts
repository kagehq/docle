import { z } from "zod";

export const Lang = z.enum(["python", "node"]);
export type Lang = z.infer<typeof Lang>;

export const Policy = z.object({
  timeoutMs: z.number().int().min(100).max(300000).default(3000)
}).partial().default({});

// Multi-file support
export const FileEntry = z.object({
  path: z.string(), // e.g., "main.py", "utils.py", "package.json"
  content: z.string()
});
export type FileEntry = z.infer<typeof FileEntry>;

export const PackageSpec = z.object({
  // For Python: ["requests", "pandas==2.0.0"]
  // For Node: ["express", "lodash@4.17.21"]
  packages: z.array(z.string()).optional()
});
export type PackageSpec = z.infer<typeof PackageSpec>;

export const RunRequest = z.object({
  // Single file mode (legacy)
  code: z.string().optional(),
  // Multi-file mode
  files: z.array(FileEntry).optional(),
  // Entry point for multi-file (e.g., "main.py")
  entrypoint: z.string().optional(),
  // Package installation
  packages: PackageSpec.optional(),
  lang: Lang,
  policy: Policy
}).refine(
  (data) => data.code || (data.files && data.files.length > 0),
  { message: "Either 'code' or 'files' must be provided" }
);
export type RunRequest = z.infer<typeof RunRequest>;

export const RunResult = z.object({
  id: z.string(),
  ok: z.boolean(),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  usage: z.object({
    cpuMs: z.number().optional(),
    memMB: z.number().optional(),
    durationMs: z.number().optional()
  }).optional(),
  createdAt: z.string()
});
export type RunResult = z.infer<typeof RunResult>;

