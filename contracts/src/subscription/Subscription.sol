// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Subscription
 * @notice The payment core of robot-id.eth. On-chain USDC subscriptions in
 *         three tiers. The emitted `Subscribed` event drives automated API-key
 *         provisioning and ENS namespace grants off-chain. There is no
 *         per-registration fee anywhere in the protocol — revenue is the
 *         subscription only.
 * @dev Prices are denominated in USDC (6 decimals). Funds accrue to a treasury
 *      address, withdrawable by the owner.
 */
contract Subscription is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Tier {
        SmallManufacturer,
        OEM,
        Enterprise
    }

    uint256 public constant PERIOD = 30 days;

    IERC20 public immutable usdc;
    address public treasury;

    /// @notice Monthly price per tier in USDC (6 decimals).
    mapping(Tier => uint256) public price;

    /// @notice subscriber => unix timestamp at which the subscription lapses.
    mapping(address => uint256) public expiry;

    /// @notice subscriber => current tier (meaningful only while active).
    mapping(address => Tier) private _tier;

    event Subscribed(address indexed subscriber, Tier tier, uint256 expiry);
    event PriceUpdated(Tier indexed tier, uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Withdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error InvalidTier();

    /**
     * @param _usdc     USDC token address (mainnet 0xA0b8...eB48; forked real
     *                  token in integration tests).
     * @param _treasury Address funds accrue to.
     * @param _owner    Contract owner (price/treasury governance).
     */
    constructor(address _usdc, address _treasury, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;

        price[Tier.SmallManufacturer] = 1_999e6;
        price[Tier.OEM] = 3_999e6;
        price[Tier.Enterprise] = 9_999e6;
    }

    /**
     * @notice Subscribe (or renew) to a tier. Pulls the tier's USDC amount via
     *         transferFrom — the caller must `approve` this contract first.
     *         Renewal extends from max(now, currentExpiry).
     * @param tier The tier to subscribe to.
     */
    function subscribe(Tier tier) external nonReentrant {
        uint256 amount = price[tier];
        if (amount == 0) revert InvalidTier();

        // Pull funds straight to the treasury.
        usdc.safeTransferFrom(msg.sender, treasury, amount);

        uint256 current = expiry[msg.sender];
        uint256 base = current > block.timestamp ? current : block.timestamp;
        uint256 newExpiry = base + PERIOD;

        expiry[msg.sender] = newExpiry;
        _tier[msg.sender] = tier;

        emit Subscribed(msg.sender, tier, newExpiry);
    }

    /// @notice True while block.timestamp < expiry.
    function isActive(address subscriber) external view returns (bool) {
        return block.timestamp < expiry[subscriber];
    }

    /// @notice The subscriber's current tier.
    function tierOf(address subscriber) external view returns (Tier) {
        return _tier[subscriber];
    }

    // ── Governance ──────────────────────────────────────────────────────────

    function setPrice(Tier tier, uint256 newPrice) external onlyOwner {
        uint256 old = price[tier];
        price[tier] = newPrice;
        emit PriceUpdated(tier, old, newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @notice Sweep any USDC held by this contract to the treasury. With the
     *         straight-to-treasury transfer in `subscribe`, this only matters
     *         for stray/forced transfers, but is retained for completeness.
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 bal = usdc.balanceOf(address(this));
        if (bal > 0) {
            usdc.safeTransfer(treasury, bal);
            emit Withdrawn(treasury, bal);
        }
    }
}
