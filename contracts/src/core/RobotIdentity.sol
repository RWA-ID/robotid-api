// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

interface IMerkleBatchOracle {
    function rootOf(bytes32 batchId) external view returns (bytes32);
}

/**
 * @title RobotIdentity
 * @notice Permanent, programmable identity NFT for robots. ERC-721 with an
 *         ERC-5192 (soulbound) option per token, ERC-2981 royalties for
 *         transferable units, and Merkle batch pre-authorization so an OEM can
 *         commit up to 100,000 serials off-chain and have each unit claim its
 *         NFT later with a proof.
 * @dev There is NO registration fee — minting/claiming costs gas only.
 */
contract RobotIdentity is ERC721, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ── ERC-5192 ────────────────────────────────────────────────────────────
    /// @dev Emitted when a token is locked (soulbound).
    event Locked(uint256 tokenId);
    /// @dev Emitted when a token is unlocked. Not emitted by this contract
    ///      (locks are permanent for soulbound units) but part of the standard.
    event Unlocked(uint256 tokenId);

    struct RobotData {
        bytes32 serialHash; // keccak256(serialNumber) — privacy-preserving, verifiable
        string manufacturer; // "Boston Dynamics"
        string model; // "Spot"
        string capabilityClass; // free-form class tag, e.g. "quadruped-inspection"
        uint32 firmwareVersion; // monotonic; cross-checked by OTAVerifier
        uint256 registrationDate; // block timestamp
        bool locked; // ERC-5192 soulbound state
    }

    IMerkleBatchOracle public immutable oracle;

    uint256 private _nextId = 1;

    /// @notice tokenId => robot data
    mapping(uint256 => RobotData) public robots;
    /// @notice serialHash => tokenId (0 if unminted) — prevents double-mint
    mapping(bytes32 => uint256) public tokenOfSerial;
    /// @notice tokenId => IPFS metadata URI (ipfs://CID)
    mapping(uint256 => string) private _tokenURIs;
    /// @notice batchId => serialHash => claimed
    mapping(bytes32 => mapping(bytes32 => bool)) public claimed;
    /// @notice addresses allowed to register (OEM registrar / API admin)
    mapping(address => bool) public registrars;

    event RobotRegistered(
        uint256 indexed tokenId,
        bytes32 indexed serialHash,
        address indexed owner,
        string manufacturer,
        string model,
        bool locked
    );
    event RobotClaimed(
        uint256 indexed tokenId, bytes32 indexed batchId, bytes32 serialHash, address owner
    );
    event FirmwareUpdated(uint256 indexed tokenId, uint32 oldVersion, uint32 newVersion);
    event RegistrarSet(address indexed registrar, bool allowed);
    event TokenURISet(uint256 indexed tokenId, string uri);

    error NotRegistrar();
    error SerialAlreadyMinted(bytes32 serialHash);
    error Soulbound(uint256 tokenId);
    error AlreadyClaimed();
    error InvalidProof();
    error UnknownBatch();
    error FirmwareNotMonotonic();
    error NonexistentToken();

    constructor(address _oracle, address _owner) ERC721("Robot Identity", "ROBOT") Ownable(_owner) {
        oracle = IMerkleBatchOracle(_oracle);
        registrars[_owner] = true;
        _setDefaultRoyalty(_owner, 250); // 2.5% default, transferable units only
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender]) revert NotRegistrar();
        _;
    }

    function setRegistrar(address registrar, bool allowed) external onlyOwner {
        registrars[registrar] = allowed;
        emit RegistrarSet(registrar, allowed);
    }

    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    // ── Registration ────────────────────────────────────────────────────────

    /**
     * @notice Mint a single unit. OEM chooses `locked` (soulbound) or
     *         transferable. No fee — gas only.
     */
    function registerRobot(
        address to,
        bytes32 serialHash,
        string calldata manufacturer,
        string calldata model,
        string calldata capabilityClass,
        uint32 firmwareVersion,
        bool locked,
        string calldata uri
    ) external onlyRegistrar returns (uint256 tokenId) {
        if (tokenOfSerial[serialHash] != 0) {
            revert SerialAlreadyMinted(serialHash);
        }
        tokenId = _mintUnit(
            to, serialHash, manufacturer, model, capabilityClass, firmwareVersion, locked, uri
        );
        emit RobotRegistered(tokenId, serialHash, to, manufacturer, model, locked);
    }

    /**
     * @notice Claim a unit's NFT against a committed Merkle batch root. The
     *         leaf is keccak256(abi.encode(serialHash, to, locked)). The OEM
     *         pre-commits the root via MerkleBatchOracle.submitRoot.
     */
    function claimWithProof(
        bytes32 batchId,
        bytes32[] calldata proof,
        address to,
        bytes32 serialHash,
        string calldata manufacturer,
        string calldata model,
        string calldata capabilityClass,
        uint32 firmwareVersion,
        bool locked,
        string calldata uri
    ) external nonReentrant returns (uint256 tokenId) {
        bytes32 root = oracle.rootOf(batchId);
        if (root == bytes32(0)) revert UnknownBatch();
        if (claimed[batchId][serialHash]) revert AlreadyClaimed();
        if (tokenOfSerial[serialHash] != 0) revert SerialAlreadyMinted(serialHash);

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(serialHash, to, locked))));
        if (!MerkleProof.verifyCalldata(proof, root, leaf)) revert InvalidProof();

        claimed[batchId][serialHash] = true;
        tokenId = _mintUnit(
            to, serialHash, manufacturer, model, capabilityClass, firmwareVersion, locked, uri
        );
        emit RobotClaimed(tokenId, batchId, serialHash, to);
    }

    function _mintUnit(
        address to,
        bytes32 serialHash,
        string calldata manufacturer,
        string calldata model,
        string calldata capabilityClass,
        uint32 firmwareVersion,
        bool locked,
        string calldata uri
    ) internal returns (uint256 tokenId) {
        tokenId = _nextId++;
        tokenOfSerial[serialHash] = tokenId;
        robots[tokenId] = RobotData({
            serialHash: serialHash,
            manufacturer: manufacturer,
            model: model,
            capabilityClass: capabilityClass,
            firmwareVersion: firmwareVersion,
            registrationDate: block.timestamp,
            locked: locked
        });
        _tokenURIs[tokenId] = uri;
        _safeMint(to, tokenId);
        if (locked) emit Locked(tokenId);
        emit TokenURISet(tokenId, uri);
    }

    // ── Firmware ────────────────────────────────────────────────────────────

    /**
     * @notice Bump a unit's on-chain firmware version. Monotonic only — used by
     *         OTAVerifier to reject downgrades.
     */
    function setFirmwareVersion(uint256 tokenId, uint32 newVersion) external onlyRegistrar {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        uint32 old = robots[tokenId].firmwareVersion;
        if (newVersion <= old) revert FirmwareNotMonotonic();
        robots[tokenId].firmwareVersion = newVersion;
        emit FirmwareUpdated(tokenId, old, newVersion);
    }

    // ── ERC-5192 (soulbound) ────────────────────────────────────────────────

    function locked(uint256 tokenId) public view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return robots[tokenId].locked;
    }

    /// @dev Enforce soulbound: block transfers (but allow mint/burn) for locked tokens.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && robots[tokenId].locked) {
            revert Soulbound(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    // ── Metadata ────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        return _tokenURIs[tokenId];
    }

    function setTokenURI(uint256 tokenId, string calldata uri) external onlyRegistrar {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken();
        _tokenURIs[tokenId] = uri;
        emit TokenURISet(tokenId, uri);
    }

    function totalMinted() external view returns (uint256) {
        return _nextId - 1;
    }

    // ── ERC-165 ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        // 0xb45a3c0e = ERC-5192
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }
}
