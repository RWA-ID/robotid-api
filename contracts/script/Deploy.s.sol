// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { MerkleBatchOracle } from "../src/oracle/MerkleBatchOracle.sol";
import { Subscription } from "../src/subscription/Subscription.sol";
import { RobotIdentity } from "../src/core/RobotIdentity.sol";
import { IntentRouter } from "../src/intent/IntentRouter.sol";
import { CapabilityRegistry } from "../src/capability/CapabilityRegistry.sol";
import { OTAVerifier } from "../src/ota/OTAVerifier.sol";

/**
 * @notice Deploys the full robot-id.eth contract suite in dependency order.
 *
 * Env:
 *   ADMIN_PRIVATE_KEY   deployer / owner (server-side registrar key)
 *   TREASURY_ADDRESS    subscription funds + royalty receiver
 *   USDC_ADDRESS        defaults to mainnet USDC if unset
 *
 * Run (mainnet):
 *   forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
 * Run (fork dry-run):
 *   forge script script/Deploy.s.sol --rpc-url $RPC_URL
 */
contract Deploy is Script {
    address constant MAINNET_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function run() external {
        uint256 pk = vm.envUint("ADMIN_PRIVATE_KEY");
        address owner = vm.addr(pk);
        address treasury = vm.envOr("TREASURY_ADDRESS", owner);
        address usdc = vm.envOr("USDC_ADDRESS", MAINNET_USDC);

        vm.startBroadcast(pk);

        MerkleBatchOracle oracle = new MerkleBatchOracle(owner);
        Subscription subscription = new Subscription(usdc, treasury, owner);
        RobotIdentity identity = new RobotIdentity(address(oracle), owner);
        IntentRouter intent = new IntentRouter(address(identity), owner);
        CapabilityRegistry capability = new CapabilityRegistry();
        OTAVerifier ota = new OTAVerifier(address(identity), owner);

        vm.stopBroadcast();

        console2.log("MERKLE_ORACLE_ADDRESS       =", address(oracle));
        console2.log("SUBSCRIPTION_ADDRESS        =", address(subscription));
        console2.log("ROBOT_IDENTITY_ADDRESS      =", address(identity));
        console2.log("INTENT_ROUTER_ADDRESS       =", address(intent));
        console2.log("CAPABILITY_REGISTRY_ADDRESS =", address(capability));
        console2.log("OTA_VERIFIER_ADDRESS        =", address(ota));
        console2.log("USDC_ADDRESS                =", usdc);
        console2.log("TREASURY_ADDRESS            =", treasury);
        console2.log("OWNER                       =", owner);
    }
}
