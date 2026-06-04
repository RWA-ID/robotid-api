import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  createPublicClient,
  http,
  keccak256,
  toHex,
  decodeFunctionData,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  parseAbiParameters,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { decodeDnsName, parseName, normalizeSlug } from './ens.js';

/**
 * CCIP-Read (EIP-3668) off-chain gateway for *.robot-id.eth.
 *
 * An on-chain wildcard resolver reverts with OffchainLookup pointing here. We:
 *   1. decode resolve(name, data)
 *   2. parse SN-X.mfr.robot-id.eth → serial slug
 *   3. read RobotIdentity.tokenOfSerial(keccak256(serial)) → tokenId
 *   4. read ownerOf(tokenId) → current holder
 *   5. return the ABI-encoded result, signed (EIP-3668 trusted-gateway) so the
 *      resolver's callback can verify our signer.
 */

const PORT = Number(process.env.PORT ?? 3002);
const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
const PARENT = process.env.ENS_PARENT ?? 'robot-id.eth';
const ROBOT_IDENTITY = process.env.ROBOT_IDENTITY_ADDRESS as Hex | undefined;
const SIGNER_KEY = process.env.GATEWAY_SIGNER_KEY as Hex | undefined;
// HTTP gateway used to dereference a unit's ipfs:// tokenURI for text records.
const IPFS_GATEWAY = (process.env.IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs/').replace(/\/?$/, '/');

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const signer = SIGNER_KEY ? privateKeyToAccount(SIGNER_KEY) : undefined;

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

// the resolver calls resolve(bytes name, bytes data)
const RESOLVE_ABI = [
  { type: 'function', name: 'resolve', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
] as const;

// addr(bytes32) selector for decoding the inner query
const ADDR_ABI = [
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
] as const;

// text(bytes32 node, string key) — ENSIP-5 text records.
const TEXT_ABI = [
  { type: 'function', name: 'text', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }], outputs: [{ type: 'string' }] },
] as const;

const ZERO = '0x0000000000000000000000000000000000000000' as Hex;
const EMPTY = '0x' as Hex;
const ADDR_SELECTOR = '0x3b3b57de'; // addr(bytes32)
const TEXT_SELECTOR = '0x59d1d43c'; // text(bytes32,string)
const RESOLVE_SELECTOR = '0x9061b923'; // resolve(bytes,bytes)

/**
 * The OffchainLookup callData arrives in one of two wire shapes (see the
 * cash-app.eth CCIP footgun): (A) a raw `abi.encode(name, data)` tuple with NO
 * selector — what our resolver emits and wallets re-send verbatim — or (B) a
 * full `resolve(bytes,bytes)` function call prefixed with 0x9061b923, which the
 * ENS/NameStone spec tooling constructs independently. Sniff the first 4 bytes
 * and decode accordingly; a gateway that only handles one fails the other with
 * a cryptic ABI error surfaced upstream as "HTTP request failed".
 */
function decodeCallData(callData: Hex): { name: string; inner: Hex } {
  let dnsName: Hex;
  let inner: Hex;
  if (callData.slice(0, 10).toLowerCase() === RESOLVE_SELECTOR) {
    const d = decodeFunctionData({ abi: RESOLVE_ABI, data: callData });
    [dnsName, inner] = d.args as [Hex, Hex];
  } else {
    [dnsName, inner] = decodeAbiParameters(
      [{ type: 'bytes' }, { type: 'bytes' }],
      callData,
    ) as [Hex, Hex];
  }
  return { name: decodeDnsName(dnsName), inner };
}

/** Resolve a unit name to its tokenId (null for the OEM zone or an unminted serial). */
async function resolveUnit(name: string): Promise<bigint | null> {
  const parsed = parseName(name, PARENT);
  if (!parsed || !ROBOT_IDENTITY || !parsed.isUnit) return null; // OEM zone has no NFT
  const serialHash = keccak256(toHex(normalizeSlug(parsed.serialSlug)));
  const tokenId = await client.readContract({
    address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenOfSerial', args: [serialHash],
  });
  return tokenId === 0n ? null : tokenId;
}

async function resolveHolder(name: string): Promise<{ addr: Hex; tokenId: bigint | null; uri?: string }> {
  const tokenId = await resolveUnit(name);
  if (tokenId === null) return { addr: ZERO, tokenId: null };

  const [owner, uri] = await Promise.all([
    client.readContract({ address: ROBOT_IDENTITY!, abi: IDENTITY_ABI, functionName: 'ownerOf', args: [tokenId] }),
    client.readContract({ address: ROBOT_IDENTITY!, abi: IDENTITY_ABI, functionName: 'tokenURI', args: [tokenId] }).catch(() => undefined),
  ]);
  return { addr: owner, tokenId, uri };
}

