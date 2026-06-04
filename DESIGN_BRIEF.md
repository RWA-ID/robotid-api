# Claude Design brief — robot-id.eth landing page redesign

> Paste everything below the line into Claude Design as the redesign prompt.
> Target audience: **robotics OEMs & manufacturers** (plus fleet operators, insurers, regulators).

---

## PROMPT FOR CLAUDE DESIGN

**Redesign the landing page for `robot-id.eth` — the neutral ENS protocol layer that gives every
robot a permanent, programmable on-chain identity.** The current page reads like a generic crypto
landing; it needs to look like **serious robotics infrastructure** built for hardware manufacturers.

### Who we're selling to
Primary: **robotics OEMs and manufacturers** — companies like Boston Dynamics, Unitree, Figure, and
Agility that ship physical robots and need a way to give each unit a verifiable identity, capability
record, firmware policy, and autonomous-payment wallet. Secondary: fleet operators, insurers, and
regulators who need to verify a robot's identity and certifications without trusting the
manufacturer.

These are **enterprise hardware buyers and engineering leaders**, not retail crypto users. The design
must feel **engineered, precise, industrial, and trustworthy** — credible enough to put in front of a
VP of Engineering at a robotics company. Downplay "crypto" aesthetics; emphasize **infrastructure,
verifiability, and scale**.

### Brand positioning (the one-liner)
> *One API for every robot on Earth.* Identity · AI/voice intent · autonomous payments · capability
> attestation · firmware verification — integrate once, keep full UX control.

### Desired aesthetic direction
Lean **industrial / technical / precision-engineering**, with a robotics control-system feel. Think:
- **Blueprint / schematic** motifs — technical line drawings, dimension callouts, exploded diagrams.
- **Telemetry / HUD** elements — sensor readouts, status LEDs, monospace data tables, live counters,
  ROS2 node graphs, joint/actuator schematics.
- **Spec-sheet precision** — datasheet-style typography, mono labels, `§` section numbering, fine
  hairline rules, generous grid.
- **Hardware identity cues** — serial-number tags, QR/datamatrix codes, laser-etched plate textures,
  unit ID badges (`SN-A1B2C3.boston-dynamics.robot-id.eth`).
- Optional: subtle **isometric robot silhouettes** (a quadruped, a humanoid, an AMR/warehouse robot)
  used as quiet supporting visuals, not cartoons.

**Palette:** keep it restrained and machined. A graphite/steel base (charcoal, gunmetal, cool grey),
clean off-white/paper for light sections, and **one precise signal accent** (e.g. a robotics
amber/safety-yellow, or an instrument cyan/electric blue) used sparingly for status, CTAs, and data
highlights. Avoid purple/neon "web3" gradients. A dark "control-room" hero with light spec-sheet
sections below would work well — but you choose the strongest execution.

**Typography:** a precise grotesk/technical sans for headings (Geist, Söhne, or similar) paired with a
monospace (Geist Mono / IBM Plex Mono) for data, labels, addresses, and code. Monospace should carry
the "machine-readable" feel.

**Tone of voice:** confident, technical, infrastructural. "Ship trust, not just hardware." Avoid hype.

### Required sections (keep all content; restructure/elevate as you see fit)
1. **Hero** — headline "One API for every robot on Earth," the sub-positioning, primary CTA
   *"Subscribe · get an API key"*, secondary *"Read the docs"* and *"View source"*. Include a
   **live stats ribbon** (robots on-chain, verified contracts, subscription tiers) — these read from
   chain, so treat them as live telemetry.
2. **Why it exists** — a robot's identity is trapped in a private database; robot-id.eth makes it
   neutral, portable, verifiable. Three audience cards: **For OEMs**, **For operators & fleets**,
   **For insurers & regulators**.
3. **Architecture / protocol stack** — a 3-layer diagram (L3 OEM apps · L2 robot-id.eth protocol ·
   L1 Ethereum + ENS). The current page uses a concentric-rings diagram; a cleaner schematic or
   exploded stack would be stronger. "Infrastructure, not an app."
4. **The five modules** — Robot Identity · AI/Voice Intent · Autonomous Payments · Capability
   Attestation · Firmware Verification. Each with a short technical description and a "→ what the OEM
   gets" line. These are the core; give them weight (icons should be technical/schematic, not generic).
5. **How an OEM integrates** — a 5-step flow: Subscribe in USDC → Pre-authorize a batch (up to
   **100,000 serials** → one Merkle root) → Units claim their identity → Attest & secure → Resolve &
   operate. Emphasize the 100k-unit scale and "no per-unit fee, gas only."
6. **ROS2 intent demo** — a terminal/HUD-style live audit log showing `IntentRouter` entries
   (EXECUTED / REJECTED with reasons). This is a signature visual; make it feel like a real robotics
   control console.
7. **Developer / API** — a code sample (the `@robot-id/intent-sdk` ROS2 snippet) beside an endpoint
   list. Datasheet/IDE styling.
8. **ENS naming** — the subname tree (`sn-a1b2c3.boston-dynamics.robot-id.eth` → resolves to current
   NFT holder). Show it as a clean hierarchy / wiring diagram.
9. **Live contracts** — a table of the 6 mainnet contracts with Etherscan links (addresses are real
   and must stay accurate). Frame as "source-verified on mainnet, 53 tests passing."
10. **Pricing** — three on-chain USDC tiers ($1,999 / $3,999 / $9,999 per month) with the
    Reown-AppKit connect + subscribe flow. Make the middle (OEM) tier the hero.
11. **Closing CTA + footer** — "Give your robots an identity that outlives your database." Footer:
    *Built on Ethereum · Powered by ENS · MIT Licensed · Crypto-native · No fiat rails.*

### Hard technical constraints (must hold for the build to keep working)
- **Next.js 14 App Router, static export** (`output: 'export'`). No server components doing data
  fetching at request time; all interactivity is client-side.
- **Keep these functional pieces working** (they're wired to live mainnet + the API):
  - The **Reown AppKit** connect button (`<appkit-button />`) and the `/subscribe` USDC flow.
  - The **live contracts table** and **live stats ribbon** (read on-chain via viem).
  - Links to `/docs` and `/subscribe` and the GitHub repo.
- **Accessibility / contrast:** ensure all button and badge text meets WCAG AA. (A prior bug had
  dark text on a dark button due to CSS specificity — please verify every CTA's contrast.)
- **Fully responsive:** stack the audience cards, modules, steps, and pricing on mobile.
- Keep contract **addresses and copy factually accurate** — do not invent metrics or features beyond
  the five modules.

### Deliverable
A redesigned landing page (and matching nav + footer, plus consistent styling that can extend to
`/subscribe` and `/docs`). Provide the design as production-ready React/TSX + CSS that drops into the
existing `frontend/app/` Next.js project, reusing the live data hooks (`LiveRibbon`, `ConnectButton`,
the `TIERS`/`CONTRACTS` config). Prioritize a look that a robotics manufacturer would trust with
their entire product line.

---

### Reference: current live page
https://robotid-api-api.vercel.app — the content is correct; the **visual design** is what needs to
become unmistakably "robotics identity protocol."
