import { namehash, labelhash } from 'viem/ens';
import { config } from './config.js';

/**
 * Normalize a unit/OEM slug: lowercase, dash-separated, strip illegal chars.
 * Prevents identity squatting per §4 (slugs must be normalized).
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** mfr.robot-id.eth */
export function oemName(mfrSlug: string): string {
  return `${normalizeSlug(mfrSlug)}.${config.ensParent}`;
}

/** SN-X.mfr.robot-id.eth */
export function unitName(serialSlug: string, mfrSlug: string): string {
  return `${normalizeSlug(serialSlug)}.${oemName(mfrSlug)}`;
}

export function nodeOf(name: string): `0x${string}` {
  return namehash(name);
}

export function labelOf(label: string): `0x${string}` {
  return labelhash(normalizeSlug(label));
}
