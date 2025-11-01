import type { FileEntry } from './schema';

/**
 * GitHub repository utilities for fetching and loading repos
 */

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

/**
 * Parse a GitHub URL into components
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/path/to/folder
 * - owner/repo
 */
export function parseGitHubUrl(url: string): GitHubRepo {
  // Remove trailing slash
  url = url.trim().replace(/\/$/, '');
  
  // Handle short format: owner/repo
  if (!url.startsWith('http') && url.includes('/')) {
    const [owner, repo] = url.split('/');
    return { owner, repo, branch: 'main' };
  }
  
  // Handle full GitHub URLs
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.+))?)?/);
  
  if (!match) {
    throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repo or owner/repo');
  }
  
  const [, owner, repo, branch, path] = match;
  
  return {
    owner,
    repo: repo.replace('.git', ''),
    branch: branch || 'main',
    path: path || ''
  };
}

/**
 * Fetch repository contents from GitHub API
 */
export async function fetchGitHubRepo(
  url: string,
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    allowedExtensions?: string[];
  } = {}
): Promise<FileEntry[]> {
  const {
    maxFiles = 100,
    maxFileSize = 1024 * 1024, // 1MB per file
    allowedExtensions = [
      '.py', '.js', '.ts', '.json', '.txt', '.md',
      '.jsx', '.tsx', '.mjs', '.cjs', '.yml', '.yaml',
      '.toml', '.ini', '.cfg', '.conf'
    ]
  } = options;
  
  const { owner, repo, branch, path } = parseGitHubUrl(url);
  
  // Build GitHub API URL
  const apiUrl = path
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;
  
  try {
    // Fetch repository contents
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Docle-Sandbox'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository not found: ${owner}/${repo}. Make sure it's public.`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const contents = await response.json();
    
    // Ensure contents is an array (API returns object for single files)
    const items = Array.isArray(contents) ? contents : [contents];
    
    // Filter for files only (not directories) and allowed extensions
    const files = items.filter((item: any) => {
      if (item.type !== 'file') return false;
      
      // Check extension
      const ext = '.' + item.name.split('.').pop();
      return allowedExtensions.length === 0 || allowedExtensions.includes(ext);
    });
    
    // Limit number of files
    if (files.length > maxFiles) {
      throw new Error(`Too many files in repository (${files.length}). Maximum allowed: ${maxFiles}`);
    }
    
    // Fetch content for each file
    const fileEntries: FileEntry[] = await Promise.all(
      files.map(async (file: any) => {
        // Check file size
        if (file.size > maxFileSize) {
          console.warn(`Skipping ${file.path}: file too large (${file.size} bytes)`);
          return null;
        }
        
        // Fetch file content
        const contentResponse = await fetch(file.download_url);
        if (!contentResponse.ok) {
          console.warn(`Failed to fetch ${file.path}: ${contentResponse.status}`);
          return null;
        }
        
        const content = await contentResponse.text();
        
        return {
          path: file.name, // Use just the filename for flat structure
          content
        };
      })
    );
    
    // Filter out nulls (skipped files)
    const validFiles = fileEntries.filter((f): f is FileEntry => f !== null);
    
    if (validFiles.length === 0) {
      throw new Error('No valid files found in repository. Check file extensions and sizes.');
    }
    
    return validFiles;
    
  } catch (error: any) {
    if (error.message.includes('fetch failed') || error.message.includes('Network')) {
      throw new Error('Failed to connect to GitHub API. Check your network connection.');
    }
    throw error;
  }
}

/**
 * Detect the language from repository files
 */
export function detectLanguage(files: FileEntry[]): 'python' | 'node' {
  // Check for package.json (Node.js)
  if (files.some(f => f.path === 'package.json')) {
    return 'node';
  }
  
  // Check for requirements.txt or setup.py (Python)
  if (files.some(f => f.path === 'requirements.txt' || f.path === 'setup.py')) {
    return 'python';
  }
  
  // Count file extensions
  const pythonFiles = files.filter(f => f.path.endsWith('.py')).length;
  const jsFiles = files.filter(f => 
    f.path.endsWith('.js') || 
    f.path.endsWith('.ts') || 
    f.path.endsWith('.mjs')
  ).length;
  
  // Return language with most files
  return pythonFiles > jsFiles ? 'python' : 'node';
}

/**
 * Detect the entrypoint file from repository
 */
export function detectEntrypoint(files: FileEntry[], lang: 'python' | 'node'): string {
  if (lang === 'python') {
    // Check common Python entrypoints in order
    const pythonEntrypoints = ['main.py', 'app.py', 'run.py', '__main__.py', 'index.py'];
    for (const entry of pythonEntrypoints) {
      if (files.some(f => f.path === entry)) {
        return entry;
      }
    }
    // Fall back to first .py file
    const firstPy = files.find(f => f.path.endsWith('.py'));
    if (firstPy) return firstPy.path;
  } else {
    // Check common Node.js entrypoints
    const nodeEntrypoints = ['index.js', 'main.js', 'app.js', 'server.js', 'index.ts', 'main.ts'];
    for (const entry of nodeEntrypoints) {
      if (files.some(f => f.path === entry)) {
        return entry;
      }
    }
    
    // Check package.json for "main" field
    const packageJson = files.find(f => f.path === 'package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        if (pkg.main) return pkg.main;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    // Fall back to first .js/.ts file
    const firstJs = files.find(f => 
      f.path.endsWith('.js') || 
      f.path.endsWith('.ts') ||
      f.path.endsWith('.mjs')
    );
    if (firstJs) return firstJs.path;
  }
  
  // Last resort: return first file
  return files[0]?.path || 'main.py';
}

/**
 * Extract package dependencies from repository files
 */
export function extractPackages(files: FileEntry[], lang: 'python' | 'node'): string[] {
  if (lang === 'python') {
    const requirementsTxt = files.find(f => f.path === 'requirements.txt');
    if (requirementsTxt) {
      return requirementsTxt.content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .slice(0, 20); // Limit to 20 packages
    }
  } else {
    const packageJson = files.find(f => f.path === 'package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        return Object.entries(deps)
          .map(([name, version]) => `${name}@${version}`)
          .slice(0, 20); // Limit to 20 packages
      } catch (e) {
        console.warn('Failed to parse package.json:', e);
      }
    }
  }
  
  return [];
}

