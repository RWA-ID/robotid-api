import type { Request, Response, NextFunction } from 'express';
import { config, requireAddress } from './config.js';
import { publicClient } from './viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES, type TierName } from './contracts.js';
import { store, type ApiKeyRecord } from './store.js';

export interface AuthedRequest extends Request {
  apiKey?: ApiKeyRecord;
}

// Per-tier limits (§5.3). Requests/mo + rate/min.
export const TIER_LIMITS: Record<TierName, { requestsPerMonth: number; ratePerMin: number }> = {
  SmallManufacturer: { requestsPerMonth: 1_000_000, ratePerMin: 300 },
  OEM: { requestsPerMonth: 5_000_000, ratePerMin: 1_000 },
  Enterprise: { requestsPerMonth: Number.POSITIVE_INFINITY, ratePerMin: 5_000 },
};

// naive in-memory sliding-window rate limiter per key
const windows = new Map<string, { start: number; count: number }>();

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

    const rec = store.getKey(key);
    if (!rec) return res.status(401).json({ error: 'Invalid API key' });

    // re-check live subscription state on every request
    const active = await isSubscriptionActive(rec.subscriber);
    if (!active) {
      return res.status(402).json({
        error: 'Payment Required',
        detail: 'Subscription inactive or expired. Renew on-chain to continue.',
      });
    }

    // rate limit per tier
    const limit = TIER_LIMITS[rec.tier].ratePerMin;
    const now = Date.now();
    const w = windows.get(key) ?? { start: now, count: 0 };
    if (now - w.start >= 60_000) {
      w.start = now;
      w.count = 0;
    }
    w.count += 1;
    windows.set(key, w);
    if (w.count > limit) {
      return res.status(429).json({ error: 'Rate limit exceeded', limit, window: '1m' });
    }

    rec.requestCount += 1;
    req.apiKey = rec;
    next();
  };
}
