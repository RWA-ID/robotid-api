import type { ReactNode } from 'react';
import { LiveRibbon } from '@/components/LiveRibbon';
import { IntentConsole } from '@/components/IntentConsole';
import { SiteNav } from '@/components/SiteNav';
import {
  Datamatrix, Arrow, Check, Ext,
  IcOem, IcFleet, IcReg,
  IcIdentity, IcVoice, IcPayments, IcAttest, IcFirmware,
} from '@/components/Schematics';
import { TIERS, CONTRACTS } from '@/lib/config';

const REPO = 'https://github.com/RWA-ID/robotid-api';

const MODULES = [
  { n: '01', Ico: IcIdentity, t: 'Robot Identity',
    d: 'A permanent, programmable NFT identity per unit — ERC-721 with optional ERC-5192 soulbound lock and ERC-2981 royalties. The serial is stored as a privacy-preserving keccak256 hash, yet stays independently verifiable. Each unit resolves to SN-X.mfr.robot-id.eth and always points to its current owner.',
    gets: 'OEMs get a tamper-proof birth certificate per robot; owners get a portable, tradable identity.' },
  { n: '02', Ico: IcVoice, t: 'AI / Voice Intent',
    d: 'On-chain authorization and an immutable audit log for every AI-agent or voice command. The ROS2-bridge adapter maps natural-language intents to ROS2 action goals, checks them against the robot’s spend rules, and records each as executed or rejected — with the reason. Alexa, Google Assistant, and custom-LLM adapters ship too.',
    gets: 'Operators get a provable record of who told the robot to do what — for safety, disputes, compliance.' },
  { n: '03', Ico: IcPayments, t: 'Autonomous Payments',
    d: 'An ERC-4337 smart-account wallet per robot. The owner sets rules once — per-action ceiling, daily cap, approved-vendor allowlist, hard per-tx maximum — and the contract enforces them forever. A robot can pay a charging dock or vendor autonomously, but never exceed its mandate.',
    gets: 'Fleets let robots transact without handing a hot wallet unlimited spend.' },
  { n: '04', Ico: IcAttest, t: 'Capability Attestation',
    d: 'OEM-signed, append-only records of what a robot is authorized to do: max_payload_kg, operating_zone, max_speed_mps, human_interaction_certified. Full certificates live on IPFS, anchored on-chain by a Merkle root. Any insurer, regulator, or buyer can verify a claim against the latest root without trusting the OEM.',
    gets: 'The robotics analog of a safety datasheet — verifiable, portable, audit-ready.' },
  { n: '05', Ico: IcFirmware, t: 'Firmware Verification',
    d: 'An ECDSA + Merkle over-the-air gate. Before a robot accepts an update, its controller verifies the firmware signature against the manufacturer’s registered key and cross-checks the version against the unit’s on-chain firmwareVersion to reject downgrades and replay attacks.',
    gets: 'Stops unsigned or rolled-back firmware from ever reaching a deployed unit.' },
];

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/v1/robots/:tokenId', 'Live identity + current owner, read straight from chain'],
  ['POST', '/api/v1/robots', 'Register a single unit (returns an unsigned tx to sign)'],
  ['POST', '/api/v1/robots/batch/preauthorize', 'Up to 100,000 serials → a single Merkle root'],
  ['GET', '/api/v1/robots/batch/:id/proof/:serial', 'A unit’s claim proof (public)'],
  ['GET', '/api/v1/capability/:robotId', 'Latest capability attestations'],
  ['POST', '/api/v1/intent', 'Submit an AI/voice intent through IntentRouter'],
  ['GET', '/api/v1/ota/:robotId/verify', 'Verify a firmware signature + version'],
  ['GET', '/api/v1/subscription/:addr', 'Subscription status, tier, and expiry'],
];

const CONTRACT_ROWS: [string, keyof typeof CONTRACTS, string][] = [
  ['RobotIdentity', 'robotIdentity', 'ERC-721 · ERC-5192 · ERC-2981 · Merkle batch claim'],
  ['AgentWallet', 'intentRouter', 'ERC-4337 smart account · on-chain spend rules'],
  ['IntentRouter', 'intentRouter', 'AI/voice authorization + immutable audit log'],
  ['CapabilityRegistry', 'capabilityRegistry', 'OEM-signed, append-only attestations'],
  ['OTAVerifier', 'otaVerifier', 'Firmware signature gate · downgrade reject'],
  ['Subscription', 'subscription', 'USDC tiers · drives key + namespace provisioning'],
];

