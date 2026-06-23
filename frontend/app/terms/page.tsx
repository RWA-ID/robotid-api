import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Terms & Conditions' };

const UPDATED = 'June 4, 2026';

export default function Terms() {
  return (
    <>
      <main>
        <SiteNav />
        <div className="wrap">
          <div className="doc">
            <nav>
              <div className="grp">Terms &amp; Conditions</div>
              <a href="#acceptance">Acceptance</a>
              <a href="#service">The Service</a>
              <a href="#eligibility">Eligibility</a>
              <a href="#accounts">Wallets &amp; API keys</a>
              <a href="#payments">Subscriptions &amp; payments</a>
              <a href="#use">Acceptable use</a>
              <a href="#blockchain">Blockchain disclaimer</a>
              <a href="#compliance">Compliance &amp; standards</a>
              <a href="#ip">Intellectual property</a>
              <a href="#thirdparty">Third-party services</a>
              <a href="#warranty">No warranty</a>
              <a href="#liability">Liability</a>
              <a href="#indemnity">Indemnification</a>
              <a href="#termination">Termination</a>
              <a href="#changes">Changes</a>
              <a href="#law">Governing law</a>
              <a href="#contact">Contact</a>
            </nav>

            <article>
              <h2 id="acceptance">Terms &amp; Conditions</h2>
              <p><b>Last updated: {UPDATED}.</b> These Terms govern your access to and use of
                <b> robotid.tech</b>, the Robot&nbsp;ID APIs, SDKs, smart contracts, and related
                services (the &ldquo;Service&rdquo;), operated by Robot&nbsp;ID Tech
                (&ldquo;Robot&nbsp;ID&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By accessing or using the Service you
                agree to these Terms. If you do not agree, do not use the Service.</p>

              <h2 id="service">The Service</h2>
              <p>Robot&nbsp;ID is neutral, open infrastructure that gives robots a permanent,
                programmable identity on Ethereum via ENS, plus modules for AI/voice intent,
                autonomous payments, capability attestation, and firmware verification. Reads go
                straight to chain; writes return <b>unsigned transactions</b> that you sign with your
                own wallet or multisig. You remain in control of your keys, your funds, and your
                on-chain actions at all times.</p>

              <h2 id="eligibility">Eligibility</h2>
              <p>You must be at least 18 years old and able to form a binding contract. If you use the
                Service on behalf of an organization, you represent that you are authorized to bind that
                organization to these Terms. You are responsible for complying with all laws,
                sanctions, and regulations that apply to you.</p>

              <h2 id="accounts">Wallets &amp; API keys</h2>
              <p>Access is gated by an active on-chain subscription and authenticated by wallet
                signature (SIWE). You are solely responsible for securing your wallet, private keys, and
                any API key issued to you, and for all activity under your key. Keys are for your own
                integration; do not resell, share, or expose them publicly. We may rotate or revoke a
                key if we reasonably believe it has been compromised or misused.</p>

              <h2 id="payments">Subscriptions &amp; payments</h2>
              <p>Subscriptions are paid in USDC directly on-chain at the tier and price displayed at
                checkout. Because payments settle on a public blockchain, they are <b>final and
                generally irreversible</b>, and fees are <b>non-refundable</b> except where required by
                law. Your access continues for the paid period and ends when the subscription expires;
                an expired subscription returns <code>402 Payment Required</code>. We may change tiers,
                limits, and pricing prospectively — changes do not affect a period you have already paid
                for. You are responsible for gas and any taxes that apply to you.</p>

              <h2 id="use">Acceptable use</h2>
              <p>You agree not to: use the Service unlawfully or to register identities you have no
                right to; infringe others&rsquo; intellectual property or impersonate any manufacturer or
                brand; attempt to disrupt, overload, reverse-engineer the hosted Service, or circumvent
                rate limits or access controls; submit false or misleading attestations or firmware
                records; or use the Service to facilitate fraud, sanctioned transactions, or other
                illegal activity. We may suspend access for violations.</p>

              <h2 id="blockchain">Blockchain &amp; protocol disclaimer</h2>
              <p>The Service interacts with public blockchains, ENS, and other protocols we do not own
                or control. Transactions are <b>immutable and irreversible</b>; we cannot reverse,
                cancel, or recover them, nor can we recover lost keys or funds. Network congestion,
                forks, gas spikes, smart-contract bugs, and third-party outages may affect availability
                and outcomes. You understand and accept these inherent risks of using on-chain
                infrastructure.</p>

              <h2 id="compliance">Compliance &amp; standards</h2>
              <p>Robot&nbsp;ID is built on open, industry-standard rails — <b>ERC-721, ERC-5192,
                ERC-2981, and ERC-4337</b> tokens and accounts, <b>ENS</b> naming with
                <b> ENSIP-10</b> wildcard resolution over <b>EIP-3668 (CCIP-Read)</b>, and a
                <b> ROS&nbsp;2</b> intent adapter — so there is no proprietary lock-in. The Service is
                designed to <b>strengthen your compliance program</b>: the immutable IntentRouter audit
                log, OEM-signed capability attestations, and firmware-signature verification produce
                independently verifiable evidence that can support machinery-safety documentation,
                cyber-resilience requirements for connected products, insurance underwriting, and audit.
                These features are <b>tooling, not a certification</b>: Robot&nbsp;ID does not warrant
                that your use satisfies any particular law, standard, or regulation (for example ISO
                10218 / ISO/TS&nbsp;15066, the EU Machinery Regulation 2023/1230, the EU Cyber
                Resilience Act, or the GDPR). You remain solely responsible for determining which
                requirements apply to you, for the accuracy of the attestations and firmware records you
                publish, and for achieving and maintaining conformity.</p>

              <h2 id="ip">Intellectual property</h2>
              <p>The Robot&nbsp;ID open-source code is provided under its published license (MIT) — your
                use of that code is governed by that license. The Robot&nbsp;ID name, logo, and brand
                are ours and may not be used in a way that implies endorsement without permission. You
                retain ownership of the content and data you submit, and grant us the limited rights
                needed to operate the Service.</p>

              <h2 id="thirdparty">Third-party services</h2>
              <p>The Service relies on and links to third parties (e.g. wallet providers, RPC and
                hosting providers, Web3Forms, the Ethereum network, ENS). We are not responsible for
                third-party services, and your use of them is governed by their own terms.</p>

              <h2 id="warranty">Disclaimer of warranties</h2>
              <p>The Service is provided <b>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</b>, without
                warranties of any kind, express or implied, including merchantability, fitness for a
                particular purpose, non-infringement, and uninterrupted or error-free operation. We do
                not warrant that the Service will meet your requirements or that on-chain operations
                will succeed.</p>

              <h2 id="liability">Limitation of liability</h2>
              <p>To the maximum extent permitted by law, Robot&nbsp;ID and its contributors will not be
                liable for any indirect, incidental, special, consequential, or punitive damages, or for
                lost profits, data, funds, or tokens, arising from your use of the Service. Our total
                aggregate liability for any claim will not exceed the greater of the fees you paid us in
                the three months before the claim or US&nbsp;$100.</p>

              <h2 id="indemnity">Indemnification</h2>
              <p>You agree to indemnify and hold harmless Robot&nbsp;ID and its contributors from any
                claims, losses, and expenses (including reasonable legal fees) arising out of your use
                of the Service, your content or on-chain actions, or your violation of these Terms or
                applicable law.</p>

              <h2 id="termination">Termination</h2>
              <p>You may stop using the Service at any time. We may suspend or terminate access if you
                breach these Terms, if required by law, or to protect the Service or other users.
                Provisions that by their nature should survive termination (e.g. payment, disclaimers,
                liability, indemnity) will survive.</p>

              <h2 id="changes">Changes to these Terms</h2>
              <p>We may update these Terms from time to time. When we do, we will revise the
                &ldquo;Last updated&rdquo; date above. Continued use of the Service after a change means
                you accept the revised Terms.</p>

              <h2 id="law">Governing law &amp; disputes</h2>
              <p>These Terms are governed by applicable law without regard to conflict-of-laws rules,
                and any dispute will be resolved in the competent courts of our place of operation,
                unless mandatory local law provides otherwise. If any provision is found unenforceable,
                the rest remains in effect.</p>

              <h2 id="contact">Contact</h2>
              <p>Questions about these Terms? Reach us through the <a href="/contact">contact form</a> or
                at <a href="https://x.com/robotidtech" target="_blank" rel="noreferrer">@robotidtech</a>.</p>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
