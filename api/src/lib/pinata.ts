import { config } from './config.js';

const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

/**
 * Pin a JSON object (robot profile or capability cert artifact) to IPFS via
 * Pinata. Returns the ipfs:// URI used by tokenURI / capability merkleRoot
 * detail. Falls back to a deterministic stub URI when PINATA_JWT is unset so
 * local/dev flows don't hard-fail.
 */
export async function pinJSON(name: string, body: unknown): Promise<string> {
  if (!config.pinataJwt) {
    const stub = Buffer.from(JSON.stringify(body)).toString('base64url').slice(0, 46);
    return `ipfs://bafy${stub}`;
  }

  const res = await fetch(PINATA_JSON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.pinataJwt}`,
    },
    body: JSON.stringify({
      pinataMetadata: { name },
      pinataContent: body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pinata pin failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { IpfsHash: string };
  return `ipfs://${json.IpfsHash}`;
}

export function ipfsToHttp(uri: string): string {
  return uri.startsWith('ipfs://')
    ? `https://gateway.pinata.cloud/ipfs/${uri.slice('ipfs://'.length)}`
    : uri;
}
