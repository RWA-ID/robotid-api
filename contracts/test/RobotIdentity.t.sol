// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { RobotIdentity } from "../src/core/RobotIdentity.sol";
import { MerkleBatchOracle } from "../src/oracle/MerkleBatchOracle.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract RobotIdentityTest is Test {
    RobotIdentity id;
    MerkleBatchOracle oracle;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        oracle = new MerkleBatchOracle(owner);
        id = new RobotIdentity(address(oracle), owner);
    }

    function _register(address to, string memory serial, bool locked) internal returns (uint256) {
        vm.prank(owner);
        return id.registerRobot(
            to,
            keccak256(bytes(serial)),
            "Boston Dynamics",
            "Spot",
            "quadruped-inspection",
            1,
            locked,
            "ipfs://QmRobot"
        );
    }

    function test_RegisterTransferable() public {
        uint256 tokenId = _register(alice, "SN-1", false);
        assertEq(id.ownerOf(tokenId), alice);
        assertEq(id.tokenURI(tokenId), "ipfs://QmRobot");
        assertFalse(id.locked(tokenId));
        assertEq(id.totalMinted(), 1);
    }

    function test_TransferableTransfers() public {
        uint256 tokenId = _register(alice, "SN-1", false);
        vm.prank(alice);
        id.transferFrom(alice, bob, tokenId);
        assertEq(id.ownerOf(tokenId), bob);
    }

    function test_RevertWhen_SoulboundTransfer() public {
        uint256 tokenId = _register(alice, "SN-2", true);
        assertTrue(id.locked(tokenId));
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(RobotIdentity.Soulbound.selector, tokenId));
        id.transferFrom(alice, bob, tokenId);
    }

    function test_RevertWhen_DuplicateSerial() public {
        _register(alice, "SN-3", false);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(RobotIdentity.SerialAlreadyMinted.selector, keccak256("SN-3"))
        );
        id.registerRobot(bob, keccak256("SN-3"), "M", "X", "c", 1, false, "ipfs://x");
    }

    function test_RevertWhen_NotRegistrar() public {
        vm.prank(alice);
        vm.expectRevert(RobotIdentity.NotRegistrar.selector);
        id.registerRobot(alice, keccak256("SN-X"), "M", "X", "c", 1, false, "ipfs://x");
    }

    function test_FirmwareMonotonic() public {
        uint256 tokenId = _register(alice, "SN-4", false);
        vm.prank(owner);
        id.setFirmwareVersion(tokenId, 5);
        (,,,, uint32 v,,) = id.robots(tokenId);
        assertEq(v, 5);

        vm.prank(owner);
        vm.expectRevert(RobotIdentity.FirmwareNotMonotonic.selector);
        id.setFirmwareVersion(tokenId, 5);
    }

    // ── Merkle batch claim ──────────────────────────────────────────────────

    function _leaf(bytes32 serialHash, address to, bool locked) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(serialHash, to, locked))));
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function test_ClaimWithProof() public {
        bytes32 serialA = keccak256("UNIT-A");
        bytes32 serialB = keccak256("UNIT-B");
        bytes32 leafA = _leaf(serialA, alice, false);
        bytes32 leafB = _leaf(serialB, bob, true);
        bytes32 root = _hashPair(leafA, leafB);

        bytes32 batchId = keccak256("batch-claim");
        vm.prank(owner);
        oracle.submitRoot(batchId, root);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafB;

        uint256 tokenId = id.claimWithProof(
            batchId, proof, alice, serialA, "Unitree", "Go2", "quadruped", 2, false, "ipfs://a"
        );
        assertEq(id.ownerOf(tokenId), alice);
        assertTrue(id.claimed(batchId, serialA));
    }

    function test_RevertWhen_ClaimTwice() public {
        bytes32 serialA = keccak256("UNIT-A");
        bytes32 leafA = _leaf(serialA, alice, false);
        bytes32 root = leafA; // single-leaf tree: root == leaf

        bytes32 batchId = keccak256("batch-single");
        vm.prank(owner);
        oracle.submitRoot(batchId, root);

        bytes32[] memory proof = new bytes32[](0);
        id.claimWithProof(batchId, proof, alice, serialA, "U", "G", "c", 2, false, "ipfs://a");

        // claimed-guard fires before the serial guard
        vm.expectRevert(RobotIdentity.AlreadyClaimed.selector);
        id.claimWithProof(batchId, proof, alice, serialA, "U", "G", "c", 2, false, "ipfs://a");
    }

    function test_RevertWhen_TamperedProof() public {
        bytes32 serialA = keccak256("UNIT-A");
        bytes32 leafA = _leaf(serialA, alice, false);
        bytes32 batchId = keccak256("batch-bad");
        vm.prank(owner);
        oracle.submitRoot(batchId, leafA);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = keccak256("garbage");
        vm.expectRevert(RobotIdentity.InvalidProof.selector);
        id.claimWithProof(batchId, proof, alice, serialA, "U", "G", "c", 2, false, "ipfs://a");
    }

    function test_SupportsERC5192() public view {
        assertTrue(id.supportsInterface(0xb45a3c0e)); // ERC-5192
        assertTrue(id.supportsInterface(0x80ac58cd)); // ERC-721
        assertTrue(id.supportsInterface(0x2a55205a)); // ERC-2981
    }
}
