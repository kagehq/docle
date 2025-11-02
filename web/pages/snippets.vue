<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { DoclePlayground } from '@doclehq/vue'

useHead({
  title: 'Integration Snippets - Docle'
})

// Inject the snippets panel function
const openSnippetsPanel = inject<() => void>('openSnippetsPanel', () => {})

const activeTab = ref<'cdn' | 'react' | 'vue' | 'iframe' | 'sdk' | 'proxy'>('cdn')

// Load CDN script for CDN preview
onMounted(() => {
  if (typeof window !== 'undefined' && !document.querySelector('script[src*="@doclehq/embed"]')) {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@doclehq/embed@latest/dist/embed.js'
    document.head.appendChild(script)
  }
})

// Syntax highlighter function - simple and reliable
const highlight = (code: string, language: string): string => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  if (language === 'cdn' || language === 'iframe') {
    // HTML highlighting
    const parts: string[] = []
    let lastIndex = 0
    const tagRegex = /<(!--[\s\S]*?--|\/?[a-zA-Z][\w-]*(?:\s+[^>]*)?)>/g
    let match

    while ((match = tagRegex.exec(code)) !== null) {
      // Add text before tag
      if (match.index > lastIndex) {
        parts.push(esc(code.slice(lastIndex, match.index)))
      }

      const fullTag = match[0]
      const inner = match[1]

      if (inner.startsWith('!--')) {
        // Comment
        parts.push(`<span class="text-gray-500">${esc(fullTag)}</span>`)
      } else {
        // Regular tag - parse more carefully
        let highlighted = '&lt;'

        // Match: optional slash, tag name, rest of attributes
        const tagMatch = inner.match(/^(\/?)([a-zA-Z][\w-]*)(.*)$/s)
        if (tagMatch) {
          const [, slash, tagName, attrsStr] = tagMatch

          highlighted += slash
          highlighted += `<span class="text-blue-400">${tagName}</span>`

          // Parse attributes more carefully (handle both single and double quotes)
          if (attrsStr.trim()) {
            const attrRegex = /\s+([a-zA-Z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'))?/g
            let attrMatch
            let lastAttrIdx = 0

            while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
              // Add space/content before attribute
              if (attrMatch.index > lastAttrIdx) {
                highlighted += esc(attrsStr.slice(lastAttrIdx, attrMatch.index))
              }

              const attrName = attrMatch[1]
              const attrVal = attrMatch[2] || attrMatch[3] // double or single quote
              const quote = attrMatch[2] !== undefined ? '"' : attrMatch[3] !== undefined ? "'" : ''

              highlighted += ' ' + `<span class="text-purple-300">${attrName}</span>`
              if (quote) {
                highlighted += '=' + `<span class="text-yellow-300">${quote}${esc(attrVal)}${quote}</span>`
              }

              lastAttrIdx = attrRegex.lastIndex
            }

            // Add remaining attr content
            if (lastAttrIdx < attrsStr.length) {
              highlighted += esc(attrsStr.slice(lastAttrIdx))
            }
          }
        }

        highlighted += '&gt;'
        parts.push(highlighted)
      }

      lastIndex = tagRegex.lastIndex
    }

    // Add remaining text
    if (lastIndex < code.length) {
      parts.push(esc(code.slice(lastIndex)))
    }

    return parts.join('')
  }

  if (language === 'react' || language === 'vue' || language === 'sdk' || language === 'proxy') {
    // Proper tokenization - identify all parts first, then render
    const tokens: Array<{text: string, type: string}> = []
    let pos = 0

    const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|await|async|class|extends|new|interface|type|try|catch|throw)\b/g
    const strings = /(["'`])((?:(?!\1|\\).|\\.)*?)\1/g
    const comments = /\/\/.*$|\/\*[\s\S]*?\*\//gm
    const numbers = /\b\d+\.?\d*\b/g
    const functions = /\b[a-zA-Z_$][\w$]*(?=\s*\()/g
    const jsxTags = /<\/?[A-Z][a-zA-Z0-9]*/g

    // Find all matches
    const allMatches: Array<{index: number, length: number, type: string, text: string}> = []

    let m
    while ((m = strings.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'string', text: m[0]})
    }
    strings.lastIndex = 0

    while ((m = comments.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'comment', text: m[0]})
    }
    comments.lastIndex = 0

    while ((m = keywords.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'keyword', text: m[0]})
    }
    keywords.lastIndex = 0

    while ((m = numbers.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'number', text: m[0]})
    }
    numbers.lastIndex = 0

    while ((m = functions.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'function', text: m[0]})
    }
    functions.lastIndex = 0

    while ((m = jsxTags.exec(code)) !== null) {
      allMatches.push({index: m.index, length: m[0].length, type: 'jsx', text: m[0]})
    }
    jsxTags.lastIndex = 0

    // Sort by position and handle overlaps (prioritize: strings/comments > keywords > functions > numbers > jsx)
    allMatches.sort((a, b) => a.index !== b.index ? a.index - b.index :
      (a.type === 'string' || a.type === 'comment' ? -1 : b.type === 'string' || b.type === 'comment' ? 1 : 0))

    const finalTokens: Array<{text: string, type: string}> = []
    let lastEnd = 0

    for (const match of allMatches) {
      // Skip if overlapping with previous match
      if (match.index < lastEnd) continue

      // Add plain text before this match
      if (match.index > lastEnd) {
        finalTokens.push({text: code.slice(lastEnd, match.index), type: 'plain'})
      }

      // Add the matched token
      finalTokens.push({text: match.text, type: match.type})
      lastEnd = match.index + match.length
    }

    // Add remaining text
    if (lastEnd < code.length) {
      finalTokens.push({text: code.slice(lastEnd), type: 'plain'})
    }

    // Render tokens
    return finalTokens.map(token => {
      const escaped = esc(token.text)
      switch (token.type) {
        case 'string': return `<span class="text-yellow-300">${escaped}</span>`
        case 'comment': return `<span class="text-gray-500">${escaped}</span>`
        case 'keyword': return `<span class="text-pink-400">${escaped}</span>`
        case 'number': return `<span class="text-orange-300">${escaped}</span>`
        case 'function': return `<span class="text-blue-300">${escaped}</span>`
        case 'jsx': return `<span class="text-green-400">${escaped}</span>`
        default: return escaped
      }
    }).join('')
  }

  return esc(code)
}

