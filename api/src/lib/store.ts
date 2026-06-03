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
}

export const store = new Store();
