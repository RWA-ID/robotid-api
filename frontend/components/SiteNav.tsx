import { BrandMark } from './Schematics';

const REPO = 'https://github.com/RWA-ID/robotid-api';

/** Shared sticky control-room nav. Used on the landing hero, /subscribe, /docs. */
export function SiteNav() {
  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="/" className="brand">
          <span className="mark"><BrandMark /></span>
          <span className="txt">Robot&nbsp;<b>ID</b></span>
        </a>
        <div className="nav-links">
          <a href="/#why">Why</a>
          <a href="/#protocol">Protocol</a>
          <a href="/#modules">Modules</a>
          <a href="/docs">Docs</a>
          <a href="/#contracts">Contracts</a>
          <a href="/#pricing">Pricing</a>
          <a href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="/subscribe" className="btn btn-primary nav-cta">Get a key</a>
        </div>
        <button className="nav-burger" aria-label="Menu">≡</button>
      </div>
    </nav>
  );
}