const cdnSnippet = `<!-- Add the script tag -->
<` + `script src="https://unpkg.com/@doclehq/embed@latest/dist/embed.js"><` + `/script>

<` + `script>
  window.docleApiKey = 'sk_live_YOUR_API_KEY';
<` + `/script>

<!-- Add code playgrounds anywhere -->
<div data-docle data-lang="python">
print("Hello, Docle!")
for i in range(5):
    print(f"Count: {i}")
</div>

<!-- Option 2: Per-embed API key -->
<div data-docle data-lang="node" data-api-key="sk_live_xxx">
console.log("Node.js example");
</div>`

const reactSnippet = `// Option 1: useDocle Hook + Server Proxy (Custom UI, Most Secure)
import { useDocle } from '@doclehq/react';
import { useState } from 'react';

function MyEditor() {
  const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
  const [code, setCode] = useState('print("Hello!")');

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => run(code, { lang: 'python' })} disabled={loading}>
        Run
      </button>
      {result && <pre>{result.stdout}</pre>}
    </div>
  );
}

// Server: app/api/docle/api/run/route.ts
// export async function POST(req) {
//   const { code, lang, policy } = await req.json();
//   const result = await fetch('https://api.docle.co/api/run', {
//     method: 'POST',
//     headers: {
//       'Authorization': \`Bearer \${process.env.DOCLE_API_KEY}\`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ code, lang, policy })
//   });
//   return Response.json(await result.json());
// }

// Option 2: DoclePlayground + Domain Restrictions (Quick UI)
import { DoclePlayground } from '@doclehq/react';

function App() {
  return (
    <DoclePlayground
      lang="python"
      code="print('Hello from React!')"
      apiKey="sk_live_YOUR_API_KEY"  // Set domain restrictions in dashboard
      onRun={(result) => console.log(result)}
    />
  );
}`

