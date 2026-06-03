// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { CapabilityRegistry } from "../src/capability/CapabilityRegistry.sol";

contract CapabilityRegistryTest is Test {
    CapabilityRegistry reg;

    uint256 oemPk = 0xA11CE;
    address oem;

    uint256 constant ROBOT = 1;
    bytes32 constant KEY = keccak256("max_payload_kg");

    function setUp() public {
        reg = new CapabilityRegistry();
        oem = vm.addr(oemPk);
    }

    function _sign(uint256 robotId, bytes32 key, bytes32 value, bytes32 root)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = keccak256(abi.encode(robotId, key, value, root));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oemPk, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    function test_AttestRecoversOEM() public {
        bytes32 value = bytes32(uint256(50));
        bytes32 root = keccak256("certs-root");
        bytes memory sig = _sign(ROBOT, KEY, value, root);

        uint256 attId = reg.attest(ROBOT, KEY, value, root, sig);
        assertEq(attId, 0);

        CapabilityRegistry.Attestation memory a = reg.latest(ROBOT, KEY);
        assertEq(a.oem, oem);
        assertEq(a.value, value);
        assertEq(a.merkleRoot, root);
    }

    function test_RevertWhen_BadSignature() public {
        bytes memory badSig = new bytes(65);
        vm.expectRevert();
        reg.attest(ROBOT, KEY, bytes32(0), bytes32(uint256(1)), badSig);
    }

    function test_HistoryAppendOnly() public {
        bytes32 root1 = keccak256("root1");
        bytes32 root2 = keccak256("root2");
        reg.attest(
            ROBOT, KEY, bytes32(uint256(50)), root1, _sign(ROBOT, KEY, bytes32(uint256(50)), root1)
        );
        reg.attest(
            ROBOT, KEY, bytes32(uint256(75)), root2, _sign(ROBOT, KEY, bytes32(uint256(75)), root2)
        );

        uint256[] memory hist = reg.historyOf(ROBOT);
        assertEq(hist.length, 2);
        assertEq(reg.attestationCount(), 2);

        // latest reflects most recent root; old attestation unchanged
        assertEq(reg.latest(ROBOT, KEY).merkleRoot, root2);
        (,,, bytes32 storedRoot1,,) = reg.attestations(0);
        assertEq(storedRoot1, root1);
    }

    function test_VerifyProof() public {
        // 2-leaf tree
        bytes32 leaf0 = keccak256(bytes.concat(keccak256("cert-A")));
        bytes32 leaf1 = keccak256(bytes.concat(keccak256("cert-B")));
        bytes32 root = leaf0 < leaf1
            ? keccak256(abi.encode(leaf0, leaf1))
            : keccak256(abi.encode(leaf1, leaf0));

        reg.attest(ROBOT, KEY, bytes32(0), root, _sign(ROBOT, KEY, bytes32(0), root));

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leaf1;
        assertTrue(reg.verify(ROBOT, KEY, leaf0, proof));

        // tampered
        proof[0] = keccak256("garbage");
        assertFalse(reg.verify(ROBOT, KEY, leaf0, proof));
    }

    function test_VerifyUnknownReturnsFalse() public view {
        bytes32[] memory proof = new bytes32[](0);
        assertFalse(reg.verify(99, KEY, bytes32(0), proof));
    }
}
