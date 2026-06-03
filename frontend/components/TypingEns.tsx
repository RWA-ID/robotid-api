'use client';

import { useEffect, useState, type ReactNode } from 'react';

// Live-typing ENS resolution for the hero credential. Types the unit name with
// the OEM segment bold, loops, and respects prefers-reduced-motion (full text,
// no animation). SSG-safe: server + first client render both show just the
// cursor (n=0), so there's no hydration mismatch.
const SEGMENTS = [
  { text: 'sn-a1b2c3.', bold: false },
  { text: 'boston-dynamics', bold: true },
  { text: '.robot-id.eth', bold: false },
];
const FLAT = SEGMENTS.flatMap((s) => [...s.text].map((ch) => ({ ch, bold: s.bold })));

export function TypingEns() {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(FLAT.length);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (i <= FLAT.length) {
        setN(i);
        i += 1;
        timer = setTimeout(step, i < 10 ? 70 : 34 + Math.random() * 40);
      } else {
        timer = setTimeout(() => {
          i = 0;
          step();
        }, 4200);
      }
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  // Coalesce consecutive same-weight chars into <b>/<span> runs.
  const nodes: ReactNode[] = [];
  let buf = '';
  let bold = false;
  const flush = (key: number) => {
    if (!buf) return;
    nodes.push(bold ? <b key={key}>{buf}</b> : <span key={key}>{buf}</span>);
    buf = '';
  };
  for (let k = 0; k < n; k++) {
    if (FLAT[k].bold !== bold) {
      flush(k);
      bold = FLAT[k].bold;
    }
    buf += FLAT[k].ch;
  }
  flush(-1);

  return (
    <>
      {nodes}
      <span className="cur" />
    </>
  );
}
