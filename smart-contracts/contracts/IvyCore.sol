// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGenesisNode.sol";
import "./IPriceOracle.sol";
import "./IvyToken.sol";

contract IvyCore is Ownable {
    uint256 public constant PID_K = 2 * 1e18;
    uint256 public constant PID_MIN = 1e17;
    uint256 public constant PID_MAX = 15 * 1e17;
    
    uint256 public constant HALVING_THRESHOLD = 7_000_000 * 1e18;
    uint256 public constant HALVING_DECAY = 95;
    uint256 public constant HARD_CAP = 100_000_000 * 1e18;
    
    uint256 public constant BASE_DAILY_MINT = 30_000 * 1e18;

    uint256 public totalMinted;
    uint256 public currentEmissionFactor = 1e18;
    uint256 public lastHalvingMintAmount;
    
    enum CircuitLevel { NONE, YELLOW, ORANGE, RED }
    struct CircuitBreakerStatus {
        CircuitLevel level;
        uint256 triggerTime;
        uint256 triggerPrice;
        uint256 forcedAlpha;
        bool isActive;
    }
    CircuitBreakerStatus public cbStatus;

    IGenesisNode public genesisNode;
    IPriceOracle public oracle;
    IvyToken public ivyToken;

    struct Candle {
        uint256 open;
        uint256 close;
        uint256 high;
        uint256 low;
        bool isFinalized;
    }

    mapping(uint256 => Candle) public candles;
    uint256 public currentCandleStartTime;

    constructor(address _genesisNode, address _oracle, address _ivyToken) Ownable(msg.sender) {
        genesisNode = IGenesisNode(_genesisNode);
        oracle = IPriceOracle(_oracle);
        ivyToken = IvyToken(_ivyToken);
    }

    function updateCandle(uint256 currentPrice) public {
        uint256 timestamp = block.timestamp;
        uint256 hourStart = (timestamp / 1 hours) * 1 hours;

        if (hourStart > currentCandleStartTime) {
            if (currentCandleStartTime != 0) {
                candles[currentCandleStartTime].isFinalized = true;
            }

            currentCandleStartTime = hourStart;
            candles[hourStart] = Candle({
                open: currentPrice,
                close: currentPrice,
                high: currentPrice,
                low: currentPrice,
                isFinalized: false
            });
        } else {
            Candle storage c = candles[currentCandleStartTime];
            c.close = currentPrice;
            if (currentPrice > c.high) c.high = currentPrice;
            if (currentPrice < c.low) c.low = currentPrice;
        }
    }

    function calculateDailyMint(address user) public view returns (uint256) {
        uint256 baseMint = BASE_DAILY_MINT;
        uint256 emissionFactor = currentEmissionFactor;
        uint256 alpha = getEffectiveAlpha();
        
        uint256 nodeBoost = genesisNode.getSelfBoost(user);
        uint256 marketingBoost = 175 * 1e15;
        uint256 totalMultiplier = 1e18 + nodeBoost + marketingBoost;

        return (baseMint * emissionFactor * alpha * totalMultiplier) / 1e54;
    }

    function getEffectiveAlpha() public view returns (uint256) {
        if (cbStatus.isActive) {
            return cbStatus.forcedAlpha;
        }
        return calculatePID();
    }

    function checkCircuitBreaker(uint256 currentPrice, uint256 referencePrice1H) external {
        // For demo purposes, allow owner to trigger check
        // require(msg.sender == address(oracle) || msg.sender == owner(), "Auth failed");
        
        if (currentPrice >= referencePrice1H) return;
        uint256 dropPercentage = ((referencePrice1H - currentPrice) * 100) / referencePrice1H;

        if (dropPercentage >= 25) {
            _triggerCircuitBreaker(CircuitLevel.RED, 5 * 1e16, currentPrice);
        } else if (dropPercentage >= 15) {
            _triggerCircuitBreaker(CircuitLevel.ORANGE, 2 * 1e17, currentPrice);
        } else if (dropPercentage > 10) {
            _triggerCircuitBreaker(CircuitLevel.YELLOW, 5 * 1e17, currentPrice);
        }
    }

    function _triggerCircuitBreaker(CircuitLevel level, uint256 alpha, uint256 price) internal {
        cbStatus = CircuitBreakerStatus({
            level: level,
            triggerTime: block.timestamp,
            triggerPrice: price,
            forcedAlpha: alpha,
            isActive: true
        });
    }

    function tryUnlockCircuitBreaker() external {
        require(cbStatus.isActive, "CB not active");
        
        uint256 timeElapsed = block.timestamp - cbStatus.triggerTime;
        uint256 currentPrice = oracle.getLatestPrice();

        if (cbStatus.level == CircuitLevel.YELLOW) {
            require(timeElapsed >= 4 hours, "L1: Locked");
            require(currentPrice > cbStatus.triggerPrice, "L1: Price not recovered");
            _resetCircuitBreaker();
        } 
        else if (cbStatus.level == CircuitLevel.ORANGE) {
            require(timeElapsed >= 12 hours, "L2: Locked");
            
            uint256 currentHour = (block.timestamp / 1 hours) * 1 hours;
            uint256 oneHourAgo = currentHour - 1 hours;
            uint256 twoHoursAgo = currentHour - 2 hours;

            Candle memory c1 = candles[oneHourAgo];
            Candle memory c2 = candles[twoHoursAgo];
            
            require(c1.open > 0 && c2.open > 0, "L2: No candle data");
            
            bool isGreen1 = c1.close > c1.open;
            bool isGreen2 = c2.close > c2.open;
            
            require(isGreen1 && isGreen2, "L2: Need 2 consecutive 1H green candles");
            _resetCircuitBreaker();
        } 
        else if (cbStatus.level == CircuitLevel.RED) {
            require(timeElapsed >= 24 hours, "L3: Hard Locked");
            _resetCircuitBreaker();
        }
    }

    function _resetCircuitBreaker() internal {
        delete cbStatus;
    }
    
    function calculatePID() internal view returns (uint256) {
        return 12 * 1e17; // Mock PID = 1.2
    }

    function mintDaily(address user) external {
        uint256 amount = calculateDailyMint(user);
        require(totalMinted + amount <= HARD_CAP, "Hard Cap Reached");
        
        totalMinted += amount;
        ivyToken.mint(user, amount);
        genesisNode.distributeRewards(user, amount);
        
        // Halving Logic
        if (totalMinted - lastHalvingMintAmount >= HALVING_THRESHOLD) {
            currentEmissionFactor = (currentEmissionFactor * HALVING_DECAY) / 100;
            lastHalvingMintAmount = totalMinted;
        }
    }
}