function addrFor(key: keyof typeof CONTRACTS): string {
  const a = CONTRACTS[key];
  return a && !/^0x0+$/.test(a) ? a : '';
}

function SpecPlate() {
  return (
    <div className="plate crop">
      <div className="plate-inner">
        <div className="plate-bar">
          <span>UNIT&nbsp;RECORD · SPECIMEN</span>
          <span className="dots"><i style={{ background: 'var(--ok)' }} /><i /><i /></span>
        </div>
        <div className="plate-body">
          <div className="plate-id">
            <div className="lab">ENS Identity</div>
            <div className="val">sn-a1b2c3.<b>boston-dynamics</b>.robot-id.eth</div>
            <div className="etch" />
          </div>
          <div className="readouts">
            <div className="ro"><span className="k">Status</span><span className="v ok"><span className="led led-ok" /> OPERATIONAL</span></div>
            <div className="ro"><span className="k">Firmware</span><span className="v">v3.2.1 · <span style={{ color: 'var(--ok)' }}>signed&nbsp;✓</span></span></div>
            <div className="ro"><span className="k">Capability</span><span className="v">14 kg · zone&nbsp;A</span></div>
            <div className="ro"><span className="k">Owner</span><span className="v">0x7a3f…c21d</span></div>
            <div className="ro"><span className="k">Token</span><span className="v">#001042 · soulbound</span></div>
          </div>
          <div className="dm" title="datamatrix"><Datamatrix seed="SN-A1B2C3-1042" /></div>
          <div className="plate-foot">
            <span>ERC-721 · ERC-5192 · ERC-2981</span>
            <span>RESOLVED VIA CCIP-READ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="dark blueprint" id="top">
      <SiteNav />
      <div className="wrap hero">
        <div className="hero-grid">
          <div>
            <span className="status-pill"><span className="led led-ok" /> MAINNET · 6 CONTRACTS · LIVE</span>
            <h1>One API for every <em>robot</em> on Earth.</h1>
            <p className="sub">
              <b>Robot ID Tech</b> is open, neutral infrastructure that gives every robot a permanent,
              programmable identity on Ethereum — the way ENS is infrastructure for human-readable
              names. Integrate once via a single API key and keep full control of your product and brand.
            </p>
            <div className="hero-cta">
              <a href="/subscribe" className="btn btn-primary">Subscribe · get an API key <Arrow /></a>
              <a href="/docs" className="btn btn-ghost-d">Read the docs</a>
              <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-ghost-d">View source ↗</a>
            </div>
            <div className="oneliner">
              <span><span className="led" />Identity</span>
              <span><span className="led" />AI / voice intent</span>
              <span><span className="led" />Autonomous payments</span>
              <span><span className="led" />Capability attestation</span>
              <span><span className="led" />Firmware verification</span>
            </div>
          </div>
          <SpecPlate />
        </div>
        <LiveRibbon />
      </div>
    </header>
  );
}

