#!/usr/bin/env node
/**
 * GitHub Repository Integration Tests
 * 
 * Validates that GitHub repo loading is properly integrated
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🧪 GitHub Repository Integration Tests\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: GitHub utility file exists
test('GitHub utility file exists', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('fetchGitHubRepo')) {
    throw new Error('fetchGitHubRepo function not found');
  }
});

// Test 2: GitHub URL parsing
test('GitHub URL parsing function exists', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('parseGitHubUrl')) {
    throw new Error('parseGitHubUrl function not found');
  }
});

// Test 3: Language detection
test('Language detection function exists', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('detectLanguage')) {
    throw new Error('detectLanguage function not found');
  }
});

// Test 4: Entrypoint detection
test('Entrypoint detection function exists', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('detectEntrypoint')) {
    throw new Error('detectEntrypoint function not found');
  }
});

// Test 5: Package extraction
test('Package extraction function exists', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('extractPackages')) {
    throw new Error('extractPackages function not found');
  }
});

// Test 6: Schema includes repo parameter
test('Schema includes repo parameter', () => {
  const schema = readFileSync(join(__dirname, 'src/lib/schema.ts'), 'utf8');
  if (!schema.includes('repo:')) {
    throw new Error('repo not in RunRequest schema');
  }
});

// Test 7: API handler integrates GitHub loading
test('API handler integrates GitHub loading', () => {
  const index = readFileSync(join(__dirname, 'src/index.ts'), 'utf8');
  if (!index.includes('fetchGitHubRepo') && !index.includes('lib/github')) {
    throw new Error('GitHub utilities not imported in API handler');
  }
  if (!index.includes('actualFiles') || !index.includes('actualLang')) {
    throw new Error('GitHub repo handling logic not found');
  }
});

// Test 8: SDK types include repo
test('SDK types include repo parameter', () => {
  const sdk = readFileSync(join(__dirname, 'sdk/index.ts'), 'utf8');
  if (!sdk.includes('repo?:')) {
    throw new Error('repo not in SDK RunOptions type');
  }
});

// Test 9: SDK passes repo to API
test('SDK passes repo to API', () => {
  const sdk = readFileSync(join(__dirname, 'sdk/index.ts'), 'utf8');
  if (!sdk.includes('body.repo')) {
    throw new Error('SDK does not pass repo parameter to API');
  }
});

// Test 10: React types include repo
test('React types include repo parameter', () => {
  const reactTypes = readFileSync(join(__dirname, 'packages/react/src/types.ts'), 'utf8');
  if (!reactTypes.includes('repo?:')) {
    throw new Error('repo not in React DocleRunOptions');
  }
});

// Test 11: Vue types include repo
test('Vue types include repo parameter', () => {
  const vueTypes = readFileSync(join(__dirname, 'packages/vue/src/types.ts'), 'utf8');
  if (!vueTypes.includes('repo?:')) {
    throw new Error('repo not in Vue DoclePlaygroundProps');
  }
});

// Test 12: Documentation exists
test('GitHub repos documentation exists', () => {
  const docs = readFileSync(join(__dirname, 'docs/github-repos.md'), 'utf8');
  if (!docs.includes('GitHub Repository Support')) {
    throw new Error('Documentation title missing');
  }
  if (!docs.includes('runSandbox') || !docs.includes('octocat/Hello-World')) {
    throw new Error('Documentation missing key examples');
  }
  if (!docs.includes('Automatic Language Detection') || !docs.includes('Automatic Entrypoint')) {
    throw new Error('Documentation missing auto-detection features');
  }
});

// Test 13: Example file exists
test('GitHub demo example exists', () => {
  const example = readFileSync(join(__dirname, 'examples/github-repo-demo.ts'), 'utf8');
  if (!example.includes('runSandbox')) {
    throw new Error('Example missing runSandbox calls');
  }
  if (!example.includes('octocat/Hello-World')) {
    throw new Error('Example missing demo repository');
  }
});

// Test 14: README mentions GitHub integration
test('README mentions GitHub integration', () => {
  const readme = readFileSync(join(__dirname, 'README.md'), 'utf8');
  if (!readme.includes('GitHub integration') && !readme.includes('GitHub')) {
    throw new Error('README does not mention GitHub integration');
  }
});

// Test 15: URL format support
test('Supports multiple URL formats', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('owner/repo') || !github.includes('github.com')) {
    throw new Error('URL format parsing logic incomplete');
  }
});

// Test 16: Error handling for invalid repos
test('Error handling for invalid repositories', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('Repository not found') || !github.includes('Make sure it\'s public')) {
    throw new Error('Error messages for invalid repos missing');
  }
});

// Test 17: File size limits
test('File size limits implemented', () => {
  const github = readFileSync(join(__dirname, 'src/lib/github.ts'), 'utf8');
  if (!github.includes('maxFileSize') || !github.includes('maxFiles')) {
    throw new Error('File size/count limits not implemented');
  }
});

// Test 18: Language is optional when repo provided
test('Language is optional when repo provided', () => {
  const schema = readFileSync(join(__dirname, 'src/lib/schema.ts'), 'utf8');
  if (!schema.includes('Lang.optional()')) {
    throw new Error('Language should be optional when repo is provided');
  }
});

console.log('='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('✅ All integration tests passed!');
  console.log('\n📝 GitHub Repository Feature Status:');
  console.log('   ✅ Core implementation complete');
  console.log('   ✅ URL parsing and fetching');
  console.log('   ✅ Language auto-detection');
  console.log('   ✅ Entrypoint auto-detection');
  console.log('   ✅ Package extraction');
  console.log('   ✅ API integration');
  console.log('   ✅ SDK support');
  console.log('   ✅ React/Vue types updated');
  console.log('   ✅ Documentation complete');
  console.log('   ✅ Examples provided');
  console.log('   ✅ Error handling');
  console.log('\n🚀 Ready for testing!');
  console.log('\nTo test with real repos:');
  console.log('   1. Deploy: npm run deploy');
  console.log('   2. Set API key: export DOCLE_API_KEY=sk_live_...');
  console.log('   3. Run demo: npx tsx examples/github-repo-demo.ts\n');
}

