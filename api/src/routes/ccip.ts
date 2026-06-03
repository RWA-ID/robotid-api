import { Router } from 'express';
import { privateKeyToAccount } from 'viem/accounts';
import {
  keccak256,
  decodeFunctionData,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  parseAbiParameters,
  bytesToString,
  hexToBytes,
  type Hex,
} from 'viem';
import { config } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { serialHashOf } from '../lib/ens.js';

/**
 * EIP-3668 (CCIP-Read) off-chain gateway for `*.robot-id.eth`, folded into the
 * API so it shares one deployment and — critically — the same `serialHashOf` as
 * registration, so the hash written on-chain always matches what we resolve.
 *
 * The on-chain RobotIdOffchainResolver reverts with OffchainLookup pointing at
 * GET /ccip/{sender}/{data}.json (templated form — required by Trust Wallet).
 * We decode resolve(name,data), map the serial label → tokenId → current owner,
 * and return the ABI-encoded address signed per the EIP-3668 trusted-gateway
 * scheme that RobotIdOffchainResolver.resolveWithProof verifies.
 */
export const ccipRouter = Router();

const PARENT = config.ensParent;
const ROBOT_IDENTITY = config.addresses.robotIdentity;
const signer = config.gatewaySignerKey ? privateKeyToAccount(config.gatewaySignerKey) : undefined;

const ZERO = '0x0000000000000000000000000000000000000000' as Hex;
const EMPTY = '0x' as Hex;
const ADDR_SELECTOR = '0x3b3b57de'; // addr(bytes32)
const RESOLVE_SELECTOR = '0x9061b923'; // resolve(bytes,bytes)

const IDENTITY_ABI = [
  { type: 'function', name: 'tokenOfSerial', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
] as const;
const RESOLVE_ABI = [
  { type: 'function', name: 'resolve', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
] as const;
const ADDR_ABI = [
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
] as const;

/** Decode a DNS-wire-format ENS name. */
function decodeDnsName(dnsHex: Hex): string {
  const bytes = hexToBytes(dnsHex);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i];
    if (len === 0) break;
    labels.push(bytesToString(bytes.slice(i + 1, i + 1 + len)));
    i += 1 + len;
  }
  return labels.join('.');
}

/** Parse `<serial>.<mfr>.robot-id.eth` → its parts. Only unit names have an NFT. */
function parseName(name: string): { serialSlug: string; isUnit: boolean } | null {
  const lc = name.toLowerCase();
  if (!lc.endsWith(PARENT)) return null;
  const sub = lc.slice(0, lc.length - PARENT.length).replace(/\.$/, '');
  if (!sub) return null; // the apex
  const parts = sub.split('.').filter(Boolean);
  if (parts.length < 2) return { serialSlug: '', isUnit: false }; // OEM zone, no holder
  return { serialSlug: parts[0], isUnit: true };
}

/**
 * Accept BOTH OffchainLookup callData wire shapes (cash-app.eth CCIP footgun):
 * raw abi.encode(name,data) tuple, or a resolve(bytes,bytes) call (0x9061b923).
 */
function decodeCallData(callData: Hex): { name: string; inner: Hex } {
  let dnsName: Hex;
  let inner: Hex;
  if (callData.slice(0, 10).toLowerCase() === RESOLVE_SELECTOR) {
    const d = decodeFunctionData({ abi: RESOLVE_ABI, data: callData });
    [dnsName, inner] = d.args as [Hex, Hex];
  } else {
    [dnsName, inner] = decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes' }], callData) as [Hex, Hex];
  }
  return { name: decodeDnsName(dnsName), inner };
}

async function resolveHolder(name: string): Promise<Hex> {
  const parsed = parseName(name);
  if (!parsed || !parsed.isUnit || !ROBOT_IDENTITY) return ZERO;
  const tokenId = await publicClient.readContract({
    address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenOfSerial', args: [serialHashOf(parsed.serialSlug)],
  });
  if (tokenId === 0n) return ZERO;
  return publicClient.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'ownerOf', args: [tokenId] });
}

/** Sign per EIP-3668 trusted-gateway, matching RobotIdOffchainResolver. */
async function signResult(target: Hex, result: Hex, requestData: Hex): Promise<Hex> {
  const expires = BigInt(Math.floor(Date.now() / 1000) + 300);
  const message = keccak256(
    encodePacked(
      ['bytes2', 'address', 'uint64', 'bytes32', 'bytes32'],
      ['0x1900', target, expires, keccak256(requestData), keccak256(result)],
    ),
  );
  const sig = signer ? await signer.sign({ hash: message }) : ('0x' as Hex);
  return encodeAbiParameters(parseAbiParameters('bytes result, uint64 expires, bytes sig'), [result, expires, sig]);
}

// Human-friendly debug endpoint — defined before the catch-all GET below.
ccipRouter.get('/resolve/:name', async (req, res) => {
  try {
    res.json({ name: req.params.name, holder: await resolveHolder(req.params.name) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

ccipRouter.get('/health', (_req, res) =>
  res.json({ status: 'ok', parent: PARENT, signer: signer?.address ?? null, identity: ROBOT_IDENTITY ?? null }),
);

// EIP-3668 endpoint: GET /ccip/{sender}/{data}.json
ccipRouter.get('/:sender/:data', async (req, res) => {
  try {
    const sender = req.params.sender as Hex;
    const data = req.params.data.replace(/\.json$/, '') as Hex;
    const { name, inner } = decodeCallData(data);

    // Only addr(node) is answered; every other record returns empty bytes.
    let result: Hex = EMPTY;
    if (inner.slice(0, 10).toLowerCase() === ADDR_SELECTOR) {
      try {
        decodeFunctionData({ abi: ADDR_ABI, data: inner });
        result = encodeAbiParameters([{ type: 'address' }], [await resolveHolder(name)]);
      } catch {
        result = EMPTY;
      }
    }
    res.json({ data: await signResult(sender, result, data) });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
});
