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
 * operator on the parent — see script/ApproveWrapper.s.sol).
 *
 * `chosenSlug` is the OEM's pick reserved at checkout (validated/availability-
 * checked at reservation time). When omitted, we fall back to a deterministic
 * address-derived label so a paying OEM always gets *a* namespace even if they
 * skipped slug selection.
 */
export async function provisionNamespace(
  subscriber: Hex,
  tier: TierName,
  chosenSlug?: string,
): Promise<string | null> {
  if (!adminWallet) {
    console.warn('[registrar] ADMIN_PRIVATE_KEY unset — skipping namespace provisioning');
    return null;
  }
  const slug = normalizeSlug(chosenSlug ?? `oem-${subscriber.slice(2, 10)}`);
  const parentNode = namehash(config.ensParent);
  const fullName = oemName(slug);

  // The OEM node must carry the CCIP wildcard resolver, NOT the PublicResolver:
  // unit names (<serial>.<oem>.robot-id.eth) are virtual and resolve by walking
  // up to this node's resolver (ENSIP-10). A PublicResolver here would leave
  // every unit name unresolvable. Falls back to PublicResolver only if the
  // wildcard resolver isn't configured yet.
  const resolver = config.addresses.resolver ?? config.publicResolver;

  const hash = await adminWallet.writeContract({
    address: config.nameWrapper,
    abi: NAME_WRAPPER_ABI,
    functionName: 'setSubnodeRecord',
    args: [parentNode, slug, subscriber, resolver, 0n, 0, 2n ** 64n - 1n],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[registrar] provisioned ${fullName} for ${subscriber} (${tier}) tx=${hash}`);
  return fullName;
}