const vueSnippet = `// Option 1: useDocle Composable + Server Proxy (Custom UI, Most Secure)
<` + `script setup>
import { ref } from 'vue';
import { useDocle } from '@doclehq/vue';

const { run, result, loading } = useDocle({ endpoint: '/api/docle' });
const code = ref('print("Hello!")');

const handleRun = async () => {
  await run(code.value, { lang: 'python' });
};
<` + `/script>

<template>
  <div>
    <textarea v-model="code" />
    <button @click="handleRun" :disabled="loading">Run</button>
    <pre v-if="result">{{ result.stdout }}</pre>
  </div>
</template>

// Server: server/api/docle/api/run.post.ts -->
export default defineEventHandler(async (event) => {
  const { code, lang, policy } = await readBody(event);
  return await $fetch('https://api.docle.co/api/run', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.DOCLE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: { code, lang, policy }
  });
});

// Option 2: DoclePlayground + Domain Restrictions (Quick UI)
<` + `script setup>
import { DoclePlayground } from '@doclehq/vue';
<` + `/script>

<template>
  <DoclePlayground
    lang="python"
    code="print('Hello from Vue!')"
    api-key="sk_live_YOUR_API_KEY"
    @run="handleRun"
  />
</template>`

const iframeSnippet = `<!-- Step 1: Add iframe to your page -->
<iframe
  id="docle-embed"
  src="https://app.docle.co/embed?lang=python&code=print('Hello!')"
  width="100%"
  height="400"
  style="border: none; border-radius: 8px;"
></iframe>

<!-- Step 2: Send API key securely via postMessage -->
<` + `script>
const iframe = document.getElementById('docle-embed');

window.addEventListener('message', async (event) => {
  if (event.data.type === 'docle-ready') {
    // BETTER: Fetch API key from your server
    const { apiKey } = await fetch('/api/get-docle-key').then(r => r.json());

    iframe.contentWindow.postMessage({
      type: 'docle-set-apikey',
      apiKey  // From your backend
    }, '*');
  }
});
<` + `/script>

<!-- Listen to execution results -->
<` + `script>
window.addEventListener('message', (event) => {
  if (event.data.type === 'docle-result') {
    console.log('Execution completed:', event.data.data);
  }
});
<` + `/script>`

const sdkSnippet = `// Server-side only (Node.js, Deno, Bun, Edge Functions)
import { runSandbox } from '@doclehq/sdk';

// Always use environment variables for API keys
const result = await runSandbox('print("Hello!")', {
  lang: 'python',
  apiKey: process.env.DOCLE_API_KEY  // Secure!
});

console.log(result.stdout);  // Output: Hello!
console.log(result.ok);      // true
console.log(result.exitCode); // 0

// With execution policy options
const result = await runSandbox(code, {
  lang: 'python',
  apiKey: process.env.DOCLE_API_KEY,
  policy: {
    timeoutMs: 5000       // Max 5 seconds
  }
});

// Error handling
if (!result.ok) {
  console.error('Execution failed:', result.stderr);
  console.error('Exit code:', result.exitCode);
}`

