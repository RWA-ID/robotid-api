import { Router } from 'express';
import { encodeFunctionData, type Hex } from 'viem';
import { config, requireAddress } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES } from '../lib/contracts.js';

export const subscriptionRouter = Router();

// GET /api/v1/subscription/:addr — active? tier? expiry?
subscriptionRouter.get('/:addr', async (req, res) => {
  const addr = req.params.addr as Hex;
  const subscription = requireAddress('subscription');
  const [active, tier, expiry] = await Promise.all([
    publicClient.readContract({ address: subscription, abi: SUBSCRIPTION_ABI, functionName: 'isActive', args: [addr] }),
    publicClient.readContract({ address: subscription, abi: SUBSCRIPTION_ABI, functionName: 'tierOf', args: [addr] }),
    publicClient.readContract({ address: subscription, abi: SUBSCRIPTION_ABI, functionName: 'expiry', args: [addr] }),
  ]);
  res.json({
    address: addr,
    active,
    tier: Number(tier),
    tierName: TIER_NAMES[Number(tier)],
    expiry: Number(expiry),
    expiryISO: expiry > 0n ? new Date(Number(expiry) * 1000).toISOString() : null,
  });
});

/**
 * GET /api/v1/subscription/:tier/tx — helper: build the unsigned approve +
 * subscribe transactions for a tier (frontend can also do this directly).
 */
subscriptionRouter.get('/tx/:tier', async (req, res) => {
  const tierIdx = Number(req.params.tier);
  if (!(tierIdx in TIER_NAMES)) return res.status(400).json({ error: 'invalid tier (0-2)' });
  const subscription = requireAddress('subscription');
  const price = await publicClient.readContract({
    address: subscription, abi: SUBSCRIPTION_ABI, functionName: 'price', args: [tierIdx],
  });
  const ERC20_APPROVE = [{ type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;
  res.json({
    tier: tierIdx,
    tierName: TIER_NAMES[tierIdx],
    priceUsdc: price.toString(),
    approveTx: {
      to: config.usdc,
      data: encodeFunctionData({ abi: ERC20_APPROVE, functionName: 'approve', args: [subscription, price] }),
      value: '0x0',
    },
    subscribeTx: {
      to: subscription,
      data: encodeFunctionData({ abi: SUBSCRIPTION_ABI, functionName: 'subscribe', args: [tierIdx] }),
      value: '0x0',
    },
  });
});
