/**
 * Stripe integration for metered billing
 * Handles customer creation, subscriptions, and usage reporting
 */

import Stripe from "stripe";
import type { Env } from "./kv";
import type { Project } from "./db";

/**
 * Get or create Stripe customer for project
 */
export async function getOrCreateStripeCustomer(
  env: Env,
  project: Project
): Promise<string> {
  // Return existing customer ID if present
  if (project.stripe_customer_id) {
    return project.stripe_customer_id;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  // Create new customer
  const customer = await stripe.customers.create({
    email: project.email || undefined,
    name: project.name,
    metadata: {
      project_id: project.id,
      plan: project.plan,
    },
  });

  // Update project with customer ID
  const { updateProject } = await import("./db");
  await updateProject(env, project.id, {
    stripe_customer_id: customer.id,
  });

  return customer.id;
}

/**
 * Create metered subscription for project
 */
export async function createMeteredSubscription(
  env: Env,
  customerId: string,
  projectId: string
): Promise<string> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  // Create subscription with metered pricing
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: env.STRIPE_PRICE_ID, // Your metered price ID from Stripe Dashboard
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    metadata: {
      project_id: projectId,
    },
  });

  // Update project with subscription ID
  const { updateProject } = await import("./db");
  await updateProject(env, projectId, {
    stripe_subscription_id: subscription.id,
  });

  return subscription.id;
}

/**
 * Report usage to Stripe for metered billing
 */
export async function reportUsageToStripe(
  env: Env,
  project: Project,
  quantity: number
): Promise<void> {
  // Skip if no subscription
  if (!project.stripe_subscription_id) {
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  try {
    // Get subscription to find the subscription item
    const subscription = await stripe.subscriptions.retrieve(
      project.stripe_subscription_id
    );

    if (subscription.items.data.length === 0) {
      console.error("No subscription items found");
      return;
    }

    const subscriptionItemId = subscription.items.data[0].id;

    // Create usage record
    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: "increment",
    });
  } catch (error: any) {
    console.error("Error reporting usage to Stripe:", error.message);
    // Don't throw - we don't want billing issues to break code execution
  }
}

/**
 * Calculate cost based on usage
 */
export function calculateCost(
  env: Env,
  usage: {
    runs?: number;
    cpuMs?: number;
    durationMs?: number;
  }
): number {
  // Configurable pricing model
  const pricePerRun = parseFloat(env.STRIPE_PRICE_PER_RUN || "0.001"); // $0.001 per run
  const pricePerCpuMs = parseFloat(env.STRIPE_PRICE_PER_CPU_MS || "0.00001"); // $0.00001 per CPU ms

  const runCost = (usage.runs || 0) * pricePerRun;
  const cpuCost = (usage.cpuMs || 0) * pricePerCpuMs;

  return runCost + cpuCost;
}

/**
 * Check if project has exceeded free tier limits
 */
export async function checkFreeTierLimits(
  env: Env,
  projectId: string
): Promise<{ exceeded: boolean; usage: any; limit: number }> {
  const { getAggregatedUsage } = await import("./db");
  const period = new Date().toISOString().substring(0, 7); // Current month
  const usage = await getAggregatedUsage(env, projectId, period);
  const limit = parseInt(env.FREE_TIER_RUNS_LIMIT || "100");

  return {
    exceeded: usage.totalRuns >= limit,
    usage,
    limit,
  };
}

/**
 * Create Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  env: Env,
  customerId: string,
  projectId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price: env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      project_id: projectId,
    },
  });

  return session.url!;
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(
  env: Env,
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

