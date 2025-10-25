/**
 * Dashboard UI templates
 * HTML views for projects, usage, and billing management
 */

import type { Project, ApiKey, Usage } from "./db";

/**
 * Main dashboard page
 */
export function dashboardHTML(data: {
  project: Project;
  apiKeys: ApiKey[];
  usage: {
    period: string;
    runs: number;
    cpuMs: number;
    cost: number;
    avgDurationMs: number;
  };
  trends: Array<{ period: string; runs: number; cost: number }>;
}): string {
  const { project, apiKeys, usage, trends } = data;
  const isFreeTier = project.plan === "free";

  return layout(
    `Dashboard - ${project.name}`,
    `
    <div class="header">
      <h1>📊 Dashboard</h1>
      <div class="project-info">
        <span class="badge ${isFreeTier ? "badge-free" : "badge-pro"}">${project.plan.toUpperCase()}</span>
        <span>${project.email}</span>
      </div>
    </div>

    <!-- Usage Summary -->
    <div class="card">
      <h2>📈 Usage This Month (${usage.period})</h2>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${usage.runs.toLocaleString()}</div>
          <div class="metric-label">Runs</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(usage.cpuMs / 1000).toFixed(2)}s</div>
          <div class="metric-label">CPU Time</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${usage.cost.toFixed(4)}</div>
          <div class="metric-label">Cost</div>
        </div>
        <div class="metric">
          <div class="metric-value">${usage.avgDurationMs.toFixed(0)}ms</div>
          <div class="metric-label">Avg Duration</div>
        </div>
      </div>
      ${
        isFreeTier
          ? `
      <div class="alert alert-info">
        🎁 Free tier: 100 runs/month included. <a href="/dashboard/billing">Upgrade to Pro</a> for unlimited runs.
      </div>
      `
          : ""
      }
    </div>

    <!-- API Keys -->
    <div class="card">
      <div class="card-header">
        <h2>🔑 API Keys</h2>
        <button class="btn btn-primary" onclick="createApiKey()">+ New Key</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Last Used</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            apiKeys.length === 0
              ? `<tr><td colspan="4" class="text-center">No API keys yet. Create one to get started!</td></tr>`
              : apiKeys
                  .map(
                    (key) => `
            <tr>
              <td>${key.name || "Unnamed"}</td>
              <td><code>${key.key_prefix}...${key.is_active ? "" : " (revoked)"}</code></td>
              <td>${key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</td>
              <td>
                ${key.is_active ? `<button class="btn btn-sm btn-danger" onclick="revokeKey('${key.id}')">Revoke</button>` : ""}
              </td>
            </tr>
          `
                  )
                  .join("")
          }
        </tbody>
      </table>
    </div>

    <!-- Usage Trends -->
    <div class="card">
      <h2>📊 Usage Trends</h2>
      <div class="chart">
        ${renderUsageChart(trends)}
      </div>
    </div>

    <!-- Quick Start -->
    <div class="card">
      <h2>🚀 Quick Start</h2>
      <p>Execute code using the Docle API:</p>
      <pre><code>curl -X POST https://docle.co/api/run \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "print(\\"Hello from Docle!\\")",
    "lang": "python"
  }'</code></pre>
      <p>
        <a href="https://github.com/kagehq/docle" target="_blank">📚 View Documentation</a> |
        <a href="/dashboard/billing">💳 Manage Billing</a>
      </p>
    </div>

    <script>
      async function createApiKey() {
        const name = prompt("Enter a name for this API key:");
        if (!name) return;
        
        try {
          const res = await fetch('/api/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name })
          });
          
          if (res.ok) {
            const data = await res.json();
            alert(\`API Key created!\\n\\n\${data.key}\\n\\nSave this key - it won't be shown again!\`);
            location.reload();
          } else {
            const err = await res.json();
            alert('Error: ' + err.error);
          }
        } catch (e) {
          alert('Failed to create API key');
        }
      }

      async function revokeKey(keyId) {
        if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
        
        try {
          const res = await fetch(\`/api/keys/\${keyId}\`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (res.ok) {
            alert('API key revoked');
            location.reload();
          }
        } catch (e) {
          alert('Failed to revoke key');
        }
      }
    </script>
  `
  );
}

/**
 * Billing page
 */
export function billingHTML(data: {
  project: Project;
  usage: any;
  invoices: any[];
  checkoutUrl?: string;
  portalUrl?: string;
}): string {
  const { project, usage, invoices, checkoutUrl, portalUrl } = data;
  const isFreeTier = project.plan === "free";

  return layout(
    "Billing",
    `
    <div class="header">
      <h1>💳 Billing</h1>
      <div class="project-info">
        <span class="badge ${isFreeTier ? "badge-free" : "badge-pro"}">${project.plan.toUpperCase()}</span>
      </div>
    </div>

    <!-- Plan Card -->
    <div class="card">
      <h2>Current Plan: ${project.plan.toUpperCase()}</h2>
      ${
        isFreeTier
          ? `
      <div class="plan-features">
        <h3>Free Plan</h3>
        <ul>
          <li>✅ 100 runs per month</li>
          <li>✅ Python & Node.js support</li>
          <li>✅ 3 second timeout</li>
          <li>✅ Community support</li>
        </ul>
        <h3>Pro Plan - $0.001 per run</h3>
        <ul>
          <li>🚀 Unlimited runs</li>
          <li>🚀 Priority support</li>
          <li>🚀 Extended timeouts</li>
          <li>🚀 Advanced features</li>
        </ul>
        ${checkoutUrl ? `<a href="${checkoutUrl}" class="btn btn-primary btn-lg">Upgrade to Pro</a>` : ""}
      </div>
      `
          : `
      <p>You're on the <strong>Pro Plan</strong> with metered billing.</p>
      <p>Current usage: <strong>${usage.runs}</strong> runs this month</p>
      <p>Estimated cost: <strong>$${usage.cost.toFixed(4)}</strong></p>
      ${portalUrl ? `<a href="${portalUrl}" class="btn btn-primary">Manage Subscription</a>` : ""}
      `
      }
    </div>

    <!-- Current Usage -->
    <div class="card">
      <h2>📊 Current Month Usage</h2>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${usage.runs}</div>
          <div class="metric-label">Total Runs</div>
        </div>
        <div class="metric">
          <div class="metric-value">$${usage.cost.toFixed(4)}</div>
          <div class="metric-label">Current Cost</div>
        </div>
      </div>
    </div>

    <!-- Invoices -->
    <div class="card">
      <h2>🧾 Invoice History</h2>
      ${
        invoices.length === 0
          ? `<p class="text-center">No invoices yet</p>`
          : `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Period</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${invoices
            .map(
              (inv) => `
            <tr>
              <td>${new Date(inv.created_at).toLocaleDateString()}</td>
              <td>${inv.period_start || "N/A"}</td>
              <td>$${inv.amount.toFixed(2)}</td>
              <td><span class="badge badge-${inv.status === "paid" ? "success" : "danger"}">${inv.status}</span></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      `
      }
    </div>

    <p class="text-center">
      <a href="/dashboard">← Back to Dashboard</a>
    </p>
  `
  );
}

/**
 * Login page
 */
export function loginHTML(message?: string): string {
  return layout(
    "Login - Docle",
    `
    <div class="auth-container">
      <div class="auth-card">
        <h1>🔐 Welcome to Docle</h1>
        <p>Sign in with your email to get started</p>
        ${message ? `<div class="alert alert-info">${message}</div>` : ""}
        <form onsubmit="handleLogin(event)">
          <input 
            type="email" 
            id="email" 
            placeholder="you@example.com" 
            required 
            class="input-field"
          />
          <button type="submit" class="btn btn-primary btn-lg btn-full">
            Send Magic Link
          </button>
        </form>
        <p class="text-center" style="margin-top: 2rem;">
          No password required. We'll send you a magic link to log in.
        </p>
      </div>
    </div>

    <script>
      async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const button = e.target.querySelector('button');
        button.disabled = true;
        button.textContent = 'Sending...';

        try {
          const res = await fetch('/auth/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          if (res.ok) {
            const data = await res.json();
            alert(\`✅ Magic link sent to \${email}! Check your inbox.\`);
          } else {
            const err = await res.json();
            alert('Error: ' + err.error);
          }
        } catch (e) {
          alert('Failed to send magic link');
        } finally {
          button.disabled = false;
          button.textContent = 'Send Magic Link';
        }
      }
    </script>
  `,
    false
  );
}

// =====================
// HELPERS
// =====================

function renderUsageChart(
  trends: Array<{ period: string; runs: number; cost: number }>
): string {
  if (trends.length === 0) {
    return "<p>No usage data yet</p>";
  }

  const maxRuns = Math.max(...trends.map((t) => t.runs), 1);
  const bars = trends
    .map((t) => {
      const height = (t.runs / maxRuns) * 100;
      return `
      <div class="chart-bar">
        <div class="bar" style="height: ${height}%">
          <div class="bar-value">${t.runs}</div>
        </div>
        <div class="bar-label">${t.period.substring(5)}</div>
      </div>
    `;
    })
    .join("");

  return `<div class="bar-chart">${bars}</div>`;
}

function layout(title: string, content: string, includeNav = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Docle</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header h1 { font-size: 2rem; }
    .project-info { display: flex; gap: 1rem; align-items: center; }
    .card {
      background: white;
      border-radius: 0.5rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h2 { margin-bottom: 1rem; color: #667eea; }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .metric {
      text-align: center;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 0.5rem;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    code {
      background: #f8f9fa;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      margin: 1rem 0;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    .btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover { background: #5568d3; }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
    .btn-lg { padding: 0.75rem 1.5rem; font-size: 1.125rem; }
    .btn-full { width: 100%; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-free { background: #dbeafe; color: #1e40af; }
    .badge-pro { background: #ddd6fe; color: #5b21b6; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-top: 1rem;
    }
    .alert-info {
      background: #dbeafe;
      color: #1e40af;
      border-left: 4px solid #3b82f6;
    }
    .text-center { text-align: center; }
    .auth-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .auth-card {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      max-width: 450px;
      width: 100%;
    }
    .input-field {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 1rem;
      margin: 1rem 0;
    }
    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }
    .plan-features ul {
      list-style: none;
      padding: 1rem 0;
    }
    .plan-features li {
      padding: 0.5rem 0;
    }
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      height: 200px;
      padding: 1rem 0;
    }
    .chart-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .bar {
      width: 100%;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 0.25rem 0.25rem 0 0;
      position: relative;
      min-height: 5%;
    }
    .bar-value {
      position: absolute;
      top: -1.5rem;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.875rem;
      font-weight: 600;
      color: #333;
    }
    .bar-label {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #666;
    }
    nav {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem 2rem;
      margin-bottom: 2rem;
    }
    nav a {
      color: #667eea;
      text-decoration: none;
      margin-right: 1.5rem;
      font-weight: 500;
    }
    nav a:hover { color: #5568d3; }
  </style>
</head>
<body>
  ${
    includeNav
      ? `
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/dashboard/billing">Billing</a>
    <a href="https://github.com/kagehq/docle" target="_blank">Docs</a>
    <a href="/auth/logout" style="float: right;">Logout</a>
  </nav>
  `
      : ""
  }
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

