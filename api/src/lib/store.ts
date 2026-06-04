import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import type { Hex } from 'viem';
import { config } from './config.js';
import type { TierName } from './contracts.js';
import type { BatchUnit } from './merkle.js';

// Persistence layer. Two implementations behind one async interface:
//   • RedisStore  — durable + atomic counters; used when REDIS_URL is set.
//   • MemoryStore — single-process, non-durable; the local-dev fallback.
// Counters (rate/min, monthly quota, lifetime units) are first-class atomic
// operations rather than fields mutated in place, so they stay correct across
// restarts and multiple instances.

/** Static identity of an API key. Volatile counters live outside this record. */
export interface ApiKeyRecord {
  key: string;
  subscriber: Hex;
  tier: TierName;
  createdAt: number;
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

/** Outcome of a namespace reservation attempt. */
export type ReserveResult =
  | { ok: true; slug: string }
  | { ok: false; reason: 'taken' | 'cap' };

export interface RateResult {
  allowed: boolean;
  count: number;
  limit: number;
}
export interface QuotaResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetsAt: number; // ms epoch when the monthly window rolls
}
export interface UnitResult {
  allowed: boolean;
  used: number; // lifetime units after a successful reserve (or current on reject)
  cap: number;
}
export interface Usage {
  requestCount: number;
  unitCount: number;
  namespaceCount: number;
}

export interface Store {
  /** Backend kind + live connectivity, for /health. */
  health(): Promise<{ backend: 'redis' | 'memory'; ok: boolean }>;

  // API keys
  issueKey(subscriber: Hex, tier: TierName): Promise<ApiKeyRecord>;
  getKey(key: string): Promise<ApiKeyRecord | undefined>;
  getKeyBySubscriber(addr: Hex): Promise<ApiKeyRecord | undefined>;

  // metered counters
  hitRate(key: string, limitPerMin: number): Promise<RateResult>;
  consumeRequest(key: string, monthlyCap: number): Promise<QuotaResult>;
  reserveUnits(key: string, n: number, cap: number): Promise<UnitResult>;
  getUsage(rec: ApiKeyRecord): Promise<Usage>;

  // batches
  saveBatch(rec: BatchRecord): Promise<void>;
  getBatch(batchId: string): Promise<BatchRecord | undefined>;

  // namespaces
  subscriberForSlug(slug: string): Promise<Hex | undefined>;
  slugsForSubscriber(addr: Hex): Promise<string[]>;
  slugForSubscriber(addr: Hex): Promise<string | undefined>;
  reserveSlug(subscriber: Hex, slug: string, max: number): Promise<ReserveResult>;
  releaseSlug(subscriber: Hex, slug: string): Promise<boolean>;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60_000;
const newKey = () => `rid_${randomBytes(24).toString('hex')}`;

// ── In-memory implementation ────────────────────────────────────────────────

class MemoryStore implements Store {
  private keysByKey = new Map<string, ApiKeyRecord>();
  private keyBySubscriber = new Map<string, string>(); // subscriber(lc) → apiKey
  private batches = new Map<string, BatchRecord>();
  private slugsBySubscriber = new Map<string, string[]>(); // subscriber(lc) → ordered slugs
  private subscriberBySlug = new Map<string, string>(); // slug → subscriber(lc), first-come
  private rate = new Map<string, { count: number; expiresAt: number }>();
  private reqs = new Map<string, { count: number; expiresAt: number }>();
  private units = new Map<string, number>();

  async health(): Promise<{ backend: 'memory'; ok: boolean }> {
    return { backend: 'memory', ok: true };
  }

  async issueKey(subscriber: Hex, tier: TierName): Promise<ApiKeyRecord> {
    const lc = subscriber.toLowerCase();
    const existingKey = this.keyBySubscriber.get(lc);
    if (existingKey) {
      const rec = this.keysByKey.get(existingKey)!;
      rec.tier = tier; // refresh tier on renewal
      this.reqs.delete(existingKey); // renewal resets the monthly quota window
      // units are lifetime fleet size — intentionally NOT reset.
      return rec;
    }
    const key = newKey();
    const rec: ApiKeyRecord = { key, subscriber, tier, createdAt: Date.now() };
    this.keysByKey.set(key, rec);
    this.keyBySubscriber.set(lc, key);
    return rec;
  }

