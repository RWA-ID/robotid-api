// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { RobotIdOffchainResolver } from "../src/resolver/RobotIdOffchainResolver.sol";

/**
 * @notice Deploy the CCIP-Read wildcard resolver for `*.robot-id.eth`.
 *
 * Env:
 *   ADMIN_PRIVATE_KEY        deployer; becomes owner (must also own robot-id.eth
 *                            to later setResolver on the node)
 *   RESOLVER_GATEWAY_URL     templated GET form, e.g.
 *                            "https://<host>/{sender}/{data}.json"  <-- REQUIRED form
 *   GATEWAY_SIGNER_ADDRESS   the address derived from the gateway's GATEWAY_SIGNER_KEY
 *
 * Run:
 *   forge script script/DeployResolver.s.sol --rpc-url $RPC_URL --broadcast \
 *     --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployResolver is Script {
    function run() external {
        uint256 pk = vm.envUint("ADMIN_PRIVATE_KEY");
        string memory url = vm.envString("RESOLVER_GATEWAY_URL");
        address signer = vm.envAddress("GATEWAY_SIGNER_ADDRESS");

        require(bytes(url).length > 0, "RESOLVER_GATEWAY_URL unset");
        require(
            _contains(url, "{sender}") && _contains(url, "{data}"),
            "URL must be templated GET form .../{sender}/{data}.json (Trust Wallet requirement)"
        );

        string[] memory urls = new string[](1);
        urls[0] = url;

        vm.startBroadcast(pk);
        RobotIdOffchainResolver resolver =
            new RobotIdOffchainResolver(vm.addr(pk), urls, signer);
        vm.stopBroadcast();

        console2.log("RobotIdOffchainResolver:", address(resolver));
        console2.log("owner:", vm.addr(pk));
        console2.log("trusted signer:", signer);
        console2.log("gateway url:", url);
        console2.log("NEXT: setResolver(node) on the NameWrapper/registry to this address.");
    }

    /// @dev minimal substring check (no library, view-free).
    function _contains(string memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(haystack);
        bytes memory n = bytes(needle);
        if (n.length == 0 || n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
