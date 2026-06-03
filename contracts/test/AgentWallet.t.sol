// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { AgentWallet } from "../src/core/AgentWallet.sol";

contract Sink {
    uint256 public received;

    function pay() external payable {
        received += msg.value;
    }
}

contract AgentWalletTest is Test {
    AgentWallet wallet;
    Sink vendor;
    Sink other;

    address owner = makeAddr("owner");
    address entryPoint = makeAddr("entryPoint");
    address stranger = makeAddr("stranger");

    function setUp() public {
        wallet = new AgentWallet(owner, entryPoint);
        vendor = new Sink();
        other = new Sink();
        vm.deal(address(wallet), 100 ether);
    }

    function _setRules() internal {
        vm.startPrank(owner);
        // perAction 1 ETH, daily 2 ETH, hardMax 5 ETH, allowlist on
        wallet.setRules(1 ether, 2 ether, 5 ether, true);
        wallet.setVendor(address(vendor), true);
        vm.stopPrank();
    }

    function test_ApprovedVendorWithinLimits() public {
        _setRules();
        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit AgentWallet.AgentExecuted(address(vendor), 0.5 ether, "", bytes32(0));
        wallet.execute(address(vendor), 0.5 ether, abi.encodeWithSignature("pay()"));
        assertEq(vendor.received(), 0.5 ether);
    }

    function test_RevertWhen_VendorNotApproved() public {
        _setRules();
        vm.prank(owner);
        vm.expectRevert(AgentWallet.VendorNotApproved.selector);
        wallet.execute(address(other), 0.1 ether, abi.encodeWithSignature("pay()"));
    }

    function test_RevertWhen_ExceedsPerAction() public {
        _setRules();
        vm.prank(owner);
        vm.expectRevert(AgentWallet.ExceedsPerAction.selector);
        wallet.execute(address(vendor), 1.5 ether, abi.encodeWithSignature("pay()"));
    }

    function test_RevertWhen_ExceedsHardMax() public {
        _setRules();
        vm.prank(owner);
        vm.expectRevert(AgentWallet.ExceedsHardMax.selector);
        wallet.execute(address(vendor), 6 ether, abi.encodeWithSignature("pay()"));
    }

    function test_RevertWhen_ExceedsDaily() public {
        _setRules();
        vm.startPrank(owner);
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        // third would push to 3 ETH > 2 ETH daily ceiling
        vm.expectRevert(AgentWallet.ExceedsDaily.selector);
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        vm.stopPrank();
    }

    function test_DailyWindowResets() public {
        _setRules();
        vm.startPrank(owner);
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        vm.warp(block.timestamp + 1 days);
        wallet.execute(address(vendor), 1 ether, abi.encodeWithSignature("pay()"));
        vm.stopPrank();
        assertEq(vendor.received(), 3 ether);
    }

    function test_RevertWhen_StrangerExecutes() public {
        _setRules();
        vm.prank(stranger);
        vm.expectRevert(AgentWallet.NotAuthorized.selector);
        wallet.execute(address(vendor), 0.1 ether, abi.encodeWithSignature("pay()"));
    }

    function test_EntryPointCanExecute() public {
        _setRules();
        vm.prank(entryPoint);
        wallet.execute(address(vendor), 0.5 ether, abi.encodeWithSignature("pay()"));
        assertEq(vendor.received(), 0.5 ether);
    }

    function test_WouldPass() public {
        _setRules();
        assertTrue(wallet.wouldPass(address(vendor), 1 ether));
        assertFalse(wallet.wouldPass(address(vendor), 1.5 ether)); // perAction
        assertFalse(wallet.wouldPass(address(other), 0.1 ether)); // allowlist
    }
}
