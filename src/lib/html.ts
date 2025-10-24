export function page(title: string, body: string) {
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
:root{--bg:#0b0d10;--fg:#e6eef8;--mut:#9aa8b4;--card:#11161b;--acc:#8aa2ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui}
.wrap{max-width:960px;margin:40px auto;padding:0 16px}
.card{background:var(--card);border:1px solid #1b232b;border-radius:12px;padding:16px;margin-bottom:16px}
h1,h2{margin:0 0 10px} .small{color:var(--mut);font-size:12px}
pre{background:#0a0e12;padding:12px;border-radius:8px;overflow:auto}
button{background:var(--acc);color:#051030;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
input,select,textarea{width:100%;background:#0c1218;color:var(--fg);border:1px solid #1b232b;border-radius:8px;padding:10px}
.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1}
.badge{display:inline-block;background:#0e1620;color:var(--mut);border:1px solid #1b232b;border-radius:999px;padding:4px 8px}
table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #1b232b;text-align:left}
</style>
</head><body><div class="wrap">${body}</div></body></html>`;
}

export function playgroundHTML() {
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Docle Playground</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@6.0.1/dist/index.css"/>
<style>
:root{--bg:#0b0d10;--fg:#e6eef8;--mut:#9aa8b4;--card:#11161b;--acc:#8aa2ff;--border:#1b232b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui}
.wrap{max-width:1200px;margin:40px auto;padding:0 16px}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px}
h1,h2{margin:0 0 10px} .small{color:var(--mut);font-size:12px}
pre{background:#0a0e12;padding:12px;border-radius:8px;overflow:auto;font:13px/1.4 "SF Mono",Monaco,monospace}
button{background:var(--acc);color:#051030;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;transition:opacity 0.2s}
button:hover{opacity:0.9}
input,select{background:#0c1218;color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:10px;width:100%}
.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1;min-width:150px}
.cm-editor{border:1px solid var(--border);border-radius:8px;background:var(--card)!important;font-size:13px;height:300px}
.cm-scroller{overflow:auto}
.history-list{max-height:150px;overflow-y:auto}
.history-item{background:#0c1218;border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer;transition:background 0.2s}
.history-item:hover{background:#11161b}
.history-item code{font-size:11px;color:var(--mut)}
.tab-bar{display:flex;gap:4px;margin-bottom:8px;border-bottom:1px solid var(--border)}
.tab{padding:8px 16px;cursor:pointer;border-radius:8px 8px 0 0;background:transparent;transition:background 0.2s}
.tab:hover{background:rgba(138,162,255,0.1)}
.tab.active{background:var(--card);border-bottom:2px solid var(--acc)}
</style>
</head><body><div class="wrap">
<div class="card"><h1>Docle Playground</h1><div class="small">Run untrusted code safely with syntax highlighting • <a href="/playground/advanced">Advanced Mode</a> • <a href="/playground/collab">Collab Mode</a></div></div>

<div class="card">
  <div class="row">
    <div><div class="small">Language</div><select id="lang"><option value="python">Python</option><option value="node">Node.js</option></select></div>
    <div><div class="small">Timeout (ms)</div><input id="timeout" value="3000"/></div>
    <div><div class="small">Memory (MB)</div><input id="mem" value="256"/></div>
    <div><div class="small">Allow network</div><select id="net"><option value="false">No</option><option value="true">Yes</option></select></div>
  </div>
  
  <div class="small" style="margin-top:12px">Code Editor</div>
  <div id="editor"></div>
  
  <div style="margin-top:12px;display:flex;gap:8px">
    <button id="run">▶ Run Code</button>
    <button id="clear" style="background:#333">Clear</button>
  </div>
</div>

<div class="card">
  <h2>Output</h2>
  <pre id="out">—</pre>
</div>

<div class="card">
  <h2>Execution History</h2>
  <div class="small">Last 10 runs (stored locally)</div>
  <div id="history" class="history-list" style="margin-top:8px"></div>
  <button id="clear-history" style="background:#444;margin-top:8px;font-size:12px;padding:6px 12px">Clear History</button>
</div>

<div class="small">See <a href="/dashboard">/dashboard</a> for server-side logs.</div>

<script type="module">
import {EditorView, basicSetup} from "https://cdn.jsdelivr.net/npm/codemirror@6.0.1/+esm";
import {python} from "https://cdn.jsdelivr.net/npm/@codemirror/lang-python@6.1.6/+esm";
import {javascript} from "https://cdn.jsdelivr.net/npm/@codemirror/lang-javascript@6.2.2/+esm";
import {oneDark} from "https://cdn.jsdelivr.net/npm/@codemirror/theme-one-dark@6.1.2/+esm";

const qs = (s) => document.querySelector(s);

// CodeMirror setup
let editorView = new EditorView({
  doc: 'print("Hello, Docle!")\\nfor i in range(5):\\n    print(f"Count: {i}")',
  extensions: [basicSetup, python(), oneDark],
  parent: qs('#editor')
});

// Load execution history
function loadHistory() {
  const history = JSON.parse(localStorage.getItem('docle_history') || '[]');
  const historyEl = qs('#history');
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="small" style="color:var(--mut);padding:8px">No history yet</div>';
    return;
  }
  historyEl.innerHTML = history.slice(-10).reverse().map((h, i) => {
    const preview = h.code.split('\\n')[0].slice(0, 50);
    return \`<div class="history-item" data-idx="\${history.length - 1 - i}">
      <code>\${h.lang}</code> • <span class="small">\${new Date(h.timestamp).toLocaleTimeString()}</span><br/>
      <code style="color:var(--fg)">\${preview}\${h.code.length > 50 ? '...' : ''}</code>
    </div>\`;
  }).join('');
  
  // Add click handlers
  historyEl.querySelectorAll('.history-item').forEach(item => {
    item.onclick = () => {
      const idx = parseInt(item.dataset.idx);
      const h = history[idx];
      editorView.dispatch({
        changes: {from: 0, to: editorView.state.doc.length, insert: h.code}
      });
      qs('#lang').value = h.lang;
      updateLanguage();
    };
  });
}

// Save to history
function saveToHistory(code, lang) {
  const history = JSON.parse(localStorage.getItem('docle_history') || '[]');
  history.push({ code, lang, timestamp: Date.now() });
  if (history.length > 50) history.shift(); // Keep last 50
  localStorage.setItem('docle_history', JSON.stringify(history));
  loadHistory();
}

// Update language
function updateLanguage() {
  const lang = qs('#lang').value;
  const code = editorView.state.doc.toString();
  editorView.destroy();
  editorView = new EditorView({
    doc: code,
    extensions: [basicSetup, lang === 'python' ? python() : javascript(), oneDark],
    parent: qs('#editor')
  });
}

qs('#lang').onchange = updateLanguage;

qs('#run').onclick = async () => {
  const code = editorView.state.doc.toString();
  const lang = qs('#lang').value;
  const payload = {
    code,
    lang,
    policy: {
      timeoutMs: parseInt(qs('#timeout').value, 10),
      memoryMB: parseInt(qs('#mem').value, 10),
      allowNet: qs('#net').value === 'true'
    }
  };
  
  qs('#out').textContent = '⏳ Running...';
  qs('#run').disabled = true;
  
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    qs('#out').textContent = JSON.stringify(json, null, 2);
    saveToHistory(code, lang);
  } catch (err) {
    qs('#out').textContent = 'Error: ' + err.message;
  } finally {
    qs('#run').disabled = false;
  }
};

qs('#clear').onclick = () => {
  editorView.dispatch({
    changes: {from: 0, to: editorView.state.doc.length, insert: ''}
  });
};

qs('#clear-history').onclick = () => {
  if (confirm('Clear all execution history?')) {
    localStorage.removeItem('docle_history');
    loadHistory();
  }
};

loadHistory();
</script>
</div></body></html>`;
}

export function dashboardHTML(items: any[]) {
  const rows = items.map((r:any)=> `<tr> <td><span class="badge">${r.id}</span></td> <td>${r.ok?"✅":"❌"}</td> <td><code>${(r.stdout||"").slice(0,120).replace(/</g,"&lt;")}</code></td> <td><code>${(r.stderr||"").slice(0,80).replace(/</g,"&lt;")}</code></td> <td class="small">${r.usage?.durationMs ?? "—"} ms</td> <td class="small">${new Date(r.createdAt).toLocaleString()}</td> </tr>`).join("");
  return page("Docle Dashboard", `<div class="card"><h1>Recent Runs</h1><div class="small">Logs & basic usage • <a href="/playground">Back to Playground</a></div></div> <div class="card"> <table> <thead><tr><th>ID</th><th>OK</th><th>STDOUT</th><th>STDERR</th><th>Duration</th><th>When</th></tr></thead> <tbody>${rows || "<tr><td colspan='6' class='small'>No runs yet.</td></tr>"}</tbody> </table> </div>`);
}

export function advancedPlaygroundHTML() {
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Docle Advanced Playground</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@6.0.1/dist/index.css"/>
<style>
:root{--bg:#0b0d10;--fg:#e6eef8;--mut:#9aa8b4;--card:#11161b;--acc:#8aa2ff;--border:#1b232b;--success:#51cf66;--err:#ff6b6b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui;display:flex;height:100vh;overflow:hidden}
.sidebar{width:250px;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:12px}
.main{flex:1;display:flex;flex-direction:column;padding:16px;overflow:hidden}
.header{margin-bottom:16px}
.header h1{margin:0;font-size:20px}
.header .small{color:var(--mut);font-size:12px}
.controls{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.controls>div{flex:1;min-width:120px}
.controls select,.controls input{background:#0c1218;color:var(--fg);border:1px solid var(--border);border-radius:6px;padding:8px;width:100%}
.controls .small{color:var(--mut);font-size:11px;margin-bottom:4px}
button{background:var(--acc);color:#051030;border:none;border-radius:6px;padding:10px 16px;font-weight:700;cursor:pointer;transition:opacity 0.2s}
button:hover{opacity:0.9}
button.secondary{background:#333}
.editor-area{flex:1;display:flex;flex-direction:column;min-height:0}
.tabs{display:flex;gap:4px;margin-bottom:8px;overflow-x:auto}
.tab{padding:8px 12px;background:#0c1218;border:1px solid var(--border);border-radius:6px 6px 0 0;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px}
.tab:hover{background:#11161b}
.tab.active{background:var(--card);border-bottom:2px solid var(--acc)}
.tab .close{opacity:0.5;margin-left:4px}
.tab .close:hover{opacity:1;color:var(--err)}
.cm-editor{border:1px solid var(--border);border-radius:8px;background:var(--card)!important;flex:1;min-height:200px}
.output{background:#0a0e12;border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow:auto}
.output pre{font:12px/1.4 "SF Mono",Monaco,monospace;white-space:pre-wrap;word-wrap:break-word;margin:0}
.file-list{flex:1;overflow-y:auto}
.file-item{padding:8px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:#0c1218;border:1px solid transparent;font-size:13px}
.file-item:hover{background:#11161b}
.file-item.active{border-color:var(--acc);background:var(--card)}
.sidebar h3{font-size:14px;margin:0 0 8px;color:var(--mut)}
.sidebar button{font-size:12px;padding:6px 10px;margin-top:8px}
.pkg-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.pkg-input{margin-top:8px;display:flex;gap:4px}
.pkg-input input{flex:1;font-size:12px}
.pkg-input button{font-size:11px;padding:6px}
.pkg-list{margin-top:8px}
.pkg-item{background:#0c1218;border:1px solid var(--border);border-radius:4px;padding:4px 8px;margin-bottom:4px;font-size:12px;display:flex;justify-content:space-between}
.pkg-item .remove{color:var(--err);cursor:pointer;opacity:0.7}
.pkg-item .remove:hover{opacity:1}
.action-bar{display:flex;gap:8px;margin-bottom:12px}
</style>
</head><body>
<div class="sidebar">
  <h3>📁 Files</h3>
  <div class="file-list" id="file-list"></div>
  <button id="add-file" class="secondary">+ Add File</button>
  
  <div class="pkg-section">
    <h3>📦 Packages</h3>
    <div class="pkg-input">
      <input id="pkg-input" placeholder="e.g. requests" />
      <button id="add-pkg" class="secondary">+</button>
    </div>
    <div class="pkg-list" id="pkg-list"></div>
  </div>
</div>

<div class="main">
  <div class="header">
    <h1>Docle Advanced Playground</h1>
    <div class="small">Multi-file support • Package installation • Execution history • <a href="/playground" style="color:var(--acc)">Simple Mode</a> • <a href="/playground/collab" style="color:var(--acc)">Collab Mode</a></div>
  </div>
  
  <div class="controls">
    <div><div class="small">Language</div><select id="lang"><option value="python">Python</option><option value="node">Node.js</option></select></div>
    <div><div class="small">Timeout (ms)</div><input id="timeout" value="10000"/></div>
    <div><div class="small">Memory (MB)</div><input id="mem" value="256"/></div>
    <div><div class="small">Network</div><select id="net"><option value="false">Off</option><option value="true">On</option></select></div>
  </div>
  
  <div class="action-bar">
    <button id="run">▶ Run</button>
    <button id="save-session" class="secondary">💾 Save Session</button>
    <button id="load-session" class="secondary">📂 Load Session</button>
  </div>
  
  <div class="editor-area">
    <div class="tabs" id="tabs"></div>
    <div id="editor"></div>
  </div>
  
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

// State
let files = [
  { path: 'main.py', content: 'print("Hello, Docle!")\\nfor i in range(5):\\n    print(f"Count: {i}")' }
];
let activeFileIdx = 0;
let packages = [];
let editorView = null;

// Initialize editor
function createEditor(content) {
  if (editorView) editorView.destroy();
  const lang = qs('#lang').value;
  editorView = new EditorView({
    doc: content,
    extensions: [basicSetup, lang === 'python' ? python() : javascript(), oneDark],
    parent: qs('#editor')
  });
}

// Render file list
function renderFiles() {
  const list = qs('#file-list');
  list.innerHTML = files.map((f, i) => 
    \`<div class="file-item \${i === activeFileIdx ? 'active' : ''}" data-idx="\${i}">\${f.path}</div>\`
  ).join('');
  
  list.querySelectorAll('.file-item').forEach(el => {
    el.onclick = () => switchFile(parseInt(el.dataset.idx));
  });
}

// Render tabs
function renderTabs() {
  const tabs = qs('#tabs');
  tabs.innerHTML = files.map((f, i) => 
    \`<div class="tab \${i === activeFileIdx ? 'active' : ''}" data-idx="\${i}">
      \${f.path}
      \${files.length > 1 ? \`<span class="close" data-idx="\${i}">×</span>\` : ''}
    </div>\`
  ).join('');
  
  tabs.querySelectorAll('.tab').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    el.onclick = (e) => {
      if (e.target.classList.contains('close')) {
        removeFile(idx);
      } else {
        switchFile(idx);
      }
    };
  });
}

// Switch active file
function switchFile(idx) {
  if (editorView) {
    files[activeFileIdx].content = editorView.state.doc.toString();
  }
  activeFileIdx = idx;
  createEditor(files[activeFileIdx].content);
  renderFiles();
  renderTabs();
}

// Add file
qs('#add-file').onclick = () => {
  const name = prompt('File name:', 'utils.py');
  if (!name) return;
  files.push({ path: name, content: '' });
  switchFile(files.length - 1);
};

// Remove file
function removeFile(idx) {
  if (files.length === 1) return;
  files.splice(idx, 1);
  if (activeFileIdx >= files.length) activeFileIdx = files.length - 1;
  switchFile(activeFileIdx);
}

// Package management
function renderPackages() {
  const list = qs('#pkg-list');
  if (packages.length === 0) {
    list.innerHTML = '<div class="small" style="color:var(--mut);margin-top:8px">No packages</div>';
    return;
  }
  list.innerHTML = packages.map((p, i) => 
    \`<div class="pkg-item"><code>\${p}</code><span class="remove" data-idx="\${i}">×</span></div>\`
  ).join('');
  
  list.querySelectorAll('.remove').forEach(el => {
    el.onclick = () => {
      packages.splice(parseInt(el.dataset.idx), 1);
      renderPackages();
    };
  });
}

qs('#add-pkg').onclick = () => {
  const pkg = qs('#pkg-input').value.trim();
  if (!pkg) return;
  packages.push(pkg);
  qs('#pkg-input').value = '';
  renderPackages();
};

// Run code
qs('#run').onclick = async () => {
  files[activeFileIdx].content = editorView.state.doc.toString();
  
  const payload = {
    files: files,
    packages: packages.length > 0 ? { packages } : undefined,
    lang: qs('#lang').value,
    policy: {
      timeoutMs: parseInt(qs('#timeout').value, 10),
      memoryMB: parseInt(qs('#mem').value, 10),
      allowNet: qs('#net').value === 'true'
    }
  };
  
  qs('#output-text').textContent = '⏳ Running...';
  qs('#output').style.display = 'block';
  qs('#run').disabled = true;
  
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    qs('#output-text').textContent = JSON.stringify(json, null, 2);
  } catch (err) {
    qs('#output-text').textContent = 'Error: ' + err.message;
  } finally {
    qs('#run').disabled = false;
  }
};

// Session management
qs('#save-session').onclick = () => {
  files[activeFileIdx].content = editorView.state.doc.toString();
  const session = { files, packages, lang: qs('#lang').value };
  localStorage.setItem('docle_session', JSON.stringify(session));
  alert('Session saved!');
};

qs('#load-session').onclick = () => {
  const saved = localStorage.getItem('docle_session');
  if (!saved) {
    alert('No saved session found');
    return;
  }
  const session = JSON.parse(saved);
  files = session.files;
  packages = session.packages || [];
  qs('#lang').value = session.lang || 'python';
  activeFileIdx = 0;
  switchFile(0);
  renderPackages();
  alert('Session loaded!');
};

// Language change
qs('#lang').onchange = () => {
  const lang = qs('#lang').value;
  const ext = lang === 'python' ? '.py' : '.js';
  files = files.map(f => ({
    ...f,
    path: f.path.replace(/\\.(py|js)$/, ext)
  }));
  switchFile(activeFileIdx);
};

// Initialize
createEditor(files[0].content);
renderFiles();
renderTabs();
renderPackages();
</script>
</body></html>`;
}

export type EmbedOptions = {
  lang: string;
  theme: string;
  code: string;
  readonly: boolean;
  showOutput: boolean;
};

export function embedPlaygroundHTML(opts: EmbedOptions) {
  const { lang, theme, code, readonly, showOutput } = opts;
  const escapedCode = code.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  
  return `<!doctype html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Docle Embed</title>
<style>
:root{--bg:#0b0d10;--fg:#e6eef8;--mut:#9aa8b4;--card:#11161b;--acc:#8aa2ff;--border:#1b232b;--err:#ff6b6b;--success:#51cf66}
${theme === 'light' ? ':root{--bg:#ffffff;--fg:#1a1a1a;--mut:#6b6b6b;--card:#f5f5f5;--border:#e0e0e0}' : ''}
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;padding:12px;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;height:100vh;display:flex;flex-direction:column}
.editor-container{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0}
textarea{flex:1;min-height:150px;background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:12px;font:13px/1.4 "SF Mono",Monaco,Menlo,Consolas,monospace;resize:vertical}
textarea:disabled{opacity:0.6;cursor:not-allowed}
.controls{display:flex;gap:8px;align-items:center}
button{background:var(--acc);color:#051030;border:none;border-radius:6px;padding:8px 16px;font:13px/1 system-ui;font-weight:600;cursor:pointer;transition:opacity 0.2s}
button:hover:not(:disabled){opacity:0.9}
button:disabled{opacity:0.5;cursor:not-allowed}
.lang-badge{background:var(--card);border:1px solid var(--border);border-radius:4px;padding:4px 10px;font:12px/1 system-ui;color:var(--mut)}
.output{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:8px;max-height:200px;overflow:auto}
.output pre{font:12px/1.4 "SF Mono",Monaco,Menlo,monospace;white-space:pre-wrap;word-wrap:break-word}
.output.error{border-color:var(--err)}
.output.success{border-color:var(--success)}
.status{font:12px/1 system-ui;color:var(--mut);display:flex;align-items:center;gap:6px}
.spinner{width:12px;height:12px;border:2px solid var(--border);border-top-color:var(--acc);border-radius:50%;animation:spin 0.6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.powered{position:fixed;bottom:8px;right:8px;font:10px/1 system-ui;color:var(--mut);opacity:0.6}
.powered a{color:var(--acc);text-decoration:none}
</style>
</head><body>
<div class="editor-container">
  <textarea id="code" ${readonly ? 'disabled' : ''} spellcheck="false">${escapedCode}</textarea>
  <div class="controls">
    <button id="run" ${readonly ? 'disabled' : ''}>▶ Run</button>
    <span class="lang-badge">${lang}</span>
    <span class="status" id="status"></span>
  </div>
  ${showOutput ? '<div id="output" class="output" style="display:none"><pre id="output-text"></pre></div>' : ''}
</div>
<div class="powered">Powered by <a href="https://github.com/kagehq/docle" target="_blank">Docle</a></div>

<script type="module">
const qs = (s) => document.querySelector(s);
const code = qs('#code');
const runBtn = qs('#run');
const status = qs('#status');
const output = qs('#output');
const outputText = qs('#output-text');

// Post message to parent
function postToParent(type, data) {
  window.parent.postMessage({ type: 'docle-' + type, data }, '*');
}

runBtn?.addEventListener('click', async () => {
  if (!code.value.trim()) return;
  
  runBtn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Running...';
  if (output) {
    output.style.display = 'none';
    output.className = 'output';
  }
  
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: code.value,
        lang: '${lang}',
        policy: { timeoutMs: 10000, memoryMB: 256, allowNet: false }
      })
    });
    
    const result = await res.json();
    
    // Show output in embed
    if (output) {
      output.style.display = 'block';
      output.className = 'output ' + (result.ok ? 'success' : 'error');
      outputText.textContent = result.stdout || result.stderr || 'No output';
    }
    
    // Update status
    status.innerHTML = result.ok 
      ? \`✓ Success (\${result.usage?.durationMs || 0}ms)\`
      : '✗ Error (exit code ' + result.exitCode + ')';
    
    // Post to parent window
    postToParent('result', result);
    
  } catch (err) {
    status.innerHTML = '✗ Failed: ' + err.message;
    if (output) {
      output.style.display = 'block';
      output.className = 'output error';
      outputText.textContent = 'Error: ' + err.message;
    }
    postToParent('error', { message: err.message });
  } finally {
    runBtn.disabled = false;
  }
});

// Auto-run if specified
const params = new URLSearchParams(window.location.search);
if (params.get('autorun') === 'true') {
  runBtn?.click();
}

// Listen for messages from parent
window.addEventListener('message', (e) => {
  if (e.data.type === 'docle-run') {
    runBtn?.click();
  } else if (e.data.type === 'docle-set-code') {
    code.value = e.data.code;
  }
});

// Notify parent that embed is ready
postToParent('ready', { lang: '${lang}' });
</script>
</body></html>`;
}

