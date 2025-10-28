import { runSandbox } from '@doclehq/sdk'

export default defineEventHandler(async (event) => {
  const { code, lang, policy } = await readBody(event)
  
  // In a real scenario, you would:
  // 1. Validate the request
  // 2. Implement per-user rate limiting
  // 3. Use your own API key from environment variables
  
  // For this demo, we'll use the playground key
  // This demonstrates the CORRECT way to integrate Docle
  try {
    const config = useRuntimeConfig()
    const apiUrl = config.public.apiUrl || 'https://api.docle.co'
    
    // Fetch the demo API key from a server endpoint or environment
    // In production, this would be your API key from env vars
    const demoKeyResponse = await $fetch('/api/playground/key', {
      method: 'POST',
      headers: event.headers
    })
    
    const apiKey = demoKeyResponse.apiKey
    
    // Proxy the request to Docle API
    const result = await $fetch(`${apiUrl}/api/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        code,
        lang,
        policy
      }
    })
    
    return result
  } catch (error: any) {
    console.error('Demo execution error:', error)
    
    // Return a helpful error for demo purposes
    return {
      ok: false,
      stdout: '',
      stderr: error.message || 'Execution failed',
      exitCode: 1
    }
  }
})

