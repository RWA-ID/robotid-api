import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  createPublicClient,
  http,
  keccak256,
  toHex,
  decodeFunctionData,
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

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const signer = SIGNER_KEY ? privateKeyToAccount(SIGNER_KEY) : undefined;

const IDENTITY_ABI = [
  { type: 'function', name: 'tokenOfSerial', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'string' }] },
] as const;

// the resolver calls resolve(bytes name, bytes data)
const RESOLVE_ABI = [
  { type: 'function', name: 'resolve', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ type: 'bytes' }] },
] as const;

// addr(bytes32) selector for decoding the inner query
const ADDR_ABI = [
  { type: 'function', name: 'addr', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ type: 'address' }] },
] as const;

const ZERO = '0x0000000000000000000000000000000000000000' as Hex;

async function resolveHolder(name: string): Promise<{ addr: Hex; tokenId: bigint | null; uri?: string }> {
  const parsed = parseName(name, PARENT);
  if (!parsed || !ROBOT_IDENTITY) return { addr: ZERO, tokenId: null };
  if (!parsed.isUnit) return { addr: ZERO, tokenId: null }; // OEM zone has no NFT holder

  const serialHash = keccak256(toHex(normalizeSlug(parsed.serialSlug)));
  const tokenId = await client.readContract({
    address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenOfSerial', args: [serialHash],
  });
  if (tokenId === 0n) return { addr: ZERO, tokenId: null };

  const [owner, uri] = await Promise.all([
    client.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'ownerOf', args: [tokenId] }),
    client.readContract({ address: ROBOT_IDENTITY, abi: IDENTITY_ABI, functionName: 'tokenURI', args: [tokenId] }).catch(() => undefined),
  ]);
  return { addr: owner, tokenId, uri };
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
 * EIP-3668 endpoint. The resolver's OffchainLookup url is
 * {gateway}/{sender}/{data}.json — sender = resolver address, data = the
 * abi-encoded resolve(name, data) callData.
 */
app.get('/:sender/:data', async (req, res) => {
  try {
    const sender = req.params.sender as Hex;
    const data = (req.params.data.replace(/\.json$/, '')) as Hex;

    const { args } = decodeFunctionData({ abi: RESOLVE_ABI, data });
    const [dnsName, innerData] = args as [Hex, Hex];
    const name = decodeDnsName(dnsName);

    // we only answer addr(node); other records resolve to empty
    let result: Hex = encodeAbiParameters([{ type: 'address' }], [ZERO]);
    try {
      decodeFunctionData({ abi: ADDR_ABI, data: innerData });
      const r = await resolveHolder(name);
      result = encodeAbiParameters([{ type: 'address' }], [r.addr]);
    } catch {
      /* unsupported record → empty */
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

export { app, resolveHolder };
