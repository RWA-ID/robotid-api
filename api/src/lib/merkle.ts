import { keccak256, encodeAbiParameters, concat, type Hex } from 'viem';

export interface BatchUnit {
  serialHash: Hex; // keccak256(serialNumber)
  owner: Hex; // claimer address
  locked: boolean; // soulbound?
}

/**
 * Leaf encoding MUST match RobotIdentity.claimWithProof:
 *   keccak256(bytes.concat(keccak256(abi.encode(serialHash, to, locked))))
 * (double-hash guards against second-preimage attacks, OZ convention.)
 */
export function leafOf(u: BatchUnit): Hex {
  const inner = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'bool' }],
      [u.serialHash, u.owner, u.locked],
    ),
  );
  return keccak256(concat([inner]));
}

function hashPair(a: Hex, b: Hex): Hex {
  const [x, y] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }, { type: 'bytes32' }], [x, y]));
}

export interface MerkleResult {
  root: Hex;
  leaves: Hex[];
  proofOf: (index: number) => Hex[];
}

/** OZ-compatible sorted-pair Merkle tree. Handles odd levels by promotion. */
export function buildTree(units: BatchUnit[]): MerkleResult {
  if (units.length === 0) throw new Error('empty batch');
  const leaves = units.map(leafOf);

  // precompute all levels
  const levels: Hex[][] = [leaves];
  let level = leaves;
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    }
    levels.push(next);
    level = next;
  }

  const proofOf = (index: number): Hex[] => {
    const proof: Hex[] = [];
    let idx = index;
    for (let l = 0; l < levels.length - 1; l++) {
      const lvl = levels[l];
      const sibling = idx ^ 1;
      if (sibling < lvl.length) proof.push(lvl[sibling]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  };

  return { root: levels[levels.length - 1][0], leaves, proofOf };
}

/** Deterministic batchId from OEM address + nonce. */
export function batchIdOf(oem: Hex, nonce: bigint): Hex {
  return keccak256(
    encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [oem, nonce]),
  );
}