const proxySnippet = `// Next.js
import { runSandbox } from '@doclehq/sdk';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, lang, policy } = req.body;

  try {
    const result = await runSandbox(code, {
      lang,
      policy,
      apiKey: process.env.DOCLE_API_KEY
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
}

// Client-side usage (React/Vue/etc.)
// Now your API key stays on the server!
<` + `script>
async function runCode(code) {
  const response = await fetch('/api/docle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      lang: 'python',
      policy: { timeoutMs: 5000 }
    })
  });

  const result = await response.json();
  console.log(result.stdout);
}
<` + `/script>

// Express.js
import express from 'express';
import { runSandbox } from '@doclehq/sdk';

const app = express();
app.use(express.json());

app.post('/api/docle', async (req, res) => {
  const { code, lang, policy } = req.body;

  try {
    const result = await runSandbox(code, {
      lang,
      policy,
      apiKey: process.env.DOCLE_API_KEY
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// Nuxt 3
import { runSandbox } from '@doclehq/sdk';

export default defineEventHandler(async (event) => {
  const { code, lang, policy } = await readBody(event);
  const config = useRuntimeConfig();

  try {
    const result = await runSandbox(code, {
      lang,
      policy,
      apiKey: config.docleApiKey  // From env vars
    });

    return result;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Execution failed'
    });
  }
});`

const currentSnippet = computed(() => {
  switch (activeTab.value) {
    case 'cdn': return cdnSnippet
    case 'react': return reactSnippet
    case 'vue': return vueSnippet
    case 'iframe': return iframeSnippet
    case 'sdk': return sdkSnippet
    case 'proxy': return proxySnippet
    default: return cdnSnippet
  }
})

const highlightedSnippet = computed(() => {
  return highlight(currentSnippet.value, activeTab.value)
})

const copyToClipboard = () => {
  navigator.clipboard.writeText(currentSnippet.value)
  showCopied.value = true
  setTimeout(() => showCopied.value = false, 2000)
}

const showCopied = ref(false)

// Live preview configuration
const previewLang = ref<'python' | 'node' | 'rust' | 'go'>('python')
const previewTheme = ref<'dark' | 'light'>('dark')
const previewCode = ref(`print("Hello from Docle!")
for i in range(5):
    print(f"Count: {i}")`)

const languageExamples = {
  python: `print("Hello from Docle!")
for i in range(5):
    print(f"Count: {i}")`,
  node: `console.log("Hello from Docle!");
for (let i = 0; i < 5; i++) {
    console.log(\`Count: \${i}\`);
}`,
  rust: `fn main() {
    println!("Hello from Docle!");
    for i in 0..5 {
        println!("Count: {}", i);
    }
}`,
  go: `package main
import "fmt"

func main() {
    fmt.Println("Hello from Docle!")
    for i := 0; i < 5; i++ {
        fmt.Printf("Count: %d\\n", i)
    }
}`
}

const updatePreviewLang = (lang: 'python' | 'node' | 'rust' | 'go') => {
  previewLang.value = lang
  previewCode.value = languageExamples[lang]
}

const previewUrl = computed(() => {
  const params = new URLSearchParams({
    lang: previewLang.value,
    code: previewCode.value,
    theme: previewTheme.value
  })
  return `/?${params.toString()}`
})

const previewTitle = computed(() => {
  switch (activeTab.value) {
    case 'cdn': return 'CDN Embed Preview'
    case 'react': return 'React Component Preview'
    case 'vue': return 'Vue Component Preview'
    case 'iframe': return 'iFrame Embed Preview'
    case 'sdk': return 'SDK Result Preview'
    default: return 'Live Preview'
  }
})

const previewDescription = computed(() => {
  switch (activeTab.value) {
    case 'cdn': return 'This is how the playground looks when embedded with a simple script tag'
    case 'react': return 'This is how the DoclePlayground React component renders'
    case 'vue': return 'This is how the DoclePlayground Vue component renders'
    case 'iframe': return 'This is how the playground looks when embedded as an iframe'
    case 'sdk': return 'This shows the output from running code via the SDK'
    default: return ''
  }
})
</script>

