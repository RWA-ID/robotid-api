// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @dev ENSIP-10 wildcard resolution entrypoint. interfaceId == 0x9061b923.
interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

/// @dev The off-chain gateway implements this shape; its selector (0x9061b923)
///      is what we embed in the OffchainLookup callData and what the gateway
///      decodes. The return tuple matches the signed response the gateway sends.
interface IResolverService {
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        returns (bytes memory result, uint64 expires, bytes memory sig);
}

/**
 * @title RobotIdOffchainResolver
 * @notice EIP-3668 (CCIP-Read) wildcard resolver for `*.robot-id.eth`. Every
 *         query reverts with `OffchainLookup` pointing at the trusted gateway,
 *         whose signed response is verified on-chain in `resolveWithProof`.
 *
 *         Only the OEM namespace (`<oem>.robot-id.eth`) is ever written on-chain;
 *         the 100k+ unit names beneath it are resolved entirely here, gas-free.
 *
 * @dev    Hardened per hard-won CCIP lessons:
 *         - `urls` MUST be the templated GET form ".../{sender}/{data}.json".
 *           Trust Wallet only follows the templated GET form; a bare/POST-only
 *           URL resolves everywhere EXCEPT Trust Wallet, silently.
 *         - `supportsInterface` returns true for IExtendedResolver so wallets
 *           take the wildcard `resolve()` path instead of legacy record reads.
 *         - signers is a public mapping (use the getter; never a slot scan).
 */
contract RobotIdOffchainResolver is IExtendedResolver, Ownable {
    using ECDSA for bytes32;

    /// @dev EIP-3668: thrown to redirect the client to the off-chain gateway.
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    string[] public urls;
    mapping(address => bool) public signers;

    event UrlsChanged(string[] urls);
    event SignerChanged(address indexed signer, bool allowed);

    constructor(address owner_, string[] memory urls_, address trustedSigner)
        Ownable(owner_)
    {
        urls = urls_;
        signers[trustedSigner] = true;
        emit UrlsChanged(urls_);
        emit SignerChanged(trustedSigner, true);
    }

    /// @notice Set the gateway URL list. Use the templated GET form, e.g.
    ///         "https://gateway.example/{sender}/{data}.json".
    function setUrls(string[] calldata urls_) external onlyOwner {
        urls = urls_;
        emit UrlsChanged(urls_);
    }

    /// @notice Allow/deny a gateway response signer.
    function setSigner(address signer, bool allowed) external onlyOwner {
        signers[signer] = allowed;
        emit SignerChanged(signer, allowed);
    }

    /// @inheritdoc IExtendedResolver
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        override
        returns (bytes memory)
    {
        bytes memory callData = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        revert OffchainLookup(
            address(this),
            urls,
            callData,
            this.resolveWithProof.selector,
            callData // extraData == request: bound into the signature below
        );
    }

    /// @notice EIP-3668 callback. Verifies the gateway's signature and returns
    ///         the resolved record bytes.
    function resolveWithProof(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        (bytes memory result, uint64 expires, bytes memory sig) =
            abi.decode(response, (bytes, uint64, bytes));
        require(expires >= block.timestamp, "RobotIdResolver: signature expired");

        // Must match the gateway's signResult():
        //   keccak256(0x1900 ++ target ++ expires ++ keccak256(request) ++ keccak256(result))
        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1900",
                address(this),
                expires,
                keccak256(extraData),
                keccak256(result)
            )
        );
        address signer = hash.recover(sig);
        require(signers[signer], "RobotIdResolver: untrusted signer");
        return result;
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == type(IExtendedResolver).interfaceId // 0x9061b923
            || interfaceID == 0x01ffc9a7; // ERC-165
    }
}
