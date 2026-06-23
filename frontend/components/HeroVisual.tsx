'use client';

import { useParallax } from './Reveal';

export function HeroVisual() {
  const robotRef = useParallax(0.05);
  return (
    <div className="hero-visual">
      <img
        ref={robotRef as React.RefObject<HTMLImageElement>}
        className="hero-robot"
        src="/assets/hero-robot.png"
        alt="Robot ID — autonomous unit with a live on-chain identity"
      />
    </div>
  );
}
