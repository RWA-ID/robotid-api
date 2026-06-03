// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { RobotIdentity } from "../../src/core/RobotIdentity.sol";
import { MerkleBatchOracle } from "../../src/oracle/MerkleBatchOracle.sol";

/**
 * @notice Integration test (§9.2 #2): preauthorize a batch → commit root via
 *         MerkleBatchOracle → claimWithProof for a sampled unit → assert
 *         ownership. Mirrors what the API's /batch/preauthorize endpoint builds.
 */
contract BatchClaimIntegrationTest is Test {
    RobotIdentity id;
    MerkleBatchOracle oracle;
    address owner = makeAddr("owner");

    uint256 constant N = 64; // sampled batch (prod supports up to 100k)

    bytes32[] leaves;
    address[] claimers;
    bytes32[] serials;

    function setUp() public {
        oracle = new MerkleBatchOracle(owner);
        id = new RobotIdentity(address(oracle), owner);

        for (uint256 i = 0; i < N; i++) {
            address claimer = address(uint160(0x1000 + i));
            bytes32 serial = keccak256(abi.encodePacked("SN-", i));
            claimers.push(claimer);
            serials.push(serial);
            leaves.push(keccak256(bytes.concat(keccak256(abi.encode(serial, claimer, false)))));
        }
    }

    function test_FullBatchPath() public {
        bytes32 root = _buildRoot(leaves);
        bytes32 batchId = keccak256("oem-batch-001");

        vm.prank(owner);
        oracle.submitRoot(batchId, root);
        assertEq(oracle.getRoot(batchId), root);

        // sample a few units and claim each with its proof
        uint256[3] memory sampleIdx = [uint256(0), 7, N - 1];
        for (uint256 s = 0; s < 3; s++) {
            uint256 i = sampleIdx[s];
            bytes32[] memory proof = _proof(leaves, i);

            uint256 tokenId = id.claimWithProof(
                batchId,
                proof,
                claimers[i],
                serials[i],
                "Unitree",
                "Go2",
                "quadruped",
                1,
                false,
                "ipfs://unit"
            );
            assertEq(id.ownerOf(tokenId), claimers[i]);
            assertTrue(id.claimed(batchId, serials[i]));
        }
    }

    // ── OZ-compatible (sorted-pair) Merkle helpers ──────────────────────────

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function _buildRoot(bytes32[] memory level) internal pure returns (bytes32) {
        while (level.length > 1) {
            uint256 n = (level.length + 1) / 2;
            bytes32[] memory next = new bytes32[](n);
            for (uint256 i = 0; i < n; i++) {
                uint256 l = 2 * i;
                uint256 r = l + 1;
                next[i] = r < level.length ? _hashPair(level[l], level[r]) : level[l];
            }
            level = next;
        }
        return level[0];
    }

    function _proof(bytes32[] memory level, uint256 index)
        internal
        pure
        returns (bytes32[] memory)
    {
        bytes32[] memory tmp = new bytes32[](64);
        uint256 count;
        uint256 idx = index;
        while (level.length > 1) {
            uint256 sibling = idx ^ 1;
            if (sibling < level.length) {
                tmp[count++] = level[sibling];
            }
            uint256 n = (level.length + 1) / 2;
            bytes32[] memory next = new bytes32[](n);
            for (uint256 i = 0; i < n; i++) {
                uint256 l = 2 * i;
                uint256 r = l + 1;
                next[i] = r < level.length ? _hashPair(level[l], level[r]) : level[l];
            }
            level = next;
            idx /= 2;
        }
        bytes32[] memory out = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            out[i] = tmp[i];
        }
        return out;
    }
}
