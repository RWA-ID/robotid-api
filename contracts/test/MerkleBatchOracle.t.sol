// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { MerkleBatchOracle } from "../src/oracle/MerkleBatchOracle.sol";

contract MerkleBatchOracleTest is Test {
    MerkleBatchOracle oracle;
    address admin = makeAddr("admin");
    address submitter = makeAddr("submitter");
    address stranger = makeAddr("stranger");

    bytes32 constant BATCH = keccak256("batch-1");
    bytes32 constant ROOT = keccak256("root-1");

    function setUp() public {
        oracle = new MerkleBatchOracle(admin);
    }

    function test_AdminCanSubmit() public {
        vm.prank(admin);
        oracle.submitRoot(BATCH, ROOT);
        assertEq(oracle.getRoot(BATCH), ROOT);
        assertTrue(oracle.exists(BATCH));
        assertEq(oracle.committedAt(BATCH), block.timestamp);
    }

    function test_GrantedSubmitterCanSubmit() public {
        bytes32 role = oracle.ROOT_SUBMITTER_ROLE();
        vm.prank(admin);
        oracle.grantRole(role, submitter);
        vm.prank(submitter);
        oracle.submitRoot(BATCH, ROOT);
        assertEq(oracle.rootOf(BATCH), ROOT);
    }

    function test_RevertWhen_NonSubmitter() public {
        vm.prank(stranger);
        vm.expectRevert();
        oracle.submitRoot(BATCH, ROOT);
    }

    function test_RevertWhen_RootImmutable() public {
        vm.startPrank(admin);
        oracle.submitRoot(BATCH, ROOT);
        vm.expectRevert(abi.encodeWithSelector(MerkleBatchOracle.RootAlreadySet.selector, BATCH));
        oracle.submitRoot(BATCH, keccak256("other"));
        vm.stopPrank();
    }

    function test_RevertWhen_ZeroRoot() public {
        vm.prank(admin);
        vm.expectRevert(MerkleBatchOracle.ZeroRoot.selector);
        oracle.submitRoot(BATCH, bytes32(0));
    }

    function test_RevertWhen_UnknownBatch() public {
        vm.expectRevert(abi.encodeWithSelector(MerkleBatchOracle.RootNotFound.selector, BATCH));
        oracle.getRoot(BATCH);
        assertEq(oracle.rootOf(BATCH), bytes32(0));
        assertFalse(oracle.exists(BATCH));
    }
}
