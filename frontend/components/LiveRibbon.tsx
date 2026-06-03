'use client';

import { useEffect, useRef, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { CONTRACTS } from '@/lib/config';
import { ROBOT_IDENTITY_ABI } from '@/lib/contracts';

/** count-up that triggers when scrolled into view */
function CountUp({ to, dur = 1400, format }: { to: number; dur?: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setV(Math.round(to * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => { if (en.isIntersecting && !started) { started = true; run(); } }),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, dur]);
  return <span ref={ref}>{format ? format(v) : v.toLocaleString()}</span>;
}

export function LiveRibbon() {
  // Real on-chain count only — starts at 0 and reads totalMinted() live.
  const [minted, setMinted] = useState(0);

  useEffect(() => {
    const identity = CONTRACTS.robotIdentity;
    if (!identity || /^0x0+$/.test(identity)) return;
    const client = createPublicClient({ chain: mainnet, transport: http() });
    client
      .readContract({
        address: identity as `0x${string}`,
        abi: ROBOT_IDENTITY_ABI,
        functionName: 'totalMinted',
      })
      .then((n) => setMinted(Number(n)))
      .catch(() => {});
  }, []);

  return (
    <div className="ribbon">
      <div className="cell">
        <div className="tag"><span className="led led-ok" /> LIVE · CHAIN</div>
        <div className="n tnum"><CountUp to={minted} /></div>
        <div className="k">Robots on-chain</div>
      </div>
      <div className="cell">
        <div className="tag">VERIFIED</div>
        <div className="n tnum"><CountUp to={6} /></div>
        <div className="k">Source-verified contracts</div>
      </div>
      <div className="cell">
        <div className="tag">USDC</div>
        <div className="n tnum"><CountUp to={3} /></div>
        <div className="k">Subscription tiers</div>
      </div>
      <div className="cell">
        <div className="tag">SCALE</div>
        <div className="n"><em>∞</em></div>
        <div className="k">OEMs supported</div>
      </div>
    </div>
  );
}
