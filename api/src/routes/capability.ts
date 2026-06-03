import { Router } from 'express';
import { keccak256, toHex, type Hex } from 'viem';
import { requireAddress } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { CAPABILITY_ABI } from '../lib/contracts.js';

export const capabilityRouter = Router();

function capKey(key: string): Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(key) ? (key as Hex) : keccak256(toHex(key));
}

// GET /api/v1/capability/:robotId — latest attestations (history index list)
capabilityRouter.get('/:robotId', async (req, res) => {
  const robotId = BigInt(req.params.robotId);
  const reg = requireAddress('capabilityRegistry');
  try {
    const indices = await publicClient.readContract({
      address: reg, abi: CAPABILITY_ABI, functionName: 'historyOf', args: [robotId],
    });
    const attestations = await Promise.all(
      indices.map((i) =>
        publicClient.readContract({ address: reg, abi: CAPABILITY_ABI, functionName: 'attestations', args: [i] }),
      ),
    );
    // collapse to latest per capabilityKey
    const latest = new Map<string, unknown>();
    for (const a of attestations) {
      latest.set(a[1], { robotId: a[0].toString(), capabilityKey: a[1], value: a[2], merkleRoot: a[3], oem: a[4], timestamp: Number(a[5]) });
    }
    res.json({ robotId: robotId.toString(), attestations: [...latest.values()] });
  } catch {
    res.status(404).json({ error: 'robot not found' });
  }
});

// GET /api/v1/capability/:robotId/history — full append-only history
capabilityRouter.get('/:robotId/history', async (req, res) => {
  const robotId = BigInt(req.params.robotId);
  const reg = requireAddress('capabilityRegistry');
  const indices = await publicClient.readContract({
    address: reg, abi: CAPABILITY_ABI, functionName: 'historyOf', args: [robotId],
  });
  const history = await Promise.all(
    indices.map(async (i) => {
      const a = await publicClient.readContract({ address: reg, abi: CAPABILITY_ABI, functionName: 'attestations', args: [i] });
      return { index: Number(i), capabilityKey: a[1], value: a[2], merkleRoot: a[3], oem: a[4], timestamp: Number(a[5]) };
    }),
  );
  res.json({ robotId: robotId.toString(), history });
});

// POST /api/v1/capability/:robotId/verify — verify a proof against latest root
capabilityRouter.post('/:robotId/verify', async (req, res) => {
  const robotId = BigInt(req.params.robotId);
  const { capabilityKey, leaf, proof } = req.body ?? {};
  if (!capabilityKey || !leaf || !Array.isArray(proof)) {
    return res.status(400).json({ error: 'capabilityKey, leaf, proof[] required' });
  }
  const reg = requireAddress('capabilityRegistry');
  const valid = await publicClient.readContract({
    address: reg, abi: CAPABILITY_ABI, functionName: 'verify',
    args: [robotId, capKey(capabilityKey), leaf as Hex, proof as Hex[]],
  });
  res.json({ robotId: robotId.toString(), capabilityKey, valid });
});
