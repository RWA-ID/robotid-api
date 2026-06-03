# Deployment — robot-id.eth

Launch is **Ethereum mainnet**. Build and test on a forked mainnet (Anvil) first; there is no
testnet-only phase. Block any deploy on a failing forked-integration suite or smoke check (§9.4).

## 0 · Prerequisites

- Alchemy key → `RPC_URL`
- `ADMIN_PRIVATE_KEY` (registrar / key-provisioning signer — server-side only)
- `TREASURY_ADDRESS`, `PINATA_JWT`, `REOWN_PROJECT_ID`
- `robot-id.eth` owned in the NameWrapper (treasury)

```bash
cp .env.example .env   # fill the above
npm install
```

## 1 · Pre-flight on a fork

```bash
anvil --fork-url $RPC_URL &           # local fork
cd contracts
forge test                            # 50 unit tests
FOUNDRY_PROFILE=integration forge test # forked-mainnet suite (uses real USDC)
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545  # dry-run, prints addresses
```

## 2 · Deploy contracts (mainnet)

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
# copy printed addresses into .env (ROBOT_IDENTITY_ADDRESS, SUBSCRIPTION_ADDRESS, …)

REGISTRAR_OPERATOR=<admin-address> \
  forge script script/ApproveWrapper.s.sol --rpc-url $RPC_URL --broadcast
```

Verify all six on Etherscan (the `--verify` flag handles this when `ETHERSCAN_API_KEY` is set).

## 3 · API → Railway

```bash
# Railway project → set env from .env (RPC_URL, *_ADDRESS, PINATA_JWT, ADMIN_PRIVATE_KEY)
# uses api/railway.json: build → npm ci + workspace build, start → node api/dist/index.js
railway up
```

Health: `GET https://<railway-domain>/health` · Swagger at `/docs`.
The `subscription-watcher` boots with the server and provisions keys + namespaces on `Subscribed`.

## 4 · CCIP gateway

Deploy `ccip-gateway/` (Railway/Cloudflare). Point your on-chain wildcard resolver's OffchainLookup
URL at `{gateway}/{sender}/{data}.json` and set `GATEWAY_SIGNER_KEY` to the resolver's trusted signer.

## 5 · Subgraph

```bash
cd subgraph
# set the deployed addresses + startBlocks in subgraph.yaml
npm run codegen && npm run build && npm run deploy
```

## 6 · Frontend → Vercel

```bash
# Vercel project → set NEXT_PUBLIC_* env (chain id, Reown id, API url, contract addresses)
cd frontend && npm run build   # static export → out/
vercel --prod
```

For ENS-hosted (IPFS) delivery, pin `frontend/out/` to Pinata and set the `robot-id.eth`
contenthash to the `ipfs://CID`.

## 7 · Acceptance (§12)

- [ ] 6 contracts deployed + source-verified on mainnet
- [ ] OEM connects via Reown, subscribes in USDC, receives auto-provisioned key + `mfr.robot-id.eth`
- [ ] OEM preauthorizes a 100K batch; a unit claims its NFT with a proof
- [ ] `SN-X.mfr.robot-id.eth` resolves to the current holder
- [ ] Intent SDK routes a ROS2 command through `IntentRouter` under AgentWallet limits
- [ ] Forked-mainnet integration suite + `oem-quickstart.sh` pass in CI
- [ ] Docs site documents every endpoint + the unit & integration testing flows
