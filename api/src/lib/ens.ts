import { namehash, labelhash } from 'viem/ens';
import { keccak256, toHex, type Hex } from 'viem';
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

/**
 * Slugs that must never be handed to an OEM: protocol/infra labels and obvious
 * impersonation vectors. Compared against the *normalized* slug.
 */
const RESERVED_SLUGS = new Set([
  'robot-id', 'robotid', 'www', 'api', 'app', 'admin', 'root', 'mail', 'ftp',
  'gateway', 'resolver', 'registrar', 'oem', 'mfr', 'manufacturer', 'test',
  'ens', 'eth', 'support', 'help', 'docs', 'status', 'staging', 'internal',
]);

export interface SlugCheck {
  ok: boolean;
  slug: string; // normalized form
  reason?: string;
}

/**
 * Validate an OEM-chosen slug *before* it becomes a real on-chain subname.
 * Enforces normalization round-trip (no silent rewrites), length, and the
 * reserved blocklist. Availability (collision) is checked by the caller against
 * the store, since that is stateful.
 */
export function checkSlug(input: string): SlugCheck {
  const slug = normalizeSlug(input);
  if (!slug) return { ok: false, slug, reason: 'empty after normalization' };
  if (slug !== input.toLowerCase().trim())
    return { ok: false, slug, reason: 'contains characters that would be rewritten; submit the normalized form' };
  if (slug.length < 3) return { ok: false, slug, reason: 'must be at least 3 characters' };
  if (slug.length > 63) return { ok: false, slug, reason: 'must be at most 63 characters (DNS label limit)' };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, slug, reason: 'reserved' };
  return { ok: true, slug };
}

/** mfr.robot-id.eth */
export function oemName(mfrSlug: string): string {
  return `${normalizeSlug(mfrSlug)}.${config.ensParent}`;
}

/** SN-X.mfr.robot-id.eth */
export function unitName(serialSlug: string, mfrSlug: string): string {
  return `${normalizeSlug(serialSlug)}.${oemName(mfrSlug)}`;
}

/**
 * Canonical serial → on-chain serialHash. This MUST hash the *normalized* serial
 * slug, because that is exactly what the CCIP gateway hashes when resolving
 * `<serial>.<mfr>.robot-id.eth` (see ccip-gateway/src/index.ts). Hashing the raw
 * serial here would make every unit name resolve to 0x0. Two raw serials that
 * normalize to the same slug collide into one identity — callers registering
 * batches must reject such collisions before submitting a root.
 */
export function serialHashOf(serial: string): Hex {
  return keccak256(toHex(normalizeSlug(serial)));
}

export function nodeOf(name: string): `0x${string}` {
  return namehash(name);
}

export function labelOf(label: string): `0x${string}` {
  return labelhash(normalizeSlug(label));
}