  async getKey(key: string): Promise<ApiKeyRecord | undefined> {
    return this.keysByKey.get(key);
  }

  async getKeyBySubscriber(addr: Hex): Promise<ApiKeyRecord | undefined> {
    const key = this.keyBySubscriber.get(addr.toLowerCase());
    return key ? this.keysByKey.get(key) : undefined;
  }

  async hitRate(key: string, limitPerMin: number): Promise<RateResult> {
    const now = Date.now();
    let w = this.rate.get(key);
    if (!w || now >= w.expiresAt) w = { count: 0, expiresAt: now + RATE_WINDOW_MS };
    w.count += 1;
    this.rate.set(key, w);
    return { allowed: w.count <= limitPerMin, count: w.count, limit: limitPerMin };
  }

  async consumeRequest(key: string, monthlyCap: number): Promise<QuotaResult> {
    const now = Date.now();
    let w = this.reqs.get(key);
    if (!w || now >= w.expiresAt) w = { count: 0, expiresAt: now + MONTH_MS };
    w.count += 1;
    this.reqs.set(key, w);
    return { allowed: w.count <= monthlyCap, count: w.count, limit: monthlyCap, resetsAt: w.expiresAt };
  }

  async reserveUnits(key: string, n: number, cap: number): Promise<UnitResult> {
    const cur = this.units.get(key) ?? 0;
    const next = cur + n;
    if (next > cap) return { allowed: false, used: cur, cap };
    this.units.set(key, next);
    return { allowed: true, used: next, cap };
  }

  async getUsage(rec: ApiKeyRecord): Promise<Usage> {
    const now = Date.now();
    const w = this.reqs.get(rec.key);
    return {
      requestCount: w && now < w.expiresAt ? w.count : 0,
      unitCount: this.units.get(rec.key) ?? 0,
      namespaceCount: this.slugsBySubscriber.get(rec.subscriber.toLowerCase())?.length ?? 0,
    };
  }

  async saveBatch(rec: BatchRecord): Promise<void> {
    this.batches.set(rec.batchId.toLowerCase(), rec);
  }

  async getBatch(batchId: string): Promise<BatchRecord | undefined> {
    return this.batches.get(batchId.toLowerCase());
  }

  async subscriberForSlug(slug: string): Promise<Hex | undefined> {
    return this.subscriberBySlug.get(slug) as Hex | undefined;
  }

  async slugsForSubscriber(addr: Hex): Promise<string[]> {
    return [...(this.slugsBySubscriber.get(addr.toLowerCase()) ?? [])];
  }

  async slugForSubscriber(addr: Hex): Promise<string | undefined> {
    return this.slugsBySubscriber.get(addr.toLowerCase())?.[0];
  }

  async reserveSlug(subscriber: Hex, slug: string, max: number): Promise<ReserveResult> {
    const lc = subscriber.toLowerCase();
    const holder = this.subscriberBySlug.get(slug);
    if (holder && holder !== lc) return { ok: false, reason: 'taken' };

    const slugs = this.slugsBySubscriber.get(lc) ?? [];
    if (slugs.includes(slug)) return { ok: true, slug }; // idempotent

    if (slugs.length >= max) {
      if (max === 1) {
        for (const prev of slugs) this.subscriberBySlug.delete(prev); // release single old pick
        slugs.length = 0;
      } else {
        return { ok: false, reason: 'cap' };
      }
    }

    slugs.push(slug);
    this.slugsBySubscriber.set(lc, slugs);
    this.subscriberBySlug.set(slug, lc);
    return { ok: true, slug };
  }

