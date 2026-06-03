import { LiveRibbon } from '@/components/LiveRibbon';
import { ConnectButton } from '@/components/ConnectButton';
import { TIERS, CONTRACTS } from '@/lib/config';

const MODULES = [
  {
    n: '01',
    t: 'Robot Identity',
    d: 'A permanent, programmable NFT identity for every unit — ERC-721 with an optional ERC-5192 soulbound lock and ERC-2981 resale royalties. The serial number is stored as a privacy-preserving keccak256 hash, yet remains independently verifiable. Each unit resolves to SN-X.mfr.robot-id.eth and always points to its current owner.',
    forwho: 'OEMs get a tamper-proof birth certificate per robot; owners get a portable, tradable identity.',
  },
  {
    n: '02',
    t: 'AI / Voice Intent',
    d: 'On-chain authorization and an immutable audit log for every AI-agent or voice command. The lead ROS2-bridge adapter maps natural-language intents to ROS2 action goals, checks them against the robot’s on-chain spend rules, and records each as executed or rejected — with the reason. Alexa, Google Assistant, and custom-LLM adapters ship too.',
    forwho: 'Operators get a provable record of who told the robot to do what — for safety, disputes, and compliance.',
  },
  {
    n: '03',
    t: 'Autonomous Payments',
    d: 'An ERC-4337 smart-account wallet per robot. The owner sets the rules once — per-action ceiling, daily cap, approved-vendor allowlist, and a hard per-transaction maximum — and the contract enforces them forever. A robot can pay a charging dock or a service vendor autonomously, but can never exceed its mandate.',
    forwho: 'Fleets let robots transact without handing a hot wallet unlimited spend.',
  },
  {
    n: '04',
    t: 'Capability Attestation',
    d: 'OEM-signed, append-only records of what a robot is authorized to do: max_payload_kg, operating_zone, max_speed_mps, human_interaction_certified. Full certificates and test reports live on IPFS, anchored on-chain by a Merkle root. Anyone — an insurer, a regulator, a buyer — can verify a claim against the latest root without trusting the OEM’s servers.',
    forwho: 'The robotics analog of a safety datasheet — verifiable, portable, and audit-ready.',
  },
  {
    n: '05',
    t: 'Firmware Verification',
    d: 'An ECDSA + Merkle over-the-air gate. Before a robot accepts an update, its controller verifies the firmware signature against the manufacturer’s registered key and cross-checks the version against the unit’s on-chain firmwareVersion to reject downgrades and replay attacks.',
    forwho: 'Stops unsigned or rolled-back firmware from ever reaching a deployed unit.',
  },
];

const ENDPOINTS = [
  ['GET', '/api/v1/robots/:tokenId', 'Live identity + current owner, read straight from chain'],
  ['POST', '/api/v1/robots', 'Register a single unit (returns an unsigned tx to sign)'],
  ['POST', '/api/v1/robots/batch/preauthorize', 'Up to 100,000 serials → a single Merkle root'],
  ['GET', '/api/v1/robots/batch/:id/proof/:serial', 'A unit’s claim proof (public)'],
  ['GET', '/api/v1/capability/:robotId', 'Latest capability attestations'],
  ['POST', '/api/v1/intent', 'Submit an AI/voice intent through IntentRouter'],
  ['GET', '/api/v1/ota/:robotId/verify', 'Verify a firmware signature + version'],
  ['GET', '/api/v1/subscription/:addr', 'Subscription status, tier, and expiry'],
];

const CONTRACT_ROWS = [
  ['RobotIdentity', 'robotIdentity', 'ERC-721 · ERC-5192 · ERC-2981 · Merkle batch claim'],
  ['AgentWallet', 'intentRouter', 'ERC-4337 smart account · on-chain spend rules'],
  ['IntentRouter', 'intentRouter', 'AI/voice authorization + immutable audit log'],
  ['CapabilityRegistry', 'capabilityRegistry', 'OEM-signed, append-only attestations'],
  ['OTAVerifier', 'otaVerifier', 'Firmware signature gate · downgrade reject'],
  ['Subscription', 'subscription', 'USDC tiers · drives key + namespace provisioning'],
] as const;

