// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Subscription } from "../../src/subscription/Subscription.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice Forked-mainnet integration test (§9.2 #1). Exercises the REAL mainnet
 *         USDC token rather than a mock.
 *
 * Run: RPC_URL=https://eth-mainnet.g.alchemy.com/v2/KEY \
 *        forge test --profile integration --match-path "*Subscription.fork*"
 *
 * Skips automatically when RPC_URL is unset (no testnet-only phase, but CI gates
 * the real fork run before deploy).
 */
contract SubscriptionForkTest is Test {
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    Subscription sub;
    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address oem = makeAddr("oem");

    bool forked;

    function setUp() public {
        string memory rpc = vm.envOr("RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;

        sub = new Subscription(USDC, treasury, owner);
        // Fund the OEM with real USDC via storage cheat.
        deal(USDC, oem, 1_000_000e6, true);
    }

    function test_Lifecycle_SubscribeWarpRenew() public {
        if (!forked) {
            emit log("SKIP: RPC_URL not set - skipping forked-mainnet integration");
            return;
        }

        // subscribe(OEM)
        vm.startPrank(oem);
        IERC20(USDC).approve(address(sub), type(uint256).max);

        vm.expectEmit(true, false, false, true);
        emit Subscription.Subscribed(oem, Subscription.Tier.OEM, block.timestamp + 30 days);
        sub.subscribe(Subscription.Tier.OEM);
        vm.stopPrank();

        assertTrue(sub.isActive(oem));
        assertEq(IERC20(USDC).balanceOf(treasury), 7_500e6);

        // warp past 30 days → lapse
        vm.warp(block.timestamp + 31 days);
        assertFalse(sub.isActive(oem));

        // renew → extends from now
        vm.prank(oem);
        sub.subscribe(Subscription.Tier.OEM);
        assertTrue(sub.isActive(oem));
        assertEq(IERC20(USDC).balanceOf(treasury), 15_000e6);
    }

    function test_RevertWhen_NoAllowance() public {
        if (!forked) return;
        address broke = makeAddr("broke");
        deal(USDC, broke, 100_000e6, true);
        vm.prank(broke);
        vm.expectRevert(); // ERC20 allowance failure on real USDC
        sub.subscribe(Subscription.Tier.OEM);
    }
}
