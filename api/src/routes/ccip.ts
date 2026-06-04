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
import { serialHashOf, normalizeSlug } from '../lib/ens.js';

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
const TEXT_SELECTOR = '0x59d1d43c'; // text(bytes32,string)
const RESOLVE_SELECTOR = '0x9061b923'; // resolve(bytes,bytes)

const IDENTITY_ABI = [
  { type: 'function', name: 'tokenOfSerial', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'string' }] },
  // robots(tokenId) → the on-chain RobotData struct (authoritative spec fields).
  { type: 'function', name: 'robots', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [
    { name: 'serialHash', type: 'bytes32' },
    { name: 'manufacturer', type: 'string' },
    { name: 'model', type: 'string' },
    { name: 'capabilityClass', type: 'string' },
    { name: 'firmwareVersion', type: 'uint32' },
    { name: 'registrationDate', type: 'uint256' },
    { name: 'locked', type: 'bool' },
  ] },
] as const;
const RESOLVE_ABI = [
  { type: 'function', name: 'resolve', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
] as const;
const ADDR_ABI = [
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
] as const;
const TEXT_ABI = [
  { type: 'function', name: 'text', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }], outputs: [{ type: 'string' }] },
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

/** Resolve a unit name to its tokenId (null for the OEM zone or an unminted serial). */
async function resolveUnit(name: string): Promise<bigint | null> {
  const parsed = parseName(name);
  if (!parsed || !parsed.isUnit || !ROBOT_IDENTITY) return null;
  const tokenId = await publicClient.readContract({
    address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenOfSerial', args: [serialHashOf(parsed.serialSlug)],
  });
  return tokenId === 0n ? null : tokenId;
}

async function resolveHolder(name: string): Promise<Hex> {
  const tokenId = await resolveUnit(name);
  if (tokenId === null || !ROBOT_IDENTITY) return ZERO;
  return publicClient.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'ownerOf', args: [tokenId] });
}

// ── Text records (ENSIP-5) ──────────────────────────────────────────────────
//
// A unit's records merge two sources: the on-chain RobotData struct
// (authoritative, tamper-proof, `robot.*` keys) and the IPFS metadata JSON
// behind tokenURI (build-date, model-number, attributes, avatar/url/…). On-chain
// wins on conflict. Merged per-name map cached 60s to spare RPC + IPFS.

interface IpfsMeta { [k: string]: unknown; attributes?: { trait_type?: string; value?: unknown }[] }

const recordCache = new Map<string, { rec: Record<string, string>; at: number }>();
const RECORD_TTL = 60_000;

function ipfsToHttp(uri: string): string {
  return uri.startsWith('ipfs://') ? config.ipfsGateway + uri.slice('ipfs://'.length) : uri;
}

async function fetchMeta(uri?: string): Promise<IpfsMeta | null> {
  if (!uri) return null;
  try {
    const res = await fetch(ipfsToHttp(uri), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json()) as IpfsMeta;
  } catch {
    return null;
  }
}

function buildRecords(
  robot: readonly [Hex, string, string, string, number, bigint, boolean],
  meta: IpfsMeta | null,
  tokenId: bigint,
): Record<string, string> {
  const rec: Record<string, string> = {};
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === '') return;
    rec[k.toLowerCase()] = String(v);
  };

  // 1. IPFS metadata (lowest priority): scalars under raw + `robot.`-prefixed
  //    keys; OpenSea-style `attributes` traits slugged.
  if (meta) {
    for (const [mk, mv] of Object.entries(meta)) {
      if (mk === 'attributes' || mv === null || typeof mv === 'object') continue;
      put(mk, mv);
      if (!mk.startsWith('robot.')) put(`robot.${mk}`, mv);
    }
    if (Array.isArray(meta.attributes)) {
      for (const a of meta.attributes) {
        if (!a || a.trait_type == null) continue;
        const slug = normalizeSlug(String(a.trait_type));
        put(`robot.${slug}`, a.value);
        put(slug, a.value);
      }
    }
  }

  // 2. On-chain struct (authoritative — overrides metadata on key conflict).
  put('robot.serial-hash', robot[0]);
  put('robot.manufacturer', robot[1]);
  put('robot.model', robot[2]);
  put('robot.capability-class', robot[3]);
  put('robot.firmware', robot[4]);
  put('robot.registered', new Date(Number(robot[5]) * 1000).toISOString());
  put('robot.soulbound', robot[6] ? 'true' : 'false');
  put('robot.token-id', tokenId.toString());

  return rec;
}

async function recordsOf(name: string): Promise<Record<string, string>> {
  const tokenId = await resolveUnit(name);
  if (tokenId === null || !ROBOT_IDENTITY) return {};

  const cached = recordCache.get(name.toLowerCase());
  if (cached && Date.now() - cached.at < RECORD_TTL) return cached.rec;

  const [robot, uri] = await Promise.all([
    publicClient.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'robots', args: [tokenId] }),
    publicClient.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenURI', args: [tokenId] }).catch(() => undefined),
  ]);
  const meta = await fetchMeta(uri);
  const rec = buildRecords(
    robot as readonly [Hex, string, string, string, number, bigint, boolean],
    meta,
    tokenId,
  );
  recordCache.set(name.toLowerCase(), { rec, at: Date.now() });
  return rec;
}

/** Resolve a single ENS text record key for a unit ('' when unknown). */
async function resolveText(name: string, key: string): Promise<string> {
  const rec = await recordsOf(name);
  return rec[key.toLowerCase()] ?? '';
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

// Debug: full merged text-record map (on-chain struct + IPFS metadata).
ccipRouter.get('/records/:name', async (req, res) => {
  try {
    res.json({ name: req.params.name, records: await recordsOf(req.params.name) });
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

    // addr(node) and text(node, key) are answered; every other record returns
    // empty bytes (per ENSIP — never crash on an unknown selector).
    let result: Hex = EMPTY;
    const selector = inner.slice(0, 10).toLowerCase();
    if (selector === ADDR_SELECTOR) {
      try {
        decodeFunctionData({ abi: ADDR_ABI, data: inner });
        result = encodeAbiParameters([{ type: 'address' }], [await resolveHolder(name)]);
      } catch {
        result = EMPTY;
      }
    } else if (selector === TEXT_SELECTOR) {
      try {
        const { args } = decodeFunctionData({ abi: TEXT_ABI, data: inner });
        result = encodeAbiParameters([{ type: 'string' }], [await resolveText(name, args[1] as string)]);
      } catch {
        result = encodeAbiParameters([{ type: 'string' }], ['']);
      }
    }
    res.json({ data: await signResult(sender, result, data) });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
});
