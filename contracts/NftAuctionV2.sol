// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./NftAuction.sol";

contract NftAuctionV2 is NftAuction {
    uint256 public platformFeeBps; // 平台费用，以基点表示（bps）1表示0.01%
    address public platformFeeRecipient; // 平台费用接收地址

    uint256[48] private __gap; // 用于兼容升级

    function setPlatformFee(
        uint256 _platformFeeBps,
        address _platformFeeRecipient
    ) public onlyOwner {
        platformFeeBps = _platformFeeBps;
        platformFeeRecipient = _platformFeeRecipient;
    }

    /// @custom:oz-upgrades-unsafe-allow-reachable
    function initializeV2(
        uint256 _platformFeeBps,
        address _platformFeeRecipient
    ) public reinitializer(2) {
        platformFeeBps = _platformFeeBps;
        platformFeeRecipient = _platformFeeRecipient;
    }

    // 重写 endAuction 方法，添加平台费用逻辑
    function endAuction(
        uint256 auctionId
    ) public override auctionActive(auctionId) {
        Auction storage auction = auctions[auctionId];
        require(
            block.timestamp >= auction.endTime,
            "Auction has not ended yet"
        );

        // 标记拍卖为结束
        auction.active = false;

        if (auction.highestBidder != address(0)) {
            // 计算平台费用
            uint256 platformFee = 0;
            uint256 sellerAmount = auction.highestBid;
            if (platformFeeBps > 0 && auction.highestBidder != address(0)) {
                // 计算费用
                platformFee = calculateFee(sellerAmount);
            }
            // 出售价格减去平台费用
            sellerAmount -= platformFee;

            // 转移NFT给最高出价者
            IERC721(auction.nftAddress).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );
            // 转移资金给卖家
            if (auction.highestBidderToken == address(0)) {
                (bool success, ) = payable(auction.seller).call{
                    value: sellerAmount
                }("");
                require(success, "Transfer failed");
                // 转移平台费用给平台
                (bool success2, ) = payable(platformFeeRecipient).call{
                    value: platformFee
                }("");
                require(success2, "Transfer failed");
            } else {
                IERC20(auction.highestBidderToken).transfer(
                    auction.seller,
                    sellerAmount
                );
                // 转移平台费用给平台
                IERC20(auction.highestBidderToken).transfer(
                    platformFeeRecipient,
                    platformFee
                );
            }
            emit AuctionEnded(
                auction.highestBidder,
                auction.tokenId,
                auction.highestBid
            );
        } else {
            // 无人出价
            // 退回NFT给卖家
            IERC721(auction.nftAddress).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
            emit AuctionEnded(address(0), auction.tokenId, 0);
        }
    }

    // 计算费用
    function calculateFee(uint256 amount) internal view returns (uint256) {
        require(platformFeeBps <= 10000, "Invalid fee basis points");
        return amount * platformFeeBps / 10000;
    }
}
