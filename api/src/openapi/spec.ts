export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'robot-id.eth API',
    version: '0.1.0',
    description:
      'The neutral ENS protocol layer for robots. Reads go straight to chain via viem + Alchemy. Writes return UNSIGNED transactions the OEM signs with their own wallet. Auth is subscription-gated — a key is issued only after an active on-chain USDC subscription.',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/', description: 'this host' }],
  components: {
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'Authorization', description: 'Bearer rid_...' },
    },
    schemas: {
      UnsignedTx: {
        type: 'object',
        properties: { to: { type: 'string' }, data: { type: 'string' }, value: { type: 'string' } },
      },
    },
  },
  paths: {
    '/health': { get: { summary: 'Liveness', responses: { '200': { description: 'ok' } } } },
    '/auth/tiers': { get: { summary: 'List 3 tiers + USDC prices', responses: { '200': { description: 'tiers' } } } },
    '/auth/keys/wallet': {
      post: {
        summary: 'SIWE → API key IF subscription active',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { address: { type: 'string' }, message: { type: 'string' }, signature: { type: 'string' } } } } } },
        responses: { '200': { description: 'apiKey' }, '402': { description: 'no active subscription' } },
      },
    },
    '/auth/keys/info': { get: { summary: 'Tier, limits, usage, expiry', security: [{ apiKey: [] }], responses: { '200': { description: 'info' }, '402': { description: 'expired' } } } },
    '/api/v1/robots/{tokenId}': { get: { summary: 'Live read: identity + current owner', parameters: [{ name: 'tokenId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'robot' }, '404': { description: 'not found' } } } },
    '/api/v1/robots': { post: { summary: 'Register single (unsigned tx)', security: [{ apiKey: [] }], responses: { '200': { description: 'unsignedTx' } } } },
    '/api/v1/robots/batch/preauthorize': { post: { summary: 'Up to 100K serials → Merkle root', security: [{ apiKey: [] }], responses: { '200': { description: 'batchId + root + unsignedTx' } } } },
    '/api/v1/robots/batch/{id}': { get: { summary: 'Batch summary', security: [{ apiKey: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'summary' } } } },
    '/api/v1/robots/batch/{id}/proof/{serial}': { get: { summary: 'Single proof (public)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'serial', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'proof' } } } },
    '/api/v1/robots/batch/{id}/proofs': { get: { summary: 'Paginated proofs', security: [{ apiKey: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'proofs' } } } },
    '/api/v1/robots/batch/{id}/transfer': { post: { summary: 'Bulk safeTransferFrom calldata', security: [{ apiKey: [] }], responses: { '200': { description: 'unsignedTxs' } } } },
    '/api/v1/capability/{robotId}': { get: { summary: 'Latest attestations', parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'attestations' } } } },
    '/api/v1/capability/{robotId}/history': { get: { summary: 'Attestation history', parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'history' } } } },
    '/api/v1/capability/{robotId}/verify': { post: { summary: 'Verify a proof', parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'valid' } } } },
    '/api/v1/intent': { post: { summary: 'Submit an AI/voice intent (unsigned tx)', security: [{ apiKey: [] }], responses: { '200': { description: 'unsignedTx' } } } },
    '/api/v1/ota/{robotId}/verify': { get: { summary: 'Check a firmware signature', parameters: [{ name: 'robotId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'valid' } } } },
    '/api/v1/subscription/{addr}': { get: { summary: 'active? tier? expiry?', parameters: [{ name: 'addr', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'status' } } } },
    '/graphql': { get: { summary: 'GraphQL endpoint', responses: { '200': { description: 'graphql' } } } },
  },
} as const;
