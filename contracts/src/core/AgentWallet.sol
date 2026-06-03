// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @dev Minimal ERC-4337 PackedUserOperation subset used for validation.
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}

/**
 * @title AgentWallet
 * @notice ERC-4337 smart account, one per robot. The owner sets spending rules
 *         once; the contract enforces them forever. Rules live on-chain, never
 *         in any backend:
 *           - per-action spend ceiling
 *           - per-period (daily) spend ceiling
 *           - approved-vendor allowlist
 *           - hard per-tx reject above an absolute max
 * @dev `execute(target, value, data)` is gated by the rule set. Callable by the
 *      owner directly or by the configured ERC-4337 EntryPoint after a valid
 *      userOp signature check.
 */
contract AgentWallet is ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    address public immutable entryPoint;

    struct Rules {
        uint256 perActionCeiling; // max value per single execute
        uint256 dailyCeiling; // max cumulative value per rolling 1-day window
        uint256 hardMax; // absolute per-tx reject threshold
        bool allowlistEnabled; // if true, target must be an approved vendor
    }

    Rules public rules;

    /// @notice vendor => approved
    mapping(address => bool) public approvedVendor;

    /// @notice start timestamp of the current daily window
    uint256 public windowStart;
    /// @notice cumulative spend in the current daily window
    uint256 public windowSpent;

    uint256 public constant DAY = 1 days;

    event AgentExecuted(address indexed target, uint256 value, bytes data, bytes32 dataHash);
    event RulesSet(
        uint256 perActionCeiling, uint256 dailyCeiling, uint256 hardMax, bool allowlistEnabled
    );
    event VendorSet(address indexed vendor, bool approved);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    error NotAuthorized();
    error ExceedsPerAction();
    error ExceedsDaily();
    error ExceedsHardMax();
    error VendorNotApproved();
    error CallFailed();
    error ZeroAddress();

    constructor(address _owner, address _entryPoint) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        entryPoint = _entryPoint;
        windowStart = block.timestamp;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != entryPoint) revert NotAuthorized();
        _;
    }

    receive() external payable { }

    // ── Rule configuration (owner only) ─────────────────────────────────────

    function setRules(
        uint256 perActionCeiling,
        uint256 dailyCeiling,
        uint256 hardMax,
        bool allowlistEnabled
    ) external onlyOwner {
        rules = Rules(perActionCeiling, dailyCeiling, hardMax, allowlistEnabled);
        emit RulesSet(perActionCeiling, dailyCeiling, hardMax, allowlistEnabled);
    }

    function setVendor(address vendor, bool approved) external onlyOwner {
        approvedVendor[vendor] = approved;
        emit VendorSet(vendor, approved);
    }

    function setVendors(address[] calldata vendors, bool approved) external onlyOwner {
        for (uint256 i = 0; i < vendors.length; i++) {
            approvedVendor[vendors[i]] = approved;
            emit VendorSet(vendors[i], approved);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // ── Execution ───────────────────────────────────────────────────────────

    /**
     * @notice Execute an action subject to the rule set. Reverts at the
     *         contract level if any limit is exceeded.
     */
    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyOwnerOrEntryPoint
        nonReentrant
        returns (bytes memory result)
    {
        _enforce(target, value);

        (bool ok, bytes memory ret) = target.call{ value: value }(data);
        if (!ok) revert CallFailed();

        emit AgentExecuted(target, value, data, keccak256(data));
        return ret;
    }

    /// @dev Pure-view rule preflight, useful for the IntentRouter and SDK.
    function wouldPass(address target, uint256 value) external view returns (bool) {
        Rules memory r = rules;
        if (r.hardMax != 0 && value > r.hardMax) return false;
        if (r.perActionCeiling != 0 && value > r.perActionCeiling) return false;
        if (r.allowlistEnabled && !approvedVendor[target]) return false;
        uint256 spent = (block.timestamp >= windowStart + DAY) ? 0 : windowSpent;
        if (r.dailyCeiling != 0 && spent + value > r.dailyCeiling) return false;
        return true;
    }

    function _enforce(address target, uint256 value) internal {
        Rules memory r = rules;

        if (r.hardMax != 0 && value > r.hardMax) revert ExceedsHardMax();
        if (r.perActionCeiling != 0 && value > r.perActionCeiling) revert ExceedsPerAction();
        if (r.allowlistEnabled && !approvedVendor[target]) revert VendorNotApproved();

        // Roll the daily window if it has elapsed.
        if (block.timestamp >= windowStart + DAY) {
            windowStart = block.timestamp;
            windowSpent = 0;
        }
        if (r.dailyCeiling != 0 && windowSpent + value > r.dailyCeiling) revert ExceedsDaily();
        windowSpent += value;
    }

    // ── ERC-4337 validation ─────────────────────────────────────────────────

    /**
     * @notice EntryPoint calls this to validate a userOp. We verify the owner's
     *         ECDSA signature over the userOpHash. Spend-limit enforcement
     *         happens in `execute` (the callData target/value), so a userOp that
     *         exceeds any limit reverts when the EntryPoint dispatches the call.
     * @return validationData 0 on success, 1 on signature failure (ERC-4337).
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        if (msg.sender != entryPoint) revert NotAuthorized();

        address recovered = userOpHash.toEthSignedMessageHash().recover(userOp.signature);
        validationData = (recovered == owner) ? 0 : 1;

        if (missingAccountFunds > 0) {
            (bool ok,) = entryPoint.call{ value: missingAccountFunds }("");
            ok; // entryPoint accounts for failures; ignore here per ERC-4337
        }
    }
}
