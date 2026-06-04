import { Router } from 'express';
import { encodeFunctionData, type Hex } from 'viem';
import { requireAddress } from '../lib/config.js';
import { publicClient } from '../lib/viem.js';
import { ROBOT_IDENTITY_ABI } from '../lib/contracts.js';
import { requireApiKey, TIER_CAPS, type AuthedRequest } from '../lib/auth.js';
import { pinJSON } from '../lib/pinata.js';
import { buildTree, batchIdOf, type BatchUnit } from '../lib/merkle.js';
import { store, type BatchRecord } from '../lib/store.js';
import { serialHashOf, normalizeSlug, unitName } from '../lib/ens.js';
import { publish } from '../ws/server.js';

export const robotsRouter = Router();

// GET /api/v1/robots/:tokenId — live read: identity + current owner (public)
robotsRouter.get('/:tokenId', async (req, res) => {
  const tokenId = BigInt(req.params.tokenId);
  const identity = requireAddress('robotIdentity');
  try {
    const [owner, uri, data] = await Promise.all([
      publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'ownerOf', args: [tokenId] }),
      publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'tokenURI', args: [tokenId] }),
      publicClient.readContract({ address: identity, abi: ROBOT_IDENTITY_ABI, functionName: 'robots', args: [tokenId] }),
    ]);
    res.json({
      tokenId: tokenId.toString(),
      owner,
      tokenURI: uri,
      serialHash: data[0],
      manufacturer: data[1],
      model: data[2],
      capabilityClass: data[3],
      firmwareVersion: Number(data[4]),
      registrationDate: Number(data[5]),
      locked: data[6],
    });
  } catch {
    res.status(404).json({ error: 'robot not found' });
  }
});

/**
 * POST /api/v1/robots (auth) — register single. Pins the profile to IPFS and
 * returns an UNSIGNED transaction the OEM signs with their own wallet.
 */
robotsRouter.post('/', requireApiKey(), async (req: AuthedRequest, res) => {
  const { to, serialNumber, manufacturer, model, capabilityClass, firmwareVersion = 0, locked = false, profile } = req.body ?? {};
  if (!to || !serialNumber || !manufacturer || !model) {
    return res.status(400).json({ error: 'to, serialNumber, manufacturer, model required' });
  }

  // Unit cap (lifetime, best-effort on prepared registrations). Atomic
  // reserve-then-act: consumes 1 unit up front; never double-spends under load.
  const unitCap = TIER_CAPS[req.apiKey!.tier].units;
  const reserved = await store.reserveUnits(req.apiKey!.key, 1, unitCap);
  if (!reserved.allowed) {
    return res.status(403).json({ error: 'Unit cap reached', cap: reserved.cap, used: reserved.used });
  }

  const serialSlug = normalizeSlug(serialNumber);
  const serialHash = serialHashOf(serialNumber);
  const tokenURI = await pinJSON(`robot-${serialHash.slice(2, 10)}`, {
    manufacturer, model, capabilityClass, firmwareVersion, ...profile,
  });

  const data = encodeFunctionData({
    abi: ROBOT_IDENTITY_ABI,
    functionName: 'registerRobot',
    args: [to, serialHash, manufacturer, model, capabilityClass ?? '', Number(firmwareVersion), Boolean(locked), tokenURI],
  });

  // Preview the resolvable ENS name using the OEM's reserved namespace slug.
  const mfrSlug = await store.slugForSubscriber(req.apiKey!.subscriber);
  const name = mfrSlug ? unitName(serialSlug, mfrSlug) : null;

  publish('robots', 'register.prepared', { to, manufacturer, model, serialHash });
  res.json({ unsignedTx: { to: requireAddress('robotIdentity'), data, value: '0x0' }, serialHash, serialSlug, name, tokenURI });
});

/**
 * POST /api/v1/robots/batch/preauthorize (auth) — up to 100K serials → Merkle
 * root. Returns the batchId + root + an unsigned MerkleBatchOracle.submitRoot tx.
 */
