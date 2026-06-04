import { Router } from 'express';
import { recoverMessageAddress, type Hex } from 'viem';
import { config } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES } from '../lib/contracts.js';
import {
  isSubscriptionActive,
  tierOf,
  requireApiKey,
  TIER_LIMITS,
  TIER_CAPS,
  namespaceCapFor,
  type AuthedRequest,
} from '../lib/auth.js';
import { store } from '../lib/store.js';
import { checkSlug, oemName } from '../lib/ens.js';

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
  const rec = await store.issueKey(recovered, tier);
  res.json({ apiKey: rec.key, tier: rec.tier, subscriber: rec.subscriber });
});

/**
 * GET /auth/namespace/:slug — availability check for an OEM-chosen namespace
 * (public, used by the checkout UI as the OEM types). Returns the normalized
 * slug, whether it is valid + free, and the resulting fully-qualified name.
 */
authRouter.get('/namespace/:slug', async (req, res) => {
  const check = checkSlug(req.params.slug);
  if (!check.ok) {
    return res.json({ slug: check.slug, valid: false, available: false, reason: check.reason });
  }
  const holder = await store.subscriberForSlug(check.slug);
  res.json({
    slug: check.slug,
    valid: true,
    available: !holder,
    name: oemName(check.slug),
  });
});

/**
 * POST /auth/namespace/reserve — SIWE-style: the OEM proves wallet control and
 * reserves their chosen slug at checkout. The reservation is consumed by the
 * Subscribed watcher, which provisions `<slug>.robot-id.eth` to this wallet on
 * payment. No active subscription is required to reserve (checkout happens
 * before the tx confirms), but provisioning only fires on a paid Subscribed.
 */
authRouter.post('/namespace/reserve', async (req, res) => {
  const { address, message, signature, slug } = req.body ?? {};
  if (!address || !message || !signature || !slug) {
    return res.status(400).json({ error: 'address, message, signature, slug required' });
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

  const check = checkSlug(slug);
  if (!check.ok) return res.status(400).json({ error: 'invalid slug', reason: check.reason, slug: check.slug });

  const cap = await namespaceCapFor(recovered);
  const result = await store.reserveSlug(recovered, check.slug, cap);
  if (!result.ok) {
    if (result.reason === 'taken') {
      return res.status(409).json({ error: 'slug already reserved', slug: check.slug });
    }
    return res.status(403).json({
      error: 'Namespace cap reached',
      detail: 'Upgrade your tier or release an existing namespace to reserve more.',
      cap,
      reserved: await store.slugsForSubscriber(recovered),
    });
  }
  res.json({
    reserved: true,
    slug: check.slug,
    name: oemName(check.slug),
    subscriber: recovered,
    namespaces: await store.slugsForSubscriber(recovered),
    cap,
  });
});

/**
 * POST /auth/namespace/release — SIWE-style: free a slug the wallet holds so a
 * multi-namespace subscriber can swap brands (or give one up). Provisioned
 * on-chain names are unaffected; this only frees the off-chain reservation.
 */
authRouter.post('/namespace/release', async (req, res) => {
  const { address, message, signature, slug } = req.body ?? {};
  if (!address || !message || !signature || !slug) {
    return res.status(400).json({ error: 'address, message, signature, slug required' });
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

  const check = checkSlug(slug);
  if (!check.ok) return res.status(400).json({ error: 'invalid slug', reason: check.reason, slug: check.slug });

  if (!(await store.releaseSlug(recovered, check.slug))) {
    return res.status(404).json({ error: 'slug not held by this wallet', slug: check.slug });
  }
  res.json({ released: true, slug: check.slug, namespaces: await store.slugsForSubscriber(recovered) });
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
  const [namespaces, usage] = await Promise.all([
    store.slugsForSubscriber(rec.subscriber),
    store.getUsage(rec),
  ]);
  res.json({
    subscriber: rec.subscriber,
    tier: rec.tier,
    limits: TIER_LIMITS[rec.tier],
    caps: TIER_CAPS[rec.tier],
    usage,
    namespaces,
    expiry: Number(expiry),
    expiryISO: new Date(Number(expiry) * 1000).toISOString(),
  });
});
