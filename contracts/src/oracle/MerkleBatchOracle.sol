// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MerkleBatchOracle
 * @notice Shared infrastructure: AccessControl-gated Merkle root registry.
 *         Anchors both RobotIdentity batch pre-authorizations and
 *         CapabilityRegistry attestation bundles. A `batchId` is an opaque
 *         identifier chosen by the submitter (e.g. keccak256 of OEM + nonce).
 * @dev Only accounts holding ROOT_SUBMITTER_ROLE may commit roots. Roots are
 *      immutable once set for a given batchId to keep proofs verifiable forever.
 */
contract MerkleBatchOracle is AccessControl {
    bytes32 public constant ROOT_SUBMITTER_ROLE = keccak256("ROOT_SUBMITTER_ROLE");

    /// @notice batchId => committed Merkle root
    mapping(bytes32 => bytes32) private _roots;
    /// @notice batchId => block timestamp it was committed
    mapping(bytes32 => uint256) public committedAt;

    event RootSubmitted(bytes32 indexed batchId, bytes32 root, address indexed submitter);

    error RootAlreadySet(bytes32 batchId);
    error RootNotFound(bytes32 batchId);
    error ZeroRoot();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROOT_SUBMITTER_ROLE, admin);
    }

    /**
     * @notice Commit a Merkle root for a batch. Immutable once set.
     * @param batchId Opaque batch identifier.
     * @param root    Merkle root of the batch.
     */
    function submitRoot(bytes32 batchId, bytes32 root) external onlyRole(ROOT_SUBMITTER_ROLE) {
        if (root == bytes32(0)) revert ZeroRoot();
        if (_roots[batchId] != bytes32(0)) revert RootAlreadySet(batchId);
        _roots[batchId] = root;
        committedAt[batchId] = block.timestamp;
        emit RootSubmitted(batchId, root, msg.sender);
    }

    /// @notice Returns the committed root, reverting if the batch is unknown.
    function getRoot(bytes32 batchId) external view returns (bytes32) {
        bytes32 root = _roots[batchId];
        if (root == bytes32(0)) revert RootNotFound(batchId);
        return root;
    }

    /// @notice Non-reverting lookup: returns bytes32(0) when unset.
    function rootOf(bytes32 batchId) external view returns (bytes32) {
        return _roots[batchId];
    }

    /// @notice True once a root has been committed for the batch.
    function exists(bytes32 batchId) external view returns (bool) {
        return _roots[batchId] != bytes32(0);
    }
}
