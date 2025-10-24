/**
 * Collaborative Playground with WebSocket support
 */
export function collaborativePlaygroundHTML(sessionId: string) {
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Docle Collaborative Playground</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@6.0.1/dist/index.css"/>
<style>
:root{--bg:#0b0d10;--fg:#e6eef8;--mut:#9aa8b4;--card:#11161b;--acc:#8aa2ff;--border:#1b232b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui;display:flex;height:100vh;overflow:hidden}
.sidebar{width:280px;background:var(--card);border-right:1px solid var(--border);padding:16px;display:flex;flex-direction:column}
.main{flex:1;display:flex;flex-direction:column;padding:16px}
.header{margin-bottom:16px}
.header h1{margin:0;font-size:20px}
.header .small{color:var(--mut);font-size:12px}
.session-info{background:#0c1218;border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px}
.session-info .code{font-family:monospace;font-size:12px;background:#0a0e12;padding:4px 8px;border-radius:4px;margin-top:8px}
.users-list{flex:1;overflow-y:auto}
.user-item{display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;margin-bottom:4px;background:#0c1218;font-size:13px}
.user-dot{width:12px;height:12px;border-radius:50%}
.status-indicator{padding:6px 12px;border-radius:6px;font-size:12px;margin-top:12px;text-align:center}
.status-indicator.connected{background:rgba(81,207,102,0.1);border:1px solid #51cf66;color:#51cf66}
.status-indicator.disconnected{background:rgba(255,107,107,0.1);border:1px solid #ff6b6b;color:#ff6b6b}
.controls{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.controls select,.controls input{background:#0c1218;color:var(--fg);border:1px solid var(--border);border-radius:6px;padding:8px;flex:1;min-width:120px}
button{background:var(--acc);color:#051030;border:none;border-radius:6px;padding:10px 16px;font-weight:700;cursor:pointer;transition:opacity 0.2s}
button:hover{opacity:0.9}
.cm-editor{border:1px solid var(--border);border-radius:8px;background:var(--card)!important;flex:1;min-height:300px}
.output{background:#0a0e12;border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow:auto}
.output pre{font:12px/1.4 "SF Mono",Monaco,monospace;white-space:pre-wrap;word-wrap:break-word;margin:0}
.cursor-overlay{position:absolute;width:2px;background:currentColor;pointer-events:none;z-index:10}
</style>
</head><body>
<div class="sidebar">
  <div class="header">
    <h1>👥 Collaborative</h1>
    <div class="small">Real-time editing</div>
  </div>

  <div class="session-info">
    <div class="small">Session ID</div>
    <div class="code">${sessionId}</div>
    <div class="small" style="margin-top:8px">Share this URL to invite others</div>
  </div>

  <div class="small" style="margin-bottom:8px">Active Users</div>
  <div class="users-list" id="users"></div>

  <div id="status" class="status-indicator disconnected">Connecting...</div>
</div>

<div class="main">
  <div class="header">
    <h1>Docle Collab Playground</h1>
    <div class="small">Code together in real-time</div>
  </div>

  <div class="controls">
    <select id="lang"><option value="python">Python</option><option value="node">Node.js</option></select>
    <input id="timeout" placeholder="Timeout (ms)" value="5000"/>
    <button id="run">▶ Run</button>
    <button id="copy-link" style="background:#333">📋 Copy Link</button>
  </div>

  <div id="editor"></div>

  <div class="output" style="display:none" id="output">
    <pre id="output-text"></pre>
  </div>
</div>

<script type="module">
import {EditorView, basicSetup} from "https://cdn.jsdelivr.net/npm/codemirror@6.0.1/+esm";
import {python} from "https://cdn.jsdelivr.net/npm/@codemirror/lang-python@6.1.6/+esm";
import {javascript} from "https://cdn.jsdelivr.net/npm/@codemirror/lang-javascript@6.2.2/+esm";
import {oneDark} from "https://cdn.jsdelivr.net/npm/@codemirror/theme-one-dark@6.1.2/+esm";

const qs = (s) => document.querySelector(s);

let editorView = null;
let ws = null;
let userId = null;
let users = new Map();
let isLocalUpdate = false;

// Initialize editor
function createEditor(content, lang) {
  if (editorView) editorView.destroy();
  editorView = new EditorView({
    doc: content,
    extensions: [
      basicSetup,
      lang === 'python' ? python() : javascript(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isLocalUpdate && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'update',
            userId,
            data: {
              code: editorView.state.doc.toString(),
              lang: qs('#lang').value
            }
          }));
        }
      })
    ],
    parent: qs('#editor')
  });
}

// Connect to WebSocket
function connect() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = \`\${protocol}//\${window.location.host}/collab/${sessionId}/websocket\`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    qs('#status').className = 'status-indicator connected';
    qs('#status').textContent = '✓ Connected';
  };

  ws.onclose = () => {
    qs('#status').className = 'status-indicator disconnected';
    qs('#status').textContent = '✗ Disconnected';
    setTimeout(connect, 3000); // Reconnect
  };

  ws.onerror = (e) => {
    console.error('WebSocket error:', e);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };
}

// Handle messages
function handleMessage(msg) {
  switch (msg.type) {
    case 'init':
      userId = msg.userId;
      isLocalUpdate = true;
      if (!editorView) {
        createEditor(msg.data.code || 'print("Hello, Collab!")', msg.data.lang || 'python');
      }
      qs('#lang').value = msg.data.lang || 'python';
      msg.data.users.forEach(u => users.set(u.id, u));
      renderUsers();
      isLocalUpdate = false;
      break;

    case 'join':
      users.set(msg.userId, { name: msg.data.name, color: msg.data.color });
      renderUsers();
      break;

    case 'leave':
      users.delete(msg.userId);
      renderUsers();
      break;

    case 'update':
      if (msg.userId !== userId) {
        isLocalUpdate = true;
        const code = msg.data.code;
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: code }
        });
        qs('#lang').value = msg.data.lang;
        isLocalUpdate = false;
      }
      break;
  }
}

// Render users
function renderUsers() {
  const list = qs('#users');
  if (users.size === 0) {
    list.innerHTML = '<div class="small" style="color:var(--mut);padding:8px">No users yet</div>';
    return;
  }
  list.innerHTML = Array.from(users.entries()).map(([id, user]) => {
    const isMe = id === userId;
    return \`<div class="user-item">
      <div class="user-dot" style="background:\${user.color}"></div>
      <div>\${user.name}\${isMe ? ' (You)' : ''}</div>
    </div>\`;
  }).join('');
}

// Language change
qs('#lang').onchange = () => {
  const lang = qs('#lang').value;
  const code = editorView.state.doc.toString();
  createEditor(code, lang);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'update',
      userId,
      data: { code, lang }
    }));
  }
};

// Run code
qs('#run').onclick = async () => {
  const code = editorView.state.doc.toString();
  qs('#output-text').textContent = '⏳ Running...';
  qs('#output').style.display = 'block';
  
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        code,
        lang: qs('#lang').value,
        policy: {
          timeoutMs: parseInt(qs('#timeout').value, 10),
          memoryMB: 256,
          allowNet: false
        }
      })
    });
    const json = await res.json();
    qs('#output-text').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    qs('#output-text').textContent = 'Error: ' + err.message;
  }
};

// Copy link
qs('#copy-link').onclick = () => {
  navigator.clipboard.writeText(window.location.href);
  qs('#copy-link').textContent = '✓ Copied!';
  setTimeout(() => {
    qs('#copy-link').textContent = '📋 Copy Link';
  }, 2000);
};

// Initialize
createEditor('print("Hello, Collab!")', 'python');
connect();
</script>
</body></html>`;
}