robotsRouter.post('/batch/preauthorize', requireApiKey(), async (req: AuthedRequest, res) => {
  const { manufacturer, model, capabilityClass = '', serials, locked = false } = req.body ?? {};
  if (!Array.isArray(serials) || serials.length === 0) {
    return res.status(400).json({ error: 'serials[] required' });
  }
  if (serials.length > 100_000) {
    return res.status(400).json({ error: 'batch exceeds 100,000 serials' });
  }

  const oem = req.apiKey!.subscriber;

  // Reject serials that normalize to the same slug — they would hash to one
  // serialHash and resolve to a single, ambiguous ENS unit name.
  const seen = new Map<string, string>(); // slug → first raw serial
  const collisions: { slug: string; serials: string[] }[] = [];
  for (const s of serials as { serialNumber: string }[]) {
    const slug = normalizeSlug(s.serialNumber);
    const first = seen.get(slug);
    if (first === undefined) seen.set(slug, s.serialNumber);
    else collisions.push({ slug, serials: [first, s.serialNumber] });
  }
  if (collisions.length > 0) {
    return res.status(422).json({ error: 'serials collide after normalization', collisions });
  }

  // Unit cap — the whole (validated) batch must fit in the tier's remaining
  // quota. Atomic: reserves all serials at once, rolling back if it overflows.
  const unitCap = TIER_CAPS[req.apiKey!.tier].units;
  const reserved = await store.reserveUnits(req.apiKey!.key, serials.length, unitCap);
  if (!reserved.allowed) {
    return res.status(403).json({
      error: 'Unit cap reached',
      cap: reserved.cap,
      used: reserved.used,
      requested: serials.length,
    });
  }

  const units: BatchUnit[] = serials.map((s: { serialNumber: string; owner: Hex }) => ({
    serialHash: serialHashOf(s.serialNumber),
    owner: s.owner,
    locked: Boolean(locked),
  }));

  // Optional per-unit spec sheet: the OEM supplies an ipfs://CID (or any URI)
  // per serial. Threaded through the proof responses so the claim attaches the
  // right tokenURI — which the CCIP gateway later surfaces as text records.
  // Pinning 100K JSONs inline isn't feasible, so CIDs are prepared by the OEM.
  const uris: string[] = serials.map((s: { tokenURI?: string; uri?: string }) => s.tokenURI ?? s.uri ?? '');
  const hasUris = uris.some((u) => u !== '');

  const tree = buildTree(units);
  const nonce = BigInt(Date.now());
  const batchId = batchIdOf(oem, nonce);

  const rec: BatchRecord = {
    batchId, oem, root: tree.root, manufacturer, model, capabilityClass,
    units, serials: serials.map((s: { serialNumber: string }) => s.serialNumber),
    uris: hasUris ? uris : undefined,
    createdAt: Date.now(), rootCommitted: false,
  };
  await store.saveBatch(rec);

  const { MERKLE_ORACLE_ABI } = await import('../lib/contracts.js');
  const submitData = encodeFunctionData({ abi: MERKLE_ORACLE_ABI, functionName: 'submitRoot', args: [batchId, tree.root] });

  res.json({
    batchId, root: tree.root, count: units.length,
    unsignedTx: { to: requireAddress('merkleOracle'), data: submitData, value: '0x0' },
  });
});

// GET /api/v1/robots/batch/:id (auth) — batch summary
robotsRouter.get('/batch/:id', requireApiKey(), async (req, res) => {
  const batch = await store.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'batch not found' });
  res.json({
    batchId: batch.batchId, root: batch.root, manufacturer: batch.manufacturer,
    model: batch.model, count: batch.units.length, createdAt: batch.createdAt,
  });
});

// GET /api/v1/robots/batch/:id/proof/:serial — single proof (public)
robotsRouter.get('/batch/:id/proof/:serial', async (req, res) => {
  const batch = await store.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'batch not found' });
  const idx = batch.serials.indexOf(req.params.serial);
  if (idx < 0) return res.status(404).json({ error: 'serial not in batch' });
  const tree = buildTree(batch.units);
  res.json({
    batchId: batch.batchId, serial: req.params.serial, index: idx,
    leaf: tree.leaves[idx], proof: tree.proofOf(idx), unit: batch.units[idx],
    // Claim args the unit (or relayer) passes to claimWithProof.
    manufacturer: batch.manufacturer, model: batch.model,
    capabilityClass: batch.capabilityClass, uri: batch.uris?.[idx] ?? '',
  });
});

// GET /api/v1/robots/batch/:id/proofs (auth) — paginated proofs
robotsRouter.get('/batch/:id/proofs', requireApiKey(), async (req, res) => {
  const batch = await store.getBatch(req.params.id);
  if (!batch) return res.status(404).json({ error: 'batch not found' });
  const page = Math.max(0, Number(req.query.page ?? 0));
  const size = Math.min(500, Math.max(1, Number(req.query.size ?? 100)));
  const tree = buildTree(batch.units);
  const start = page * size;
  const slice = batch.units.slice(start, start + size).map((u, i) => ({
    index: start + i, serial: batch.serials[start + i], leaf: tree.leaves[start + i], proof: tree.proofOf(start + i), unit: u,
    uri: batch.uris?.[start + i] ?? '',
  }));
  res.json({ batchId: batch.batchId, page, size, total: batch.units.length, proofs: slice });
});

// POST /api/v1/robots/batch/:id/transfer (auth) — bulk safeTransferFrom calldata
robotsRouter.post('/batch/:id/transfer', requireApiKey(), (req, res) => {
  const { transfers } = req.body ?? {};
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return res.status(400).json({ error: 'transfers[] of {from,to,tokenId} required' });
  }
  const identity = requireAddress('robotIdentity');
  const txs = transfers.map((t: { from: Hex; to: Hex; tokenId: string }) => ({
    to: identity,
    data: encodeFunctionData({ abi: ROBOT_IDENTITY_ABI, functionName: 'safeTransferFrom', args: [t.from, t.to, BigInt(t.tokenId)] }),
    value: '0x0',
  }));
  res.json({ unsignedTxs: txs });
});
