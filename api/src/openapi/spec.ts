/* Full OpenAPI 3.0.3 reference for the robot-id.eth API.
   Rendered at /docs (Swagger UI) and served raw at /openapi.json. */

const RAILWAY = 'https://robot-idapi-production.up.railway.app';

const Address = { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', example: '0xEebf76b8E31d95E6ccC198B9291471fF8B31bEcc' };
const Bytes32 = { type: 'string', pattern: '^0x[a-fA-F0-9]{64}$' };

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'robot-id.eth API',
    version: '1.0.0',
    description: [
      'The neutral ENS protocol layer for robots & autonomous machines.',
      '',
      '**Reads** go straight to chain via viem + Alchemy — no caching layer between caller and truth.',
      '**Writes** return an **unsigned transaction** you sign with your own wallet or multisig; the',
      'protocol never holds your keys.',
      '',
      '**Authentication is subscription-gated.** A key (`rid_…`) is issued only after an active on-chain',
      'USDC subscription, and every authenticated request re-checks `Subscription.isActive(addr)` —',
      'an expired subscription returns `402 Payment Required`.',
      '',
      'No per-unit registration fee: minting/claiming a robot identity costs gas only.',
    ].join('\n'),
    license: { name: 'MIT', url: 'https://github.com/RWA-ID/robotid-api/blob/main/LICENSE' },
    contact: { name: 'robot-id.eth', url: 'https://github.com/RWA-ID/robotid-api' },
  },
  servers: [
    { url: RAILWAY, description: 'Production (Railway)' },
    { url: '/', description: 'This host' },
    { url: 'http://localhost:3001', description: 'Local dev' },
  ],
  tags: [
    { name: 'System', description: 'Health and metadata' },
    { name: 'Auth', description: 'Subscription-gated API keys (SIWE via Reown)' },
    { name: 'Robots', description: 'Identity NFTs, single + Merkle batch registration' },
    { name: 'Capability', description: 'OEM-signed capability attestations' },
    { name: 'Intent', description: 'AI/voice intent authorization + audit log' },
    { name: 'OTA', description: 'Firmware signature verification' },
    { name: 'Subscription', description: 'On-chain USDC subscription status' },
    { name: 'GraphQL & WS', description: 'GraphQL endpoint and WebSocket event stream' },
  ],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'rid_…',
        description: 'API key issued after an active on-chain subscription. Send as `Authorization: Bearer rid_…`.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' }, detail: { type: 'string' } },
        example: { error: 'Payment Required', detail: 'Subscription inactive or expired. Renew on-chain to continue.' },
      },
      UnsignedTx: {
        type: 'object',
        description: 'An unsigned EVM transaction for the OEM to sign and broadcast.',
        properties: { to: Address, data: { type: 'string', example: '0x…' }, value: { type: 'string', example: '0x0' } },
        required: ['to', 'data', 'value'],
      },
      Tier: {
        type: 'object',
        properties: {
          tier: { type: 'integer', enum: [0, 1, 2], description: '0 = SmallManufacturer, 1 = OEM, 2 = Enterprise' },
          name: { type: 'string', example: 'OEM' },
          priceUsdc: { type: 'string', description: 'Monthly price in USDC base units (6 decimals)', example: '7500000000' },
          priceUsd: { type: 'number', example: 7500 },
          limits: {
            type: 'object',
            properties: { requestsPerMonth: { type: 'integer', nullable: true }, ratePerMin: { type: 'integer' } },
          },
        },
      },
      Robot: {
        type: 'object',
        properties: {
          tokenId: { type: 'string', example: '1' },
          owner: Address,
          tokenURI: { type: 'string', example: 'ipfs://bafy…' },
          serialHash: Bytes32,
          manufacturer: { type: 'string', example: 'Boston Dynamics' },
          model: { type: 'string', example: 'Spot' },
          capabilityClass: { type: 'string', example: 'quadruped-inspection' },
          firmwareVersion: { type: 'integer', example: 3 },
          registrationDate: { type: 'integer', description: 'Unix seconds' },
          locked: { type: 'boolean', description: 'ERC-5192 soulbound' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['to', 'serialNumber', 'manufacturer', 'model'],
        properties: {
          to: Address,
          serialNumber: { type: 'string', example: 'SPOT-0001' },
          manufacturer: { type: 'string', example: 'Boston Dynamics' },
          model: { type: 'string', example: 'Spot' },
          capabilityClass: { type: 'string', example: 'quadruped-inspection' },
          firmwareVersion: { type: 'integer', default: 0 },
          locked: { type: 'boolean', default: false },
          profile: { type: 'object', additionalProperties: true, description: 'Extra metadata pinned to IPFS' },
        },
      },
      PreauthorizeRequest: {
        type: 'object',
        required: ['manufacturer', 'model', 'serials'],
        properties: {
          manufacturer: { type: 'string', example: 'Unitree' },
          model: { type: 'string', example: 'Go2' },
          capabilityClass: { type: 'string', example: 'quadruped' },
          locked: { type: 'boolean', default: false },
          serials: {
            type: 'array',
            maxItems: 100000,
            items: {
              type: 'object',
              required: ['serialNumber', 'owner'],
              properties: { serialNumber: { type: 'string', example: 'GO2-0001' }, owner: Address },
            },
          },
        },
      },
      PreauthorizeResult: {
        type: 'object',
        properties: {
          batchId: Bytes32,
          root: Bytes32,
          count: { type: 'integer' },
          unsignedTx: { $ref: '#/components/schemas/UnsignedTx' },
        },
      },
      Proof: {
        type: 'object',
        properties: {
          batchId: Bytes32,
          serial: { type: 'string' },
          index: { type: 'integer' },
          leaf: Bytes32,
          proof: { type: 'array', items: Bytes32 },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          address: Address,
          active: { type: 'boolean' },
          tier: { type: 'integer' },
          tierName: { type: 'string' },
          expiry: { type: 'integer' },
          expiryISO: { type: 'string', nullable: true },
        },
      },
      KeyInfo: {
        type: 'object',
        properties: {
          subscriber: Address,
          tier: { type: 'string' },
          limits: { type: 'object', properties: { requestsPerMonth: { type: 'integer', nullable: true }, ratePerMin: { type: 'integer' } } },
          usage: { type: 'object', properties: { requestCount: { type: 'integer' } } },
          expiry: { type: 'integer' },
          expiryISO: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: { description: 'Missing or invalid API key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      PaymentRequired: { description: 'Subscription inactive or expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      RateLimited: { description: 'Rate limit exceeded for tier', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'], summary: 'Liveness probe',
        responses: { '200': { description: 'Service status', content: { 'application/json': { example: { status: 'ok', chainId: 1, parent: 'robot-id.eth', ts: 1780466612411 } } } } },
      },
    },
    '/auth/tiers': {
      get: {
        tags: ['Auth'], summary: 'List the three subscription tiers + live USDC prices',
        responses: { '200': { description: 'Tiers', content: { 'application/json': { schema: { type: 'object', properties: { tiers: { type: 'array', items: { $ref: '#/components/schemas/Tier' } } } } } } } },
      },
    },
    '/auth/keys/wallet': {
      post: {
        tags: ['Auth'], summary: 'SIWE → API key (only if the subscription is active)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address', 'message', 'signature'], properties: { address: Address, message: { type: 'string', example: 'robot-id.eth: issue API key' }, signature: { type: 'string', example: '0x…' } } } } } },
        responses: {
          '200': { description: 'API key issued', content: { 'application/json': { example: { apiKey: 'rid_…', tier: 'OEM', subscriber: '0x…' } } } },
          '400': { description: 'Invalid signature/body', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/PaymentRequired' },
        },
      },
    },
    '/auth/keys/info': {
      get: {
        tags: ['Auth'], summary: 'Key tier, limits, usage, and expiry', security: [{ apiKey: [] }],
        responses: {
          '200': { description: 'Key info', content: { 'application/json': { schema: { $ref: '#/components/schemas/KeyInfo' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/PaymentRequired' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/v1/robots/{tokenId}': {
      get: {
        tags: ['Robots'], summary: 'Live identity + current owner (read straight from chain)',
        parameters: [{ name: 'tokenId', in: 'path', required: true, schema: { type: 'string', example: '1' } }],
        responses: {
          '200': { description: 'Robot', content: { 'application/json': { schema: { $ref: '#/components/schemas/Robot' } } } },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/robots': {
      post: {
        tags: ['Robots'], summary: 'Register a single unit → unsigned tx', security: [{ apiKey: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          '200': { description: 'Unsigned registerRobot tx + pinned tokenURI', content: { 'application/json': { schema: { type: 'object', properties: { unsignedTx: { $ref: '#/components/schemas/UnsignedTx' }, serialHash: Bytes32, tokenURI: { type: 'string' } } } } } },
          '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/PaymentRequired' },
        },
      },
    },
    '/api/v1/robots/batch/preauthorize': {
      post: {
        tags: ['Robots'], summary: 'Pre-authorize up to 100,000 serials → one Merkle root', security: [{ apiKey: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PreauthorizeRequest' } } } },
        responses: {
          '200': { description: 'Batch root + unsigned submitRoot tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/PreauthorizeResult' } } } },
          '400': { description: 'Empty or oversized batch', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/PaymentRequired' },
        },
      },
    },
    '/api/v1/robots/batch/{id}': {
      get: {
        tags: ['Robots'], summary: 'Batch summary', security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: Bytes32 }],
        responses: { '200': { description: 'Summary' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/robots/batch/{id}/proof/{serial}': {
      get: {
        tags: ['Robots'], summary: 'Merkle proof for one serial (public)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: Bytes32 }, { name: 'serial', in: 'path', required: true, schema: { type: 'string', example: 'GO2-0001' } }],
        responses: { '200': { description: 'Proof', content: { 'application/json': { schema: { $ref: '#/components/schemas/Proof' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/robots/batch/{id}/proofs': {
      get: {
        tags: ['Robots'], summary: 'Paginated proofs', security: [{ apiKey: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: Bytes32 },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
        ],
        responses: { '200': { description: 'Proof page' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/robots/batch/{id}/transfer': {
      post: {
        tags: ['Robots'], summary: 'Bulk safeTransferFrom calldata', security: [{ apiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: Bytes32 }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { transfers: { type: 'array', items: { type: 'object', properties: { from: Address, to: Address, tokenId: { type: 'string' } } } } } } } } },
        responses: { '200': { description: 'Array of unsigned txs' }, '400': { description: 'Bad request' } },
      },
    },
    '/api/v1/capability/{robotId}': {
      get: {
        tags: ['Capability'], summary: 'Latest capability attestations',
        parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string', example: '1' } }],
        responses: { '200': { description: 'Attestations' }, '404': { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/v1/capability/{robotId}/history': {
      get: {
        tags: ['Capability'], summary: 'Full append-only attestation history',
        parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'History' } },
      },
    },
    '/api/v1/capability/{robotId}/verify': {
      post: {
        tags: ['Capability'], summary: 'Verify a Merkle proof against the latest root',
        parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['capabilityKey', 'leaf', 'proof'], properties: { capabilityKey: { type: 'string', example: 'max_payload_kg' }, leaf: Bytes32, proof: { type: 'array', items: Bytes32 } } } } } },
        responses: { '200': { description: 'Verification result', content: { 'application/json': { example: { robotId: '1', capabilityKey: 'max_payload_kg', valid: true } } } } },
      },
    },
    '/api/v1/intent': {
      post: {
        tags: ['Intent'], summary: 'Submit an AI/voice intent → unsigned IntentRouter tx', security: [{ apiKey: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['robotId', 'actionTarget'], properties: { robotId: { type: 'string', example: '1' }, command: { type: 'string', example: 'Authorize payment for charging dock B' }, intentHash: Bytes32, actionTarget: Address, value: { type: 'string', default: '0' }, nonce: { type: 'integer', default: 0 } } } } } },
        responses: {
          '200': { description: 'Intent hash + unsigned tx', content: { 'application/json': { schema: { type: 'object', properties: { intentHash: Bytes32, unsignedTx: { $ref: '#/components/schemas/UnsignedTx' } } } } } },
          '400': { description: 'Bad request' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '402': { $ref: '#/components/responses/PaymentRequired' },
        },
      },
    },
    '/api/v1/ota/{robotId}/verify': {
      get: {
        tags: ['OTA'], summary: 'Verify a firmware signature + version for a unit',
        parameters: [
          { name: 'robotId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'firmwareHash', in: 'query', required: true, schema: Bytes32 },
          { name: 'newVersion', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'signature', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'oemAddress', in: 'query', required: true, schema: Address },
        ],
        responses: { '200': { description: 'Verification result', content: { 'application/json': { example: { robotId: '1', newVersion: 4, valid: true } } } }, '400': { description: 'Missing query params' } },
      },
    },
    '/api/v1/subscription/{addr}': {
      get: {
        tags: ['Subscription'], summary: 'Subscription status, tier, and expiry',
        parameters: [{ name: 'addr', in: 'path', required: true, schema: Address }],
        responses: { '200': { description: 'Status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } } },
      },
    },
    '/api/v1/subscription/tx/{tier}': {
      get: {
        tags: ['Subscription'], summary: 'Build unsigned approve + subscribe txs for a tier',
        parameters: [{ name: 'tier', in: 'path', required: true, schema: { type: 'integer', enum: [0, 1, 2] } }],
        responses: { '200': { description: 'approveTx + subscribeTx', content: { 'application/json': { schema: { type: 'object', properties: { tier: { type: 'integer' }, tierName: { type: 'string' }, priceUsdc: { type: 'string' }, approveTx: { $ref: '#/components/schemas/UnsignedTx' }, subscribeTx: { $ref: '#/components/schemas/UnsignedTx' } } } } } }, '400': { description: 'Invalid tier' } },
      },
    },
    '/graphql': {
      post: {
        tags: ['GraphQL & WS'], summary: 'GraphQL endpoint',
        description: 'Queries: `robot(tokenId)`, `subscription(address)`, `totalMinted`.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string', example: '{ totalMinted }' } } } } } },
        responses: { '200': { description: 'GraphQL response', content: { 'application/json': { example: { data: { totalMinted: '0' } } } } } },
      },
    },
  },
} as const;
