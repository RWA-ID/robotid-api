# robot-id.eth · contracts

Foundry workspace for the six (+oracle) robot-id.eth contracts. Solidity `^0.8.28`, OpenZeppelin v5,
`via_ir` enabled (claim/register carry wide argument sets).

## Layout

```
src/
  core/         RobotIdentity.sol   AgentWallet.sol
  intent/       IntentRouter.sol
  capability/   CapabilityRegistry.sol
  ota/          OTAVerifier.sol
  oracle/       MerkleBatchOracle.sol
  subscription/ Subscription.sol
test/                               one .t.sol per contract (50 unit tests)
test/integration/                   forked-mainnet + end-to-end batch suite
script/         Deploy · ApproveWrapper · RegisterBulk
```

## Commands

```bash
forge build
forge test                                       # unit
FOUNDRY_PROFILE=integration forge test           # integration (RPC_URL → forks mainnet)
forge fmt
forge coverage
```

## Leaf encoding (batch claim)

`RobotIdentity.claimWithProof` verifies against an OZ sorted-pair Merkle tree. Each leaf is:

```
keccak256(bytes.concat(keccak256(abi.encode(serialHash, to, locked))))
```

The API (`api/src/lib/merkle.ts`) and the integration test build identical trees — keep them in sync
if the encoding ever changes.

## Deploy order

`MerkleBatchOracle` → `Subscription` → `RobotIdentity` (needs oracle) → `IntentRouter` (needs
identity) → `CapabilityRegistry` → `OTAVerifier` (needs identity). `script/Deploy.s.sol` does this
and prints every address in `.env` form.
