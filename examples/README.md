# Docle Embed Examples

This directory contains examples of how to embed Docle code playgrounds in your applications.

## Quick Start

1. Start the dev server:
```bash
cd ..
npm run dev
```

2. Open `embed-demo.html` in your browser:
```bash
open examples/embed-demo.html
# or just drag it into your browser
```

## Embed Options

### Basic iframe Embed

```html
<iframe 
  src="https://docle.workers.dev/embed?lang=python&code=print('Hello')"
  width="100%" 
  height="400"
></iframe>
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lang` | `python` \| `node` | `python` | Programming language |
| `theme` | `dark` \| `light` | `dark` | Color theme |
| `code` | string (URL-encoded) | `print("Hello, Docle!")` | Initial code |
| `readonly` | `true` \| `false` | `false` | Make editor read-only |
| `showOutput` | `true` \| `false` | `true` | Show/hide output panel |
| `autorun` | `true` \| `false` | `false` | Auto-run on load |

### Examples

**Python with custom code:**
```html
<iframe src="https://docle.workers.dev/embed?lang=python&code=for%20i%20in%20range(5)%3A%0A%20%20%20%20print(i)"></iframe>
```

**JavaScript/Node:**
```html
<iframe src="https://docle.workers.dev/embed?lang=node&code=console.log('Hi!')"></iframe>
```

**Light theme:**
```html
<iframe src="https://docle.workers.dev/embed?theme=light"></iframe>
```

**Read-only (demo mode):**
```html
<iframe src="https://docle.workers.dev/embed?readonly=true"></iframe>
```

## PostMessage API

Communicate with the embed via `postMessage`:

### Listen to Results

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'docle-result') {
    console.log('Execution result:', event.data.data);
    // {
    //   ok: true,
    //   exitCode: 0,
    //   stdout: "Hello!\n",
    //   stderr: "",
    //   usage: { durationMs: 123 }
    // }
  }
  
  if (event.data.type === 'docle-ready') {
    console.log('Embed ready!');
  }
  
  if (event.data.type === 'docle-error') {
    console.error('Error:', event.data.data);
  }
});
```

### Control the Embed

```javascript
const iframe = document.querySelector('iframe');

// Trigger code execution
iframe.contentWindow.postMessage({ type: 'docle-run' }, '*');

// Update code
iframe.contentWindow.postMessage({ 
  type: 'docle-set-code', 
  code: 'print("New code!")' 
}, '*');
```

## Use Cases

### 1. Interactive Documentation
Embed runnable code examples in your docs:

```html
<h2>API Example</h2>
<p>Here's how to use our API:</p>
<iframe src="https://docle.workers.dev/embed?lang=python&code=import%20requests%0Aresponse%20%3D%20requests.get('https://api.example.com')%0Aprint(response.json())"></iframe>
```

### 2. Tutorial/Learning Platform
Create interactive coding lessons:

```html
<div class="lesson">
  <h3>Lesson 1: Variables</h3>
  <p>Try changing the values:</p>
  <iframe src="https://docle.workers.dev/embed?lang=python&code=x%20%3D%2042%0Ay%20%3D%2010%0Aprint(x%20%2B%20y)"></iframe>
</div>
```

### 3. Code Challenge
Embed coding challenges for hiring or education:

```html
<iframe 
  src="https://docle.workers.dev/embed?lang=python&code=def%20solution()%3A%0A%20%20%20%20%23%20TODO%3A%20Implement%20me%0A%20%20%20%20pass"
  id="challenge"
></iframe>
<button onclick="checkSolution()">Submit Solution</button>
```

### 4. Product Demo
Let users try your product without signup:

```html
<h2>Try Our Data Processing API</h2>
<iframe src="https://docle.workers.dev/embed?lang=python&code=from%20your_sdk%20import%20process_data%0A%0Adata%20%3D%20%5B1%2C%202%2C%203%5D%0Aresult%20%3D%20process_data(data)%0Aprint(result)"></iframe>
```

## Next Steps

- See the [React component example](../packages/react/) for framework integration
- Check the [main README](../README.md) for API documentation
- Read about [web components](../packages/web-component/) for universal compatibility

