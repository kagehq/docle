// Public endpoint that returns the demo API key
// This allows the /demo page to work without authentication

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  // Get demo API key from environment variable
  // You should create a dedicated API key for public demos
  const demoApiKey = config.public.demoApiKey || process.env.DEMO_API_KEY
  
  if (!demoApiKey) {
    throw createError({
      statusCode: 500,
      message: 'Demo API key not configured. Please set DEMO_API_KEY environment variable.'
    })
  }
  
  return {
    apiKey: demoApiKey
  }
})

