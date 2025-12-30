// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGenesisNode.sol";

contract GenesisNode is ERC721Enumerable, Ownable, IGenesisNode {
    
    struct UserInfo {
        address referrer;
        uint256 totalRewards;
    }
    
    mapping(address => UserInfo) public users;
    address public immutable DAO_TREASURY;
    
    uint256 public constant L1_RATE = 1000; // 10%
    uint256 public constant L2_RATE = 500;  // 5%
    uint256 public constant INFINITE_RATE = 200; // 2%
    uint256 public constant EQUAL_LEVEL_BONUS = 50; // 0.5%
    uint256 public constant MAX_DEPTH = 20; // Gas Limit Protection

    uint256 private _nextTokenId;

    constructor(address _daoTreasury) ERC721("Ivy Genesis Node", "IVY-NODE") Ownable(msg.sender) {
        require(_daoTreasury != address(0), "Invalid Treasury");
        DAO_TREASURY = _daoTreasury;
    }

    function mint(address to) external onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function setReferrer(address user, address referrer) external onlyOwner {
        users[user].referrer = referrer;
    }

    function distributeRewards(address minter, uint256 mintAmount) external override {
        address current = users[minter].referrer;
        if (current == address(0)) return;

        // --- L1 Distribution (10%) ---
        _safeTransferReward(current, (mintAmount * L1_RATE) / 10000);
        
        address l2 = users[current].referrer;
        if (l2 == address(0)) return;

        // --- L2 Distribution (5%) ---
        _safeTransferReward(l2, (mintAmount * L2_RATE) / 10000);

        // --- L3~Infinite Distribution (2% Differential) ---
        address cursor = users[l2].referrer;
        bool infiniteRewardClaimed = false;
        uint256 depth = 0;

        while (cursor != address(0) && !infiniteRewardClaimed && depth < MAX_DEPTH) {
            if (balanceOf(cursor) > 0) {
                _safeTransferReward(cursor, (mintAmount * INFINITE_RATE) / 10000);
                infiniteRewardClaimed = true;
                
                address potentialBlockedUpline = users[cursor].referrer;
                if (potentialBlockedUpline != address(0) && balanceOf(potentialBlockedUpline) > 0) {
                    _safeTransferReward(potentialBlockedUpline, (mintAmount * EQUAL_LEVEL_BONUS) / 10000);
                }
            }
            cursor = users[cursor].referrer;
            depth++;
        }

        if (!infiniteRewardClaimed) {
            _safeTransferReward(DAO_TREASURY, (mintAmount * INFINITE_RATE) / 10000);
        }
    }

    function getSelfBoost(address user) external view override returns (uint256) {
        return balanceOf(user) > 0 ? 1e17 : 0; // +10% if holds NFT
    }

    function _safeTransferReward(address to, uint256 amount) internal {
        // In a real implementation, this would mint IVY tokens or transfer from a pool.
        // For this demo, we just emit an event or update internal accounting.
        users[to].totalRewards += amount;
    }
}
