import { LiveRibbon } from '@/components/LiveRibbon';
import { ConnectButton } from '@/components/ConnectButton';
import { TIERS, CONTRACTS } from '@/lib/config';

const MODULES = [
  { n: '01', t: 'Robot Identity', d: 'ERC-721 + ERC-5192 soulbound option. A permanent, programmable NFT identity per unit, resolving to SN-X.mfr.robot-id.eth.' },
  { n: '02', t: 'AI / Voice Intent', d: 'On-chain authorization + audit log of agent commands. ROS2-bridge lead adapter routes intents through IntentRouter under wallet limits.' },
  { n: '03', t: 'Autonomous Payments', d: 'ERC-4337 AgentWallet per robot. Owner sets spend ceilings, daily caps, and vendor allowlists once; the contract enforces them forever.' },
  { n: '04', t: 'Capability Attestation', d: 'OEM-signed, append-only attestations of what a robot is authorized to do — verifiable independently by insurers and regulators.' },
  { n: '05', t: 'Firmware Verification', d: 'ECDSA + Merkle OTA gate. The controller verifies each update against the registered OEM key and rejects downgrades on-chain.' },
];

const CONTRACT_ROWS = [
  ['RobotIdentity', 'robotIdentity', 'ERC-721 · ERC-5192 · ERC-2981'],
  ['AgentWallet', 'intentRouter', 'ERC-4337 smart account'],
  ['IntentRouter', 'intentRouter', 'AI/voice authorization + audit'],
  ['CapabilityRegistry', 'capabilityRegistry', 'OEM-signed attestations'],
  ['OTAVerifier', 'otaVerifier', 'Firmware signature gate'],
  ['Subscription', 'subscription', 'USDC tiers · revenue core'],
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
            <span className="dot" /> MAINNET · 6 CONTRACTS
          </span>
          <h1>One API for every robot on Earth.</h1>
          <p className="sub">
            <b>robot-id.eth</b> is open, neutral infrastructure that gives every robot a permanent,
            programmable identity on Ethereum. Identity, intent, payments, capability, and firmware —
            integrate once, keep full UX control.
          </p>
          <div className="hero-cta">
            <a href="/subscribe" className="btn">
              Subscribe · Get a key →
            </a>
            <a href="/docs" className="btn secondary">
              Read the docs
            </a>
          </div>
          <LiveRibbon />
        </div>
      </section>

      {/* PROTOCOL STACK */}
      <section className="section" id="protocol">
        <div className="wrap">
          <div className="section-num">§ 01</div>
          <h2>Infrastructure, not an app.</h2>
          <p className="lede">
            The same way ENS is infrastructure for human-readable names, robot-id.eth is the
            protocol layer beneath every OEM&rsquo;s own product.
          </p>

          <div className="stack">
            <div className="layer">
              <div>
                <div className="label">Layer 3</div>
                <div className="lt">OEM applications</div>
              </div>
              <div className="ld">Boston Dynamics · Unitree · Figure · Agility — own UX, own brand</div>
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
              <div className="ld">Settlement · NameWrapper subdomains · CCIP-Read resolution</div>
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
          <div className="section-num">§ 02</div>
          <h2>Five modules. One key.</h2>
          <p className="lede">
            Narrow by design. No battery passports, charging registries, V2G, or carbon credits —
            just what a robot needs to be a first-class on-chain citizen.
          </p>
          <div className="modules">
            {MODULES.map((m) => (
              <div className="mod" key={m.n}>
                <div className="section-num">{m.n}</div>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTENT LOG DEMO */}
      <section className="section">
        <div className="wrap">
          <div className="section-num">§ 03</div>
          <h2>ROS2 intent, authorized on-chain.</h2>
          <p className="lede">
            Every AI/voice command is classified, checked against the robot&rsquo;s AgentWallet
            limits, and recorded as an immutable audit entry.
          </p>
          <div className="intentlog">
            <div className="head">IntentRouter · live audit log</div>
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

      {/* CONTRACTS */}
      <section className="section">
        <div className="wrap">
          <div className="section-num">§ 04</div>
          <h2>Live contracts.</h2>
          <p className="lede">All source-verified on Ethereum mainnet.</p>
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
          <div className="section-num">§ 05</div>
          <h2>On-chain USDC subscriptions.</h2>
          <p className="lede">
            No registration fees — minting a unit costs gas only. Revenue is the subscription, paid
            in USDC, settled on-chain. Connect a wallet to subscribe.
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

      <footer className="footer">
        <div className="wrap row">
          <div>Built on Ethereum · Powered by ENS · MIT Licensed · Crypto-native · No fiat rails.</div>
          <div className="mono">robot-id.eth</div>
        </div>
      </footer>
    </main>
  );
}
