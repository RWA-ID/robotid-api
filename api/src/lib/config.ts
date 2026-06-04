import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  chainId: Number(process.env.CHAIN_ID ?? 1),
  // When set, the durable Redis-backed store is used; otherwise an in-memory
  // store (single-process, non-durable) is the fallback for local dev.
  redisUrl: process.env.REDIS_URL,
  rpcUrl: req('RPC_URL', 'http://127.0.0.1:8545'),
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY as `0x${string}` | undefined,
  gatewaySignerKey: process.env.GATEWAY_SIGNER_KEY as `0x${string}` | undefined,
  pinataJwt: process.env.PINATA_JWT ?? '',
  // HTTP gateway used to dereference a unit's ipfs:// tokenURI for text records.
  ipfsGateway: (process.env.IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs/').replace(/\/?$/, '/'),
  ensParent: process.env.ENS_PARENT ?? 'robot-id.eth',
  nameWrapper: (process.env.NAMEWRAPPER_ADDRESS ??
    '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401') as `0x${string}`,
  publicResolver: (process.env.PUBLIC_RESOLVER ??
    '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63') as `0x${string}`,
  usdc: (process.env.USDC_ADDRESS ??
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as `0x${string}`,
  addresses: {
    robotIdentity: process.env.ROBOT_IDENTITY_ADDRESS as `0x${string}` | undefined,
    agentWallet: process.env.AGENT_WALLET_ADDRESS as `0x${string}` | undefined,
    intentRouter: process.env.INTENT_ROUTER_ADDRESS as `0x${string}` | undefined,
    capabilityRegistry: process.env.CAPABILITY_REGISTRY_ADDRESS as `0x${string}` | undefined,
    otaVerifier: process.env.OTA_VERIFIER_ADDRESS as `0x${string}` | undefined,
    merkleOracle: process.env.MERKLE_ORACLE_ADDRESS as `0x${string}` | undefined,
    subscription: process.env.SUBSCRIPTION_ADDRESS as `0x${string}` | undefined,
    resolver: process.env.RESOLVER_ADDRESS as `0x${string}` | undefined, // CCIP wildcard resolver
  },
};

export function requireAddress(key: keyof typeof config.addresses): `0x${string}` {
  const a = config.addresses[key];
  if (!a) throw new Error(`Contract address not configured: ${key}`);
  return a;
}
