<div align="center">

# robot-id.eth

### The neutral ENS protocol layer for robots & autonomous machines

**Identity · AI/Voice Intent · Autonomous Payments · Capability Attestation · Firmware Verification**

[![Mainnet](https://img.shields.io/badge/Ethereum-Mainnet_Live-1a1a1a)](https://etherscan.io/address/0xEebf76b8E31d95E6ccC198B9291471fF8B31bEcc)
[![Contracts](https://img.shields.io/badge/Contracts-6_verified-2f7d4f)](#-deployed-contracts-mainnet)
[![Tests](https://img.shields.io/badge/forge_test-53_passing-2f7d4f)](#-testing)
[![License](https://img.shields.io/badge/License-MIT-5b6573)](LICENSE)

[Live dApp](https://robotid-api-api.vercel.app) · [API](https://robot-idapi-production.up.railway.app/health) · [API Docs (Swagger)](https://robot-idapi-production.up.railway.app/docs)

</div>

---

## Table of contents

1. [What is robot-id.eth](#-what-is-robot-ideth)
2. [Why it exists](#-why-it-exists)
3. [Architecture](#-architecture)
4. [Deployed contracts (mainnet)](#-deployed-contracts-mainnet)
5. [The five modules](#-the-five-modules)
6. [ENS naming](#-ens-naming)
7. [Monorepo layout](#-monorepo-layout)
8. [Smart contracts in depth](#-smart-contracts-in-depth)
9. [The API](#-the-api)
10. [SDKs](#-sdks)
11. [Frontend](#-frontend)
12. [Local development](#-local-development)
13. [Testing](#-testing)
14. [Deployment](#-deployment)
15. [Environment variables](#-environment-variables)
16. [Security model](#-security-model)
17. [Tech stack](#-tech-stack)
18. [License](#-license)

---

## 🤖 What is robot-id.eth

`robot-id.eth` is **open, neutral infrastructure that gives every robot a permanent, programmable
identity on Ethereum** — the same way ENS is infrastructure for human-readable names. Any robot OEM
(Boston Dynamics, Unitree, Figure, Agility, …) integrates **once** via a single API key and retains
**full control of its own product, UX, and brand**.

It is **infrastructure, not an app.** The protocol provides five tightly-scoped capabilities and
nothing else:

| Module | What it does |
|---|---|
| **Identity** | A permanent, programmable NFT per robot (ERC-721 + optional soulbound + royalties) |
| **AI / Voice Intent** | On-chain authorization + immutable audit log of agent commands (ROS2-first) |
| **Autonomous Payments** | An ERC-4337 wallet per robot with owner-set, contract-enforced spend rules |
| **Capability Attestation** | OEM-signed, verifiable records of what a robot is authorized to do |
| **Firmware Verification** | ECDSA + Merkle OTA gate that rejects unsigned firmware and downgrades |

**Out of scope by design:** battery passports, charging registries, V2G, carbon credits, fleet
payment aggregation, and reserved-brand namespaces. (Those belong to the sibling `e-car.eth`
project.)

**Crypto-native, no fiat rails.** Revenue is an on-chain USDC subscription. There is no per-unit
registration fee — minting a robot's identity costs gas only. There is no Stripe, no card processor,
and no fiat on-ramp anywhere in the codebase.

---

## 💡 Why it exists

A robot's serial number lives in its manufacturer's private database. The instant that robot is
**resold, re-deployed, audited, or insured**, its identity becomes unverifiable to everyone except
the original maker. There is no neutral, portable, tamper-proof way to answer:

- *Who made this robot, and is it genuine?*
- *Who owns it right now?*
- *What is it certified and authorized to do?*
- *Is its firmware signed and current?*
- *What did its AI agent authorize it to do, and when?*

robot-id.eth answers all of these on a public, neutral ledger that **no single company controls** —
while letting each OEM keep its own product experience on top.

---

## 🏛 Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  Layer 3 — OEM applications        your app · your brand · your UX │
├───────────────────────────────────────────────────────────────────┤
│  Layer 2 — robot-id.eth protocol                                   │
│    Identity · Intent · Payments · Capability · OTA · Subscriptions │
├───────────────────────────────────────────────────────────────────┤
│  Layer 1 — Ethereum + ENS                                          │
│    Settlement · NameWrapper subnames · CCIP-Read resolution        │
└───────────────────────────────────────────────────────────────────┘
```

- **Reads** go straight to chain via viem + Alchemy — no caching layer between caller and truth.
- **Writes** are returned to the OEM as **unsigned transactions** they sign with their own wallet or
  multisig. The protocol never holds OEM keys.
- **Resolution** of `SN-X.mfr.robot-id.eth` flows through a CCIP-Read (EIP-3668) gateway that reads
  `ownerOf` live, so a name always points to the robot's current holder — gaslessly, even after a
  resale, and at 100k-unit scale.

---

## 📜 Deployed contracts (mainnet)

Deployed and **source-verified on Ethereum mainnet** on 2026-06-03.
Owner / registrar: `0x5f11a48230f7CdaB91A2361576239091E4b1165b` · Treasury: `0x0104c88Ea4f55c26df89F5cd3eC62F3C8288D69b`

| Contract | Address | Role |
|---|---|---|
| **RobotIdentity** | [`0xEebf76b8E31d95E6ccC198B9291471fF8B31bEcc`](https://etherscan.io/address/0xEebf76b8E31d95E6ccC198B9291471fF8B31bEcc) | Per-unit identity NFT + Merkle batch claim |
| **Subscription** | [`0xfd9A0F30f264C47996C93E78CcC1736AF3C1635F`](https://etherscan.io/address/0xfd9A0F30f264C47996C93E78CcC1736AF3C1635F) | USDC tiers — the revenue core |
| **IntentRouter** | [`0xE7C6703bf5506231d97bea6F899704Cb45c6f6d8`](https://etherscan.io/address/0xE7C6703bf5506231d97bea6F899704Cb45c6f6d8) | AI/voice authorization + audit log |
| **CapabilityRegistry** | [`0x602C50Ac8B9eE4886874b4713f55489b193aeD5f`](https://etherscan.io/address/0x602C50Ac8B9eE4886874b4713f55489b193aeD5f) | OEM-signed attestations |
| **OTAVerifier** | [`0x8442f404C18b96F5C7af857f03f5d5CCB95a7D0f`](https://etherscan.io/address/0x8442f404C18b96F5C7af857f03f5d5CCB95a7D0f) | Firmware signature gate |
| **MerkleBatchOracle** | [`0xC8CE068dE9c38Db8780B7a70174fb453BDC8BB13`](https://etherscan.io/address/0xC8CE068dE9c38Db8780B7a70174fb453BDC8BB13) | Shared Merkle root registry |

> **AgentWallet** is deployed **per robot** on demand (not part of the one-shot deploy), so it has no
> single canonical address.

**USDC:** `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` · **ENS NameWrapper:** `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401`

---

## 🧩 The five modules

### 1 · Robot Identity
A permanent, programmable NFT per unit. ERC-721 with an **optional ERC-5192 soulbound lock**
(per-token) and **ERC-2981 royalties** for transferable units. The serial number is stored as
`keccak256(serialNumber)` — privacy-preserving yet independently verifiable. Up to **100,000 serials**
per batch can be pre-authorized off-chain and claimed later with a Merkle proof. No registration fee.

### 2 · AI / Voice Intent
`IntentRouter` is on-chain authorization **and** an append-only audit log. An intent is authorized
only if it passes the robot's AgentWallet limits; otherwise it is rejected with a machine-readable
reason. Per-robot rate gating prevents intent floods. The **lead adapter is `ros2-bridge`** (most
OEMs run ROS2); `alexa`, `google-assistant`, and `custom-llm` adapters ship too.

### 3 · Autonomous Payments
`AgentWallet` is an **ERC-4337 smart account, one per robot**. The owner sets the rules once and the
contract enforces them forever: per-action spend ceiling, daily cap, approved-vendor allowlist, and a
hard per-transaction maximum. Rules live on-chain, never in a backend.

### 4 · Capability Attestation
`CapabilityRegistry` holds **OEM-signed, append-only attestations** of what a robot is authorized to
do (`max_payload_kg`, `operating_zone`, `human_interaction_certified`, `max_speed_mps`, …). Full
certificates live on IPFS, anchored on-chain by a Merkle root. `verify(robotId, key, leaf, proof)`
lets anyone check a claim against the latest root — independently of the OEM.

### 5 · Firmware Verification
`OTAVerifier` is an **ECDSA + Merkle firmware gate**. A robot's controller verifies an update against
the manufacturer's registered key and cross-checks the version against the unit's on-chain
`firmwareVersion` to reject downgrades and replays.

---

## 🌐 ENS naming

```
robot-id.eth                                      ← protocol root (treasury, NameWrapper)
├── boston-dynamics.robot-id.eth                  ← OEM namespace (granted on paid subscription)
│   ├── sn-a1b2c3.boston-dynamics.robot-id.eth    ← an individual robot → resolves to NFT holder
│   └── warehouse-01.boston-dynamics.robot-id.eth ← a site / fleet grouping
├── unitree.robot-id.eth
└── figure.robot-id.eth
```

- OEM subnames are **provisioned as a deliverable of an active subscription** — when `Subscribed`
  fires, the registrar creates `mfr.robot-id.eth` via NameWrapper.
- Per-unit resolution runs through the **CCIP-Read gateway**, which reads `RobotIdentity.ownerOf`
  (the `addr` record) plus the unit's **text records** (spec data — see below). Slugs are normalized
  (lowercase, dash-separated) to prevent identity squatting.

---

## 📇 Records: serial, build date, model & specs

Every unit name resolves two kinds of data, gas-free, through the CCIP-Read gateway:

- **`addr`** → the current NFT holder (`ownerOf`).
- **`text(key)`** → spec records, merged from two sources:

| Source | Trust | Mutability | Holds |
|---|---|---|---|
| On-chain `RobotData` struct | **Authoritative / tamper-proof** | registrar-only (`setTokenURI`/`setFirmwareVersion`) | manufacturer, model, capability class, firmware, serial **hash**, registration date, soulbound flag |
| IPFS metadata JSON (`tokenURI`) | OEM-asserted | registrar can re-pin | build date, model number, weight, payload, avatar, datasheet links, arbitrary attributes |

> The serial number itself is stored **only as `keccak256(serial)`** (privacy-preserving). A holder can
> *prove* a serial; it is never exposed in plaintext on-chain or via records.

### Canonical text-record keys

| ENS text key | Source | Example value |
|---|---|---|
| `robot.manufacturer` | on-chain | `Boston Dynamics` |
| `robot.model` | on-chain | `Spot` |
| `robot.capability-class` | on-chain | `quadruped-inspection` |
| `robot.firmware` | on-chain | `3` |
| `robot.serial-hash` | on-chain | `0x9af2…` |
| `robot.registered` | on-chain | `2026-06-04T18:22:01.000Z` (ISO) |
| `robot.soulbound` | on-chain | `true` |
| `robot.token-id` | on-chain | `1` |
| `robot.build-date` | IPFS metadata | `2026-01-15` |
| `robot.model-number` | IPFS metadata | `SPOT-EXPLORER-2` |
| `avatar` · `url` · `description` | IPFS metadata | standard ENS keys, passed through |
| `robot.<trait>` | IPFS `attributes[]` | any OpenSea-style trait, slugged |

On-chain fields win on key conflicts. Any scalar field in the metadata JSON is also exposed under both
its raw key and a `robot.`-prefixed alias. Unknown keys resolve to `""` (per ENSIP — never an error).

### Resolve records on your platform

Resolution is **standard ENS** — any ENSIP-10 + EIP-3668 (CCIP-Read) client works with no special SDK.

**viem** (CCIP-Read on by default):
```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({ chain: mainnet, transport: http() });
const name = 'sn-a1b2c3.boston-dynamics.robot-id.eth';

const holder    = await client.getEnsAddress({ name });
const model     = await client.getEnsText({ name, key: 'robot.model' });
const buildDate = await client.getEnsText({ name, key: 'robot.build-date' });
const firmware  = await client.getEnsText({ name, key: 'robot.firmware' });
```

**ethers v6** (follows CCIP-Read automatically):
```ts
import { JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider(process.env.RPC_URL);
const resolver = await provider.getResolver('sn-a1b2c3.boston-dynamics.robot-id.eth');

const holder = await resolver.getAddress();
const model  = await resolver.getText('robot.model');
```

**No chain / quick lookups** — the gateway exposes read-only debug endpoints that return the same data:
```bash
curl https://<gateway>/resolve/sn-a1b2c3.boston-dynamics.robot-id.eth   # holder + tokenId + profile CID
curl https://<gateway>/records/sn-a1b2c3.boston-dynamics.robot-id.eth   # full merged text-record map
```

Wallets and explorers (ENS app, Etherscan, Rainbow, …) display these text records automatically — no
integration work needed on their side.

---

## 📦 Monorepo layout

```
robotid-api/
├── contracts/        Foundry — 6 contracts + unit & forked-mainnet tests + deploy scripts
├── api/              Express REST + GraphQL + WebSocket + Swagger  → Railway
├── sdk/              @robot-id/sdk — TypeScript client
├── intent-sdk/       @robot-id/intent-sdk — ROS2-bridge + voice adapters (key differentiator)
├── ccip-gateway/     CCIP-Read (EIP-3668) off-chain gateway for *.robot-id.eth
├── subgraph/         The Graph event indexing
├── frontend/         Next.js dApp — landing · /subscribe · /docs  → Vercel
├── relayer/          Optional gas sponsorship for unit claims
├── vercel.json       Frontend build config (static export)
├── vercel-build.sh   Frontend build script (Build Output API)
├── nixpacks.toml     API build config (Railway)
└── package.json      npm workspaces root
```

---

## 🔩 Smart contracts in depth

Solidity `^0.8.28`, OpenZeppelin v5, Foundry, `via_ir` enabled. All state changes emit events (the
API listeners and subgraph depend on them).

| Contract | Standards | Key functions |
|---|---|---|
| `RobotIdentity` | ERC-721 · ERC-5192 · ERC-2981 | `registerRobot`, `claimWithProof`, `setFirmwareVersion`, `locked` |
| `AgentWallet` | ERC-4337 | `setRules`, `setVendor`, `execute`, `wouldPass`, `validateUserOp` |
| `IntentRouter` | — | `submitIntent`, `linkWallet`, `setRateConfig` |
| `CapabilityRegistry` | ECDSA · Merkle | `attest`, `verify`, `latest`, `historyOf` |
| `OTAVerifier` | ECDSA | `verify`, `verifyForRobot`, `setOEMKey` |
| `MerkleBatchOracle` | AccessControl | `submitRoot`, `getRoot`, `rootOf` |
| `Subscription` | — | `subscribe`, `isActive`, `tierOf`, `setPrice`, `withdraw` |

### Subscription tiers (USDC, 6 decimals)

| Tier | Price / mo | Requests / mo | Rate / min | Namespace |
|---|---|---|---|---|
| Small Manufacturer | $1,999 | 1,000,000 | 300 | ✓ `*.mfr` |
| OEM | $3,999 | 5,000,000 | 1,000 | ✓ `*.mfr` + all adapters |
| Enterprise | $9,999 | unlimited | 5,000 | ✓ + multi-chain + white-label |

`subscribe(tier)` pulls USDC via `transferFrom` (approve first), sets a 30-day expiry, and emits
`Subscribed`. Renewal extends from `max(now, currentExpiry)`.

### Merkle batch leaf encoding
`RobotIdentity.claimWithProof` verifies against an OZ sorted-pair tree. Each leaf is:

```
keccak256(bytes.concat(keccak256(abi.encode(serialHash, to, locked))))
```

This must stay in sync across the contract, `api/src/lib/merkle.ts`, and the integration test.

---

## 🛰 The API

Base path `/api/v1/*`. REST + GraphQL + WebSocket, with Swagger UI at `/docs`.
**Live:** https://robot-idapi-production.up.railway.app

**Auth is subscription-gated.** A key is issued only after an active on-chain subscription, and
every authenticated request re-checks `Subscription.isActive(addr)` — an expired subscription gets
`402 Payment Required`. The `subscription-watcher` listens for `Subscribed` events → mints an API key
→ provisions the OEM ENS namespace.

```
GET    /health
GET    /auth/tiers                          # 3 tiers + USDC prices
POST   /auth/keys/wallet                    # SIWE → API key (if subscription active)
GET    /auth/keys/info            (auth)    # tier, limits, usage, expiry

GET    /api/v1/robots/:tokenId              # live: identity + current owner
POST   /api/v1/robots             (auth)    # register single (unsigned tx)
POST   /api/v1/robots/batch/preauthorize (auth)   # up to 100K serials → Merkle root
GET    /api/v1/robots/batch/:id   (auth)    # batch summary
GET    /api/v1/robots/batch/:id/proof/:serial     # single proof (public)
GET    /api/v1/robots/batch/:id/proofs (auth)     # paginated proofs
POST   /api/v1/robots/batch/:id/transfer (auth)   # bulk safeTransferFrom calldata

GET    /api/v1/capability/:robotId          # latest attestations
GET    /api/v1/capability/:robotId/history
POST   /api/v1/capability/:robotId/verify

POST   /api/v1/intent             (auth)    # submit an AI/voice intent
GET    /api/v1/ota/:robotId/verify          # verify a firmware signature

GET    /api/v1/subscription/:addr           # active? tier? expiry?
POST   /graphql                             # GraphQL endpoint
WS     /ws                                   # robots · intent · capability channels
GET    /docs                                # Swagger UI
```

**Error codes:** `401` missing/invalid key · `402` subscription inactive/expired · `429` rate
limit · `404` not found.

### Attaching records when minting

The records resolved in [📇 Records](#-records-serial-build-date-model--specs) are written **at mint /
claim time**. There is no separate "set record" call — you provide them with the unit.

**The metadata JSON schema** (pinned to IPFS, referenced by `tokenURI`). On-chain struct fields are
mirrored here for marketplaces; everything else is free-form and surfaces as `text` records:

```json
{
  "manufacturer": "Boston Dynamics",
  "model": "Spot",
  "capabilityClass": "quadruped-inspection",
  "firmwareVersion": 3,
  "build-date": "2026-01-15",
  "model-number": "SPOT-EXPLORER-2",
  "avatar": "ipfs://bafy…/spot.png",
  "description": "Inspection quadruped, unit A1B2C3",
  "attributes": [
    { "trait_type": "Payload kg", "value": 14 },
    { "trait_type": "Ingress rating", "value": "IP54" }
  ]
}
```

**Single unit** — `POST /api/v1/robots`. Pass spec data in `profile`; the API pins
`{ manufacturer, model, capabilityClass, firmwareVersion, ...profile }` to IPFS and bakes the CID into
the unsigned `registerRobot` tx you sign:

```jsonc
{
  "to": "0xUnitOwner…",
  "serialNumber": "A1B2C3",          // hashed client→chain; never stored in plaintext
  "manufacturer": "Boston Dynamics",
  "model": "Spot",
  "capabilityClass": "quadruped-inspection",
  "firmwareVersion": 3,
  "locked": true,                     // soulbound
  "profile": {                        // → IPFS metadata → text records
    "build-date": "2026-01-15",
    "model-number": "SPOT-EXPLORER-2",
    "attributes": [{ "trait_type": "Payload kg", "value": 14 }]
  }
}
```

**Batch (10K–100K)** — records attach in two layers:

1. **Batch-level** fields (`manufacturer`, `model`, `capabilityClass`) are shared by every unit and
   passed once to `POST /api/v1/robots/batch/preauthorize`.
2. **Per-unit** spec sheets are supplied as a `tokenURI` (an `ipfs://CID` you pin) on each serial.
   Inline pinning of 100K JSONs isn't feasible, so you pin them (Pinata, web3.storage, your own IPFS
   node) and hand us the CIDs — the API threads each through the proof responses so the claim attaches
   the right one. Omit it to ship units with only the shared on-chain fields.

```jsonc
// POST /api/v1/robots/batch/preauthorize
{
  "manufacturer": "Boston Dynamics",
  "model": "Spot",
  "capabilityClass": "quadruped-inspection",
  "locked": true,
  "serials": [
    { "serialNumber": "A1B2C3", "owner": "0x…", "tokenURI": "ipfs://bafyUnit1…" },
    { "serialNumber": "A1B2C4", "owner": "0x…", "tokenURI": "ipfs://bafyUnit2…" }
  ]
}
```

The returned `batchId` + `root` go on-chain via `MerkleBatchOracle.submitRoot`. Each unit then claims
with `GET …/batch/:id/proof/:serial` — which now returns `manufacturer`, `model`, `capabilityClass`
and `uri` alongside the `proof` — feeding straight into `claimWithProof` (or the relayer's
`/sponsor/claim`).

> **Trust note:** the Merkle leaf commits only `(serialHash, owner, locked)`. The spec strings and
> `uri` are bound to the unit at claim time, not by the proof. For records that must be cryptographically
> tied to the batch, mint via `registerRobot` (registrar-signed) instead of self-claim, or pin a
> metadata CID whose hash you publish. **On-chain fields are always registrar-gated and tamper-proof;
> IPFS metadata is OEM-asserted.**

To update a record later: `setTokenURI(tokenId, newCID)` (re-pin the JSON) or `setFirmwareVersion`
(monotonic) — both registrar-only. The gateway caches records for 60s, so updates appear within a
minute.

---

## 🧰 SDKs

### `@robot-id/sdk`
```ts
import { RobotIdClient } from '@robot-id/sdk'

const client = new RobotIdClient({ apiKey: 'rid_...', network: 'mainnet' })

const robot  = await client.robots.get(1n)
const caps   = await client.capability.get(1n)
const batch  = await client.robots.preauthorize({ serials, manufacturer, model, capabilityClass })
const active = await client.subscription.isActive('0x...')
```

### `@robot-id/intent-sdk` (the key differentiator)
Converts natural-language / AI-agent commands into on-chain actions via `IntentRouter`. Lead adapter
is `ros2-bridge`; also `alexa`, `google-assistant`, `custom-llm`.

```ts
import { RobotIntentPlugin } from '@robot-id/intent-sdk'

const plugin = new RobotIntentPlugin({ robotId: 1n, apiKey, adapter: 'ros2-bridge' })
const ack = await plugin.handleUtterance(
  "Authorize payment for charging dock B and log the task")
// → classify intent → check AgentWallet limits → IntentRouter.submitIntent → ack
```

---

## 🎨 Frontend

Next.js (App Router, static export). **Live:** https://robotid-api-api.vercel.app

- **Landing** (`/`) — protocol overview, the five modules, OEM integration flow, ROS2 intent-log
  demo, live contracts table, ENS naming, and on-chain USDC pricing.
- **Subscribe** (`/subscribe`) — Reown AppKit connect → approve USDC → `Subscription.subscribe(tier)`
  → key + namespace provisioned.
- **Docs** (`/docs`) — concepts, SDKs, tools, and the unit + integration testing flows.

> To enable the wallet Connect button + subscribe flow, set `NEXT_PUBLIC_REOWN_PROJECT_ID`
> (free from [dashboard.reown.com](https://dashboard.reown.com)) in the Vercel project env.

---

## 💻 Local development

**Prerequisites:** Node 20+, [Foundry](https://book.getfoundry.sh/), an Alchemy mainnet key.

```bash
git clone https://github.com/RWA-ID/robotid-api.git
cd robotid-api
cp .env.example .env          # fill RPC_URL, contract addresses, PINATA_JWT, ADMIN_PRIVATE_KEY
npm install                   # installs all workspaces

# Contracts
cd contracts && forge build && forge test

# API  →  http://localhost:3001  (Swagger at /docs)
npm --workspace api run dev

# Frontend  →  http://localhost:3000
npm --workspace frontend run dev
```

---

## ✅ Testing

We launch on **mainnet** with no testnet-only phase, so integration coverage is mandatory.

```bash
cd contracts
forge test                                    # 53 unit + integration tests
forge fmt --check                             # formatting
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY \
  FOUNDRY_PROFILE=integration forge test      # forked-mainnet suite (real USDC)
```

- **Unit** — one `.t.sol` per contract: soulbound lock/transfer revert, batch Merkle verification,
  AgentWallet limit enforcement, IntentRouter accept/reject, CapabilityRegistry immutability, OTA
  accept/reject + downgrade reject, Subscription subscribe/renew/expire/price-update.
- **Integration** — forked mainnet exercises the **real USDC token**: subscription lifecycle (fund →
  approve → subscribe → warp 30 days → renew) and the full batch path (preauthorize → commit root →
  `claimWithProof` → assert ownership).
- **API smoke** — `api/src/scripts/oem-quickstart.sh` (colored pass/fail, aborts on first
  regression) is wired into CI as a production gate.

---

## 🚀 Deployment

| Component | Target | Config |
|---|---|---|
| Contracts | Ethereum mainnet | `contracts/script/Deploy.s.sol` |
| API | [Railway](https://railway.app) | `nixpacks.toml` + `api/railway.json` |
| Frontend | [Vercel](https://vercel.com) | `vercel.json` + `vercel-build.sh` |
| Subgraph | The Graph | `subgraph/subgraph.yaml` |

```bash
# Contracts (mainnet)
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
forge script script/ApproveWrapper.s.sol --rpc-url $RPC_URL --broadcast  # registrar ← NameWrapper operator
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full step-by-step (Railway env, Vercel, ENS contenthash,
acceptance checklist). The CI matrix (`.github/workflows/ci.yml`) runs `forge test` + lint +
typecheck on every push, and gates deploys on the forked-mainnet suite + smoke check.

> **Note on Vercel:** the frontend is a workspace inside a monorepo. `vercel-build.sh` locates the
> `frontend` package, runs `next build`, and emits the static export via Vercel's Build Output API —
> robust to the project's Root Directory setting. Set `NEXT_PUBLIC_REOWN_PROJECT_ID` in Vercel env.

---

## 🔐 Environment variables

See [`.env.example`](.env.example) for the full list. Highlights:

| Var | Used by | Notes |
|---|---|---|
| `RPC_URL` | all | Alchemy mainnet URL |
| `ADMIN_PRIVATE_KEY` | api, registrar | **Server-side only.** Never reaches the frontend bundle. |
| `PINATA_JWT` | api | IPFS pinning for profiles + capability artifacts |
| `*_ADDRESS` | api, frontend | Deployed contract addresses |
| `REOWN_PROJECT_ID` / `NEXT_PUBLIC_REOWN_PROJECT_ID` | frontend | Reown AppKit wallet connect |
| `TREASURY_ADDRESS` | contracts | Subscription + royalty receiver |

---

## 🛡 Security model

- **No custody.** Writes are returned as unsigned transactions; the OEM signs with its own wallet.
- **On-chain enforcement.** AgentWallet spend rules and IntentRouter authorization are enforced by
  contracts, not a backend.
- **Subscription re-checked per request** — expired access is cut off at the contract level (`402`).
- **Privacy-preserving serials** — only `keccak256(serial)` is stored on-chain.
- **Soulbound option** — OEMs can lock identities to a unit (ERC-5192) to prevent transfer.
- **`ReentrancyGuard`** on all value-moving functions; `via_ir` + OZ v5.
- `ADMIN_PRIVATE_KEY` is **server-side only** and must never reach the frontend bundle.

---

## 🧱 Tech stack

**Contracts:** Solidity 0.8.28 · Foundry · OpenZeppelin v5 · `via_ir`
**API:** Node 20 · Express · viem · GraphQL · WebSocket (ws) · Swagger
**SDKs:** TypeScript · viem
**Frontend:** Next.js 14 (App Router, static export) · Reown AppKit · wagmi · viem
**Infra:** Ethereum mainnet · ENS (NameWrapper + CCIP-Read) · Pinata (IPFS) · The Graph · Railway · Vercel

---

## 📄 License

MIT — see [LICENSE](LICENSE).

<div align="center">

**Built on Ethereum · Powered by ENS · MIT Licensed · Crypto-native · No fiat rails**

`robot-id.eth`

</div>
