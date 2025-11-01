# ⚡ Instant API

Turn your code into a live API endpoint in 30 seconds. No repos, no builds, no deployment pipeline.

## What is this?

Write a function, click deploy, get a URL. That's it.

Your code runs on every request to that URL. Perfect for:
- **Testing webhooks** (Stripe, GitHub, etc.) without ngrok
- **Mocking APIs** for frontend development
- **Quick automations** (scheduled tasks, integrations)
- **Discord/Slack bots** without servers

## Quick Start

1. Go to **Instant API** in your dashboard
2. Write a handler function:

```javascript
export default function handler(request) {
  const { name } = request.query;
  return {
    message: `Hello ${name || 'World'}!`,
    timestamp: Date.now()
  };
}
```

3. Click **Deploy**
4. Get instant URL: `https://api.docle.co/api/e/abc12345`
5. Call it: `curl https://api.docle.co/api/e/abc12345?name=Alice`

## Use Cases

### Webhook Testing

```javascript
export default function handler(request) {
  console.log('Stripe webhook:', request.body);
  
  if (request.body.type === 'payment.succeeded') {
    // Handle payment
    return { received: true, status: 'processed' };
  }
  
  return { received: true };
}
```

**Use it:** Paste the URL into Stripe/GitHub webhook settings. No ngrok needed.

### API Mocking

```javascript
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

export default function handler(request) {
  const { id } = request.query;
  return id ? users.find(u => u.id == id) : users;
}
```

**Use it:** Frontend devs can call this immediately. No waiting for the backend team.

### Quick Automation

```javascript
export default async function handler(request) {
  const data = await fetch('https://api.example.com/data');
  // Process and return
  return { status: 'done', items: data.length };
}
```

**Use it:** Add the URL to cron-job.org or your Zapier workflow.

## Request Context

Your handler receives a `request` object:

```javascript
{
  method: 'GET',           // HTTP method
  query: { name: 'Alice' }, // Query parameters
  body: {},                // JSON body (POST/PUT)
  headers: {},             // Request headers
  path: '/api/e/...'       // Full path
}
```

## What You Get

- **Templates** - Start with Hello World, Webhook, or REST API examples
- **Testing UI** - Send test requests right from the dashboard
- **Live logs** - See every call with timing and status
- **Analytics** - Track total calls and last execution
- **Code examples** - Copy cURL, JavaScript, or Python snippets
- **Edit anytime** - Update your code without changing the URL

## Limits

- **5 second timeout** per request
- **Last 100 logs** are kept
- Language support: **JavaScript** (Node.js) and **Python**
- Public endpoints (anyone with URL can call them)

## Tips

✅ **Return JSON** for best experience  
✅ **Use query params** for GET requests  
✅ **Use request.body** for POST data  
✅ **Check request.method** to handle different HTTP methods  
✅ **Test in the dashboard** before sharing the URL  

## Examples

Check the **Templates** dropdown in the Instant API page for working examples of:
- Hello World API
- Webhook handlers
- REST API patterns

## Pricing

Same as regular Docle executions - each API call counts as one execution against your rate limit.

---

**Questions?** Check the main [README](README.md) or [DETAILED.md](DETAILED.md) for more info.
