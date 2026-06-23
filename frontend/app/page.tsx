import type { ReactNode } from 'react';
import { LiveRibbon } from '@/components/LiveRibbon';
import { IntentConsole } from '@/components/IntentConsole';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroVisual } from '@/components/HeroVisual';
import { Reveal, SecHead } from '@/components/Reveal';
import {
  Datamatrix, Arrow, Ext, Check,
  IcOem, IcFleet, IcReg,
  IcIdentity, IcVoice, IcPayments, IcAttest, IcFirmware,
  IcAudit, IcLock,
} from '@/components/Schematics';
import { TIERS, CONTRACTS } from '@/lib/config';

const REPO = 'https://github.com/RWA-ID/robotid-api';

type ModuleDef = {
  n: string;
  Ico: () => ReactNode;
  t: string;
  d: string;
  gets: string;
  img: string;
  hud: 'identity' | 'voice' | 'payments' | 'attest' | 'firmware';
};

const MODULES: ModuleDef[] = [
  { n: '01', Ico: IcIdentity, t: 'Robot Identity', img: '/assets/mod-1.png', hud: 'identity',
    d: 'A permanent, programmable NFT identity per unit — ERC-721 with optional ERC-5192 soulbound lock and ERC-2981 royalties. The serial is stored as a privacy-preserving keccak256 hash, yet stays independently verifiable. Each unit resolves to <serial>.<oem>.robot-id.eth and always points to its current owner.',
    gets: 'OEMs get a tamper-proof birth certificate per robot; owners get a portable, tradable identity.' },
  { n: '02', Ico: IcVoice, t: 'AI / Voice Intent', img: '/assets/mod-2.png', hud: 'voice',
    d: 'On-chain authorization and an immutable audit log for every AI-agent or voice command. The ROS2-bridge adapter maps natural-language intents to ROS2 action goals, checks them against the robot’s spend rules, and records each as executed or rejected — with the reason. Alexa, Google Assistant, and custom-LLM adapters ship too.',
    gets: 'Operators get a provable record of who told the robot to do what — for safety, disputes, compliance.' },
  { n: '03', Ico: IcPayments, t: 'Autonomous Payments', img: '/assets/mod-3.png', hud: 'payments',
    d: 'An ERC-4337 smart-account wallet per robot. The owner sets rules once — per-action ceiling, daily cap, approved-vendor allowlist, hard per-tx maximum — and the contract enforces them forever. A robot can pay a charging dock or vendor autonomously, but never exceed its mandate.',
    gets: 'Fleets let robots transact without handing a hot wallet unlimited spend.' },
  { n: '04', Ico: IcAttest, t: 'Capability Attestation', img: '/assets/mod-4.png', hud: 'attest',
    d: 'OEM-signed, append-only records of what a robot is authorized to do: max_payload_kg, operating_zone, max_speed_mps, human_interaction_certified. Full certificates live on IPFS, anchored on-chain by a Merkle root. Any insurer, regulator, or buyer can verify a claim against the latest root without trusting the OEM.',
    gets: 'The robotics analog of a safety datasheet — verifiable, portable, audit-ready.' },
  { n: '05', Ico: IcFirmware, t: 'Firmware Verification', img: '/assets/mod-5.png', hud: 'firmware',
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
  ['Subscription', 'subscription', 'USDC tiers · drives API-key issuance'],
];

function addrFor(key: keyof typeof CONTRACTS): string {
  const a = CONTRACTS[key];
  return a && !/^0x0+$/.test(a) ? a : '';
}

/* ---- HERO ---- */
function Hero() {
  return (
    <header className="hero-stage" id="top">
      <div className="hero-aura" aria-hidden="true" />
      <SiteNav />
      <div className="wrap hero">
        <div className="hero-grid">
          <div>
            <Reveal as="span" className="status-pill"><span className="led led-ok" /> MAINNET · 6 CONTRACTS · LIVE</Reveal>
            <Reveal as="h1" delay={60}>One API for every <em>robot</em> on Earth.</Reveal>
            <Reveal as="p" className="sub" delay={120}>
              <b>Robot ID Tech</b> is open, neutral infrastructure that gives every robot a permanent,
              programmable identity on Ethereum — the way ENS is infrastructure for human-readable
              names. Integrate once via a single API key and keep full control of your product and brand.
            </Reveal>
            <Reveal as="div" className="hero-cta" delay={180}>
              <a href="/subscribe" className="btn btn-primary">Subscribe · get an API key <Arrow /></a>
              <a href="/docs" className="btn btn-ghost-d">Read the docs</a>
              <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-ghost-d">View source ↗</a>
            </Reveal>
            <Reveal as="div" className="oneliner" delay={240}>
              <span><span className="led" />Identity</span>
              <span><span className="led" />AI / voice intent</span>
              <span><span className="led" />Autonomous payments</span>
              <span><span className="led" />Capability attestation</span>
              <span><span className="led" />Firmware verification</span>
            </Reveal>
            <div className="scroll-cue"><span className="rail" /> SCROLL TO EXPLORE</div>
          </div>

          <HeroVisual />
        </div>

        <LiveRibbon />
      </div>
    </header>
  );
}

/* ---- §01 WHY ---- */
function Why() {
  const cards = [
    { Ico: IcOem, eye: 'For OEMs', h: 'Ship trust, not just hardware', p: 'Issue a verifiable identity, capability record, and firmware policy per unit. One integration covers your entire catalog and every robot you’ve ever made.', foot: 'Boston Dynamics · Unitree · Figure · Agility-class' },
    { Ico: IcFleet, eye: 'For operators & fleets', h: 'Control what robots can do', p: 'On-chain spend limits and an immutable intent log mean a robot can act autonomously without ever exceeding the mandate you set.', foot: 'Warehouses · inspection · logistics · service' },
    { Ico: IcReg, eye: 'For insurers & regulators', h: 'Verify without trusting', p: 'Check a robot’s certified payload, operating zone, or human-interaction rating against an on-chain Merkle root — independently of the manufacturer.', foot: 'Underwriting · compliance · resale due-diligence' },
  ];
  return (
    <section className="section blueprint" id="why">
      <div className="wrap">
        <SecHead num="§ 01" tag="Why it exists" h="Every robot needs an identity it doesn’t own.">
          Serial numbers live in a manufacturer’s private database. The moment a robot is resold,
          re-deployed, or audited, that identity is unverifiable to anyone else. robot-id.eth makes a
          robot’s identity public infrastructure: neutral, permanent, and provable by anyone — without
          any single company owning the registry.
        </SecHead>
        <div className="cards3">
          {cards.map((c, i) => (
            <Reveal as="div" className="acard" key={c.eye} delay={i * 90}>
              <span className="ico"><c.Ico /></span>
              <div className="eyebrow">{c.eye}</div>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
              <div className="foot">{c.foot}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- §02 ARCHITECTURE ---- */
function Architecture() {
  const layers = [
    { id: 'Layer 3', t: 'OEM applications', d: 'Your app, your brand — full UX control', mods: ['Mobile', 'Fleet console', 'Provisioning line'], cls: '' },
    { id: 'Layer 2', t: 'robot-id.eth protocol', d: 'Identity · Intent · Payments · Capability · OTA · Subscriptions', mods: ['Identity', 'Intent', 'Payments', 'Capability', 'OTA'], cls: 'l2' },
    { id: 'Layer 1', t: 'Ethereum + ENS', d: 'Settlement · NameWrapper subnames · CCIP-Read resolution', mods: ['Mainnet', 'NameWrapper', 'USDC'], cls: '' },
  ];
  return (
    <section className="section blueprint" id="protocol">
      <div className="wrap">
        <SecHead num="§ 02" tag="Architecture" h="Infrastructure, not an app.">
          robot-id.eth is the protocol layer beneath every OEM’s own product. You keep your UX, your
          brand, and your customer relationship — the protocol handles identity, settlement, and
          verification underneath.
        </SecHead>
        <div className="stack">
          {layers.map((l, i) => (
            <Reveal as="div" className={`layer ${l.cls}`} key={l.id} delay={i * 90}>
              <div className="lid">{l.id}</div>
              <div><div className="lt">{l.t}</div><div className="ld">{l.d}</div></div>
              <div className="lmods">{l.mods.map((m) => <span className="chip" key={m}>{m}</span>)}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- §03 MODULES ---- */
function ModuleHud({ kind }: { kind: ModuleDef['hud'] }) {
  if (kind === 'identity') {
    return (
      <div className="hud"><div className="hud-panel hud-ens">
        <span className="qr"><Datamatrix seed="SN-A1B2C3-1042" n={12} /></span>
        <span className="nm">sn-a1b2c3.<b>boston-dynamics</b><br />.robot-id.eth</span>
      </div></div>
    );
  }
  if (kind === 'voice') {
    return (
      <div className="hud"><div className="hud-panel">
        <div className="hud-row"><span className="hud-k">Intent detected</span><span className="hud-v ok">98.7%</span></div>
        <div className="hud-row" style={{ marginTop: 7 }}>
          <span className="hud-v">“schedule delivery”</span>
          <span className="hud-wave">{[0,1,2,3,4,5,6,7,8].map((n) => <i key={n} style={{ animationDelay: `${n * 0.09}s` }} />)}</span>
        </div>
      </div></div>
    );
  }
  if (kind === 'payments') {
    return (
      <div className="hud"><div className="hud-panel">
        <div className="hud-row"><span className="hud-k">Autonomous pay</span><span className="hud-v"><span className="s2">0.05 ETH</span></span></div>
        <div className="hud-row" style={{ marginTop: 7 }}>
          <span className="hud-v ok">within limits ✓</span>
          <span className="hud-bars">{[40,70,30,90,55,80].map((h, n) => <i key={n} style={{ height: `${h}%` }} />)}</span>
        </div>
      </div></div>
    );
  }
  if (kind === 'attest') {
    return (
      <div className="hud"><div className="hud-panel hud-spec">
        <div className="hud-row" style={{ marginBottom: 3 }}><span className="hud-k">Capability spec</span><span className="hud-v ok">attested ✓</span></div>
        <div className="sr"><span className="ck"><Check size={11} /></span> Payload 15kg · Zone A</div>
        <div className="sr"><span className="ck"><Check size={11} /></span> Human-interaction certified</div>
      </div></div>
    );
  }
  return (
    <div className="hud"><div className="hud-panel hud-spec">
      <div className="hud-row" style={{ marginBottom: 3 }}><span className="hud-k">Firmware verified</span><span className="hud-v ok">v3.2.1 ✓</span></div>
      <div className="sr"><span className="ck"><Check size={11} /></span> Signature valid · downgrade rejected</div>
      <div className="sr"><span className="ck"><Check size={11} /></span> On-chain version matched</div>
    </div></div>
  );
}

function Modules() {
  return (
    <section className="section blueprint" id="modules">
      <div className="wrap">
        <SecHead num="§ 03" tag="The five modules" h="Five modules. One key.">
          Narrow by design. No battery passports, charging registries, V2G, or carbon credits — just
          what a robot needs to be a first-class, verifiable on-chain citizen.
        </SecHead>
        <div className="modules">
          {MODULES.map((m, i) => (
            <Reveal as="div" className="mod" key={m.n} delay={i * 70}>
              <div className="mod-vis">
                <img src={m.img} alt={`${m.t} — robot module`} loading="lazy" />
                <span className="mod-num">{m.n}</span>
                <span className="mod-ico"><m.Ico /></span>
                <ModuleHud kind={m.hud} />
              </div>
              <div className="mod-body">
                <h3>{m.t}</h3>
                <p>{m.d}</p>
                <div className="mod-gets"><span className="ar"><Arrow size={13} /></span><span>{m.gets}</span></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- §04 STEPS ---- */
function Steps() {
  const steps: [string, string, ReactNode][] = [
    ['01', 'Subscribe in USDC', <span key="1">Connect a wallet, reserve your namespace, approve USDC, call <code>subscribe(tier)</code>. The on-chain event issues your API key and provisions the <code>&lt;oem&gt;.robot-id.eth</code> namespace you chose at checkout.</span>],
    ['02', 'Pre-authorize a batch', <span key="2">Submit up to <b>100,000 serials</b> off-chain. The API builds a Merkle tree; you commit one root via <code>submitRoot</code>. One tx authorizes your whole run.</span>],
    ['03', 'Units claim identity', <span key="3">Each robot calls <code>claimWithProof(…)</code> to mint its NFT — soulbound or transferable, your choice. No per-unit fee; gas only.</span>],
    ['04', 'Attest & secure', <span key="4">Sign capability attestations (payload, zone, certs) and register your firmware-signing key. Set each AgentWallet’s spend rules once.</span>],
    ['05', 'Resolve & operate', <span key="5"><code>&lt;serial&gt;.&lt;oem&gt;.robot-id.eth</code> resolves to the current owner via CCIP-Read. Robots route intents and payments — under the limits you set.</span>],
  ];
  return (
    <section className="section blueprint" id="how">
      <div className="wrap">
        <SecHead num="§ 04" tag="Integration" h="How an OEM integrates.">
          From subscription to a fully-identified fleet in five steps. Every write is returned as an
          unsigned transaction you sign with your own wallet or multisig — the protocol never holds your keys.
        </SecHead>
        <Reveal as="div" className="scale-callout">
          <span>1 unit</span>
          <span className="bar" />
          <b>up to 100,000 serials → one Merkle root → one transaction</b>
          <span className="bar" />
          <span>no per-unit fee · gas only</span>
        </Reveal>
        <div className="steps">
          {steps.map(([n, h, body], i) => (
            <Reveal as="div" className="step" key={n} delay={i * 70}>
              <div className="sn">{n}</div>
              <h4>{h}</h4>
              <p>{body}</p>
              {i < steps.length - 1 && <span className="arrow"><Arrow size={16} /></span>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- §06 DEVELOPER ---- */
function Developer() {
  return (
    <section className="section blueprint" id="developers">
      <div className="wrap">
        <SecHead num="§ 06" tag="Developers" h="Built for robotics developers.">
          A REST + GraphQL + WebSocket API, an OpenAPI spec with Swagger UI, and typed SDKs. Reads go
          straight to chain via viem + Alchemy — no caching layer between you and the truth.
        </SecHead>
        <div className="dev-grid">
          <Reveal as="div" className="codeblock">
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
          </Reveal>
          <Reveal as="div" className="endpoints" delay={90}>
            {ENDPOINTS.map(([m, p, d]) => (
              <div className="ep" key={p}>
                <div className={`m ${m === 'POST' ? 'post' : ''}`}>{m}</div>
                <div><div className="p">{p}</div><div className="d">{d}</div></div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---- §07 ENS ---- */
function Ens() {
  return (
    <section className="section blueprint" id="ens">
      <div className="wrap">
        <SecHead num="§ 07" tag="ENS naming" h="Every robot, a name.">
          You pick your OEM namespace at checkout; on a paid subscription it’s provisioned under{' '}
          <span className="mono">robot-id.eth</span> via ENS NameWrapper. Units resolve through a CCIP-Read
          gateway that reads <span className="mono">ownerOf</span>{' '}
          live — so a name always points to the robot’s current holder, even after resale, with zero gas per transfer.
        </SecHead>
        <div className="ens-grid">
          <Reveal as="div" className="tree-card">
            <div className="tnode">
              <span className="dat"><span className="sig">robot-id.eth</span></span>
              <span className="note">← protocol root (treasury)</span>
            </div>
            <div className="tnode ind1">
              <span className="branch">└─</span>
              <span className="dat">boston-dynamics.<span className="sig">robot-id.eth</span></span>
              <span className="note">← OEM namespace · you choose it at checkout</span>
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
              <span className="pillr"><Arrow size={13} /> resolves via CCIP-Read → <b style={{ color: 'var(--fg)' }}>0x7a3f…c21d</b> (current NFT holder)</span>
            </div>
            <div className="tree-other">
              <span><span className="sig">unitree</span>.robot-id.eth</span>
              <span><span className="sig">figure</span>.robot-id.eth</span>
              <span><span className="sig">agility</span>.robot-id.eth</span>
            </div>
          </Reveal>
          <Reveal as="div" className="ens-photo" delay={90}>
            <img src="/assets/industrial-robot.jpg" alt="Industrial quadruped resolving its on-chain name" loading="lazy" />
            <div className="cap">
              <span className="qr"><Datamatrix seed="XR-47B-WAREHOUSE" n={12} /></span>
              <div>
                <div className="t1">Resolved on-chain</div>
                <div className="t2"><b>xr-47b</b>.robot-id.eth</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---- §08 CONTRACTS ---- */
function Contracts() {
  return (
    <section className="section blueprint" id="contracts">
      <div className="wrap">
        <SecHead num="§ 08" tag="Live contracts" h="Live, source-verified contracts.">
          Six contracts on Ethereum mainnet, each verified on Etherscan. 53 tests cover every
          state-changing path, plus a forked-mainnet integration suite that exercises the real USDC
          token — because we launch on mainnet, not a testnet.
        </SecHead>
        <Reveal as="div" className="verify-bar">
          <span className="vbadge"><span className="led led-ok" /> <b>Source-verified</b> on mainnet</span>
          <span className="vbadge"><b>53</b> tests passing</span>
          <span className="vbadge">Forked-mainnet USDC suite</span>
        </Reveal>
        <Reveal as="table" className="ctable" delay={80}>
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
        </Reveal>
      </div>
    </section>
  );
}

/* ---- §09 COMPLIANCE & STANDARDS ---- */
function Compliance() {
  const cards = [
    { Ico: IcAudit, h: 'Immutable audit trail',
      p: 'Every AI or voice command and every autonomous payment is written append-only through IntentRouter — executed or rejected, each with a reason and a timestamp. The record can’t be edited after the fact, so incident review, dispute resolution, and operational audits run against tamper-proof evidence instead of logs a vendor could quietly rewrite.',
      maps: <>Powered by <b>IntentRouter</b> · append-only on-chain event log</> },
    { Ico: IcReg, h: 'Verifiable safety attestations',
      p: 'OEM-signed capability records — payload, operating zone, max speed, human-interaction rating — are anchored on-chain by a Merkle root, with full certificates on IPFS. Insurers, regulators, and buyers verify that a robot meets a declared spec without having to trust the manufacturer’s word.',
      maps: <>Powered by <b>CapabilityRegistry</b> · supports machinery-safety & conformity documentation</> },
    { Ico: IcFirmware, h: 'Firmware & supply-chain integrity',
      p: 'Updates pass an ECDSA + Merkle gate that checks the manufacturer signature and rejects downgrades and replays, while each unit’s firmware version is recorded on-chain. That establishes a provable chain of custody for the software running across a deployed fleet.',
      maps: <>Powered by <b>OTAVerifier</b> · aligns with connected-product cyber-resilience expectations</> },
    { Ico: IcLock, h: 'Privacy & data-minimization by design',
      p: 'Serial numbers are stored as a privacy-preserving keccak256 hash rather than in the clear — independently verifiable, yet no raw serial or personal data is published. Reads go straight to chain and writes return unsigned transactions; the protocol never custodies your keys or funds.',
      maps: <>Data minimization · GDPR-aligned hashing · non-custodial by default</> },
  ];
  const standards = [
    'ERC-721', 'ERC-5192', 'ERC-2981', 'ERC-4337',
    'ENS · ENSIP-10', 'EIP-3668 (CCIP-Read)', 'ROS 2',
    'ISO 10218 / ISO-TS 15066', 'EU Machinery Reg. 2023/1230', 'EU Cyber Resilience Act', 'GDPR',
  ];
  return (
    <section className="section blueprint" id="compliance">
      <div className="wrap">
        <SecHead num="§ 09" tag="Compliance & standards" h="Built for compliance and audit.">
          Robot ID turns identity, capability, and firmware into independently verifiable on-chain
          evidence — the paper trail insurers, regulators, and safety auditors already ask for, made
          tamper-proof. It’s built on open, industry-standard token, naming, and resolution rails so
          you’re never locked into a proprietary registry.
        </SecHead>
        <div className="comply">
          {cards.map((c, i) => (
            <Reveal as="div" className="ccard" key={c.h} delay={i * 80}>
              <span className="ico"><c.Ico /></span>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
              <div className="maps">{c.maps}</div>
            </Reveal>
          ))}
        </div>
        <Reveal as="div" className="standards-bar" delay={120}>
          {standards.map((s) => (
            <span className="std" key={s}><span className="led" />{s}</span>
          ))}
        </Reveal>
        <Reveal as="p" className="comply-note" delay={160}>
          Robot ID provides the verifiable infrastructure — audit trails, attestations, and firmware
          proofs — that strengthens your own compliance program; it does not by itself certify
          regulatory conformity, and responsibility for meeting any specific regulation remains with the
          operator. See our <a href="/terms">Terms &amp; Conditions</a> and{' '}
          <a href="/privacy">Privacy Policy</a> for details.
        </Reveal>
      </div>
    </section>
  );
}

/* ---- §10 PRICING ---- */
function Pricing() {
  return (
    <section className="section blueprint" id="pricing">
      <div className="wrap">
        <SecHead num="§ 10" tag="Pricing" h="On-chain USDC subscriptions.">
          No registration fees — minting a unit costs gas only. Revenue is the subscription alone, paid
          in USDC and settled on-chain. Subscribing issues your API key and provisions the{' '}
          <span className="mono">&lt;oem&gt;.robot-id.eth</span> namespace you pick at checkout.
        </SecHead>
        <Reveal as="div" className="connect-row">
          <a href="/subscribe" className="btn btn-primary">Connect wallet · subscribe <Arrow /></a>
          <span className="connect-note">↳ connect, approve USDC, and subscribe on the key page</span>
        </Reveal>
        <div className="pricing">
          {TIERS.map((t, i) => (
            <Reveal as="div" className={`tier${t.featured ? ' featured' : ''}`} key={t.idx} delay={i * 90}>
              {t.featured && <span className="badge">Recommended</span>}
              <div className="tn">{t.name}</div>
              <div className="price">${t.priceUsd.toLocaleString()}<span> / mo</span></div>
              <dl className="specs">
                {t.specs.map((s) => (
                  <div className="spec" key={s.k}>
                    <dt>{s.k}</dt>
                    <dd>{s.v}</dd>
                  </div>
                ))}
              </dl>
              <a href={`/subscribe?tier=${t.idx}`} className={`btn ${t.featured ? 'btn-primary' : 'btn-ghost-d'}`}>
                Subscribe in USDC
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- CLOSING ---- */
function Closing() {
  return (
    <section className="section closing blueprint">
      <div className="glowfield" aria-hidden="true" />
      <div className="wrap">
        <Reveal as="h2">Give your robots an identity that outlives your database.</Reveal>
        <Reveal as="p" className="sec-lede" delay={80}>Integrate once. Identify every unit you’ve ever made. Keep full control.</Reveal>
        <Reveal as="div" className="hero-cta" delay={140}>
          <a href="/subscribe" className="btn btn-primary">Get an API key <Arrow /></a>
          <a href="/docs" className="btn btn-ghost-d">Read the docs</a>
        </Reveal>
      </div>
    </section>
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
      <Compliance />
      <Pricing />
      <Closing />
      <SiteFooter />
    </>
  );
}
