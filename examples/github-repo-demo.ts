#!/usr/bin/env tsx
/**
 * GitHub Repository Loading Demo
 * 
 * This example demonstrates loading and running code from GitHub repositories.
 * 
 * Usage:
 *   1. Set your DOCLE_API_KEY environment variable
 *   2. Run: npx tsx examples/github-repo-demo.ts
 */

import { runSandbox } from '../sdk/index';

async function demoSimpleRepo() {
  console.log('\n📦 Demo 1: Simple Repository');
  console.log('='.repeat(60));
  console.log('Loading: octocat/Hello-World\n');
  
  try {
    const result = await runSandbox(null, {
      repo: 'octocat/Hello-World',
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 15000
      }
    });
    
    console.log('✅ Success!');
    console.log('\nOutput:');
    console.log(result.stdout || result.stderr);
    console.log('\nMetadata:');
    console.log(`- Exit code: ${result.exitCode}`);
    console.log(`- Duration: ${result.usage?.durationMs}ms`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function demoWithCustomEntrypoint() {
  console.log('\n📂 Demo 2: Custom Entrypoint');
  console.log('='.repeat(60));
  console.log('Loading repository with specific file\n');
  
  try {
    const result = await runSandbox(null, {
      repo: 'https://github.com/octocat/Hello-World',
      entrypoint: 'README', // Custom entrypoint
      lang: 'python', // Force language
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 15000
      }
    });
    
    console.log('✅ Custom entrypoint executed');
    console.log(result.stdout ? result.stdout.substring(0, 200) + '...' : result.stderr);
  } catch (error: any) {
    console.error('Expected error (README is not executable):', error.message.substring(0, 100));
  }
}

async function demoLanguageDetection() {
  console.log('\n🔍 Demo 3: Automatic Language Detection');
  console.log('='.repeat(60));
  console.log('Loading repository without specifying language\n');
  
  try {
    const result = await runSandbox(null, {
      repo: 'octocat/Hello-World',
      // No lang specified - auto-detect!
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 15000
      }
    });
    
    console.log('✅ Language auto-detected and executed');
    console.log('Output:', result.stdout || result.stderr);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function demoWithNetworkAccess() {
  console.log('\n🌐 Demo 4: Repository with Network Access');
  console.log('='.repeat(60));
  console.log('Running code that needs external API access\n');
  
  // Create a simple example that fetches from GitHub API
  try {
    const result = await runSandbox(null, {
      repo: 'octocat/Hello-World',
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 20000,
        allowNetwork: true,
        allowedHosts: ['api.github.com']
      }
    });
    
    console.log('✅ Executed with network access');
    console.log(result.stdout || result.stderr);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function demoErrorHandling() {
  console.log('\n❌ Demo 5: Error Handling');
  console.log('='.repeat(60));
  console.log('Attempting to load non-existent repository\n');
  
  try {
    await runSandbox(null, {
      repo: 'this-user-does-not-exist/fake-repo-12345',
      apiKey: process.env.DOCLE_API_KEY!
    });
  } catch (error: any) {
    console.log('✅ Error caught correctly:');
    console.log(`   ${error.message.substring(0, 150)}`);
  }
}

async function demoShortFormat() {
  console.log('\n🔗 Demo 6: Short URL Format');
  console.log('='.repeat(60));
  console.log('Using "owner/repo" format instead of full URL\n');
  
  try {
    const result = await runSandbox(null, {
      repo: 'octocat/Hello-World', // Short format
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 15000
      }
    });
    
    console.log('✅ Short format works!');
    console.log('Output:', (result.stdout || result.stderr).substring(0, 100));
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

async function runAllDemos() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         GitHub Repository Loading - Demo Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (!process.env.DOCLE_API_KEY) {
    console.error('\n❌ Error: DOCLE_API_KEY environment variable not set');
    console.error('Set your API key: export DOCLE_API_KEY=sk_live_...\n');
    process.exit(1);
  }
  
  try {
    await demoSimpleRepo();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoLanguageDetection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoShortFormat();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoWithCustomEntrypoint();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoWithNetworkAccess();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoErrorHandling();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All demos completed!');
    console.log('='.repeat(60));
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  ✓ Simple repository loading');
    console.log('  ✓ Automatic language detection');
    console.log('  ✓ Short URL format (owner/repo)');
    console.log('  ✓ Custom entrypoints');
    console.log('  ✓ Network access integration');
    console.log('  ✓ Error handling');
    console.log('\n📚 See docs/github-repos.md for complete documentation\n');
    
  } catch (error: any) {
    console.error('\n❌ Demo suite failed:', error.message);
    process.exit(1);
  }
}

// Run all demos
runAllDemos();

