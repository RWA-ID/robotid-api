import { type Hex, bytesToString, hexToBytes } from 'viem';

/** Decode a DNS-wire-format ENS name (as passed to resolve(bytes,bytes)). */
export function decodeDnsName(dnsHex: Hex): string {
  const bytes = hexToBytes(dnsHex);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i];
    if (len === 0) break;
    labels.push(bytesToString(bytes.slice(i + 1, i + 1 + len)));
    i += 1 + len;
  }
  return labels.join('.');
}

/** Normalize a slug: lowercase, dash-separated (anti-squatting, §4). */
export function normalizeSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export interface ParsedUnitName {
  serialSlug: string; // "sn-a1b2c3"
  mfrSlug: string; // "boston-dynamics"
  isUnit: boolean; // SN-X.mfr.robot-id.eth
  isOem: boolean; // mfr.robot-id.eth
}

/** Parse *.robot-id.eth into its unit/OEM parts. */
export function parseName(name: string, parent = 'robot-id.eth'): ParsedUnitName | null {
  const lc = name.toLowerCase();
  if (!lc.endsWith(parent)) return null;
  const sub = lc.slice(0, lc.length - parent.length).replace(/\.$/, '');
  if (!sub) return null; // the parent itself
  const parts = sub.split('.').filter(Boolean);
  if (parts.length === 1) {
    return { serialSlug: '', mfrSlug: parts[0], isUnit: false, isOem: true };
  }
  // SN-X.mfr — serial is the left-most label, mfr is the rest before parent
  const serialSlug = parts[0];
  const mfrSlug = parts.slice(1).join('.');
  return { serialSlug, mfrSlug, isUnit: true, isOem: false };
}