function addrFor(key: string): string {
  const a = (CONTRACTS as Record<string, string>)[key];
  return a && !/^0x0+$/.test(a) ? a : '';
}

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <span className="pill">
            <span className="dot" /> MAINNET · 6 CONTRACTS · LIVE
          </span>
          <h1>One API for every robot on Earth.</h1>
          <p className="sub">
            <b>robot-id.eth</b> is open, neutral infrastructure that gives every robot a permanent,
            programmable identity on Ethereum — the way ENS is infrastructure for human-readable
            names. Identity, AI&nbsp;intent, autonomous payments, capability attestation, and
            firmware verification: integrate once via a single API key and keep full control of your
            product and brand.
          </p>
          <div className="hero-cta">
            <a href="/subscribe" className="btn">
              Subscribe · get an API key →
            </a>
            <a href="/docs" className="btn secondary">
              Read the docs
            </a>
            <a
              href="https://github.com/RWA-ID/robotid-api"
              target="_blank"
              rel="noreferrer"
              className="btn secondary"
            >
              View source ↗
            </a>
          </div>
          <LiveRibbon />
        </div>
      </section>

      {/* WHY */}
      <section className="section" id="why">
        <div className="wrap">
          <div className="section-num">§ 01</div>
          <h2>Every robot needs an identity it doesn’t own.</h2>
          <p className="lede">
            Serial numbers live in a manufacturer’s private database. The moment a robot is resold,
            re-deployed, or audited, that identity is unverifiable to anyone else. robot-id.eth makes
            a robot’s identity public infrastructure: neutral, permanent, and provable by anyone —
            without any single company owning the registry.
          </p>
          <div className="grid-3">
            <div className="card">
              <div className="eyebrow">For OEMs</div>
              <h3>Ship trust, not just hardware</h3>
              <p>
                Issue a verifiable identity, capability record, and firmware policy per unit. One
                integration covers your entire catalog and every robot you’ve ever made.
              </p>
              <div className="for">Boston Dynamics · Unitree · Figure · Agility-class</div>
            </div>
            <div className="card">
              <div className="eyebrow">For operators &amp; fleets</div>
              <h3>Control what robots can do</h3>
              <p>
                On-chain spend limits and an immutable intent log mean a robot can act autonomously
                without ever exceeding the mandate you set.
              </p>
              <div className="for">Warehouses · inspection · logistics · service</div>
            </div>
            <div className="card">
              <div className="eyebrow">For insurers &amp; regulators</div>
              <h3>Verify without trusting</h3>
              <p>
                Check a robot’s certified payload, operating zone, or human-interaction rating
                against an on-chain Merkle root — independently of the manufacturer.
              </p>
              <div className="for">Underwriting · compliance · resale due-diligence</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROTOCOL STACK */}
      <section className="section" id="protocol">
        <div className="wrap">
          <div className="section-num">§ 02</div>
          <h2>Infrastructure, not an app.</h2>
          <p className="lede">
            robot-id.eth is the protocol layer beneath every OEM’s own product. You keep your UX,
            your brand, and your customer relationship — the protocol handles identity, settlement,
            and verification underneath.
          </p>

          <div className="stack">
            <div className="layer">
              <div>
                <div className="label">Layer 3</div>
                <div className="lt">OEM applications</div>
              </div>
              <div className="ld">Your app, your brand — full UX control</div>
            </div>
            <div className="layer l2">
              <div>
                <div className="label">Layer 2</div>
                <div className="lt">robot-id.eth protocol</div>
              </div>
              <div className="ld">Identity · Intent · Payments · Capability · OTA · Subscriptions</div>
            </div>
            <div className="layer">
              <div>
                <div className="label">Layer 1</div>
                <div className="lt">Ethereum + ENS</div>
              </div>
              <div className="ld">Settlement · NameWrapper subnames · CCIP-Read resolution</div>
            </div>
          </div>

          <div className="concentric">
            <div className="rings">
              <div className="ring r1">
                <span className="tag" style={{ top: 6 }}>OEM apps</span>
              </div>
              <div className="ring r2">
                <span className="tag" style={{ top: 52 }}>robot-id.eth</span>
              </div>
              <div className="ring r3">
                <div className="core">
                  Ethereum
                  <br />+ ENS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="section" id="modules">
        <div className="wrap">
          <div className="section-num">§ 03</div>
          <h2>Five modules. One key.</h2>
          <p className="lede">
            Narrow by design. No battery passports, charging registries, V2G, or carbon credits —
            just what a robot needs to be a first-class, verifiable on-chain citizen.
          </p>
          <div className="modules">
            {MODULES.map((m) => (
              <div className="mod" key={m.n}>
                <div className="section-num">{m.n}</div>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
                <p className="for" style={{ marginTop: 12, color: 'var(--steel-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  → {m.forwho}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="section-num">§ 04</div>
          <h2>How an OEM integrates.</h2>
          <p className="lede">
            From subscription to a fully-identified fleet in five steps. Reads come straight from
            chain; every write is returned to you as an unsigned transaction you sign with your own
            wallet or multisig — the protocol never holds your keys.
          </p>
          <div className="steps">
            <div className="step">
              <div className="si">01</div>
              <div>
                <h4>Subscribe in USDC</h4>
                <p>
                  Connect a wallet, approve USDC, and call <code>Subscription.subscribe(tier)</code>.
                  The on-chain event provisions your API key and your{' '}
                  <code>mfr.robot-id.eth</code> namespace automatically.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="si">02</div>
              <div>
                <h4>Pre-authorize a batch</h4>
                <p>
                  Submit up to <b>100,000 serial numbers</b> off-chain. The API builds a Merkle tree;
                  you commit one root via <code>MerkleBatchOracle.submitRoot</code>. One transaction
                  authorizes your entire production run.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="si">03</div>
              <div>
                <h4>Units claim their identity</h4>
                <p>
                  Each robot (or your provisioning line) calls{' '}
                  <code>claimWithProof(batchId, proof, …)</code> to mint its NFT — soulbound or
                  transferable, your choice. No per-unit registration fee; gas only.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="si">04</div>
              <div>
                <h4>Attest &amp; secure</h4>
                <p>
                  Sign capability attestations (payload, zone, certifications) and register your
                  firmware-signing key. Set each robot’s AgentWallet spend rules once.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="si">05</div>
              <div>
                <h4>Resolve &amp; operate</h4>
                <p>
                  <code>SN-X.mfr.robot-id.eth</code> resolves to the current owner through the
                  CCIP-Read gateway. Robots route AI/voice intents and autonomous payments — all
                  under the limits you set.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTENT LOG DEMO */}
      <section className="section">
        <div className="wrap">
          <div className="section-num">§ 05</div>
          <h2>ROS2 intent, authorized on-chain.</h2>
          <p className="lede">
            Most robot OEMs run ROS2, so the lead intent adapter is <b>ros2-bridge</b>. Every
            command is classified, checked against the robot’s AgentWallet limits, routed to a ROS2
            action goal, and recorded as an immutable audit entry — executed or rejected, with the
            reason.
          </p>
          <div className="intentlog">
            <div className="head">IntentRouter · live audit log · mfr.robot-id.eth</div>
            <div className="rows">
              <div className="row">
                <span className="t">12:04:01</span>
                <span className="ok">✓ EXECUTED</span>
                <span>/robot/navigate_to_dock · &ldquo;go charge at dock B&rdquo; · 0 ETH</span>
              </div>
              <div className="row">
                <span className="t">12:04:09</span>
                <span className="ok">✓ EXECUTED</span>
                <span>/robot/authorize_payment · vendor 0x9f…a1 · 0.05 ETH</span>
              </div>
              <div className="row">
                <span className="t">12:04:15</span>
                <span className="rej">✗ REJECTED</span>
                <span>LimitsExceeded · 8.0 ETH &gt; per-action ceiling</span>
              </div>
              <div className="row">
                <span className="t">12:04:22</span>
                <span className="rej">✗ REJECTED</span>
                <span>RateLimited · intent flood guard</span>
              </div>
              <div className="row">
                <span className="t">12:04:30</span>
                <span className="ok">✓ EXECUTED</span>
                <span>/robot/start_inspection · &ldquo;patrol warehouse-01&rdquo; · 0 ETH</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVELOPER / API */}
      <section className="section" id="developers">
        <div className="wrap">
          <div className="section-num">§ 06</div>
          <h2>Built for robotics developers.</h2>
          <p className="lede">
            A REST + GraphQL + WebSocket API, an OpenAPI spec with Swagger UI, and typed SDKs. Reads
            go straight to chain via viem + Alchemy — no caching layer between you and the truth.
          </p>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <pre className="codeblock">{`import { RobotIntentPlugin } from '@robot-id/intent-sdk'

const plugin = new RobotIntentPlugin({
  robotId: 1n,
  apiKey: process.env.ROBOT_ID_KEY,
  adapter: 'ros2-bridge',   // alexa | google-assistant | custom-llm
})

const ack = await plugin.handleUtterance(
  "Authorize payment for charging dock B and log the task")
// → classify intent → check AgentWallet limits
// → IntentRouter.submitIntent → return ack`}</pre>
            <table className="endpoints">
              <tbody>
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={p}>
                    <td className="m">{m}</td>
                    <td>
                      <div className="p">{p}</div>
                      <div className="d">{d}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ENS ARCHITECTURE */}
      <section className="section" id="ens">
        <div className="wrap">
          <div className="section-num">§ 07</div>
          <h2>Every robot, a name.</h2>
          <p className="lede">
            On a paid subscription your OEM namespace is provisioned under{' '}
            <span className="mono">robot-id.eth</span> via ENS NameWrapper. Individual units resolve
            through a CCIP-Read gateway that reads <code>ownerOf</code> live — so a name always
            points to the robot’s current holder, even after resale, with zero gas per transfer.
          </p>
          <div className="tree">
{`robot-id.eth                                    `}<b>← protocol root (treasury)</b>{`
└── boston-dynamics.robot-id.eth                `}<b>← OEM namespace (granted on subscription)</b>{`
    ├── sn-a1b2c3.boston-dynamics.robot-id.eth  `}<b>← a unit → resolves to its NFT holder</b>{`
    └── warehouse-01.boston-dynamics.robot-id.eth `}<b>← a site / fleet grouping</b>{`
unitree.robot-id.eth   ·   figure.robot-id.eth   ·   agility.robot-id.eth`}
          </div>
        </div>
      </section>

      {/* CONTRACTS */}
      <section className="section" id="contracts">
        <div className="wrap">
          <div className="section-num">§ 08</div>
          <h2>Live, source-verified contracts.</h2>
          <p className="lede">
            Six contracts on Ethereum mainnet, each verified on Etherscan. 53 tests cover every
            state-changing path, plus a forked-mainnet integration suite that exercises the real USDC
            token — because we launch on mainnet, not a testnet.
          </p>
          <table className="ctable">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Role</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_ROWS.map(([name, key, role]) => {
                const a = addrFor(key);
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{ color: 'var(--ink-soft)' }}>{role}</td>
                    <td>
                      {a ? (
                        <a href={`https://etherscan.io/address/${a}`} target="_blank" rel="noreferrer">
                          {a.slice(0, 10)}…{a.slice(-8)}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--ink-soft)' }}>pending deploy</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-num">§ 09</div>
          <h2>On-chain USDC subscriptions.</h2>
          <p className="lede">
            No registration fees — minting a unit costs gas only. Revenue is the subscription alone,
            paid in USDC and settled on-chain. Subscribing auto-provisions your API key and your{' '}
            <span className="mono">mfr.robot-id.eth</span> namespace.
          </p>
          <div style={{ marginBottom: 24 }}>
            <ConnectButton />
          </div>
          <div className="pricing">
            {TIERS.map((t) => (
              <div className={`tier${t.featured ? ' featured' : ''}`} key={t.idx}>
                <div className="tn">{t.name}</div>
                <div className="price">
                  ${t.priceUsd.toLocaleString()}
                  <span> / mo</span>
                </div>
                <div className="meta">{t.requests} · {t.rate}</div>
                <ul>
                  {t.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <a href={`/subscribe?tier=${t.idx}`} className={`btn${t.featured ? '' : ' secondary'}`}>
                  Subscribe in USDC
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 34 }}>Give your robots an identity that outlives your database.</h2>
          <p className="lede" style={{ margin: '8px auto 28px' }}>
            Integrate once. Identify every unit you’ve ever made. Keep full control.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/subscribe" className="btn">
              Get an API key →
            </a>
            <a href="/docs" className="btn secondary">
              Read the docs
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap row">
          <div>Built on Ethereum · Powered by ENS · MIT Licensed · Crypto-native · No fiat rails.</div>
          <div className="mono">robot-id.eth</div>
        </div>
      </footer>
    </main>
  );
}
