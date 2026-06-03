export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1);
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? '';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.robot-id.eth';

export const SUBSCRIPTION_ADDRESS = (process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS ??
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as `0x${string}`;

export const CONTRACTS = {
  robotIdentity: process.env.NEXT_PUBLIC_ROBOT_IDENTITY_ADDRESS ?? '',
  subscription: SUBSCRIPTION_ADDRESS,
  intentRouter: process.env.NEXT_PUBLIC_INTENT_ROUTER_ADDRESS ?? '',
  capabilityRegistry: process.env.NEXT_PUBLIC_CAPABILITY_REGISTRY_ADDRESS ?? '',
  otaVerifier: process.env.NEXT_PUBLIC_OTA_VERIFIER_ADDRESS ?? '',
  merkleOracle: process.env.NEXT_PUBLIC_MERKLE_ORACLE_ADDRESS ?? '',
};

export const TIERS = [
  {
    idx: 0,
    name: 'Small Manufacturer',
    priceUsd: 5000,
    priceUsdc: 5_000_000_000n,
    requests: '1,000,000 / mo',
    rate: '300 / min',
    perks: ['✓ *.mfr namespace', 'Basic intent adapters', 'REST · GraphQL · WS'],
  },
  {
    idx: 1,
    name: 'OEM',
    priceUsd: 7500,
    priceUsdc: 7_500_000_000n,
    requests: '5,000,000 / mo',
    rate: '1,000 / min',
    perks: ['✓ *.mfr namespace', 'All intent adapters', 'Priority support'],
    featured: true,
  },
  {
    idx: 2,
    name: 'Enterprise',
    priceUsd: 12500,
    priceUsdc: 12_500_000_000n,
    requests: 'Unlimited',
    rate: '5,000 / min',
    perks: ['✓ + multi-chain', 'White-label', 'Dedicated SLA'],
  },
] as const;
