/**
 * Authentication middleware for API key validation
 */

import type { Context } from "hono";
import type { Env } from "../lib/kv";
import { getProjectByApiKey } from "../lib/db";

/**
 * Middleware to require API key authentication
 * Extracts API key from Authorization header and validates it
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Function) {
  const authHeader = c.req.header("authorization");

  if (!authHeader) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  // Support both "Bearer token" and "token" formats
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  if (!token) {
    return c.json({ error: "Missing API key" }, 401);
  }

  // Validate API key and get project
  const project = await getProjectByApiKey(c.env, token);

  if (!project) {
    return c.json({ error: "Invalid API key" }, 403);
  }

  // Store project in context for downstream handlers
  c.set("project", project);
  c.set("authenticated", true);

  await next();
}

/**
 * Middleware to require session authentication (for web dashboard)
 * Extracts session token from cookie and validates it
 */
export async function requireSession(c: Context<{ Bindings: Env }>, next: Function) {
  const { getSession, getProjectById } = await import("../lib/db");

  // Try to get session from cookie or Authorization header
  const cookieHeader = c.req.header("cookie") || "";
  const sessionToken =
    cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("docle_session="))
      ?.split("=")[1] || c.req.header("authorization")?.replace("Bearer ", "");

  if (!sessionToken) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const session = await getSession(c.env, sessionToken);

  if (!session) {
    return c.json({ error: "Invalid or expired session" }, 403);
  }

  const project = await getProjectById(c.env, session.project_id);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Store project and session in context
  c.set("project", project);
  c.set("session", session);
  c.set("authenticated", true);

  await next();
}

/**
 * Optional auth - sets project if authenticated but doesn't require it
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Function) {
  const authHeader = c.req.header("authorization");

  if (authHeader) {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (token) {
      const project = await getProjectByApiKey(c.env, token);
      if (project) {
        c.set("project", project);
        c.set("authenticated", true);
      }
    }
  }

  await next();
}

/**
 * Check if project has exceeded rate limits
 */
export async function checkRateLimit(c: Context<{ Bindings: Env }>, next: Function) {
  const project = c.get("project");

  if (!project) {
    await next();
    return;
  }

  // Check free tier limits
  if (project.plan === "free") {
    const { checkFreeTierLimits } = await import("../lib/stripe");
    const { exceeded, limit, usage } = await checkFreeTierLimits(c.env, project.id);

    if (exceeded) {
      return c.json(
        {
          error: "Free tier limit exceeded",
          limit,
          usage: usage.totalRuns,
          message: `You've used ${usage.totalRuns}/${limit} free runs this month. Upgrade to Pro for unlimited usage.`,
          upgrade_url: `${c.env.APP_URL || "https://docle.co"}/dashboard/billing`,
        },
        429
      );
    }
  }

  await next();
}

