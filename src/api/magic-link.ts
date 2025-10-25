/**
 * Magic link authentication flow
 * Passwordless authentication using email links
 */

import type { Context } from "hono";
import type { Env } from "../lib/kv";
import {
  createMagicLink,
  getMagicLink,
  useMagicLink,
  createProject,
  getProjectByEmail,
  createSession,
} from "../lib/db";

/**
 * Request a magic link
 * POST /auth/magic-link
 */
export async function requestMagicLink(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return c.json({ error: "Invalid email address" }, 400);
    }

    // Create magic link token
    const magicLink = await createMagicLink(c.env, email);

    // Send email (using environment-specific email service)
    await sendMagicLinkEmail(c.env, email, magicLink.token);

    return c.json({
      message: "Magic link sent! Check your email.",
      email,
      expires_in: "15 minutes",
    });
  } catch (error: any) {
    console.error("Error requesting magic link:", error);
    return c.json({ error: "Failed to send magic link" }, 500);
  }
}

/**
 * Verify magic link and create session
 * GET /auth/verify?token=xxx
 */
export async function verifyMagicLink(c: Context<{ Bindings: Env }>) {
  try {
    const token = c.req.query("token");

    if (!token) {
      return c.json({ error: "Missing token" }, 400);
    }

    // Get and validate magic link
    const magicLink = await getMagicLink(c.env, token);

    if (!magicLink) {
      return c.json({ error: "Invalid or expired magic link" }, 403);
    }

    // Check if already used
    if (magicLink.used_at) {
      return c.json({ error: "Magic link already used" }, 403);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(magicLink.expires_at);

    if (now > expiresAt) {
      return c.json({ error: "Magic link expired" }, 403);
    }

    // Get or create project for this email
    let project = await getProjectByEmail(c.env, magicLink.email);

    if (!project) {
      // Create new project on first login
      project = await createProject(c.env, {
        name: magicLink.email.split("@")[0], // Default project name
        email: magicLink.email,
        plan: "free",
      });
    }

    // Mark magic link as used
    await useMagicLink(c.env, token, project.id);

    // Create session
    const session = await createSession(c.env, project.id);

    // Set session cookie
    const cookieOptions = [
      `docle_session=${session.token}`,
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${30 * 24 * 60 * 60}`, // 30 days
      "Path=/",
    ].join("; ");

    // Return success with redirect
    const dashboardUrl = `${c.env.APP_URL || "https://docle.co"}/dashboard`;

    return c.html(
      `<!DOCTYPE html>
<html>
<head>
  <title>Login Successful - Docle</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #333; margin: 0 0 1rem; }
    p { color: #666; margin: 0 0 2rem; }
    .success { color: #10b981; font-size: 3rem; margin-bottom: 1rem; }
    .btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
    }
    .btn:hover { background: #5568d3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h1>Login Successful!</h1>
    <p>You've been authenticated. Redirecting to dashboard...</p>
    <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
  </div>
  <script>
    // Auto-redirect after 2 seconds
    setTimeout(() => {
      window.location.href = '${dashboardUrl}';
    }, 2000);
  </script>
</body>
</html>`,
      200,
      {
        "Set-Cookie": cookieOptions,
        "Content-Type": "text/html",
      }
    );
  } catch (error: any) {
    console.error("Error verifying magic link:", error);
    return c.json({ error: "Failed to verify magic link" }, 500);
  }
}

/**
 * Logout (delete session)
 * POST /auth/logout
 */
export async function logout(c: Context<{ Bindings: Env }>) {
  const { deleteSession } = await import("../lib/db");

  const cookieHeader = c.req.header("cookie") || "";
  const sessionToken = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("docle_session="))
    ?.split("=")[1];

  if (sessionToken) {
    await deleteSession(c.env, sessionToken);
  }

  // Clear cookie
  return c.json(
    { message: "Logged out successfully" },
    200,
    {
      "Set-Cookie": "docle_session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/",
    }
  );
}

/**
 * Get current user info
 * GET /auth/me
 */
export async function getCurrentUser(c: Context<{ Bindings: Env }>) {
  const project = c.get("project");
  const session = c.get("session");

  if (!project) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  return c.json({
    project: {
      id: project.id,
      name: project.name,
      email: project.email,
      plan: project.plan,
      created_at: project.created_at,
    },
    session: session
      ? {
          expires_at: session.expires_at,
        }
      : null,
  });
}

// =====================
// HELPERS
// =====================

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send magic link email
 * In production, integrate with SendGrid, Resend, or Mailgun
 */
async function sendMagicLinkEmail(env: Env, email: string, token: string): Promise<void> {
  const magicLinkUrl = `${env.APP_URL || "https://docle.co"}/auth/verify?token=${token}`;

  // For development, just log the link
  if (env.ENVIRONMENT === "development") {
    console.log(`🔗 Magic link for ${email}:`);
    console.log(magicLinkUrl);
    console.log("(In production, this would be sent via email)");
    return;
  }

  // Production: Send via email service
  // Example with fetch to a generic email API:
  try {
    const emailBody = {
      to: email,
      subject: "Your Docle Login Link",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">Welcome to Docle</h1>
          <p>Click the button below to log in to your account:</p>
          <a href="${magicLinkUrl}" 
             style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Log In to Docle
          </a>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            Or copy this link: ${magicLinkUrl}
          </p>
        </div>
      `,
    };

    // Example: Send via Resend
    if (env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || "noreply@docle.co",
          to: email,
          subject: emailBody.subject,
          html: emailBody.html,
        }),
      });
    }
    // Add other email providers as needed (SendGrid, Mailgun, etc.)
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send magic link email");
  }
}

