// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IRobotFirmware {
    function robots(uint256 tokenId)
        external
        view
        returns (
            bytes32 serialHash,
            string memory manufacturer,
            string memory model,
            string memory capabilityClass,
            uint32 firmwareVersion,
            uint256 registrationDate,
            bool locked
        );
}

/**
 * @title OTAVerifier
 * @notice ECDSA firmware-signature gate. A robot's controller calls `verify`
 *         before accepting an over-the-air update. The signature must be
 *         produced by an OEM key registered for the manufacturer, and the new
 *         firmware version must not be a downgrade relative to the unit's
 *         on-chain `RobotIdentity.firmwareVersion`.
 */
contract OTAVerifier is Ownable {
    using MessageHashUtils for bytes32;
    using ECDSA for bytes32;

    IRobotFirmware public immutable robotIdentity;

    /// @notice OEM signer => authorized
    mapping(address => bool) public oemKey;

    event OEMKeySet(address indexed oem, bool authorized);

    constructor(address _robotIdentity, address _owner) Ownable(_owner) {
        robotIdentity = IRobotFirmware(_robotIdentity);
    }

    function setOEMKey(address oem, bool authorized) external onlyOwner {
        oemKey[oem] = authorized;
        emit OEMKeySet(oem, authorized);
    }

    /**
     * @notice Verify a firmware blob signature against a claimed OEM key.
     * @param firmwareHash keccak256 of the firmware image.
     * @param newVersion   The version the blob upgrades to.
     * @param signature    ECDSA signature over keccak256(firmwareHash, newVersion).
     * @param oemAddress   Claimed signer; must be a registered OEM key and match
     *                     the recovered signer.
     * @return ok          True if signature valid + signer authorized.
     */
    function verify(
        bytes32 firmwareHash,
        uint32 newVersion,
        bytes calldata signature,
        address oemAddress
    ) public view returns (bool ok) {
        if (!oemKey[oemAddress]) return false;
        bytes32 digest = keccak256(abi.encode(firmwareHash, newVersion)).toEthSignedMessageHash();
        return digest.recover(signature) == oemAddress;
    }

    /**
     * @notice Verify a firmware update for a specific unit, additionally
     *         rejecting downgrades against the unit's on-chain version.
     */
    function verifyForRobot(
        uint256 robotId,
        bytes32 firmwareHash,
        uint32 newVersion,
        bytes calldata signature,
        address oemAddress
    ) external view returns (bool) {
        (,,,, uint32 currentVersion,,) = robotIdentity.robots(robotId);
        if (newVersion <= currentVersion) return false; // reject downgrade / replay
        return verify(firmwareHash, newVersion, signature, oemAddress);
    }
}