<template>
  <div class="h-screen bg-black text-white flex flex-col overflow-hidden">
    <div class="relative flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <AppHeader active-page="snippets" @open-snippets="openSnippetsPanel" />

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-4 py-8">
        <div class="max-w-3xl mx-auto w-full">
          <!-- Page Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-white mb-2">Integration Snippets</h1>
            <p class="text-gray-400">Copy-paste examples to integrate Docle into your app</p>
          </div>

          <div class="">
            <!-- Tabs -->
            <div class="flex items-center gap-2 mb-6 border-b border-gray-500/20 overflow-x-auto">
              <button
                @click="activeTab = 'cdn'"
                :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'cdn'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  CDN
                </span>
              </button>
                  <button
                @click="activeTab = 'react'"
                    :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'react'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>
                  </svg>
                  React
                </span>
              </button>
              <button
                @click="activeTab = 'vue'"
                      :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'vue'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 1.61h-4.84l-7.16 12.41L4.84 1.61H0L12 22.39 24 1.61M3.97 1.61L12 15.36l8.03-13.75h-3.39L12 10.35 7.36 1.61H3.97z"/>
                  </svg>
                  Vue
                </span>
                  </button>
                  <button
                @click="activeTab = 'iframe'"
                    :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'iframe'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  iFrame
                </span>
              </button>
              <button
                @click="activeTab = 'sdk'"
                      :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'sdk'
                    ? 'text-blue-300 border-b-2 border-blue-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                  </svg>
                  TypeScript SDK
                </span>
              </button>
              <button
                @click="activeTab = 'proxy'"
                      :class="[
                  'px-4 py-3 text-xs font-medium transition-all whitespace-nowrap',
                  activeTab === 'proxy'
                    ? 'text-green-300 border-b-2 border-green-300'
                    : 'text-gray-400 hover:text-white'
                ]">
                <span class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Server Proxy
                </span>
              </button>
            </div>

            <div class="flex gap-4">
              <!-- Code Block -->
              <div class="bg-gray-500/10 rounded-lg border border-gray-500/10 overflow-hidden w-full">
                <div class="flex items-center justify-between px-4 py-2 border-b border-gray-500/20">
                  <div class="flex items-center gap-2 text-sm text-gray-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                    </svg>
                    <span class="uppercase">{{ activeTab }}</span>
                  </div>
                    <button
                    @click="copyToClipboard"
                    class="px-3 py-1.5 text-xs rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-white border border-gray-500/20 font-medium transition-all flex items-center gap-2">
                    <svg v-if="!showCopied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    {{ showCopied ? 'Copied!' : 'Copy' }}
                    </button>
                </div>
                <div class="overflow-x-auto text-sm bg-black/30">
                  <pre class="p-4 leading-relaxed font-mono m-0 whitespace-pre"><code v-html="highlightedSnippet" class="text-gray-300"></code></pre>
                    </div>
                <div class="border-t border-gray-500/10 px-4 py-3 font-mono text-xs">
                  <!-- <div v-if="activeTab === 'cdn'" class="text-amber-300">
                    <p>⚠️ API key exposed in browser. For production, see "Server Proxy" tab or use domain restrictions.</p>
                  </div> -->
                  <div v-if="activeTab === 'react'">
                    <pre class="text-blue-300"><code>npm install @doclehq/react</code></pre>
                    <!-- <p class="mt-2 text-gray-400">Option 1: useDocle + proxy (custom UI) | Option 2: DoclePlayground + domain restrictions</p> -->
                  </div>
                  <div v-else-if="activeTab === 'vue'">
                    <pre class="text-blue-300"><code>npm install @doclehq/vue</code></pre>
                    <!-- <p class="mt-2 text-gray-400">Option 1: useDocle + proxy (custom UI) | Option 2: DoclePlayground + domain restrictions</p> -->
                  </div>
                  <!-- <div v-else-if="activeTab === 'iframe'" class="text-amber-300">
                    <p>💡 For simple embedding. Better: Fetch API key from your server endpoint.</p>
                  </div> -->
                  <div v-else-if="activeTab === 'sdk'">
                    <pre class="text-blue-300"><code>npm install @doclehq/sdk</code></pre>
                    <!-- <p class="mt-2 text-green-300">✅ Server-side only - Most secure</p> -->
                  </div>
                  <!-- <div v-else-if="activeTab === 'proxy'" class="text-green-300">
                    <p>✅ RECOMMENDED: API keys stay secure on your server</p>
                  </div> -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
