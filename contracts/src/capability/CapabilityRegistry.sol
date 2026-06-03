// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title CapabilityRegistry
 * @notice OEM-signed, append-only attestations of what a robot is *authorized*
 *         to do — the robotics analog of a battery passport. Insurers,
 *         operators, and regulators can verify records independently.
 * @dev Each attestation anchors off-chain detail (cert PDFs, test reports
 *      pinned to IPFS) by a Merkle root. Attestations are immutable once
 *      written; only new ones can be appended.
 */
contract CapabilityRegistry {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

    struct Attestation {
        uint256 robotId;
        bytes32 capabilityKey; // e.g. keccak256("max_payload_kg")
        bytes32 value; // packed/encoded value or hash of the value
        bytes32 merkleRoot; // anchors IPFS-pinned detail
        address oem; // recovered signer (OEM key)
        uint256 timestamp;
    }

    /// @notice global append-only attestation log
    Attestation[] public attestations;

    /// @notice robotId => list of attestation indices
    mapping(uint256 => uint256[]) private _byRobot;
    /// @notice robotId => capabilityKey => latest attestation index + 1 (0 = none)
    mapping(uint256 => mapping(bytes32 => uint256)) private _latest;

    event CapabilityAttested(
        uint256 indexed attestationId,
        uint256 indexed robotId,
        bytes32 indexed capabilityKey,
        bytes32 value,
        bytes32 merkleRoot,
        address oem
    );

    error InvalidSignature();
    error UnknownCapability();

    /**
     * @notice Append an OEM-signed attestation. The signature must cover the
     *         tuple (robotId, capabilityKey, value, merkleRoot); the recovered
     *         signer is recorded as the attesting OEM.
     */
    function attest(
        uint256 robotId,
        bytes32 capabilityKey,
        bytes32 value,
        bytes32 merkleRoot,
        bytes calldata oemSignature
    ) external returns (uint256 attestationId) {
        bytes32 digest = keccak256(abi.encode(robotId, capabilityKey, value, merkleRoot))
            .toEthSignedMessageHash();
        address oem = digest.recover(oemSignature);
        if (oem == address(0)) revert InvalidSignature();

        attestationId = attestations.length;
        attestations.push(
            Attestation({
                robotId: robotId,
                capabilityKey: capabilityKey,
                value: value,
                merkleRoot: merkleRoot,
                oem: oem,
                timestamp: block.timestamp
            })
        );
        _byRobot[robotId].push(attestationId);
        _latest[robotId][capabilityKey] = attestationId + 1;

        emit CapabilityAttested(attestationId, robotId, capabilityKey, value, merkleRoot, oem);
    }

    /**
     * @notice Verify a Merkle proof of off-chain detail against the latest
     *         attestation's root for (robotId, capabilityKey).
     * @param leaf The keccak256 leaf of the detail being proven.
     */
    function verify(uint256 robotId, bytes32 capabilityKey, bytes32 leaf, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        uint256 idxPlus1 = _latest[robotId][capabilityKey];
        if (idxPlus1 == 0) return false;
        bytes32 root = attestations[idxPlus1 - 1].merkleRoot;
        return MerkleProof.verifyCalldata(proof, root, leaf);
    }

    /// @notice Latest attestation for a (robotId, capabilityKey) pair.
    function latest(uint256 robotId, bytes32 capabilityKey)
        external
        view
        returns (Attestation memory)
    {
        uint256 idxPlus1 = _latest[robotId][capabilityKey];
        if (idxPlus1 == 0) revert UnknownCapability();
        return attestations[idxPlus1 - 1];
    }

    /// @notice All attestation indices for a robot (full history).
    function historyOf(uint256 robotId) external view returns (uint256[] memory) {
        return _byRobot[robotId];
    }

    function attestationCount() external view returns (uint256) {
        return attestations.length;
    }
}
