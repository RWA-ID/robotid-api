// Minimal ABIs the API needs. Reads go straight to chain via viem; writes are
// returned to OEMs as unsigned transactions they sign with their own wallet.

export const SUBSCRIPTION_ABI = [
  { type: 'function', name: 'isActive', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'tierOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'expiry', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'price', stateMutability: 'view', inputs: [{ name: 't', type: 'uint8' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'subscribe', stateMutability: 'nonpayable', inputs: [{ name: 'tier', type: 'uint8' }], outputs: [] },
  {
    type: 'event',
    name: 'Subscribed',
    inputs: [
      { name: 'subscriber', type: 'address', indexed: true },
      { name: 'tier', type: 'uint8', indexed: false },
      { name: 'expiry', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const ROBOT_IDENTITY_ABI = [
  { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'totalMinted', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'robots',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'serialHash', type: 'bytes32' },
      { name: 'manufacturer', type: 'string' },
      { name: 'model', type: 'string' },
      { name: 'capabilityClass', type: 'string' },
      { name: 'firmwareVersion', type: 'uint32' },
      { name: 'registrationDate', type: 'uint256' },
      { name: 'locked', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'registerRobot',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'serialHash', type: 'bytes32' },
      { name: 'manufacturer', type: 'string' },
      { name: 'model', type: 'string' },
      { name: 'capabilityClass', type: 'string' },
      { name: 'firmwareVersion', type: 'uint32' },
      { name: 'locked', type: 'bool' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'safeTransferFrom',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  { type: 'event', name: 'RobotRegistered', inputs: [
    { name: 'tokenId', type: 'uint256', indexed: true },
    { name: 'serialHash', type: 'bytes32', indexed: true },
    { name: 'owner', type: 'address', indexed: true },
    { name: 'manufacturer', type: 'string', indexed: false },
    { name: 'model', type: 'string', indexed: false },
    { name: 'locked', type: 'bool', indexed: false },
  ] },
] as const;

export const MERKLE_ORACLE_ABI = [
  { type: 'function', name: 'submitRoot', stateMutability: 'nonpayable', inputs: [{ name: 'batchId', type: 'bytes32' }, { name: 'root', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'rootOf', stateMutability: 'view', inputs: [{ name: 'batchId', type: 'bytes32' }], outputs: [{ type: 'bytes32' }] },
] as const;

export const CAPABILITY_ABI = [
  {
    type: 'function',
    name: 'latest',
    stateMutability: 'view',
    inputs: [{ name: 'robotId', type: 'uint256' }, { name: 'capabilityKey', type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'robotId', type: 'uint256' },
      { name: 'capabilityKey', type: 'bytes32' },
      { name: 'value', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'oem', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
    ] }],
  },
  { type: 'function', name: 'historyOf', stateMutability: 'view', inputs: [{ name: 'robotId', type: 'uint256' }], outputs: [{ type: 'uint256[]' }] },
  { type: 'function', name: 'verify', stateMutability: 'view', inputs: [
    { name: 'robotId', type: 'uint256' },
    { name: 'capabilityKey', type: 'bytes32' },
    { name: 'leaf', type: 'bytes32' },
    { name: 'proof', type: 'bytes32[]' },
  ], outputs: [{ type: 'bool' }] },
  {
    type: 'function',
    name: 'attestations',
    stateMutability: 'view',
    inputs: [{ name: 'i', type: 'uint256' }],
    outputs: [
      { name: 'robotId', type: 'uint256' },
      { name: 'capabilityKey', type: 'bytes32' },
      { name: 'value', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'oem', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;

export const INTENT_ROUTER_ABI = [
  {
    type: 'function',
    name: 'submitIntent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'robotId', type: 'uint256' },
      { name: 'intentHash', type: 'bytes32' },
      { name: 'actionTarget', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: 'intentId', type: 'uint256' }, { name: 'authorized', type: 'bool' }],
  },
  { type: 'event', name: 'IntentExecuted', inputs: [
    { name: 'intentId', type: 'uint256', indexed: true },
    { name: 'robotId', type: 'uint256', indexed: true },
    { name: 'intentHash', type: 'bytes32', indexed: false },
    { name: 'actionTarget', type: 'address', indexed: false },
    { name: 'value', type: 'uint256', indexed: false },
    { name: 'submitter', type: 'address', indexed: false },
  ] },
  { type: 'event', name: 'IntentRejected', inputs: [
    { name: 'intentId', type: 'uint256', indexed: true },
    { name: 'robotId', type: 'uint256', indexed: true },
    { name: 'intentHash', type: 'bytes32', indexed: false },
    { name: 'reason', type: 'uint8', indexed: false },
  ] },
] as const;

export const OTA_ABI = [
  { type: 'function', name: 'verify', stateMutability: 'view', inputs: [
    { name: 'firmwareHash', type: 'bytes32' },
    { name: 'newVersion', type: 'uint32' },
    { name: 'signature', type: 'bytes' },
    { name: 'oemAddress', type: 'address' },
  ], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'verifyForRobot', stateMutability: 'view', inputs: [
    { name: 'robotId', type: 'uint256' },
    { name: 'firmwareHash', type: 'bytes32' },
    { name: 'newVersion', type: 'uint32' },
    { name: 'signature', type: 'bytes' },
    { name: 'oemAddress', type: 'address' },
  ], outputs: [{ type: 'bool' }] },
] as const;

export const TIER_NAMES = ['SmallManufacturer', 'OEM', 'Enterprise'] as const;
export type TierName = (typeof TIER_NAMES)[number];
