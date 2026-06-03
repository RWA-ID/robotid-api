import 'dotenv/config';
import express from 'express';
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

/**
 * OPTIONAL relayer — sponsors gas for unit claims so an individual robot can
 * claim its NFT without holding ETH. The relayer signs and broadcasts the
 * claimWithProof tx on behalf of the unit; the unit still proves batch
 * membership via its Merkle proof, so the relayer cannot mint arbitrary units.
 *
 * Disabled unless RELAYER_PRIVATE_KEY + ROBOT_IDENTITY_ADDRESS are set.
 */

const PORT = Number(process.env.PORT ?? 3003);
const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545';
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
const ROBOT_IDENTITY = process.env.ROBOT_IDENTITY_ADDRESS as Hex | undefined;

const CLAIM_ABI = [
  {
    type: 'function',
    name: 'claimWithProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'batchId', type: 'bytes32' },
      { name: 'proof', type: 'bytes32[]' },
      { name: 'to', type: 'address' },
      { name: 'serialHash', type: 'bytes32' },
      { name: 'manufacturer', type: 'string' },
      { name: 'model', type: 'string' },
      { name: 'capabilityClass', type: 'string' },
      { name: 'firmwareVersion', type: 'uint32' },
      { name: 'locked', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const account = RELAYER_KEY ? privateKeyToAccount(RELAYER_KEY) : undefined;
const wallet = account
  ? createWalletClient({ account, chain: mainnet, transport: http(RPC_URL) })
  : undefined;

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', enabled: !!wallet, relayer: account?.address ?? null }),
);

// POST /sponsor/claim — relays a claimWithProof on behalf of a unit.
app.post('/sponsor/claim', async (req, res) => {
  if (!wallet || !ROBOT_IDENTITY) {
    return res.status(503).json({ error: 'relayer not configured' });
  }
  const c = req.body ?? {};
  try {
    const data = encodeFunctionData({
      abi: CLAIM_ABI,
      functionName: 'claimWithProof',
      args: [
        c.batchId, c.proof, c.to, c.serialHash, c.manufacturer ?? '', c.model ?? '',
        c.capabilityClass ?? '', Number(c.firmwareVersion ?? 0), Boolean(c.locked), c.uri ?? '',
      ],
    });
    const hash = await wallet.sendTransaction({ to: ROBOT_IDENTITY, data });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    res.json({ hash, status: receipt.status });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`robot-id.eth relayer on :${PORT} (enabled=${!!wallet})`);
});

export { app };
