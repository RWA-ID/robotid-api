import { type Hex, namehash } from 'viem';
import { config } from './config.js';
import { adminWallet, publicClient } from './viem.js';
import type { TierName } from './contracts.js';
import { oemName, normalizeSlug } from './ens.js';

const NAME_WRAPPER_ABI = [
  {
    type: 'function',
    name: 'setSubnodeRecord',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parentNode', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
      { name: 'fuses', type: 'uint32' },
      { name: 'expiry', type: 'uint64' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

/**
 * Provision an OEM namespace (mfr.robot-id.eth) as a deliverable of an active
 * subscription. Requires ADMIN_PRIVATE_KEY (the registrar must be a NameWrapper
 * operator on the parent — see script/ApproveWrapper.s.sol). Derives a label
 * from the subscriber address; in production the OEM picks the slug at checkout.
 */
export async function provisionNamespace(subscriber: Hex, tier: TierName): Promise<string | null> {
  if (!adminWallet) {
    console.warn('[registrar] ADMIN_PRIVATE_KEY unset — skipping namespace provisioning');
    return null;
  }
  // default slug from address; override via dApp by passing a chosen slug
  const slug = normalizeSlug(`oem-${subscriber.slice(2, 10)}`);
  const parentNode = namehash(config.ensParent);
  const fullName = oemName(slug);

  const hash = await adminWallet.writeContract({
    address: config.nameWrapper,
    abi: NAME_WRAPPER_ABI,
    functionName: 'setSubnodeRecord',
    args: [parentNode, slug, subscriber, config.publicResolver, 0n, 0, 2n ** 64n - 1n],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[registrar] provisioned ${fullName} for ${subscriber} (${tier}) tx=${hash}`);
  return fullName;
}
