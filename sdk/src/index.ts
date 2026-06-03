/**
 * @robot-id/sdk — TypeScript client for the robot-id.eth protocol API.
 *
 * @example
 * import { RobotIdClient } from '@robot-id/sdk'
 * const client = new RobotIdClient({ apiKey: 'rid_...', network: 'mainnet' })
 * const robot  = await client.robots.get(1n)
 * const caps   = await client.capability.get(1n)
 * const batch  = await client.robots.preauthorize({ serials, manufacturer, model, capabilityClass })
 * const active = await client.subscription.isActive('0x...')
 */

export type Network = 'mainnet' | 'local';

export interface RobotIdClientOptions {
  apiKey?: string;
  network?: Network;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface UnsignedTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
}

export interface Robot {
  tokenId: string;
  owner: `0x${string}`;
  manufacturer: string;
  model: string;
  capabilityClass: string;
  firmwareVersion: number;
  registrationDate: number;
  locked: boolean;
  tokenURI: string;
  serialHash: `0x${string}`;
}

export interface BatchSerial {
  serialNumber: string;
  owner: `0x${string}`;
}

export interface PreauthorizeInput {
  manufacturer: string;
  model: string;
  capabilityClass?: string;
  locked?: boolean;
  serials: BatchSerial[];
}

export interface PreauthorizeResult {
  batchId: `0x${string}`;
  root: `0x${string}`;
  count: number;
  unsignedTx: UnsignedTx;
}

export interface ProofResult {
  batchId: `0x${string}`;
  serial: string;
  index: number;
  leaf: `0x${string}`;
  proof: `0x${string}`[];
}

const DEFAULT_BASE: Record<Network, string> = {
  mainnet: 'https://api.robot-id.eth',
  local: 'http://localhost:3001',
};

export class RobotIdError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'RobotIdError';
  }
}

export class RobotIdClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly _fetch: typeof fetch;

  readonly robots: RobotsResource;
  readonly capability: CapabilityResource;
  readonly intent: IntentResource;
  readonly ota: OtaResource;
  readonly subscription: SubscriptionResource;

  constructor(opts: RobotIdClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE[opts.network ?? 'mainnet']).replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this._fetch = opts.fetch ?? fetch;

    this.robots = new RobotsResource(this);
    this.capability = new CapabilityResource(this);
    this.intent = new IntentResource(this);
    this.ota = new OtaResource(this);
    this.subscription = new SubscriptionResource(this);
  }

  /** @internal */
  async request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (auth) {
      if (!this.apiKey) throw new RobotIdError(401, 'apiKey required for authenticated request');
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    const res = await this._fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new RobotIdError(res.status, json?.error ?? res.statusText, json);
    }
    return json as T;
  }
}

class RobotsResource {
  constructor(private c: RobotIdClient) {}

  get(tokenId: bigint | string): Promise<Robot> {
    return this.c.request('GET', `/api/v1/robots/${tokenId.toString()}`);
  }

  register(input: {
    to: `0x${string}`;
    serialNumber: string;
    manufacturer: string;
    model: string;
    capabilityClass?: string;
    firmwareVersion?: number;
    locked?: boolean;
    profile?: Record<string, unknown>;
  }): Promise<{ unsignedTx: UnsignedTx; serialHash: `0x${string}`; tokenURI: string }> {
    return this.c.request('POST', '/api/v1/robots', input, true);
  }

  preauthorize(input: PreauthorizeInput): Promise<PreauthorizeResult> {
    return this.c.request('POST', '/api/v1/robots/batch/preauthorize', input, true);
  }

  batch(batchId: string): Promise<{ batchId: string; root: string; count: number }> {
    return this.c.request('GET', `/api/v1/robots/batch/${batchId}`, undefined, true);
  }

  proof(batchId: string, serial: string): Promise<ProofResult> {
    return this.c.request('GET', `/api/v1/robots/batch/${batchId}/proof/${encodeURIComponent(serial)}`);
  }
}

class CapabilityResource {
  constructor(private c: RobotIdClient) {}

  get(robotId: bigint | string): Promise<{ robotId: string; attestations: unknown[] }> {
    return this.c.request('GET', `/api/v1/capability/${robotId.toString()}`);
  }

  history(robotId: bigint | string): Promise<{ robotId: string; history: unknown[] }> {
    return this.c.request('GET', `/api/v1/capability/${robotId.toString()}/history`);
  }

  verify(
    robotId: bigint | string,
    input: { capabilityKey: string; leaf: `0x${string}`; proof: `0x${string}`[] },
  ): Promise<{ valid: boolean }> {
    return this.c.request('POST', `/api/v1/capability/${robotId.toString()}/verify`, input);
  }
}

class IntentResource {
  constructor(private c: RobotIdClient) {}

  submit(input: {
    robotId: bigint | string;
    command?: string;
    intentHash?: `0x${string}`;
    actionTarget: `0x${string}`;
    value?: string;
    nonce?: number;
  }): Promise<{ intentHash: `0x${string}`; unsignedTx: UnsignedTx }> {
    return this.c.request('POST', '/api/v1/intent', { ...input, robotId: input.robotId.toString() }, true);
  }
}

class OtaResource {
  constructor(private c: RobotIdClient) {}

  verify(
    robotId: bigint | string,
    q: { firmwareHash: `0x${string}`; newVersion: number; signature: `0x${string}`; oemAddress: `0x${string}` },
  ): Promise<{ valid: boolean }> {
    const qs = new URLSearchParams({
      firmwareHash: q.firmwareHash,
      newVersion: String(q.newVersion),
      signature: q.signature,
      oemAddress: q.oemAddress,
    });
    return this.c.request('GET', `/api/v1/ota/${robotId.toString()}/verify?${qs}`);
  }
}

class SubscriptionResource {
  constructor(private c: RobotIdClient) {}

  status(addr: `0x${string}`): Promise<{ active: boolean; tier: number; tierName: string; expiry: number }> {
    return this.c.request('GET', `/api/v1/subscription/${addr}`);
  }

  async isActive(addr: `0x${string}`): Promise<boolean> {
    return (await this.status(addr)).active;
  }
}
