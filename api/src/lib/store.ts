import { randomBytes } from 'node:crypto';
import type { Hex } from 'viem';
import type { TierName } from './contracts.js';
import type { BatchUnit } from './merkle.js';

// In-memory store. Swap for Postgres/Redis on Railway for multi-instance.
// Single-process is fine for the reference deployment.

export interface ApiKeyRecord {
  key: string;
  subscriber: Hex;
  tier: TierName;
  createdAt: number;
  requestCount: number;
}

export interface BatchRecord {
  batchId: Hex;
  oem: Hex;
  root: Hex;
  manufacturer: string;
  model: string;
  capabilityClass: string;
  units: BatchUnit[];
  serials: string[]; // original serial strings (for proof-by-serial lookup)
  createdAt: number;
  rootCommitted: boolean;
}

class Store {
  private keysByKey = new Map<string, ApiKeyRecord>();
  private keysBySubscriber = new Map<string, ApiKeyRecord>();
  private batches = new Map<string, BatchRecord>();
  private slugBySubscriber = new Map<string, string>(); // subscriber(lc) → chosen slug
  private subscriberBySlug = new Map<string, string>(); // slug → subscriber(lc), first-come

  issueKey(subscriber: Hex, tier: TierName): ApiKeyRecord {
    const existing = this.keysBySubscriber.get(subscriber.toLowerCase());
    if (existing) {
      existing.tier = tier; // refresh tier on renewal
      return existing;
    }
    const key = `rid_${randomBytes(24).toString('hex')}`;
    const rec: ApiKeyRecord = { key, subscriber, tier, createdAt: Date.now(), requestCount: 0 };
    this.keysByKey.set(key, rec);
    this.keysBySubscriber.set(subscriber.toLowerCase(), rec);
    return rec;
  }

  getKey(key: string): ApiKeyRecord | undefined {
    return this.keysByKey.get(key);
  }

  getKeyBySubscriber(addr: Hex): ApiKeyRecord | undefined {
    return this.keysBySubscriber.get(addr.toLowerCase());
  }

  saveBatch(rec: BatchRecord): void {
    this.batches.set(rec.batchId.toLowerCase(), rec);
  }

  getBatch(batchId: string): BatchRecord | undefined {
    return this.batches.get(batchId.toLowerCase());
  }

  /** Who (if anyone) holds this slug. */
  subscriberForSlug(slug: string): Hex | undefined {
    return this.subscriberBySlug.get(slug) as Hex | undefined;
  }

  /** The slug a subscriber has reserved, if any. */
  slugForSubscriber(addr: Hex): string | undefined {
    return this.slugBySubscriber.get(addr.toLowerCase());
  }

  /**
   * Reserve `slug` for `subscriber` (first-come). Idempotent if the same
   * subscriber re-reserves the same slug. Re-pointing a subscriber to a new
   * slug frees the old one. Returns false if another subscriber holds it.
   */
  reserveSlug(subscriber: Hex, slug: string): boolean {
    const lc = subscriber.toLowerCase();
    const holder = this.subscriberBySlug.get(slug);
    if (holder && holder !== lc) return false; // taken by someone else
    const prev = this.slugBySubscriber.get(lc);
    if (prev && prev !== slug) this.subscriberBySlug.delete(prev); // release old
    this.slugBySubscriber.set(lc, slug);
    this.subscriberBySlug.set(slug, lc);
    return true;
  }
}

export const store = new Store();
