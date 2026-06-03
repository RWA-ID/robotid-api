import { API_URL } from '@/lib/config';

export const metadata = { title: 'Docs — robot-id.eth' };

export default function Docs() {
  return (
    <main className="wrap">
      <div className="doc">
        <nav>
          <a href="#overview">Overview</a>
          <a href="#quickstart">5-min Quickstart</a>
          <a href="#auth">Authentication</a>
          <div className="grp">Concepts</div>
          <a href="#identity">Robot Identity</a>
          <a href="#batches">Merkle Batches</a>
          <a href="#capability">Capability Registry</a>
          <a href="#intent">Intent Routing</a>
          <a href="#ota">OTA Verification</a>
          <a href="#subscriptions">Subscriptions</a>
          <div className="grp">SDKs</div>
          <a href="#sdk-ts">TypeScript SDK</a>
          <a href="#sdk-intent">Intent SDK (ROS2)</a>
          <div className="grp">Tools</div>
          <a href="#tools">Quickstart · .http · WS · GraphQL</a>
          <div className="grp">Testing</div>
          <a href="#unit-tests">Unit Tests</a>
          <a href="#integration-tests">Integration Tests</a>
          <div className="grp">Reference</div>
          <a href="#errors">Error Codes</a>
          <a href="#limits">Rate Limits</a>
          <a href="#contracts">Mainnet Contracts</a>
        </nav>

        <article>
          <h2 id="overview">Overview</h2>
          <p>
            robot-id.eth is the neutral ENS protocol layer for robots. Reads go straight to chain
            via viem + Alchemy; writes return <b>unsigned transactions</b> you sign with your own
            wallet or multisig. There is no free self-serve tier — a key is issued only after an
            active on-chain USDC subscription.
          </p>

          <h2 id="quickstart">5-minute Quickstart</h2>
          <pre><code>{`npm i @robot-id/sdk

import { RobotIdClient } from '@robot-id/sdk'
const client = new RobotIdClient({ apiKey: 'rid_...', network: 'mainnet' })

const robot = await client.robots.get(1n)
const caps  = await client.capability.get(1n)`}</code></pre>

          <h2 id="auth">Authentication</h2>
          <p>
            Subscription-gated, SIWE via Reown AppKit. Connect a wallet on{' '}
            <a href="/subscribe">/subscribe</a>, approve USDC, and call{' '}
            <code>Subscription.subscribe(tier)</code>. The on-chain <code>Subscribed</code> event
            triggers API-key minting + ENS namespace provisioning. Retrieve your key via a
            SIWE-authenticated <code>GET /auth/keys/info</code>. Every request re-checks{' '}
            <code>isActive</code>; expired subscriptions get <code>402 Payment Required</code>.
          </p>

          <h2 id="identity">Robot Identity</h2>
          <p>
            ERC-721 + ERC-5192 (per-token soulbound) + ERC-2981 royalties. Each unit&rsquo;s{' '}
            <code>serialHash</code> is <code>keccak256(serialNumber)</code> — privacy-preserving but
            verifiable. The ENS name <code>SN-X.mfr.robot-id.eth</code> always resolves to the
            current NFT holder via the CCIP-Read gateway. No registration fee — minting costs gas
            only.
          </p>

          <h2 id="batches">Merkle Batches (OEM)</h2>
          <p>
            Pre-authorize up to <b>100,000 serials</b> off-chain: the API builds a Merkle tree, you
            commit the root via <code>MerkleBatchOracle.submitRoot</code>, and each unit later claims
            its NFT with a proof via <code>claimWithProof(batchId, proof, …)</code>.
          </p>
          <pre><code>{`POST /api/v1/robots/batch/preauthorize
{ "manufacturer":"Unitree", "model":"Go2",
  "serials":[{"serialNumber":"GO2-0001","owner":"0x…"}] }
→ { batchId, root, unsignedTx }   // sign submitRoot, then distribute proofs`}</code></pre>

          <h2 id="capability">Capability Registry</h2>
          <p>
            OEM-signed, append-only attestations of what a robot is authorized to do (
            <code>max_payload_kg</code>, <code>operating_zone</code>,{' '}
            <code>human_interaction_certified</code>). Off-chain cert detail is pinned to IPFS and
            anchored by a Merkle root; <code>verify(robotId, capabilityKey, leaf, proof)</code>{' '}
            checks a proof against the latest root.
          </p>

          <h2 id="intent">Intent Routing</h2>
          <p>
            <code>IntentRouter.submitIntent</code> is on-chain authorization + an immutable audit
            log. An intent is authorized only if it passes the robot&rsquo;s AgentWallet limits;
            otherwise it&rsquo;s rejected with a reason. Per-robot rate gating prevents intent
            floods.
          </p>

          <h2 id="ota">OTA Verification</h2>
          <p>
            <code>OTAVerifier.verify(firmwareHash, version, signature, oemAddress)</code> gates each
            update. It cross-references <code>RobotIdentity.firmwareVersion</code> to reject
            downgrades. A blob signed by the registered OEM key verifies true; any other signer or a
            downgrade verifies false.
          </p>

          <h2 id="subscriptions">Subscriptions</h2>
          <p>
            Three tiers in USDC (6 decimals): Small Manufacturer <b>$5,000</b>, OEM <b>$7,500</b>,
            Enterprise <b>$12,500</b>. <code>subscribe</code> pulls via <code>transferFrom</code>{' '}
            (approve first) and sets a 30-day expiry; renewal extends from{' '}
            <code>max(now, currentExpiry)</code>.
          </p>

          <h2 id="sdk-ts">TypeScript SDK</h2>
          <pre><code>{`const batch = await client.robots.preauthorize({
  manufacturer, model, capabilityClass, serials
})
const active = await client.subscription.isActive('0x…')`}</code></pre>

          <h2 id="sdk-intent">Intent SDK (ROS2 + voice)</h2>
          <pre><code>{`import { RobotIntentPlugin } from '@robot-id/intent-sdk'
const plugin = new RobotIntentPlugin({
  robotId: 1n, apiKey: process.env.ROBOT_ID_KEY!,
  adapter: 'ros2-bridge', // alexa | google-assistant | custom-llm
})
const ack = await plugin.handleUtterance(
  "Authorize payment for charging dock B and log the task")
// → classify → check AgentWallet limits → IntentRouter.submitIntent → ack`}</code></pre>

          <h2 id="tools">Tools</h2>
          <p>
            Quickstart smoke script (<code>oem-quickstart.sh</code>), a REST <code>.http</code>{' '}
            collection, a WebSocket event server at <code>/ws</code> (robots · intent · capability
            channels), and GraphQL at <code>/graphql</code>. Swagger UI:{' '}
            <a href={`${API_URL}/docs`}>{API_URL}/docs</a>.
          </p>

          <h2 id="unit-tests">Testing · Unit Tests</h2>
          <p>
            One <code>.t.sol</code> per contract under <code>contracts/test/</code>, covering every
            state-changing path: soulbound lock/transfer revert, batch Merkle verification,
            AgentWallet limit enforcement, IntentRouter accept/reject, CapabilityRegistry
            immutability, OTA accept/reject + downgrade reject, and Subscription
            subscribe/renew/expire/price-update.
          </p>
          <pre><code>forge test</code></pre>

          <h2 id="integration-tests">Testing · Integration Tests (forked mainnet)</h2>
          <p>
            Because we launch on mainnet with no testnet-only phase, integration coverage is
            mandatory. The suite runs against a <b>forked mainnet</b> so real contracts (USDC) are
            exercised, not mocks:
          </p>
          <ul>
            <li>Subscription lifecycle — fund a fork account with real USDC, approve, subscribe(OEM), warp 30 days, renew.</li>
            <li>Batch path — preauthorize → commit root → claimWithProof for a sampled unit → assert ownership.</li>
            <li>AgentWallet — userOps that pass and that exceed limits; assert enforcement.</li>
            <li>OTA — verify a correctly-signed blob; reject a wrong signer / downgrade.</li>
            <li>ENS end-to-end — resolve <code>SN-X.mfr.robot-id.eth</code> through the CCIP gateway.</li>
          </ul>
          <pre><code>{`RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY \\
  FOUNDRY_PROFILE=integration forge test`}</code></pre>

          <h2 id="errors">Error Codes</h2>
          <ul>
            <li><code>401</code> — missing/invalid API key</li>
            <li><code>402</code> — subscription inactive or expired</li>
            <li><code>429</code> — rate limit exceeded for tier</li>
            <li><code>404</code> — robot / batch not found</li>
          </ul>

          <h2 id="limits">Rate Limits</h2>
          <ul>
            <li>Small Manufacturer — 1,000,000 req/mo · 300/min</li>
            <li>OEM — 5,000,000 req/mo · 1,000/min</li>
            <li>Enterprise — unlimited · 5,000/min</li>
          </ul>

          <h2 id="contracts">Mainnet Contracts</h2>
          <p>RobotIdentity · AgentWallet · IntentRouter · CapabilityRegistry · OTAVerifier · MerkleBatchOracle · Subscription — all source-verified. See the live table on the <a href="/#contracts">landing page</a>.</p>
        </article>
      </div>
    </main>
  );
}
