import { Router } from 'express';
import type { Hex } from 'viem';
import { requireAddress } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { OTA_ABI } from '../lib/contracts.js';

export const otaRouter = Router();

/**
 * GET /api/v1/ota/:robotId/verify — check a firmware signature for a unit,
 * rejecting downgrades against the unit's on-chain firmwareVersion.
 * Query: firmwareHash, newVersion, signature, oemAddress
 */
otaRouter.get('/:robotId/verify', async (req, res) => {
  const robotId = BigInt(req.params.robotId);
  const { firmwareHash, newVersion, signature, oemAddress } = req.query;
  if (!firmwareHash || !newVersion || !signature || !oemAddress) {
    return res.status(400).json({ error: 'firmwareHash, newVersion, signature, oemAddress required' });
  }
  const ota = requireAddress('otaVerifier');
  const valid = await publicClient.readContract({
    address: ota,
    abi: OTA_ABI,
    functionName: 'verifyForRobot',
    args: [robotId, firmwareHash as Hex, Number(newVersion), signature as Hex, oemAddress as Hex],
  });
  res.json({ robotId: robotId.toString(), newVersion: Number(newVersion), valid });
});