function Why() {
  const cards = [
    { Ico: IcOem, eye: 'For OEMs', h: 'Ship trust, not just hardware', p: 'Issue a verifiable identity, capability record, and firmware policy per unit. One integration covers your entire catalog and every robot you’ve ever made.', foot: 'Boston Dynamics · Unitree · Figure · Agility-class' },
    { Ico: IcFleet, eye: 'For operators & fleets', h: 'Control what robots can do', p: 'On-chain spend limits and an immutable intent log mean a robot can act autonomously without ever exceeding the mandate you set.', foot: 'Warehouses · inspection · logistics · service' },
    { Ico: IcReg, eye: 'For insurers & regulators', h: 'Verify without trusting', p: 'Check a robot’s certified payload, operating zone, or human-interaction rating against an on-chain Merkle root — independently of the manufacturer.', foot: 'Underwriting · compliance · resale due-diligence' },
  ];
  return (
    <section className="section" id="why">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 01</span> Why it exists</div>
        <h2 className="sec-h">Every robot needs an identity it doesn’t own.</h2>
        <p className="sec-lede">
          Serial numbers live in a manufacturer’s private database. The moment a robot is resold,
          re-deployed, or audited, that identity is unverifiable to anyone else. robot-id.eth makes a
          robot’s identity public infrastructure: neutral, permanent, and provable by anyone — without
          any single company owning the registry.
        </p>
        <div className="cards3">
          {cards.map((c) => (
            <div className="acard" key={c.eye}>
              <span className="ico"><c.Ico /></span>
              <div className="eyebrow">{c.eye}</div>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
              <div className="foot">{c.foot}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="section" id="protocol">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 02</span> Architecture</div>
        <h2 className="sec-h">Infrastructure, not an app.</h2>
        <p className="sec-lede">
          robot-id.eth is the protocol layer beneath every OEM’s own product. You keep your UX, your
          brand, and your customer relationship — the protocol handles identity, settlement, and
          verification underneath.
        </p>
        <div className="stack">
          <div className="layer">
            <div className="lid">Layer 3</div>
            <div><div className="lt">OEM applications</div><div className="ld">Your app, your brand — full UX control</div></div>
            <div className="lmods">
              <span className="chip">Mobile</span><span className="chip">Fleet console</span><span className="chip">Provisioning line</span>
            </div>
          </div>
          <div className="layer l2">
            <div className="lid">Layer 2</div>
            <div><div className="lt">robot-id.eth protocol</div><div className="ld">Identity · Intent · Payments · Capability · OTA · Subscriptions</div></div>
            <div className="lmods">
              <span className="chip">Identity</span><span className="chip">Intent</span><span className="chip">Payments</span><span className="chip">Capability</span><span className="chip">OTA</span>
            </div>
          </div>
          <div className="layer">
            <div className="lid">Layer 1</div>
            <div><div className="lt">Ethereum + ENS</div><div className="ld">Settlement · NameWrapper subnames · CCIP-Read resolution</div></div>
            <div className="lmods">
              <span className="chip">Mainnet</span><span className="chip">NameWrapper</span><span className="chip">USDC</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section className="section" id="modules">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 03</span> The five modules</div>
        <h2 className="sec-h">Five modules. One key.</h2>
        <p className="sec-lede">
          Narrow by design. No battery passports, charging registries, V2G, or carbon credits — just
          what a robot needs to be a first-class, verifiable on-chain citizen.
        </p>
        <div className="modules">
          {MODULES.map((m) => (
            <div className="mod" key={m.n}>
              <div className="mhead">
                <span className="mn">{m.n}</span>
                <span className="mico"><m.Ico /></span>
              </div>
              <h3>{m.t}</h3>
              <p>{m.d}</p>
              <div className="gets"><span className="ar"><Arrow size={13} /></span><span>{m.gets}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps: [string, string, ReactNode][] = [
    ['01', 'Subscribe in USDC', <span key="1">Connect a wallet, approve USDC, call <code>subscribe(tier)</code>. The on-chain event provisions your API key and <code>mfr.robot-id.eth</code> namespace automatically.</span>],
    ['02', 'Pre-authorize a batch', <span key="2">Submit up to <b>100,000 serials</b> off-chain. The API builds a Merkle tree; you commit one root via <code>submitRoot</code>. One tx authorizes your whole run.</span>],
    ['03', 'Units claim identity', <span key="3">Each robot calls <code>claimWithProof(…)</code> to mint its NFT — soulbound or transferable, your choice. No per-unit fee; gas only.</span>],
    ['04', 'Attest & secure', <span key="4">Sign capability attestations (payload, zone, certs) and register your firmware-signing key. Set each AgentWallet’s spend rules once.</span>],
    ['05', 'Resolve & operate', <span key="5"><code>SN-X.mfr.robot-id.eth</code> resolves to the current owner via CCIP-Read. Robots route intents and payments — under the limits you set.</span>],
  ];
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 04</span> Integration</div>
        <h2 className="sec-h">How an OEM integrates.</h2>
        <p className="sec-lede">
          From subscription to a fully-identified fleet in five steps. Every write is returned as an
          unsigned transaction you sign with your own wallet or multisig — the protocol never holds your keys.
        </p>
        <div className="scale-callout">
          <span>1 unit</span>
          <span className="bar" />
          <b>up to 100,000 serials → one Merkle root → one transaction</b>
          <span className="bar" />
          <span>no per-unit fee · gas only</span>
        </div>
        <div className="steps">
          {steps.map(([n, h, body], i) => (
            <div className="step" key={n}>
              <div className="sn">{n}</div>
              <h4>{h}</h4>
              <p>{body}</p>
              {i < steps.length - 1 && <span className="arrow"><Arrow size={16} /></span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Developer() {
  return (
    <section className="section" id="developers">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 06</span> Developers</div>
        <h2 className="sec-h">Built for robotics developers.</h2>
        <p className="sec-lede">
          A REST + GraphQL + WebSocket API, an OpenAPI spec with Swagger UI, and typed SDKs. Reads go
          straight to chain via viem + Alchemy — no caching layer between you and the truth.
        </p>
        <div className="dev-grid">
          <div className="codeblock">
            <div className="cbar"><span className="dots"><i /><i /><i /></span> <span className="fn">ros2_intent.ts · @robot-id/intent-sdk</span></div>
            <pre>
<span className="k">import</span> {'{ RobotIntentPlugin }'} <span className="k">from</span> <span className="s">&apos;@robot-id/intent-sdk&apos;</span>{'\n\n'}
<span className="k">const</span> plugin = <span className="k">new</span> <span className="f">RobotIntentPlugin</span>({'{'}{'\n'}
{'  '}robotId: <span className="s">1n</span>,{'\n'}
{'  '}apiKey: process.env.ROBOT_ID_KEY,{'\n'}
{'  '}adapter: <span className="s">&apos;ros2-bridge&apos;</span>,   <span className="c">{'// alexa | google-assistant | custom-llm'}</span>{'\n'}
{'}'}){'\n\n'}
<span className="k">const</span> ack = <span className="k">await</span> plugin.<span className="f">handleUtterance</span>({'\n'}
{'  '}<span className="s">&quot;Authorize payment for charging dock B and log the task&quot;</span>){'\n'}
<span className="c">{'// → classify intent → check AgentWallet limits'}</span>{'\n'}
<span className="c">{'// → IntentRouter.submitIntent → return ack'}</span>
            </pre>
          </div>
          <div className="endpoints">
            {ENDPOINTS.map(([m, p, d]) => (
              <div className="ep" key={p}>
                <div className={`m ${m === 'POST' ? 'post' : ''}`}>{m}</div>
                <div><div className="p">{p}</div><div className="d">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Ens() {
  return (
    <section className="section" id="ens">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 07</span> ENS naming</div>
        <h2 className="sec-h">Every robot, a name.</h2>
        <p className="sec-lede">
          On a paid subscription your OEM namespace is provisioned under <span className="mono">robot-id.eth</span>{' '}
          via ENS NameWrapper. Units resolve through a CCIP-Read gateway that reads <span className="mono">ownerOf</span>{' '}
          live — so a name always points to the robot’s current holder, even after resale, with zero gas per transfer.
        </p>
        <div className="tree-card">
          <div className="tnode">
            <span className="dat"><span className="sig">robot-id.eth</span></span>
            <span className="note">← protocol root (treasury)</span>
          </div>
          <div className="tnode ind1">
            <span className="branch">└─</span>
            <span className="dat">boston-dynamics.<span className="sig">robot-id.eth</span></span>
            <span className="note">← OEM namespace · granted on subscription</span>
          </div>
          <div className="tnode ind2">
            <span className="branch">├─</span>
            <span className="dat"><span className="sig">sn-a1b2c3</span>.boston-dynamics.robot-id.eth</span>
            <span className="note">← a unit</span>
          </div>
          <div className="tnode ind2">
            <span className="branch">└─</span>
            <span className="dat"><span className="sig">warehouse-01</span>.boston-dynamics.robot-id.eth</span>
            <span className="note">← a site / fleet grouping</span>
          </div>
          <div className="tnode resolves">
            <span className="pillr"><Arrow size={13} /> resolves via CCIP-Read → <b style={{ color: 'var(--on-dark)' }}>0x7a3f…c21d</b> (current NFT holder)</span>
          </div>
          <div className="tree-other">
            <span><span className="sig">unitree</span>.robot-id.eth</span>
            <span><span className="sig">figure</span>.robot-id.eth</span>
            <span><span className="sig">agility</span>.robot-id.eth</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contracts() {
  return (
    <section className="section" id="contracts">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 08</span> Live contracts</div>
        <h2 className="sec-h">Live, source-verified contracts.</h2>
        <p className="sec-lede">
          Six contracts on Ethereum mainnet, each verified on Etherscan. 53 tests cover every
          state-changing path, plus a forked-mainnet integration suite that exercises the real USDC
          token — because we launch on mainnet, not a testnet.
        </p>
        <div className="verify-bar">
          <span className="vbadge"><span className="led led-ok" /> <b>Source-verified</b> on mainnet</span>
          <span className="vbadge"><b>53</b> tests passing</span>
          <span className="vbadge">Forked-mainnet USDC suite</span>
        </div>
        <table className="ctable">
          <thead><tr><th>Contract</th><th>Role</th><th>Address</th></tr></thead>
          <tbody>
            {CONTRACT_ROWS.map(([name, key, role], i) => {
              const a = addrFor(key);
              return (
                <tr key={name + i}>
                  <td><span className="cn"><span className="led led-sig" />{name}</span></td>
                  <td className="role">{role}</td>
                  <td className="addr">
                    {a ? (
                      <a href={`https://etherscan.io/address/${a}`} target="_blank" rel="noreferrer">
                        {a.slice(0, 10)}…{a.slice(-8)} <span className="ext"><Ext /></span>
                      </a>
                    ) : <span className="role">pending deploy</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="wrap">
        <div className="sec-tag"><span className="num">§ 09</span> Pricing</div>
        <h2 className="sec-h">On-chain USDC subscriptions.</h2>
        <p className="sec-lede">
          No registration fees — minting a unit costs gas only. Revenue is the subscription alone, paid
          in USDC and settled on-chain. Subscribing auto-provisions your API key and your{' '}
          <span className="mono">mfr.robot-id.eth</span> namespace.
        </p>
        <div className="connect-row">
          <a href="/subscribe" className="btn btn-primary">Connect wallet · subscribe <Arrow /></a>
          <span className="connect-note">↳ connect, approve USDC, and subscribe on the key page</span>
        </div>
        <div className="pricing">
          {TIERS.map((t) => (
            <div className={`tier${t.featured ? ' featured' : ''}`} key={t.idx}>
              {t.featured && <span className="badge">Recommended</span>}
              <div className="tn">{t.name}</div>
              <div className="price">${t.priceUsd.toLocaleString()}<span> / mo</span></div>
              <div className="meta">{t.requests} · {t.rate}</div>
              <ul>
                {t.perks.map((p) => (
                  <li key={p}><span className="ck"><Check size={14} /></span>{p}</li>
                ))}
              </ul>
              <a href={`/subscribe?tier=${t.idx}`} className={`btn ${t.featured ? 'btn-primary' : 'btn-ghost'}`}>
                Subscribe in USDC
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="dark blueprint closing">
      <div className="wrap">
        <h2>Give your robots an identity that outlives your database.</h2>
        <p className="sec-lede">Integrate once. Identify every unit you’ve ever made. Keep full control.</p>
        <div className="hero-cta">
          <a href="/subscribe" className="btn btn-primary">Get an API key <Arrow /></a>
          <a href="/docs" className="btn btn-ghost-d">Read the docs</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap row">
        <div className="meta">
          <span>Built on Ethereum</span><span className="sep">·</span>
          <span>Powered by ENS</span><span className="sep">·</span>
          <span>MIT Licensed</span><span className="sep">·</span>
          <span>Crypto-native</span><span className="sep">·</span>
          <span>No fiat rails</span>
        </div>
        <div className="brand-f">Robot&nbsp;<b>ID</b></div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Why />
      <Architecture />
      <Modules />
      <Steps />
      <IntentConsole />
      <Developer />
      <Ens />
      <Contracts />
      <Pricing />
      <Closing />
      <Footer />
    </>
  );
}
