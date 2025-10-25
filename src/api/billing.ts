/**
 * Stripe webhook handlers for billing events
 */

import Stripe from "stripe";
import type { Context } from "hono";
import type { Env } from "../lib/kv";
import { getProjectById, updateProject } from "../lib/db";

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(c: Context<{ Bindings: Env }>) {
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await c.req.text();
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return c.json({ error: "Invalid signature" }, 400);
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(c.env, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(c.env, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(c.env, event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(c.env, event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(c.env, event.data.object as Stripe.Invoice);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(c.env, event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error.message);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(env: Env, subscription: Stripe.Subscription) {
  const projectId = subscription.metadata.project_id;

  if (!projectId) {
    console.error("No project_id in subscription metadata");
    return;
  }

  const project = await getProjectById(env, projectId);

  if (!project) {
    console.error(`Project not found: ${projectId}`);
    return;
  }

  await updateProject(env, projectId, {
    stripe_subscription_id: subscription.id,
    plan: "pro" as any,
  });

  console.log(`Subscription created for project ${projectId}`);
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(env: Env, subscription: Stripe.Subscription) {
  const projectId = subscription.metadata.project_id;

  if (!projectId) return;

  // Update plan based on subscription status
  let plan: "free" | "pro" = "free";

  if (subscription.status === "active" || subscription.status === "trialing") {
    plan = "pro";
  }

  await updateProject(env, projectId, {
    plan: plan as any,
  });

  console.log(`Subscription updated for project ${projectId}: ${subscription.status}`);
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(env: Env, subscription: Stripe.Subscription) {
  const projectId = subscription.metadata.project_id;

  if (!projectId) return;

  await updateProject(env, projectId, {
    plan: "free" as any,
    stripe_subscription_id: null,
  });

  console.log(`Subscription cancelled for project ${projectId}`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(env: Env, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Store invoice record in database
  await env.DB.prepare(
    `INSERT INTO invoices (id, project_id, stripe_invoice_id, amount, currency, status, period_start, period_end, paid_at, created_at)
     SELECT ?1, p.id, ?2, ?3, ?4, 'paid', ?5, ?6, ?7, ?8
     FROM projects p WHERE p.stripe_customer_id = ?9`
  )
    .bind(
      crypto.randomUUID(),
      invoice.id,
      (invoice.amount_paid || 0) / 100, // Convert from cents
      invoice.currency,
      invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      new Date().toISOString(),
      new Date().toISOString(),
      customerId
    )
    .run();

  console.log(`Invoice paid: ${invoice.id}`);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(env: Env, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Store failed invoice record
  await env.DB.prepare(
    `INSERT INTO invoices (id, project_id, stripe_invoice_id, amount, currency, status, period_start, period_end, created_at)
     SELECT ?1, p.id, ?2, ?3, ?4, 'failed', ?5, ?6, ?7
     FROM projects p WHERE p.stripe_customer_id = ?8`
  )
    .bind(
      crypto.randomUUID(),
      invoice.id,
      (invoice.amount_due || 0) / 100,
      invoice.currency,
      invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      new Date().toISOString(),
      customerId
    )
    .run();

  console.log(`Invoice payment failed: ${invoice.id}`);
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(env: Env, session: Stripe.Checkout.Session) {
  const projectId = session.metadata?.project_id;

  if (!projectId) return;

  // Subscription will be handled by subscription.created event
  console.log(`Checkout completed for project ${projectId}`);
}

