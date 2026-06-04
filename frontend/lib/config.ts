export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1);
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? '';
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://robot-idapi-production.up.railway.app';

// Live mainnet addresses (public) baked in as defaults so the dApp works
// out of the box; override via NEXT_PUBLIC_* if redeployed.
export const SUBSCRIPTION_ADDRESS = (process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS ??
  '0xfd9A0F30f264C47996C93E78CcC1736AF3C1635F') as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as `0x${string}`;

export const CONTRACTS = {
  robotIdentity: process.env.NEXT_PUBLIC_ROBOT_IDENTITY_ADDRESS ?? '0xEebf76b8E31d95E6ccC198B9291471fF8B31bEcc',
  subscription: SUBSCRIPTION_ADDRESS,
  intentRouter: process.env.NEXT_PUBLIC_INTENT_ROUTER_ADDRESS ?? '0xE7C6703bf5506231d97bea6F899704Cb45c6f6d8',
  capabilityRegistry: process.env.NEXT_PUBLIC_CAPABILITY_REGISTRY_ADDRESS ?? '0x602C50Ac8B9eE4886874b4713f55489b193aeD5f',
  otaVerifier: process.env.NEXT_PUBLIC_OTA_VERIFIER_ADDRESS ?? '0x8442f404C18b96F5C7af857f03f5d5CCB95a7D0f',
  merkleOracle: process.env.NEXT_PUBLIC_MERKLE_ORACLE_ADDRESS ?? '0xC8CE068dE9c38Db8780B7a70174fb453BDC8BB13',
};

// Each tier is the same product, scaled. Manufacturer is capped, OEM is the
// middle most real OEMs land on, Enterprise is "Unlimited" across the board.
// `specs` drives the comparison matrix on the landing page; `requests`/`rate`
// stay as the compact summary line used by the /subscribe picker.
export const TIERS = [
  {
    idx: 0,
    name: 'Small Manufacturer',
    priceUsd: 5000,
    priceUsdc: 5_000_000_000n,
    requests: '1,000,000 / mo',
    rate: '300 / min',
    specs: [
      { k: 'Robot identities', v: 'Up to 10,000' },
      { k: 'OEM namespaces', v: '1' },
      { k: 'Batch pre-authorize', v: '10k serials / batch' },
      { k: 'Signing keys', v: '1' },
      { k: 'API requests', v: '1M / mo · 300/min' },
      { k: 'Intent adapters', v: 'Basic' },
      { k: 'Chains', v: 'Mainnet' },
      { k: 'Support', v: 'Community + email' },
    ],
    featured: false,
  },
  {
    idx: 1,
    name: 'OEM',
    priceUsd: 7500,
    priceUsdc: 7_500_000_000n,
    requests: '5,000,000 / mo',
    rate: '1,000 / min',
    specs: [
      { k: 'Robot identities', v: 'Up to 250,000' },
      { k: 'OEM namespaces', v: 'Up to 5 brands' },
      { k: 'Batch pre-authorize', v: '100k serials / batch' },
      { k: 'Signing keys', v: '5 · rotation' },
      { k: 'API requests', v: '5M / mo · 1,000/min' },
      { k: 'Intent adapters', v: 'All adapters' },
      { k: 'Chains', v: 'Mainnet' },
      { k: 'Support', v: 'Priority (24h)' },
    ],
    featured: true,
  },
  {
    idx: 2,
    name: 'Enterprise',
    priceUsd: 12500,
    priceUsdc: 12_500_000_000n,
    requests: 'Unlimited',
    rate: '5,000 / min',
    specs: [
      { k: 'Robot identities', v: 'Unlimited' },
      { k: 'OEM namespaces', v: 'Unlimited' },
      { k: 'Batch pre-authorize', v: 'Unlimited batches' },
      { k: 'Signing keys', v: 'Unlimited · HSM' },
      { k: 'API requests', v: 'Unlimited · 5,000/min' },
      { k: 'Intent adapters', v: 'All + custom' },
      { k: 'Chains', v: 'Multi-chain' },
      { k: 'Support', v: 'Dedicated SLA' },
    ],
    featured: false,
  },
] as const;
