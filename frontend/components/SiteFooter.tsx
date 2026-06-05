/** Shared site footer. Used on the landing page and every standalone page
 *  (/contact, /privacy, /terms, …) so legal + contact links live in one place. */
export function SiteFooter() {
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
        <nav className="foot-links" aria-label="Footer">
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
        <div className="foot-right">
          <a className="x-link" href="https://x.com/robotidtech" target="_blank" rel="noreferrer" aria-label="robot-id.eth on X (@robotidtech)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            @robotidtech
          </a>
          <span className="brand-f">Robot&nbsp;<b>ID</b></span>
        </div>
      </div>
    </footer>
  );
}
