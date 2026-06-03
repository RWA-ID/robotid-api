import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { config } from './config.js';

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(config.rpcUrl),
});

/**
 * Server-side registrar wallet (key-provisioning / NameWrapper operator).
 * Returns undefined when ADMIN_PRIVATE_KEY is not set — the API still serves
 * all read endpoints and unsigned-tx builders without it.
 */
export const adminAccount = config.adminPrivateKey
  ? privateKeyToAccount(config.adminPrivateKey)
  : undefined;

export const adminWallet = adminAccount
  ? createWalletClient({ account: adminAccount, chain: mainnet, transport: http(config.rpcUrl) })
  : undefined;
