import { type Hex } from 'viem';
import { config } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { SUBSCRIPTION_ABI, TIER_NAMES } from '../lib/contracts.js';
import { store } from '../lib/store.js';
import { provisionNamespace } from '../lib/registrar.js';

/**
 * Listens for `Subscribed` events. On each event it:
 *   1. mints/refreshes an API key bound to subscriber + tier
 *   2. provisions the OEM ENS namespace (mfr.robot-id.eth) via NameWrapper
 * The key is then retrievable by the OEM via SIWE GET /auth/keys/info, and is
 * returned to the dApp post-confirmation.
 */
export function startSubscriptionWatcher(): () => void {
  const subscription = config.addresses.subscription;
  if (!subscription) {
    console.warn('[watcher] SUBSCRIPTION_ADDRESS unset — Subscribed watcher disabled');
    return () => {};
  }

  console.log('[watcher] watching Subscribed on', subscription);
  const unwatch = publicClient.watchContractEvent({
    address: subscription,
    abi: SUBSCRIPTION_ABI,
    eventName: 'Subscribed',
    onLogs: (logs) => {
      for (const log of logs) {
        const { subscriber, tier, expiry } = log.args as {
          subscriber: Hex;
          tier: number;
          expiry: bigint;
        };
        const tierName = TIER_NAMES[Number(tier)] ?? 'SmallManufacturer';
        const rec = store.issueKey(subscriber, tierName);
        const chosenSlug = store.slugForSubscriber(subscriber); // OEM pick at checkout, if any
        console.log(
          `[watcher] Subscribed ${subscriber} tier=${tierName} expiry=${expiry} → key issued` +
            (chosenSlug ? ` slug=${chosenSlug}` : ' (no slug reserved — address fallback)'),
        );
        void provisionNamespace(subscriber, tierName, chosenSlug).catch((e) =>
          console.error('[watcher] namespace provisioning failed:', e?.message ?? e),
        );
        void rec;
      }
    },
    onError: (e) => console.error('[watcher] watch error:', e.message),
  });

  return unwatch;
}
