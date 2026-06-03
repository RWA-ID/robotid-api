// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";

interface INameWrapper {
    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);
}

/**
 * @notice Bulk-register unit subnames under an OEM zone
 *         (`SN-X.mfr.robot-id.eth`). Mirrors the bulk-register pattern from the
 *         onchain-id-protocol repo. Labels + owners are read from a JSON file so
 *         the API can stage large batches off-chain.
 *
 * Env:
 *   ADMIN_PRIVATE_KEY    registrar key (must be NameWrapper operator on parent)
 *   NAMEWRAPPER_ADDRESS  defaults to mainnet NameWrapper
 *   PUBLIC_RESOLVER      defaults to mainnet PublicResolver
 *   PARENT_NODE          namehash of mfr.robot-id.eth (bytes32)
 *   BULK_JSON            path to JSON: { "labels": [...], "owners": [...] }
 *
 * Run:
 *   forge script script/RegisterBulk.s.sol --rpc-url $RPC_URL --broadcast
 */
contract RegisterBulk is Script {
    address constant MAINNET_NAMEWRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;
    address constant MAINNET_PUBLIC_RESOLVER = 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63;

    function run() external {
        uint256 pk = vm.envUint("ADMIN_PRIVATE_KEY");
        bytes32 parentNode = vm.envBytes32("PARENT_NODE");
        address nw = vm.envOr("NAMEWRAPPER_ADDRESS", MAINNET_NAMEWRAPPER);
        address resolver = vm.envOr("PUBLIC_RESOLVER", MAINNET_PUBLIC_RESOLVER);
        string memory path = vm.envOr("BULK_JSON", string("./script/bulk.example.json"));

        string memory json = vm.readFile(path);
        string[] memory labels = vm.parseJsonStringArray(json, ".labels");
        address[] memory owners = vm.parseJsonAddressArray(json, ".owners");
        require(labels.length == owners.length, "labels/owners length mismatch");

        vm.startBroadcast(pk);
        for (uint256 i = 0; i < labels.length; i++) {
            INameWrapper(nw)
                .setSubnodeRecord(
                    parentNode, labels[i], owners[i], resolver, 0, 0, type(uint64).max
                );
            console2.log("registered:", labels[i]);
        }
        vm.stopBroadcast();

        console2.log("Bulk-registered units:", labels.length);
    }
}