// ── Text records (ENSIP-5) ──────────────────────────────────────────────────
//
// A unit's records come from two sources, merged here so a wallet can read a
// flat `text(node, key)` for any of them:
//   1. The on-chain RobotData struct — authoritative, tamper-proof. Exposed
//      under `robot.*` keys (manufacturer, model, firmware, serial-hash, …).
//   2. The IPFS metadata JSON behind tokenURI — the flexible spec sheet
//      (build-date, model-number, weight, OpenSea-style `attributes`, plus the
//      standard ENS keys avatar/url/description). On-chain wins on conflict.

interface IpfsMeta { [k: string]: unknown; attributes?: { trait_type?: string; value?: unknown }[] }

const recordCache = new Map<string, { rec: Record<string, string>; at: number }>();
const RECORD_TTL = 60_000;

function ipfsToHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) return IPFS_GATEWAY + uri.slice('ipfs://'.length);
  return uri;
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

/** Build the merged, lower-cased key → value record map for a unit. */
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

  // 1. IPFS metadata (lowest priority). Scalars are exposed under both their
  //    raw key and a `robot.`-prefixed alias; `attributes` traits are slugged.
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

  // 2. On-chain struct (authoritative — overrides any metadata of the same key).
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
  if (tokenId === null) return {};

  const cached = recordCache.get(name.toLowerCase());
  if (cached && Date.now() - cached.at < RECORD_TTL) return cached.rec;

  const [robot, uri] = await Promise.all([
    client.readContract({ address: ROBOT_IDENTITY!, abi: IDENTITY_ABI, functionName: 'robots', args: [tokenId] }),
    client.readContract({ address: ROBOT_IDENTITY!, abi: IDENTITY_ABI, functionName: 'tokenURI', args: [tokenId] }).catch(() => undefined),
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

/** Sign per EIP-3668 trusted-gateway: keccak256(0x1900, target, expires, hash(request), hash(result)). */
async function signResult(target: Hex, result: Hex, requestData: Hex): Promise<Hex> {
  const expires = BigInt(Math.floor(Date.now() / 1000) + 300);
  const requestHash = keccak256(requestData);
  const resultHash = keccak256(result);
  const message = keccak256(
    encodePacked(
      ['bytes2', 'address', 'uint64', 'bytes32', 'bytes32'],
      ['0x1900', target, expires, requestHash, resultHash],
    ),
  );
  const sig = signer ? await signer.sign({ hash: message }) : ('0x' as Hex);
  return encodeAbiParameters(parseAbiParameters('bytes result, uint64 expires, bytes sig'), [
    result,
    expires,
    sig,
  ]);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', parent: PARENT, signer: signer?.address ?? null }));

/** Human-friendly debug endpoint: GET /resolve/sn-x.mfr.robot-id.eth */
app.get('/resolve/:name', async (req, res) => {
  try {
    const r = await resolveHolder(req.params.name);
    res.json({ name: req.params.name, holder: r.addr, tokenId: r.tokenId?.toString() ?? null, profile: r.uri });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * Debug endpoint: GET /records/sn-x.mfr.robot-id.eth — the full merged text
 * record map (on-chain struct + IPFS metadata) the gateway will serve. Useful
 * for integrators discovering which `text(node, key)` keys are populated.
 */
app.get('/records/:name', async (req, res) => {
  try {
    res.json({ name: req.params.name, records: await recordsOf(req.params.name) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

/**
 * EIP-3668 endpoint. The resolver's OffchainLookup url is
 * {gateway}/{sender}/{data}.json — sender = resolver address, data = the
 * abi-encoded resolve(name, data) callData.
 */
app.get('/:sender/:data', async (req, res) => {
  try {
    const sender = req.params.sender as Hex;
    const data = (req.params.data.replace(/\.json$/, '')) as Hex;

    const { name, inner } = decodeCallData(data);

    // We answer addr(node) and text(node, key); any other record (contenthash,
    // …) MUST resolve to empty bytes per ENSIP — never crash on an unknown
    // selector.
    let result: Hex = EMPTY;
    const selector = inner.slice(0, 10).toLowerCase();
    if (selector === ADDR_SELECTOR) {
      try {
        decodeFunctionData({ abi: ADDR_ABI, data: inner });
        const r = await resolveHolder(name);
        result = encodeAbiParameters([{ type: 'address' }], [r.addr]);
      } catch {
        result = EMPTY;
      }
    } else if (selector === TEXT_SELECTOR) {
      try {
        const { args } = decodeFunctionData({ abi: TEXT_ABI, data: inner });
        const value = await resolveText(name, args[1] as string);
        result = encodeAbiParameters([{ type: 'string' }], [value]);
      } catch {
        result = encodeAbiParameters([{ type: 'string' }], ['']);
      }
    }

    const signed = await signResult(sender, result, data);
    res.json({ data: signed });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`robot-id.eth CCIP gateway on :${PORT} (parent ${PARENT})`);
  if (!signer) console.warn('  GATEWAY_SIGNER_KEY unset — responses are unsigned (debug only)');
  if (!ROBOT_IDENTITY) console.warn('  ROBOT_IDENTITY_ADDRESS unset — resolution returns zero');
});

export { app, resolveHolder, resolveText, recordsOf };
