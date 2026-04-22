import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

export const isStripeConfigured =
  STRIPE_SECRET_KEY !== "" &&
  (STRIPE_SECRET_KEY.startsWith("sk_live_") || STRIPE_SECRET_KEY.startsWith("sk_test_"));

// When not configured, we still construct a client with a placeholder so the
// server boots in dev; route handlers gate on `isStripeConfigured`.
export const stripe = new Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-12-18.acacia" as any,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
