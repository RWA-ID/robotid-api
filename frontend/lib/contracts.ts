export const SUBSCRIPTION_ABI = [
  { type: 'function', name: 'subscribe', stateMutability: 'nonpayable', inputs: [{ name: 'tier', type: 'uint8' }], outputs: [] },
  { type: 'function', name: 'isActive', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'tierOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'price', stateMutability: 'view', inputs: [{ name: 't', type: 'uint8' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

export const ROBOT_IDENTITY_ABI = [
  { type: 'function', name: 'totalMinted', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;
