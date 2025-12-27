const { expect } = require('chai');
const { ethers, deployments } = require('hardhat');

async function NftAuctionV2() {
  let proxy;
  let proxyAddress;
  let UsdcAddress;
  let NftAddress;

  let usdcChainLink; // usdc 对应的 ChainLink 合约地址
  let ethChainLink; // eth 对应的 ChainLink 合约地址

  let erc20, nft; // ERC20 和 NFT 合约实例

  let owner, addr1, addr2, addr3, addr4, addr5;

  async function initContract() {
    [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

    // 部署 NftAuction V1
    await deployments.fixture(['NftAuction']);
    const deploymentV1 = await deployments.get('NftAuction');

    // 升级到 NftAuction V2
    await deployments.fixture(['NftAuctionV2']);
    const deploymentV2 = await deployments.get('NftAuctionV2');
    proxy = await ethers.getContractAt(deploymentV2.abi, deploymentV2.address);

    proxyAddress = await proxy.getAddress();
    console.log('NftAuctionV2 proxy address:', proxyAddress);
  }

  async function initConfig() {
    const DECIMALS = 8; // 价格预言机的小数位
    // 部署 Mock 预言机合约
    const Mock = await ethers.getContractFactory('MockAggregatorV3');
    const USDCAggregator = await Mock.deploy(DECIMALS, 0.98 * 10 ** DECIMALS);
    usdcChainLink = await USDCAggregator.getAddress();
    console.log('USDCAggregator:', usdcChainLink);

    // 创建 Mock 预言机合约
    const Mock2 = await ethers.getContractFactory('MockAggregatorV3');
    const ETHAggregator = await Mock2.deploy(DECIMALS, 2980 * 10 ** DECIMALS);
    ethChainLink = await ETHAggregator.getAddress();
    console.log('ETHAggregator:', ethChainLink);

    // 创建 USDC 和 NFT 合约
    const MyErc20 = await ethers.getContractFactory('MyErc20');
    erc20 = await MyErc20.deploy('MyErc20', 'MEC20');
    await erc20.waitForDeployment();
    UsdcAddress = await erc20.getAddress();
    console.log('USDC:', UsdcAddress);

    const MyNft = await ethers.getContractFactory('MyNft');
    nft = await MyNft.deploy('MyNft', 'MNFT');
    await nft.waitForDeployment();
    NftAddress = await nft.getAddress();
    console.log('NFT:', NftAddress);
  }

  async function initData() {
    // 给 addr1 铸造NFT做测试数据
    await nft.mint(addr1.address, 'ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re');
    await nft.mint(addr1.address, 'ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re');
    await nft.mint(addr1.address, 'ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re');

    await nft.connect(addr1).setApprovalForAll(proxyAddress, true);

    // 转账 USDC 做测试数据
    await erc20.connect(owner).transfer(addr1.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr1).approve(proxyAddress, ethers.parseUnits('200', 6));

    await erc20.connect(owner).transfer(addr2.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr2).approve(proxyAddress, ethers.parseUnits('200', 6));

    await erc20.connect(owner).transfer(addr3.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr3).approve(proxyAddress, ethers.parseUnits('200', 6));

    // 设置价格预言机
    await proxy.setPriceFeed(ethers.ZeroAddress, ethChainLink);
    await proxy.setPriceFeed(UsdcAddress, usdcChainLink);
  }

  async function getAuctionDetails(auctionId) {
    const a = await proxy.getAuctionDetails(auctionId);
    return {
      seller: a[0],
      startPrice: a[1],
      startPriceUsd: a[2],
      highestBid: a[3],
      highestBidder: a[4],
      highestBidUsd: a[5],
      highestBidderToken: a[6],
      endTime: a[7],
      startTime: a[8],
      nftAddress: a[9],
      tokenId: a[10],
      token: a[11],
      active: a[12]
    };
  }

  async function printUserData() {
    console.log('Addr1 USDC:', await erc20.balanceOf(addr1.address));
    console.log('Addr2 USDC:', await erc20.balanceOf(addr2.address));
    console.log('Addr3 USDC:', await erc20.balanceOf(addr3.address));
    console.log('Addr4 USDC:', await erc20.balanceOf(addr4.address));

    console.log('Addr1 NFT:', await nft.balanceOf(addr1.address));
    console.log('Addr2 NFT:', await nft.balanceOf(addr2.address));
    console.log('Addr3 NFT:', await nft.balanceOf(addr3.address));
    console.log('Addr4 NFT:', await nft.balanceOf(addr4.address));

    console.log('Addr1 ETH:', await ethers.provider.getBalance(addr1.address));
    console.log('Addr2 ETH:', await ethers.provider.getBalance(addr2.address));
    console.log('Addr3 ETH:', await ethers.provider.getBalance(addr3.address));
    console.log('Addr4 ETH:', await ethers.provider.getBalance(addr4.address));
  }

  describe('NftAuctionV2 Contract', function () {
    before(async function () {
      console.log('Network name:', hre.network.name);
      await initContract();
      // 本地的网络
      if (hre.network.name == 'hardhat' || hre.network.name == 'localhost') {
        await initConfig();
        await initData();
      }
    });

    it('设置平台交易费', async function () {
      await proxy.setPlatformFee(500, addr4.address);
      expect(await proxy.platformFeeBps()).to.equal(500);
      expect(await proxy.platformFeeRecipient()).to.equal(addr4.address);
    });

    describe('结束拍卖收取平台手续费', function () {
      beforeEach(async function () {});

      it('ETH拍卖', async function () {
        // 创建拍卖
        await proxy.connect(addr1).startAuction(10, ethers.parseEther('0.1'), NftAddress, 1, ethers.ZeroAddress);

        // 出价 1 ETH
        await proxy.connect(addr2).placeBid(1, ethers.ZeroAddress, 0, {
          value: ethers.parseEther('1')
        });
        // 获取卖家余额
        const initialSellerBalance = await ethers.provider.getBalance(addr1.address);
        // 获取平台收款账户余额
        const initialPlatformBalance = await ethers.provider.getBalance(addr4.address);

        // 推进时间并结束拍卖
        await ethers.provider.send('evm_increaseTime', [11]);
        await ethers.provider.send('evm_mine');
        await proxy.endAuction(1);

        expect(await nft.ownerOf(1)).to.equal(addr2.address);

        const finalSellerBalance = await ethers.provider.getBalance(addr1.address);
        const finalPlatformBalance = await ethers.provider.getBalance(addr4.address);

        // 验证费用分配：1 ETH - 0.05 ETH (5%) = 0.95 ETH
        expect(finalSellerBalance - initialSellerBalance).to.equal(ethers.parseEther('0.95'));
        expect(finalPlatformBalance - initialPlatformBalance).to.equal(ethers.parseEther('0.05'));
      });

      it('USDC拍卖', async function () {
        // 创建拍卖
        await proxy.connect(addr1).startAuction(12, ethers.parseEther('0.01'), NftAddress, 2, ethers.ZeroAddress);

        // 出价 100 USDC
        await proxy.connect(addr2).placeBid(2, UsdcAddress, ethers.parseUnits('100', 6));

        const initialSellerBalance = await erc20.balanceOf(addr1.address);
        const initialPlatformBalance = await erc20.balanceOf(addr4.address);

        // 推进时间并结束拍卖
        await ethers.provider.send('evm_increaseTime', [13]);
        await ethers.provider.send('evm_mine');
        await proxy.endAuction(2);

        const finalSellerBalance = await erc20.balanceOf(addr1.address);
        const finalPlatformBalance = await erc20.balanceOf(addr4.address);

        // 验证费用分配：100 USDC - 5 USDC (5%) = 95 USDC
        expect(finalSellerBalance - initialSellerBalance).to.equal(ethers.parseUnits('95', 6));
        expect(finalPlatformBalance - initialPlatformBalance).to.equal(ethers.parseUnits('5', 6));
      });

      it('无人出价拍卖', async function () {
        // 创建拍卖
        await proxy.connect(addr1).startAuction(15, ethers.parseEther('0.1'), NftAddress, 3, ethers.ZeroAddress);
        const initialNftBalance = await nft.balanceOf(addr1.address);

        // 推进时间并结束拍卖（无人出价）
        await ethers.provider.send('evm_increaseTime', [16]);
        await ethers.provider.send('evm_mine');
        await proxy.endAuction(3);

        const finalNftBalance = await nft.balanceOf(addr1.address);

        // NFT 应该归还给卖家，没有费用分配
        expect(finalNftBalance - initialNftBalance).to.equal(1);
      });
      after(async function () {
        await printUserData();
      });
    });
  });
}

NftAuctionV2();
module.exports = { NftAuctionV2 };
