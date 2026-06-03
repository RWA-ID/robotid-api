// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { OTAVerifier } from "../src/ota/OTAVerifier.sol";
import { RobotIdentity } from "../src/core/RobotIdentity.sol";
import { MerkleBatchOracle } from "../src/oracle/MerkleBatchOracle.sol";

contract OTAVerifierTest is Test {
    OTAVerifier ota;
    RobotIdentity id;
    MerkleBatchOracle oracle;

    address owner = makeAddr("owner");
    address robotOwner = makeAddr("robotOwner");

    uint256 oemPk = 0xBEEF;
    address oem;
    uint256 wrongPk = 0xDEAD;

    uint256 robotId;

    function setUp() public {
        oracle = new MerkleBatchOracle(owner);
        id = new RobotIdentity(address(oracle), owner);
        ota = new OTAVerifier(address(id), owner);
        oem = vm.addr(oemPk);

        vm.prank(owner);
        ota.setOEMKey(oem, true);

        // robot currently at firmware v3
        vm.prank(owner);
        robotId =
            id.registerRobot(robotOwner, keccak256("SN-1"), "M", "X", "c", 3, false, "ipfs://x");
    }

    function _sign(uint256 pk, bytes32 fwHash, uint32 version)
        internal
        pure
        returns (bytes memory)
    {
        bytes32 digest = keccak256(abi.encode(fwHash, version));
        bytes32 ethSigned = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSigned);
        return abi.encodePacked(r, s, v);
    }

    function test_ValidSignatureVerifies() public view {
        bytes32 fw = keccak256("firmware-v4");
        bytes memory sig = _sign(oemPk, fw, 4);
        assertTrue(ota.verify(fw, 4, sig, oem));
    }

    function test_WrongSignerFails() public {
        bytes32 fw = keccak256("firmware-v4");
        bytes memory sig = _sign(wrongPk, fw, 4);
        address wrong = vm.addr(wrongPk);
        assertFalse(ota.verify(fw, 4, sig, wrong)); // not a registered key
        assertFalse(ota.verify(fw, 4, sig, oem)); // recovered != claimed
    }

    function test_VerifyForRobot_AcceptsUpgrade() public view {
        bytes32 fw = keccak256("firmware-v4");
        bytes memory sig = _sign(oemPk, fw, 4);
        assertTrue(ota.verifyForRobot(robotId, fw, 4, sig, oem));
    }

    function test_VerifyForRobot_RejectsDowngrade() public view {
        bytes32 fw = keccak256("firmware-v2");
        bytes memory sig = _sign(oemPk, fw, 2); // robot is at v3
        assertFalse(ota.verifyForRobot(robotId, fw, 2, sig, oem));
    }

    function test_VerifyForRobot_RejectsSameVersion() public view {
        bytes32 fw = keccak256("firmware-v3");
        bytes memory sig = _sign(oemPk, fw, 3);
        assertFalse(ota.verifyForRobot(robotId, fw, 3, sig, oem));
    }

    function test_RevokedKeyFails() public {
        vm.prank(owner);
        ota.setOEMKey(oem, false);
        bytes32 fw = keccak256("firmware-v4");
        bytes memory sig = _sign(oemPk, fw, 4);
        assertFalse(ota.verify(fw, 4, sig, oem));
    }
}
