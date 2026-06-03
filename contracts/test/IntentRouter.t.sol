// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { IntentRouter } from "../src/intent/IntentRouter.sol";
import { AgentWallet } from "../src/core/AgentWallet.sol";
import { RobotIdentity } from "../src/core/RobotIdentity.sol";
import { MerkleBatchOracle } from "../src/oracle/MerkleBatchOracle.sol";

contract IntentRouterTest is Test {
    IntentRouter router;
    AgentWallet wallet;
    RobotIdentity id;
    MerkleBatchOracle oracle;

    address owner = makeAddr("owner");
    address robotOwner = makeAddr("robotOwner");
    address vendor = makeAddr("vendor");
    address stranger = makeAddr("stranger");

    uint256 robotId;

    function setUp() public {
        oracle = new MerkleBatchOracle(owner);
        id = new RobotIdentity(address(oracle), owner);
        router = new IntentRouter(address(id), owner);

        // robotOwner controls the wallet
        wallet = new AgentWallet(robotOwner, address(0));
        vm.startPrank(robotOwner);
        wallet.setRules(1 ether, 2 ether, 5 ether, true);
        wallet.setVendor(vendor, true);
        vm.stopPrank();

        vm.prank(owner);
        robotId =
            id.registerRobot(robotOwner, keccak256("SN-1"), "M", "X", "c", 1, false, "ipfs://x");

        vm.prank(owner);
        router.linkWallet(robotId, address(wallet));
    }

    function test_ValidIntentAuthorized() public {
        vm.prank(robotOwner);
        vm.expectEmit(true, true, false, false);
        emit IntentRouter.IntentExecuted(
            0, robotId, keccak256("cmd"), vendor, 0.5 ether, robotOwner
        );
        (uint256 intentId, bool ok) =
            router.submitIntent(robotId, keccak256("cmd"), vendor, 0.5 ether);
        assertTrue(ok);
        assertEq(intentId, 0);
        assertEq(router.intentCount(), 1);
    }

    function test_RejectWhen_ExceedsLimits() public {
        vm.prank(robotOwner);
        (, bool ok) = router.submitIntent(robotId, keccak256("cmd"), vendor, 2 ether); // > perAction
        assertFalse(ok);
        (,,,,,, bool authorized, IntentRouter.RejectReason reason) = router.intents(0);
        assertFalse(authorized);
        assertEq(uint8(reason), uint8(IntentRouter.RejectReason.LimitsExceeded));
    }

    function test_RejectWhen_VendorNotApproved() public {
        vm.prank(robotOwner);
        (, bool ok) = router.submitIntent(robotId, keccak256("cmd"), stranger, 0.1 ether);
        assertFalse(ok);
    }

    function test_RejectWhen_NotOperator() public {
        vm.prank(stranger);
        (, bool ok) = router.submitIntent(robotId, keccak256("cmd"), vendor, 0.5 ether);
        assertFalse(ok);
        (,,,,,,, IntentRouter.RejectReason reason) = router.intents(0);
        assertEq(uint8(reason), uint8(IntentRouter.RejectReason.NotRobotOperator));
    }

    function test_RejectWhen_NoWallet() public {
        vm.prank(owner);
        uint256 other =
            id.registerRobot(robotOwner, keccak256("SN-9"), "M", "X", "c", 1, false, "ipfs://x");
        vm.prank(robotOwner);
        (, bool ok) = router.submitIntent(other, keccak256("cmd"), vendor, 0.1 ether);
        assertFalse(ok);
    }

    function test_RateLimiting() public {
        vm.prank(owner);
        router.setRateConfig(2, 1 minutes);

        vm.startPrank(robotOwner);
        (, bool ok1) = router.submitIntent(robotId, keccak256("a"), vendor, 0.1 ether);
        (, bool ok2) = router.submitIntent(robotId, keccak256("b"), vendor, 0.1 ether);
        (, bool ok3) = router.submitIntent(robotId, keccak256("c"), vendor, 0.1 ether);
        vm.stopPrank();
        assertTrue(ok1);
        assertTrue(ok2);
        assertFalse(ok3); // rate limited

        vm.warp(block.timestamp + 61);
        vm.prank(robotOwner);
        (, bool ok4) = router.submitIntent(robotId, keccak256("d"), vendor, 0.1 ether);
        assertTrue(ok4);
    }
}
