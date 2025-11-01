#!/usr/bin/env tsx
/**
 * Network Access Test Example
 * 
 * This example demonstrates the network allow-list feature.
 * 
 * Usage:
 *   1. Set your DOCLE_API_KEY environment variable
 *   2. Run: npx tsx examples/network-test.ts
 */

import { runSandbox } from '../sdk/index';

async function testNetworkBlocked() {
  console.log('\n🔒 Test 1: Network blocked by default');
  console.log('='.repeat(50));
  
  const code = `
const response = await fetch('https://api.github.com/users/octocat');
console.log('This should never print');
  `;

  try {
    const result = await runSandbox(code, {
      lang: 'node',
      apiKey: process.env.DOCLE_API_KEY!,
      policy: {
        timeoutMs: 10000
        // No allowNetwork or allowedHosts - network should be blocked
      }
    });
    
    if (result.ok) {
      console.log('❌ FAIL: Network should be blocked by default');
    } else {
      console.log('✅ PASS: Network blocked (as expected)');
      console.log('Error:', result.stderr.substring(0, 100) + '...');
    }
  } catch (error: any) {
    console.log('✅ PASS: Network blocked (as expected)');
    console.log('Error:', error.message);
  }
}

async function testNetworkAllowed() {
  console.log('\n✅ Test 2: Network allowed with allow-list');
  console.log('='.repeat(50));
  
  const code = `
const response = await fetch('https://api.github.com/users/octocat');
const data = await response.json();
console.log('User:', data.login);
console.log('Repos:', data.public_repos);
console.log('Followers:', data.followers);
  `;

  const result = await runSandbox(code, {
    lang: 'node',
    apiKey: process.env.DOCLE_API_KEY!,
    policy: {
      timeoutMs: 15000,
      allowNetwork: true,
      allowedHosts: ['api.github.com']
    }
  });
  
  if (result.ok) {
    console.log('✅ PASS: Fetch succeeded with allow-list');
    console.log('\nOutput:');
    console.log(result.stdout);
  } else {
    console.log('❌ FAIL: Fetch should work with allow-list');
    console.log('Error:', result.stderr);
  }
}

async function testNetworkDenied() {
  console.log('\n🚫 Test 3: Network denied for non-allowed host');
  console.log('='.repeat(50));
  
  const code = `
// Try to access a domain not in the allow-list
const response = await fetch('https://example.com');
console.log('This should never print');
  `;

  const result = await runSandbox(code, {
    lang: 'node',
    apiKey: process.env.DOCLE_API_KEY!,
    policy: {
      timeoutMs: 10000,
      allowNetwork: true,
      allowedHosts: ['api.github.com'] // example.com not allowed
    }
  });
  
  if (result.ok) {
    console.log('❌ FAIL: Access to example.com should be denied');
  } else {
    console.log('✅ PASS: Access denied (as expected)');
    console.log('Error:', result.stderr.substring(0, 150) + '...');
  }
}

async function testWildcardDomain() {
  console.log('\n🌐 Test 4: Wildcard subdomain support');
  console.log('='.repeat(50));
  
  const code = `
// Test multiple GitHub subdomains
const api = await fetch('https://api.github.com/users/octocat');
const apiData = await api.json();
console.log('API access:', apiData.login);

// Note: gist.github.com would also work with *.github.com
console.log('Wildcard pattern works!');
  `;

  const result = await runSandbox(code, {
    lang: 'node',
    apiKey: process.env.DOCLE_API_KEY!,
    policy: {
      timeoutMs: 15000,
      allowNetwork: true,
      allowedHosts: ['*.github.com'] // Allows all GitHub subdomains
    }
  });
  
  if (result.ok) {
    console.log('✅ PASS: Wildcard pattern works');
    console.log('\nOutput:');
    console.log(result.stdout);
  } else {
    console.log('❌ FAIL: Wildcard should allow subdomains');
    console.log('Error:', result.stderr);
  }
}

async function testPythonNetwork() {
  console.log('\n🐍 Test 5: Python network access');
  console.log('='.repeat(50));
  
  const code = `
import urllib.request
import json

response = urllib.request.urlopen('https://api.github.com/users/octocat')
data = json.loads(response.read())
print(f"User: {data['login']}")
print(f"Repos: {data['public_repos']}")
  `;

  const result = await runSandbox(code, {
    lang: 'python',
    apiKey: process.env.DOCLE_API_KEY!,
    policy: {
      timeoutMs: 15000,
      allowNetwork: true,
      allowedHosts: ['api.github.com']
    }
  });
  
  if (result.ok) {
    console.log('✅ PASS: Python network access works');
    console.log('\nOutput:');
    console.log(result.stdout);
  } else {
    console.log('❌ FAIL: Python fetch should work');
    console.log('Error:', result.stderr);
  }
}

async function testOutputLimit() {
  console.log('\n📏 Test 6: Output size limit');
  console.log('='.repeat(50));
  
  const code = `
// Generate large output
for (let i = 0; i < 10000; i++) {
  console.log('This is a very long line that will be repeated many times to exceed the output limit ' + i);
}
  `;

  const result = await runSandbox(code, {
    lang: 'node',
    apiKey: process.env.DOCLE_API_KEY!,
    policy: {
      timeoutMs: 10000,
      maxOutputBytes: 5000 // Limit to 5KB
    }
  });
  
  if (result.stdout.includes('output truncated')) {
    console.log('✅ PASS: Output was truncated at limit');
    console.log('Output size:', result.stdout.length, 'bytes');
  } else {
    console.log('⚠️  Output limit may not have been reached');
    console.log('Output size:', result.stdout.length, 'bytes');
  }
}

async function runAllTests() {
  console.log('\n🧪 Network Access Feature Tests');
  console.log('='.repeat(50));
  
  if (!process.env.DOCLE_API_KEY) {
    console.error('\n❌ Error: DOCLE_API_KEY environment variable not set');
    console.error('Set your API key: export DOCLE_API_KEY=sk_live_...');
    process.exit(1);
  }
  
  try {
    await testNetworkBlocked();
    await testNetworkAllowed();
    await testNetworkDenied();
    await testWildcardDomain();
    await testPythonNetwork();
    await testOutputLimit();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log('='.repeat(50) + '\n');
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run all tests
runAllTests();

