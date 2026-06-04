'use client';

import { useState } from 'react';
import { BrandMark } from './Schematics';

const REPO = 'https://github.com/RWA-ID/robotid-api';

const LINKS: [string, string][] = [
  ['/#why', 'Why'],
  ['/#protocol', 'Protocol'],
  ['/#modules', 'Modules'],
  ['/docs', 'Docs'],
  ['/#contracts', 'Contracts'],
  ['/#pricing', 'Pricing'],
];

/** Shared sticky control-room nav. Used on the landing hero, /subscribe, /docs.
 *  Below 720px the inline links collapse into a burger-toggled dropdown. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="nav">
      <div className="wrap nav-inner">
        <a href="/" className="brand">
          <span className="mark"><BrandMark /></span>
          <span className="txt">Robot&nbsp;<b>ID</b></span>
        </a>
        <div className="nav-links">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href="/subscribe" className="btn btn-primary nav-cta">Get a key</a>
        </div>
        <button
          className="nav-burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '≡'}
        </button>
      </div>
      {open && (
        <div className="nav-mobile">
          <div className="wrap nav-mobile-inner">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} onClick={close}>{label}</a>
            ))}
            <a href={REPO} target="_blank" rel="noreferrer" onClick={close}>GitHub ↗</a>
            <a href="/subscribe" className="btn btn-primary" onClick={close}>Get a key</a>
          </div>
        </div>
      )}
    </nav>
  );
}