  async releaseSlug(subscriber: Hex, slug: string): Promise<boolean> {
    const lc = subscriber.toLowerCase();
    const slugs = this.slugsBySubscriber.get(lc);
    const idx = slugs?.indexOf(slug) ?? -1;
    if (!slugs || idx < 0) return false;
    slugs.splice(idx, 1);
    this.subscriberBySlug.delete(slug);
    if (slugs.length === 0) this.slugsBySubscriber.delete(lc);
    return true;
  }
}

// ── Redis implementation ────────────────────────────────────────────────────

const K = {
  key: (k: string) => `rid:key:${k}`,
  sub2key: (lc: string) => `rid:sub2key:${lc}`,
  reqs: (k: string) => `rid:reqs:${k}`,
  rate: (k: string) => `rid:rate:${k}`,
  units: (k: string) => `rid:units:${k}`,
  batch: (id: string) => `rid:batch:${id}`,
  slug2sub: (s: string) => `rid:slug2sub:${s}`,
  sub2slugs: (lc: string) => `rid:sub2slugs:${lc}`,
};
const SLUG2SUB_PREFIX = 'rid:slug2sub:';
// Lua keeps slug reservation atomic across the ownership key + per-sub list.
const RESERVE_LUA = `
local holder = redis.call('GET', KEYS[1])
if holder and holder ~= ARGV[1] then return {0, 'taken'} end
local items = redis.call('LRANGE', KEYS[2], 0, -1)
for i=1,#items do if items[i] == ARGV[2] then return {1, 'ok'} end end
local max = tonumber(ARGV[3])
if #items >= max then
  if max == 1 then
    for i=1,#items do redis.call('DEL', ARGV[4]..items[i]) end
    redis.call('DEL', KEYS[2])
  else
    return {0, 'cap'}
  end
end
redis.call('RPUSH', KEYS[2], ARGV[2])
redis.call('SET', KEYS[1], ARGV[1])
return {1, 'ok'}`;
const RELEASE_LUA = `
local removed = redis.call('LREM', KEYS[2], 0, ARGV[2])
if removed == 0 then return 0 end
if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end
return 1`;

// Redis can't tonumber('Infinity'); pass an effectively-unbounded cap instead.
const capArg = (cap: number) => (Number.isFinite(cap) ? String(cap) : String(Number.MAX_SAFE_INTEGER));

class RedisStore implements Store {
  private r: Redis;

