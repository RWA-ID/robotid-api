// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import {
    RobotIdOffchainResolver,
    IExtendedResolver,
    IResolverService
} from "../src/resolver/RobotIdOffchainResolver.sol";

/// @dev Mirrors the gateway's signResult() so we prove the on-chain verifier
///      accepts exactly what ccip-gateway/src/index.ts produces.
contract RobotIdOffchainResolverTest is Test {
    RobotIdOffchainResolver resolver;
    address owner = address(0xA0);
    uint256 signerPk = 0xA11CE;
    address signerAddr;

    // dnsname-encoded "spot-0001.boston-dynamics.robot-id.eth" is irrelevant to
    // the verifier; any bytes work since the signature binds the request blob.
    bytes name = hex"04746573740b726f626f742d69640365746800";
    bytes data = abi.encodeWithSelector(bytes4(0x3b3b57de), bytes32(uint256(1))); // addr(node)

    function setUp() public {
        signerAddr = vm.addr(signerPk);
        string[] memory urls = new string[](1);
        urls[0] = "https://gw.example/{sender}/{data}.json";
        resolver = new RobotIdOffchainResolver(owner, urls, signerAddr);
    }

    function _sign(bytes memory request, bytes memory result, uint64 expires)
        internal
        view
        returns (bytes memory response)
    {
        bytes32 h = keccak256(
            abi.encodePacked(
                hex"1900", address(resolver), expires, keccak256(request), keccak256(result)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, h);
        response = abi.encode(result, expires, abi.encodePacked(r, s, v));
    }

    function test_resolve_revertsOffchainLookup() public view {
        (bool ok, bytes memory ret) =
            address(resolver).staticcall(abi.encodeCall(IExtendedResolver.resolve, (name, data)));
        assertFalse(ok);
        assertEq(bytes4(ret), RobotIdOffchainResolver.OffchainLookup.selector);
    }

    function test_resolveWithProof_validSignature() public view {
        bytes memory request = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        bytes memory result = abi.encode(address(0xBEEF));
        uint64 expires = uint64(block.timestamp + 300);
        bytes memory got = resolver.resolveWithProof(_sign(request, result, expires), request);
        assertEq(got, result);
        assertEq(abi.decode(got, (address)), address(0xBEEF));
    }

    function test_resolveWithProof_rejectsUntrustedSigner() public {
        bytes memory request = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        bytes memory result = abi.encode(address(0xBEEF));
        uint64 expires = uint64(block.timestamp + 300);
        bytes32 h = keccak256(
            abi.encodePacked(
                hex"1900", address(resolver), expires, keccak256(request), keccak256(result)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBADBAD, h); // not a trusted signer
        bytes memory response = abi.encode(result, expires, abi.encodePacked(r, s, v));
        vm.expectRevert("RobotIdResolver: untrusted signer");
        resolver.resolveWithProof(response, request);
    }

    function test_resolveWithProof_rejectsExpired() public {
        bytes memory request = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        bytes memory result = abi.encode(address(0xBEEF));
        vm.warp(1000);
        uint64 expires = uint64(block.timestamp - 1); // already expired
        vm.expectRevert("RobotIdResolver: signature expired");
        resolver.resolveWithProof(_sign(request, result, expires), request);
    }

    function test_supportsInterface() public view {
        assertTrue(resolver.supportsInterface(type(IExtendedResolver).interfaceId)); // 0x9061b923
        assertTrue(resolver.supportsInterface(0x01ffc9a7)); // ERC-165
        assertFalse(resolver.supportsInterface(0xffffffff));
    }

    function test_setUrls_onlyOwner() public {
        string[] memory u = new string[](1);
        u[0] = "https://new.example/{sender}/{data}.json";
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        resolver.setUrls(u);
        vm.prank(owner);
        resolver.setUrls(u);
        assertEq(resolver.urls(0), u[0]);
    }

    function test_setSigner_onlyOwner() public {
        vm.prank(owner);
        resolver.setSigner(address(0x1234), true);
        assertTrue(resolver.signers(address(0x1234)));
    }
}
