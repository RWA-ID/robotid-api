/* SVG line-art: brand mark, datamatrix, technical icons, blueprint robot
   silhouettes. All stroke-based, accent-aware via currentColor / var(--signal). */
import type { CSSProperties } from 'react';

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 2 L27.7 8.5 V23.5 L16 30 L4.3 23.5 V8.5 Z" stroke="var(--signal)" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="3.2" fill="var(--signal)" />
      <path
        d="M16 9.3 V12.8 M16 19.2 V22.7 M9.7 16 H12.8 M19.2 16 H22.3"
        stroke="var(--on-dark-soft)"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** datamatrix: deterministic pseudo-random module grid with finder pattern */
export function Datamatrix({ seed = 'SN-A1B2C3', n = 14 }: { seed?: string; n?: number }) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let on: boolean;
      if (x === 0) on = true;
      else if (y === n - 1) on = true;
      else if (y === 0) on = x % 2 === 0;
      else if (x === n - 1) on = y % 2 === 1;
      else on = rnd() > 0.5;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--signal)" />);
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges">
      {cells}
    </svg>
  );
}

const iconProps = {
  width: 36,
  height: 36,
  viewBox: '0 0 36 36',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IcIdentity() {
  return (
    <svg {...iconProps}>
      <rect x="6" y="4" width="24" height="28" rx="2.5" />
      <path d="M11 11 H25 M11 16 H21" stroke="currentColor" />
      <circle cx="18" cy="24" r="4.5" />
      <path d="M18 21.5 V24 L19.8 25.2" />
    </svg>
  );
}
export function IcVoice() {
  return (
    <svg {...iconProps}>
      <path d="M6 18 H9 M27 18 H30" />
      <path d="M11 13 V23 M15 8 V28 M19 11 V25 M23 15 V21" />
    </svg>
  );
}
export function IcPayments() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="9" width="26" height="18" rx="2.5" />
      <path d="M5 14 H31" />
      <circle cx="24" cy="20.5" r="2.2" fill="currentColor" stroke="none" />
      <path d="M18 4 V9 M11 4 V9 M11 27 V32 M25 27 V32" />
    </svg>
  );
}
export function IcAttest() {
  return (
    <svg {...iconProps}>
      <path d="M18 4 L29 9 V18 C29 25 24 30 18 32 C12 30 7 25 7 18 V9 Z" />
      <path d="M13.5 18 L16.5 21 L23 14" />
    </svg>
  );
}
export function IcFirmware() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="18" height="18" rx="2" />
      <path d="M14 4 V9 M22 4 V9 M14 27 V32 M22 27 V32 M4 14 H9 M4 22 H9 M27 14 H32 M27 22 H32" />
      <path d="M15 18 L17.5 20.5 L22 15" />
    </svg>
  );
}

const aIcoProps = {
  width: 40,
  height: 40,
  viewBox: '0 0 40 40',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IcOem() {
  return (
    <svg {...aIcoProps}>
      <path d="M5 33 V18 L14 23 V18 L23 23 V13 L35 13 V33 Z" />
      <path d="M5 33 H35 M28 19 H31 M28 24 H31 M28 29 H31" />
    </svg>
  );
}
export function IcFleet() {
  return (
    <svg {...aIcoProps}>
      <circle cx="20" cy="9" r="3.2" />
      <circle cx="9" cy="29" r="3.2" />
      <circle cx="31" cy="29" r="3.2" />
      <path d="M18 11.5 L11 26.5 M22 11.5 L29 26.5 M12 29 H28" />
    </svg>
  );
}
export function IcReg() {
  return (
    <svg {...aIcoProps}>
      <path d="M20 4 L33 9 V19 C33 28 27 33 20 36 C13 33 7 28 7 19 V9 Z" />
      <path d="M14 19 L18 23 L26 14" />
    </svg>
  );
}

export function Arrow({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8 H12 M8.5 4 L12.5 8 L8.5 12" />
    </svg>
  );
}
export function Check({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 L6.5 12 L13 4.5" />
    </svg>
  );
}
export function Ext({ size = 12, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6 3 H4 a1 1 0 0 0-1 1 V12 a1 1 0 0 0 1 1 H12 a1 1 0 0 0 1-1 V10 M9 3 H13 V7 M13 3 L7.5 8.5" />
    </svg>
  );
}

export const MODULE_ICONS = { IcIdentity, IcVoice, IcPayments, IcAttest, IcFirmware } as const;
