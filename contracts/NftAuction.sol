// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';

import {AggregatorV3Interface} from '@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol';

contract NftAuction is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable, IERC721Receiver {
    // tokenID
    uint256 public auctionIdCounter;

    /* ---------- Auction 拍卖 ---------- */
    struct Auction {
        address seller; // 拍卖人
        uint256 startPrice; // 原始数量（ETH wei 或 ERC20 token）
        uint256 startPriceUsd; // USD 统一价格，8 decimals
        uint256 highestBid; // 最高投标价
        address highestBidder; // 最高投标人
        uint256 highestBidUsd; // USD 8 decimals
        address highestBidderToken; // 最高投标人使用的代币
        uint256 endTime; // 结束时间
        uint256 startTime; // 开始时间
        address nftAddress; // NFT合约地址
        uint256 tokenId; // NFT的tokenI
        address token; // 代币地址
        bool active; // 状态
    }

    mapping(uint256 => Auction) public auctions; // 拍卖

    mapping(address => AggregatorV3Interface) public priceFeeds; // 价格预言机地址

    uint256[50] private __gap; // 占位符

    /* ---------- Events ---------- */
    event AuctionCreated(address indexed seller, uint256 indexed auctionId, uint256 minPrice, uint256 endTime);
    event BidPlaced(address indexed bidder, uint256 indexed auctionId, uint256 bidAmount);
    event AuctionEnded(address indexed winner, uint256 indexed auctionId, uint256 bidAmount);
    event AuctionCancelled(address indexed seller, uint256 indexed auctionId);

    function initialize() public virtual initializer {
        __Ownable_init(_msgSender()); // 初始化 owner
        __UUPSUpgradeable_init(); // 初始化 UUPS 升级
        __ReentrancyGuard_init(); // 初始化 ReentrancyGuard
    }

    /**
     * @dev 设置价格预言机
     * @param token ERC20 代币地址
     * @param priceFeed 价格预言机地址
     */
    function setPriceFeed(address token, address priceFeed) public onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }

    /**
     * @dev 获取价格 转换为USD 8 decimals
     * @param amount 代币数量
     * @param token 代币合约地址
     */
    function amountToUsd(uint256 amount, address token) internal view returns (uint256) {
        uint256 price = getChainlinkDataFeedLatestAnswer(token);

        if (token == address(0)) {
            // ETH 18 decimals
            return (amount * price) / 1e18; // ETH 18 decimals → USD 8 decimals
        } else {
            // USDC是6 decimals，预言机是8 decimals
            return (amount * price) / 1e6;
        }
    }

    function getChainlinkDataFeedLatestAnswer(address token) public view returns (uint256) {
        (, int256 price, , , ) = priceFeeds[token].latestRoundData();
        require(price > 0, 'Invalid price');
        return uint256(price);
    }

    // 升级
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /* ---------- Auction 拍卖 ---------- */
    function startAuction(
        uint256 _duration, // 拍卖时长
        uint256 _startPrice, // 起拍价
        address _nftAddress, // NFT合约地址
        uint256 _tokenId, // NFT的tokenId
        address _token // 出价的代币地址，address(0)表示ETH
    ) public virtual nonReentrant {
        // 验证NFT的拥有者
        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == msg.sender, 'You are not the owner of this NFT');
        require(nft.isApprovedForAll(msg.sender, address(this)), 'Contract is not approved to manage your NFT');
        // 拍卖ID自增
        uint256 auctionId = ++auctionIdCounter;
        uint256 startPriceUsd = amountToUsd(_startPrice, _token);
        require(startPriceUsd > 0, 'Invalid start price');

        auctions[auctionId] = Auction({
            seller: msg.sender, // 拍卖人
            startPrice: _startPrice, // USD 8 decimals
            startPriceUsd: startPriceUsd,
            nftAddress: _nftAddress, // NFT合约地址
            tokenId: _tokenId, // NFT的tokenId
            highestBid: 0, // 最高投标价
            highestBidUsd: 0, // USD 8 decimals
            highestBidder: address(0), // 最高投标人
            endTime: block.timestamp + _duration, // 结束时间
            startTime: block.timestamp, // 开始时间
            highestBidderToken: address(0), // 出价的代币地址，address(0)表示ETH
            token: _token,
            active: true // 状态
        });

        // 转移NFT给合约
        IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), _tokenId);

        emit AuctionCreated(msg.sender, auctionId, _startPrice, block.timestamp + _duration);
    }

    function getAuctionDetails(uint256 auctionId) public view returns (Auction memory) {
        return auctions[auctionId];
    }

    // 出价
    function placeBid(uint256 auctionId, address _token, uint256 amount) public payable virtual nonReentrant auctionActive(auctionId) {
        Auction storage a = auctions[auctionId]; // 获取拍卖信息

        uint256 bidUsd;
        if (_token == address(0)) {
            bidUsd = amountToUsd(msg.value, address(0));
        } else {
            bidUsd = amountToUsd(amount, _token);
        }
        require(bidUsd > 0, 'Invalid bid');

        require(bidUsd >= a.startPriceUsd, 'Bid below start price');
        require(bidUsd > a.highestBidUsd, 'Bid too low');

        if (_token != address(0)) {
            // 转移代币到合约账户
            IERC20(_token).transferFrom(msg.sender, address(this), amount);
        }

        // 退款上一轮出价者
        if (a.highestBidder != address(0)) {
            if (a.highestBidderToken == address(0)) {
                (bool success, ) = payable(a.highestBidder).call{value: a.highestBid}('');
                require(success, 'Transfer failed');
            } else {
                IERC20(a.highestBidderToken).transfer(a.highestBidder, a.highestBid);
            }
        }

        // 更新出价
        a.highestBidder = msg.sender;
        a.highestBidderToken = _token;
        a.highestBid = _token == address(0) ? msg.value : amount;
        a.highestBidUsd = bidUsd;

        emit BidPlaced(msg.sender, auctionId, bidUsd);
    }

    function endAuction(uint256 auctionId) public virtual auctionActive(auctionId) {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.endTime, 'Auction has not ended yet');

        // 标记拍卖为结束
        auction.active = false;

        if (auction.highestBidder != address(0)) {
            // 转移NFT给最高出价者
            IERC721(auction.nftAddress).safeTransferFrom(address(this), auction.highestBidder, auction.tokenId);
            // 转移资金给卖家
            if (auction.highestBidderToken == address(0)) {
                (bool success, ) = payable(auction.seller).call{value: auction.highestBid}('');
                require(success, 'Transfer failed');
            } else {
                IERC20(auction.highestBidderToken).transfer(auction.seller, auction.highestBid);
            }
            emit AuctionEnded(auction.highestBidder, auction.tokenId, auction.highestBid);
        } else {
            // 无人出价
            // 退回NFT给卖家
            IERC721(auction.nftAddress).safeTransferFrom(address(this), auction.seller, auction.tokenId);
            emit AuctionEnded(address(0), auction.tokenId, 0);
        }
    }

    modifier auctionActive(uint256 tokenId) {
        require(auctions[tokenId].active, 'Auction does not active');
        _;
    }

    /**
     * @dev 接收NFT的回调函数
     */
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
