# robot-id.eth

> The neutral ENS protocol layer for robots & autonomous machines.

`robot-id.eth` is open, neutral infrastructure that gives every robot a permanent, programmable
identity on Ethereum — the same way ENS is infrastructure for human-readable names. Any robot OEM
(Boston Dynamics, Unitree, Figure, Agility, …) integrates once via a single API key and keeps full
UX control.

**Scope:** identity · AI/voice intent · autonomous payments · capability attestation · firmware
verification. **Launch target: Ethereum mainnet** (fork-tested via Anvil). Crypto-only — USDC
subscriptions, no fiat rails.

```
L3   OEM applications          own UX, own brand
L2   robot-id.eth protocol     identity · intent · payments · capability · OTA · subscriptions
L1   Ethereum + ENS            settlement · NameWrapper subnames · CCIP-Read resolution
```

## Monorepo

| Package | What |
|---|---|
| `contracts/` | Foundry — 6 contracts + unit & forked-mainnet integration tests + deploy scripts |
| `api/` | Express REST + GraphQL + WebSocket + Swagger → Railway |
| `sdk/` | `@robot-id/sdk` — TypeScript client |
| `intent-sdk/` | `@robot-id/intent-sdk` — ROS2-bridge + voice adapters (key differentiator) |
| `ccip-gateway/` | CCIP-Read (EIP-3668) off-chain gateway for `*.robot-id.eth` |
| `subgraph/` | The Graph event indexing |
| `frontend/` | Next.js dApp + landing + docs → Vercel |
| `relayer/` | Optional gas sponsorship for unit claims |

## Contracts

| Contract | Role | Standards |
|---|---|---|
| `RobotIdentity` | Per-unit identity NFT, Merkle batch claim | ERC-721 · ERC-5192 · ERC-2981 |
| `AgentWallet` | Per-robot smart account with spend rules | ERC-4337 |
| `IntentRouter` | On-chain AI/voice authorization + audit log | — |
| `CapabilityRegistry` | OEM-signed, append-only attestations | ECDSA · Merkle |
| `OTAVerifier` | Firmware-signature gate, downgrade reject | ECDSA |
| `MerkleBatchOracle` | Shared root registry (batches + attestations) | AccessControl |
| `Subscription` | USDC tiers — the revenue core | — |

No registration fee — minting/claiming a unit costs gas only. Revenue is the subscription.

### Build & test

```bash
cd contracts
forge build
forge test                                    # 50 unit tests
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY \
  FOUNDRY_PROFILE=integration forge test      # forked-mainnet integration suite
```

### Deploy (mainnet)

```bash
forge script script/Deploy.s.sol        --rpc-url $RPC_URL --broadcast --verify
forge script script/ApproveWrapper.s.sol --rpc-url $RPC_URL --broadcast   # registrar ← NameWrapper operator
forge script script/RegisterBulk.s.sol   --rpc-url $RPC_URL --broadcast   # bulk unit subnames
```

## API

```bash
cp .env.example .env        # fill RPC_URL, contract addresses, PINATA_JWT, ADMIN_PRIVATE_KEY
npm install
npm --workspace api run dev
#  Swagger   → http://localhost:3001/docs
#  GraphQL   → http://localhost:3001/graphql
#  WebSocket → ws://localhost:3001/ws
```

Reads go straight to chain (viem + Alchemy). Writes return **unsigned transactions** the OEM signs.
Auth is **subscription-gated**: a key is issued only after an active on-chain subscription, and
every request re-checks `isActive` (expired ⇒ `402`). The `subscription-watcher` listens for
`Subscribed` events → mints the API key → provisions the `mfr.robot-id.eth` namespace.

Smoke check: `API_URL=http://localhost:3001 bash api/src/scripts/oem-quickstart.sh`

## SDKs

```ts
import { RobotIdClient } from '@robot-id/sdk'
const client = new RobotIdClient({ apiKey: 'rid_...', network: 'mainnet' })
const robot  = await client.robots.get(1n)

import { RobotIntentPlugin } from '@robot-id/intent-sdk'
const plugin = new RobotIntentPlugin({ robotId: 1n, apiKey, adapter: 'ros2-bridge' })
const ack = await plugin.handleUtterance("Authorize payment for charging dock B and log the task")
```

## Frontend

```bash
npm --workspace frontend run dev     # landing · /subscribe (Reown + USDC) · /docs
npm --workspace frontend run build   # static export → frontend/out → Vercel
```

## ENS

```
robot-id.eth                                   ← protocol root (treasury, NameWrapper)
└── boston-dynamics.robot-id.eth               ← OEM namespace (granted on paid subscription)
    └── sn-a1b2c3.boston-dynamics.robot-id.eth ← individual robot (resolves to NFT holder via CCIP)
```

## License

MIT · Built on Ethereum · Powered by ENS · Crypto-native · No fiat rails.
