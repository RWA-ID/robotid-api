// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentWallet {
    function wouldPass(address target, uint256 value) external view returns (bool);
    function owner() external view returns (address);
}

interface IRobotOwner {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title IntentRouter
 * @notice On-chain authorization + append-only audit log of AI/voice intents
 *         mapped to actions. An intent is authorized only if it passes the
 *         robot's AgentWallet limits; otherwise it is rejected with a reason.
 *         Per-robot rate gating prevents intent floods.
 * @dev `intentHash` is keccak256 of the normalized natural-language command +
 *      nonce, computed by the intent SDK. This contract is the authorization
 *      and audit layer; actual fund movement is performed by the AgentWallet
 *      owner/EntryPoint, not by this router.
 */
contract IntentRouter is Ownable {
    enum RejectReason {
        None,
        NoWallet,
        LimitsExceeded,
        RateLimited,
        NotRobotOperator
    }

    struct Intent {
        uint256 robotId;
        bytes32 intentHash;
        address actionTarget;
        uint256 value;
        address submitter;
        uint256 timestamp;
        bool authorized;
        RejectReason reason;
    }

    IRobotOwner public immutable robotIdentity;

    /// @notice robotId => its AgentWallet (set by owner/registrar).
    mapping(uint256 => address) public walletOf;

    /// @notice append-only intent log
    Intent[] public intents;

    /// @notice robotId => rate window start
    mapping(uint256 => uint256) public rateWindowStart;
    /// @notice robotId => count of intents in the current window
    mapping(uint256 => uint256) public rateCount;

    /// @notice max authorized intents per robot per window
    uint256 public rateLimit = 60;
    uint256 public rateWindow = 1 minutes;

    event WalletLinked(uint256 indexed robotId, address indexed wallet);
    event IntentExecuted(
        uint256 indexed intentId,
        uint256 indexed robotId,
        bytes32 intentHash,
        address actionTarget,
        uint256 value,
        address submitter
    );
    event IntentRejected(
        uint256 indexed intentId, uint256 indexed robotId, bytes32 intentHash, RejectReason reason
    );
    event RateConfigUpdated(uint256 rateLimit, uint256 rateWindow);

    constructor(address _robotIdentity, address _owner) Ownable(_owner) {
        robotIdentity = IRobotOwner(_robotIdentity);
    }

    function linkWallet(uint256 robotId, address wallet) external onlyOwner {
        walletOf[robotId] = wallet;
        emit WalletLinked(robotId, wallet);
    }

    function setRateConfig(uint256 _rateLimit, uint256 _rateWindow) external onlyOwner {
        rateLimit = _rateLimit;
        rateWindow = _rateWindow;
        emit RateConfigUpdated(_rateLimit, _rateWindow);
    }

    /**
     * @notice Submit an AI/voice intent for authorization + audit logging.
     *         Caller must be the robot's NFT holder or its AgentWallet owner.
     * @return intentId        Index in the append-only log.
     * @return authorized      True if the intent passed all checks.
     */
    function submitIntent(uint256 robotId, bytes32 intentHash, address actionTarget, uint256 value)
        external
        returns (uint256 intentId, bool authorized)
    {
        intentId = intents.length;
        RejectReason reason = RejectReason.None;

        address wallet = walletOf[robotId];
        if (wallet == address(0)) {
            reason = RejectReason.NoWallet;
        } else if (!_isOperator(robotId, wallet, msg.sender)) {
            reason = RejectReason.NotRobotOperator;
        } else if (_rateExceeded(robotId)) {
            reason = RejectReason.RateLimited;
        } else if (!IAgentWallet(wallet).wouldPass(actionTarget, value)) {
            reason = RejectReason.LimitsExceeded;
        }

        authorized = reason == RejectReason.None;

        intents.push(
            Intent({
                robotId: robotId,
                intentHash: intentHash,
                actionTarget: actionTarget,
                value: value,
                submitter: msg.sender,
                timestamp: block.timestamp,
                authorized: authorized,
                reason: reason
            })
        );

        if (authorized) {
            _consumeRate(robotId);
            emit IntentExecuted(intentId, robotId, intentHash, actionTarget, value, msg.sender);
        } else {
            emit IntentRejected(intentId, robotId, intentHash, reason);
        }
    }

    function _isOperator(uint256 robotId, address wallet, address caller)
        internal
        view
        returns (bool)
    {
        if (caller == IAgentWallet(wallet).owner()) return true;
        try robotIdentity.ownerOf(robotId) returns (address holder) {
            return caller == holder;
        } catch {
            return false;
        }
    }

    function _rateExceeded(uint256 robotId) internal view returns (bool) {
        if (block.timestamp >= rateWindowStart[robotId] + rateWindow) return false;
        return rateCount[robotId] >= rateLimit;
    }

    function _consumeRate(uint256 robotId) internal {
        if (block.timestamp >= rateWindowStart[robotId] + rateWindow) {
            rateWindowStart[robotId] = block.timestamp;
            rateCount[robotId] = 1;
        } else {
            rateCount[robotId] += 1;
        }
    }

    function intentCount() external view returns (uint256) {
        return intents.length;
    }
}