  constructor(url: string) {
    // family: 0 lets DNS return IPv4 *or* IPv6 — required for Railway's private
    // network (`redis.railway.internal` resolves over IPv6 only); harmless for
    // the public TCP proxy too.
    this.r = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false, family: 0 });
    this.r.on('error', (e) => console.error('[store/redis] error:', e.message));
    this.r.on('connect', () => console.log('[store/redis] connected'));
  }

  async health(): Promise<{ backend: 'redis'; ok: boolean }> {
    try {
      return { backend: 'redis', ok: (await this.r.ping()) === 'PONG' };
    } catch {
      return { backend: 'redis', ok: false };
    }
  }

  async issueKey(subscriber: Hex, tier: TierName): Promise<ApiKeyRecord> {
    const lc = subscriber.toLowerCase();
    const existingKey = await this.r.get(K.sub2key(lc));
    if (existingKey) {
      const raw = await this.r.get(K.key(existingKey));
      const rec: ApiKeyRecord = raw
        ? JSON.parse(raw)
        : { key: existingKey, subscriber, tier, createdAt: Date.now() };
      rec.tier = tier; // refresh tier on renewal
      await this.r.set(K.key(existingKey), JSON.stringify(rec));
      await this.r.del(K.reqs(existingKey)); // renewal resets the monthly quota window
      return rec;
    }
    const key = newKey();
    const rec: ApiKeyRecord = { key, subscriber, tier, createdAt: Date.now() };
    await this.r.set(K.key(key), JSON.stringify(rec));
    await this.r.set(K.sub2key(lc), key);
    return rec;
  }

  async getKey(key: string): Promise<ApiKeyRecord | undefined> {
    const raw = await this.r.get(K.key(key));
    return raw ? (JSON.parse(raw) as ApiKeyRecord) : undefined;
  }

  async getKeyBySubscriber(addr: Hex): Promise<ApiKeyRecord | undefined> {
    const key = await this.r.get(K.sub2key(addr.toLowerCase()));
    return key ? this.getKey(key) : undefined;
  }

  async hitRate(key: string, limitPerMin: number): Promise<RateResult> {
    const count = await this.r.incr(K.rate(key));
    if (count === 1) await this.r.pexpire(K.rate(key), RATE_WINDOW_MS);
    return { allowed: count <= limitPerMin, count, limit: limitPerMin };
  }

  async consumeRequest(key: string, monthlyCap: number): Promise<QuotaResult> {
    const count = await this.r.incr(K.reqs(key));
    let ttl: number;
    if (count === 1) {
      await this.r.pexpire(K.reqs(key), MONTH_MS);
      ttl = MONTH_MS;
    } else {
      ttl = await this.r.pttl(K.reqs(key));
    }
    const resetsAt = Date.now() + (ttl > 0 ? ttl : MONTH_MS);
    const allowed = !Number.isFinite(monthlyCap) || count <= monthlyCap;
    return { allowed, count, limit: monthlyCap, resetsAt };
  }

  async reserveUnits(key: string, n: number, cap: number): Promise<UnitResult> {
    const next = await this.r.incrby(K.units(key), n);
    if (Number.isFinite(cap) && next > cap) {
      await this.r.incrby(K.units(key), -n); // roll back the over-reservation
      return { allowed: false, used: next - n, cap };
    }
    return { allowed: true, used: next, cap };
  }

  async getUsage(rec: ApiKeyRecord): Promise<Usage> {
    const [reqs, units, namespaceCount] = await Promise.all([
      this.r.get(K.reqs(rec.key)),
      this.r.get(K.units(rec.key)),
      this.r.llen(K.sub2slugs(rec.subscriber.toLowerCase())),
    ]);
    return { requestCount: Number(reqs ?? 0), unitCount: Number(units ?? 0), namespaceCount };
  }

  async saveBatch(rec: BatchRecord): Promise<void> {
    await this.r.set(K.batch(rec.batchId.toLowerCase()), JSON.stringify(rec));
  }

  async getBatch(batchId: string): Promise<BatchRecord | undefined> {
    const raw = await this.r.get(K.batch(batchId.toLowerCase()));
    return raw ? (JSON.parse(raw) as BatchRecord) : undefined;
  }

  async subscriberForSlug(slug: string): Promise<Hex | undefined> {
    return (await this.r.get(K.slug2sub(slug))) as Hex | null ?? undefined;
  }

  async slugsForSubscriber(addr: Hex): Promise<string[]> {
    return this.r.lrange(K.sub2slugs(addr.toLowerCase()), 0, -1);
  }

  async slugForSubscriber(addr: Hex): Promise<string | undefined> {
    return (await this.r.lindex(K.sub2slugs(addr.toLowerCase()), 0)) ?? undefined;
  }

  async reserveSlug(subscriber: Hex, slug: string, max: number): Promise<ReserveResult> {
    const lc = subscriber.toLowerCase();
    const res = (await this.r.eval(
      RESERVE_LUA,
      2,
      K.slug2sub(slug),
      K.sub2slugs(lc),
      lc,
      slug,
      capArg(max),
      SLUG2SUB_PREFIX,
    )) as [number, string];
    return res[0] === 1
      ? { ok: true, slug }
      : { ok: false, reason: res[1] as 'taken' | 'cap' };
  }

  async releaseSlug(subscriber: Hex, slug: string): Promise<boolean> {
    const lc = subscriber.toLowerCase();
    const res = (await this.r.eval(
      RELEASE_LUA,
      2,
      K.slug2sub(slug),
      K.sub2slugs(lc),
      lc,
      slug,
    )) as number;
    return res === 1;
  }
}

function createStore(): Store {
  if (config.redisUrl) {
    console.log('[store] using Redis-backed store');
    return new RedisStore(config.redisUrl);
  }
  console.warn('[store] REDIS_URL unset — using in-memory store (non-durable, single-process)');
  return new MemoryStore();
}

export const store: Store = createStore();
