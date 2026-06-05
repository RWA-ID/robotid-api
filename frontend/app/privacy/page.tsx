import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Privacy Policy' };

const UPDATED = 'June 4, 2026';

export default function Privacy() {
  return (
    <>
      <main>
        <SiteNav />
        <div className="wrap">
          <div className="doc">
            <nav>
              <div className="grp">Privacy Policy</div>
              <a href="#overview">Overview</a>
              <a href="#who">Who we are</a>
              <a href="#collect">What we collect</a>
              <a href="#onchain">On-chain data</a>
              <a href="#use">How we use it</a>
              <a href="#processors">Processors</a>
              <a href="#cookies">Cookies &amp; analytics</a>
              <a href="#sharing">Sharing</a>
              <a href="#retention">Retention</a>
              <a href="#rights">Your rights</a>
              <a href="#security">Security</a>
              <a href="#children">Children</a>
              <a href="#changes">Changes</a>
              <a href="#contact">Contact</a>
            </nav>

            <article>
              <h2 id="overview">Privacy Policy</h2>
              <p><b>Last updated: {UPDATED}.</b> This policy explains what information
                Robot&nbsp;ID Tech (&ldquo;Robot&nbsp;ID&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use
                <b> robotid.tech</b>, our APIs, SDKs, and related services (the &ldquo;Service&rdquo;), and how
                we handle it. Robot&nbsp;ID is neutral, crypto-native infrastructure: much of what the
                Service touches lives on a public blockchain, which changes how privacy works — please
                read <a href="#onchain">On-chain data</a> carefully.</p>

              <h2 id="who">Who we are</h2>
              <p>Robot&nbsp;ID is the neutral ENS protocol layer for robots and autonomous machines.
                For any privacy question, reach us via the <a href="/contact">contact form</a> or on
                X at <a href="https://x.com/robotidtech" target="_blank" rel="noreferrer">@robotidtech</a>.
                For data-protection purposes, Robot&nbsp;ID is the controller of the personal data
                described below.</p>

              <h2 id="collect">Information we collect</h2>
              <ul>
                <li><b>Contact details you submit.</b> When you use the contact form, we receive the
                  name, email address, company, and message you provide. The form is processed by
                  Web3Forms, which delivers your message to our inbox by email.</li>
                <li><b>Wallet &amp; subscription data.</b> When you connect a wallet or subscribe, we
                  process your public wallet address, the tier you selected, transaction hashes, and
                  the API key issued to you. Payments are made in USDC directly on Ethereum — we never
                  receive or store card numbers or bank details.</li>
                <li><b>Technical data.</b> Like most sites and APIs, our hosting and infrastructure
                  providers automatically log IP addresses, request metadata, user-agent strings, and
                  timestamps to operate, secure, and rate-limit the Service.</li>
              </ul>

              <h2 id="onchain">On-chain data is public and permanent</h2>
              <p>The Service writes to and reads from public blockchains (Ethereum) and ENS. Data such
                as wallet addresses, token IDs, serial hashes, capability attestations, subscription
                events, and transactions is <b>public, permanent, and outside our control</b>. We
                cannot edit, delete, or restrict access to information once it is recorded on-chain.
                Serial numbers are stored as a privacy-preserving <code>keccak256</code> hash rather
                than in the clear, but the hash and all associated identity records remain publicly
                visible. Do not put information on-chain that you are not comfortable disclosing
                permanently.</p>

              <h2 id="use">How we use information</h2>
              <ul>
                <li>To respond to your enquiries and provide support.</li>
                <li>To issue and manage API keys, verify active subscriptions, and provision the
                  namespace you reserved.</li>
                <li>To operate, secure, debug, and improve the Service, including abuse prevention and
                  rate limiting.</li>
                <li>To meet legal, accounting, and compliance obligations.</li>
              </ul>
              <p>We rely on your consent (contact form), the performance of our contract with you
                (providing the Service), and our legitimate interests (security and improvement) as the
                bases for processing.</p>

              <h2 id="processors">Third-party processors</h2>
              <p>We share the minimum data necessary with infrastructure providers who process it on
                our behalf, including: <b>Web3Forms</b> (contact-form delivery), our <b>hosting and
                API providers</b> (e.g. Vercel, Railway), <b>RPC/indexing providers</b> (e.g. Alchemy)
                used to read and write chain data, and the public <b>Ethereum network and ENS</b>. Each
                operates under its own terms and privacy policy. We do not sell your personal data.</p>

              <h2 id="cookies">Cookies &amp; analytics</h2>
              <p>The marketing site is intentionally lightweight. We do not use advertising cookies or
                cross-site trackers. Wallet connection and any strictly necessary preferences may use
                local browser storage to function. Where we use privacy-respecting analytics, it is to
                understand aggregate usage, not to identify individuals.</p>

              <h2 id="sharing">When we share information</h2>
              <p>We disclose personal data only: to the processors above; when required by law or valid
                legal process; to protect the rights, safety, and security of Robot&nbsp;ID, our users,
                or the public; or in connection with a merger, acquisition, or asset sale, in which
                case we will notify you of any material change to this policy.</p>

              <h2 id="retention">Data retention</h2>
              <p>We keep contact-form messages and account/subscription records for as long as needed to
                provide the Service and meet legal obligations, then delete or anonymize them. On-chain
                data cannot be deleted by us and persists for the life of the network.</p>

              <h2 id="rights">Your rights</h2>
              <p>Depending on where you live, you may have the right to access, correct, delete, or port
                the personal data we hold, to object to or restrict certain processing, and to withdraw
                consent. Contact us via the <a href="/contact">contact form</a> to exercise these
                rights; we will respond as required by applicable law. Note that rights of erasure
                cannot extend to data already published on a public blockchain.</p>

              <h2 id="security">Security</h2>
              <p>We use reasonable technical and organizational measures to protect personal data. No
                system is perfectly secure, and you are responsible for safeguarding your own wallet,
                private keys, and API keys. We will never ask for your seed phrase or private key.</p>

              <h2 id="children">Children</h2>
              <p>The Service is intended for businesses and adults. It is not directed to children
                under 16, and we do not knowingly collect their personal data.</p>

              <h2 id="changes">Changes to this policy</h2>
              <p>We may update this policy from time to time. When we do, we will revise the
                &ldquo;Last updated&rdquo; date above, and material changes may be announced on the
                site. Continued use of the Service after a change means you accept the revised policy.</p>

              <h2 id="contact">Contact</h2>
              <p>Questions about privacy? Reach us through the <a href="/contact">contact form</a> or
                at <a href="https://x.com/robotidtech" target="_blank" rel="noreferrer">@robotidtech</a>.</p>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
