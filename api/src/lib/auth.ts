import type { Request, Response, NextFunction } from 'express';
import { config, requireAddress } from './config.js';
import { publicClient } from './viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES, type TierName } from './contracts.js';
import { store, type ApiKeyRecord } from './store.js';

export interface AuthedRequest extends Request {
  apiKey?: ApiKeyRecord;
}

// Per-tier API limits (§5.3). Requests/mo + rate/min.
export const TIER_LIMITS: Record<TierName, { requestsPerMonth: number; ratePerMin: number }> = {
  SmallManufacturer: { requestsPerMonth: 1_000_000, ratePerMin: 300 },
  OEM: { requestsPerMonth: 5_000_000, ratePerMin: 1_000 },
  Enterprise: { requestsPerMonth: Number.POSITIVE_INFINITY, ratePerMin: 5_000 },
};

// Per-tier resource caps. `units` = lifetime robot identities; `namespaces` =
// OEM brand slugs under robot-id.eth. Mirrors the pricing matrix on the site.
export const TIER_CAPS: Record<TierName, { units: number; namespaces: number }> = {
  SmallManufacturer: { units: 10_000, namespaces: 1 },
  OEM: { units: 250_000, namespaces: 5 },
  Enterprise: { units: Number.POSITIVE_INFINITY, namespaces: Number.POSITIVE_INFINITY },
};

/**
 * The namespace cap that applies to `addr` right now. A wallet with an active
 * subscription gets its tier's cap; an unsubscribed wallet at checkout may still
 * reserve its first (primary) slug, matching reserve-before-payment.
 */
export async function namespaceCapFor(addr: `0x${string}`): Promise<number> {
  if (!(await isSubscriptionActive(addr))) return 1;
  return TIER_CAPS[await tierOf(addr)].namespaces;
}

export async function isSubscriptionActive(addr: `0x${string}`): Promise<boolean> {
  const subscription = config.addresses.subscription;
  if (!subscription) return false;
  return publicClient.readContract({
    address: subscription,
    abi: SUBSCRIPTION_ABI,
    functionName: 'isActive',
    args: [addr],
  });
}

export async function tierOf(addr: `0x${string}`): Promise<TierName> {
  const subscription = requireAddress('subscription');
  const t = await publicClient.readContract({
    address: subscription,
    abi: SUBSCRIPTION_ABI,
    functionName: 'tierOf',
    args: [addr],
  });
  return TIER_NAMES[Number(t)] ?? 'SmallManufacturer';
}

/**
 * Subscription-gated API-key auth. Every authenticated request re-checks
 * Subscription.isActive(addr); expired subscriptions get 402 Payment Required.
 */
export function requireApiKey() {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const raw = req.header('authorization') ?? req.header('x-api-key') ?? '';
    const key = raw.replace(/^Bearer\s+/i, '').trim();
    if (!key) return res.status(401).json({ error: 'Missing API key' });

    const rec = await store.getKey(key);
    if (!rec) return res.status(401).json({ error: 'Invalid API key' });

    // re-check live subscription state on every request
    const active = await isSubscriptionActive(rec.subscriber);
    if (!active) {
      return res.status(402).json({
        error: 'Payment Required',
        detail: 'Subscription inactive or expired. Renew on-chain to continue.',
      });
    }

    const { ratePerMin, requestsPerMonth } = TIER_LIMITS[rec.tier];

    // per-minute rate limit (atomic, durable)
    const rate = await store.hitRate(key, ratePerMin);
    if (!rate.allowed) {
      return res
        .status(429)
        .json({ error: 'Rate limit exceeded', limit: ratePerMin, window: '1m' });
    }

    // monthly quota (atomic, auto-resetting 30-day window)
    const quota = await store.consumeRequest(key, requestsPerMonth);
    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Monthly quota exceeded',
        limit: requestsPerMonth,
        window: '30d',
        resetsAt: new Date(quota.resetsAt).toISOString(),
      });
    }

    req.apiKey = rec;
    next();
  };
}
