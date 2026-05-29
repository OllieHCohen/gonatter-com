import Stripe from "stripe";

// Server-only Stripe client (test mode). Uses the account's default API version.
// Constructed lazily so that importing this module never throws at build time
// (Next's "collecting page data" step imports route modules before env vars are
// necessarily available). The real client is built on first property access,
// i.e. at request time inside a handler.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as Stripe;

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "25");
export const MIN_RATE_GBP_PER_HOUR = Number(process.env.MIN_RATE_GBP_PER_HOUR ?? "10");
