// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";

interface INameWrapper {
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/**
 * @notice The parent `robot-id.eth` owner approves the registrar (the API admin
 *         signer) as a NameWrapper operator so it can create OEM subnames when a
 *         `Subscribed` event fires.
 *
 * Env:
 *   ADMIN_PRIVATE_KEY    parent-name owner key
 *   NAMEWRAPPER_ADDRESS  defaults to mainnet NameWrapper
 *   REGISTRAR_OPERATOR   address to approve (the key-provisioning signer)
 *
 * Run:
 *   forge script script/ApproveWrapper.s.sol --rpc-url $RPC_URL --broadcast
 */
contract ApproveWrapper is Script {
    address constant MAINNET_NAMEWRAPPER = 0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401;

    function run() external {
        uint256 pk = vm.envUint("ADMIN_PRIVATE_KEY");
        address operator = vm.envAddress("REGISTRAR_OPERATOR");
        address nw = vm.envOr("NAMEWRAPPER_ADDRESS", MAINNET_NAMEWRAPPER);

        vm.startBroadcast(pk);
        INameWrapper(nw).setApprovalForAll(operator, true);
        vm.stopBroadcast();

        console2.log("Approved operator on NameWrapper:", operator);
        console2.log("isApprovedForAll:", INameWrapper(nw).isApprovedForAll(vm.addr(pk), operator));
    }
}
