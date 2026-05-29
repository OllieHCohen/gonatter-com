import Stripe from "stripe";

// Server-only Stripe client (test mode). Uses the account's default API version.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "25");
export const MIN_RATE_GBP_PER_HOUR = Number(process.env.MIN_RATE_GBP_PER_HOUR ?? "10");
