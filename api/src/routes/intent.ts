import { Router } from 'express';
import { encodeFunctionData, keccak256, toHex, type Hex } from 'viem';
import { requireAddress } from '../lib/config.js';
import { INTENT_ROUTER_ABI } from '../lib/contracts.js';
import { requireApiKey, type AuthedRequest } from '../lib/auth.js';
import { publish } from '../ws/server.js';

export const intentRouter = Router();

/**
 * POST /api/v1/intent (auth) — submit an AI/voice intent. The SDK normally
 * computes intentHash = keccak256(normalizedCommand + nonce); we recompute here
 * when given a raw command. Returns an UNSIGNED IntentRouter.submitIntent tx for
 * the OEM/agent operator to sign.
 */
intentRouter.post('/', requireApiKey(), (req: AuthedRequest, res) => {
  const { robotId, command, intentHash, actionTarget, value = '0', nonce = 0 } = req.body ?? {};
  if (robotId === undefined || !actionTarget) {
    return res.status(400).json({ error: 'robotId and actionTarget required' });
  }
  let hash: Hex;
  if (intentHash) {
    hash = intentHash as Hex;
  } else if (command) {
    const normalized = String(command).toLowerCase().trim().replace(/\s+/g, ' ');
    hash = keccak256(toHex(`${normalized}#${nonce}`));
  } else {
    return res.status(400).json({ error: 'command or intentHash required' });
  }

  const data = encodeFunctionData({
    abi: INTENT_ROUTER_ABI,
    functionName: 'submitIntent',
    args: [BigInt(robotId), hash, actionTarget as Hex, BigInt(value)],
  });

  publish('intent', 'intent.prepared', { robotId: String(robotId), intentHash: hash, actionTarget, value: String(value) });
  res.json({
    intentHash: hash,
    unsignedTx: { to: requireAddress('intentRouter'), data, value: '0x0' },
  });
});
