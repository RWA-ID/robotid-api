// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Subscription } from "../src/subscription/Subscription.sol";
import { MockUSDC } from "./mocks/MockUSDC.sol";

contract SubscriptionTest is Test {
    Subscription sub;
    MockUSDC usdc;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address oem = makeAddr("oem");

    function setUp() public {
        usdc = new MockUSDC();
        sub = new Subscription(address(usdc), treasury, owner);
        usdc.mint(oem, 1_000_000e6);
    }

    function test_DefaultPrices() public view {
        assertEq(sub.price(Subscription.Tier.SmallManufacturer), 5_000e6);
        assertEq(sub.price(Subscription.Tier.OEM), 7_500e6);
        assertEq(sub.price(Subscription.Tier.Enterprise), 12_500e6);
    }

    function test_Subscribe() public {
        vm.startPrank(oem);
        usdc.approve(address(sub), 7_500e6);
        vm.expectEmit(true, false, false, true);
        emit Subscription.Subscribed(oem, Subscription.Tier.OEM, block.timestamp + 30 days);
        sub.subscribe(Subscription.Tier.OEM);
        vm.stopPrank();

        assertTrue(sub.isActive(oem));
        assertEq(uint8(sub.tierOf(oem)), uint8(Subscription.Tier.OEM));
        assertEq(sub.expiry(oem), block.timestamp + 30 days);
        assertEq(usdc.balanceOf(treasury), 7_500e6);
    }

    function test_RevertWhen_InsufficientAllowance() public {
        vm.prank(oem);
        vm.expectRevert();
        sub.subscribe(Subscription.Tier.OEM);
    }

    function test_Expiry_LapsesAfter30Days() public {
        _subscribe(Subscription.Tier.SmallManufacturer, 5_000e6);
        assertTrue(sub.isActive(oem));
        vm.warp(block.timestamp + 30 days);
        assertFalse(sub.isActive(oem)); // strict: < expiry
    }

    function test_Renew_ExtendsFromCurrentExpiry() public {
        _subscribe(Subscription.Tier.OEM, 7_500e6);
        uint256 firstExpiry = sub.expiry(oem);

        // renew before expiry → extends from current expiry
        vm.warp(block.timestamp + 10 days);
        _subscribe(Subscription.Tier.OEM, 7_500e6);
        assertEq(sub.expiry(oem), firstExpiry + 30 days);
    }

    function test_Renew_AfterExpiry_ExtendsFromNow() public {
        _subscribe(Subscription.Tier.OEM, 7_500e6);
        vm.warp(block.timestamp + 40 days); // lapsed
        assertFalse(sub.isActive(oem));
        _subscribe(Subscription.Tier.OEM, 7_500e6);
        assertEq(sub.expiry(oem), block.timestamp + 30 days);
        assertTrue(sub.isActive(oem));
    }

    function test_SetPrice() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Subscription.PriceUpdated(Subscription.Tier.Enterprise, 12_500e6, 20_000e6);
        sub.setPrice(Subscription.Tier.Enterprise, 20_000e6);
        assertEq(sub.price(Subscription.Tier.Enterprise), 20_000e6);
    }

    function test_RevertWhen_NonOwnerSetsPrice() public {
        vm.prank(oem);
        vm.expectRevert();
        sub.setPrice(Subscription.Tier.OEM, 1);
    }

    function _subscribe(Subscription.Tier tier, uint256 amount) internal {
        vm.startPrank(oem);
        usdc.approve(address(sub), amount);
        sub.subscribe(tier);
        vm.stopPrank();
    }
}
