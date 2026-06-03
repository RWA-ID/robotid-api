import { Router } from 'express';
import { recoverMessageAddress, type Hex } from 'viem';
import { config } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES } from '../lib/contracts.js';
import { isSubscriptionActive, tierOf, requireApiKey, TIER_LIMITS, type AuthedRequest } from '../lib/auth.js';
import { store } from '../lib/store.js';

export const authRouter = Router();

// GET /auth/tiers — list 3 tiers + USDC prices
authRouter.get('/tiers', async (_req, res) => {
  const subscription = config.addresses.subscription;
  const tiers = await Promise.all(
    TIER_NAMES.map(async (name, i) => {
      let priceUsdc = [5_000_000_000n, 7_500_000_000n, 12_500_000_000n][i];
      if (subscription) {
        try {
          priceUsdc = await publicClient.readContract({
            address: subscription,
            abi: SUBSCRIPTION_ABI,
            functionName: 'price',
            args: [i],
          });
        } catch {
          /* fall back to spec defaults */
        }
      }
      return {
        tier: i,
        name,
        priceUsdc: priceUsdc.toString(),
        priceUsd: Number(priceUsdc) / 1e6,
        limits: TIER_LIMITS[name],
      };
    }),
  );
  res.json({ tiers });
});

/**
 * POST /auth/keys/wallet — SIWE-style: client submits the address + a signed
 * message proving control. Returns an API key IFF the subscription is active.
 */
authRouter.post('/keys/wallet', async (req, res) => {
  const { address, message, signature } = req.body ?? {};
  if (!address || !message || !signature) {
    return res.status(400).json({ error: 'address, message, signature required' });
  }
  let recovered: Hex;
  try {
    recovered = await recoverMessageAddress({ message, signature });
  } catch {
    return res.status(400).json({ error: 'invalid signature' });
  }
  if (recovered.toLowerCase() !== String(address).toLowerCase()) {
    return res.status(401).json({ error: 'signature does not match address' });
  }

  const active = await isSubscriptionActive(recovered);
  if (!active) {
    return res.status(402).json({ error: 'Payment Required', detail: 'No active subscription' });
  }
  const tier = await tierOf(recovered);
  const rec = store.issueKey(recovered, tier);
  res.json({ apiKey: rec.key, tier: rec.tier, subscriber: rec.subscriber });
});

// GET /auth/keys/info (auth) — tier, limits, usage, expiry
authRouter.get('/keys/info', requireApiKey(), async (req: AuthedRequest, res) => {
  const rec = req.apiKey!;
  const subscription = config.addresses.subscription!;
  const expiry = await publicClient.readContract({
    address: subscription,
    abi: SUBSCRIPTION_ABI,
    functionName: 'expiry',
    args: [rec.subscriber],
  });
  res.json({
    subscriber: rec.subscriber,
    tier: rec.tier,
    limits: TIER_LIMITS[rec.tier],
    usage: { requestCount: rec.requestCount },
    expiry: Number(expiry),
    expiryISO: new Date(Number(expiry) * 1000).toISOString(),
  });
});
