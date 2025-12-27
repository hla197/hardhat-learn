const { expect } = require('chai');
const { ethers, upgrades, deployments } = require('hardhat');

async function NftAuction() {
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
    // hardhat-deploy 的 fixture() 会 自动运行指定的 deploy 脚本。默认会复用合约网络
    await deployments.fixture(['NftAuction']);
    // await deployments.fixture(["MyContract"], { reset: true }); // 每次重置网络，重新部署
    // ⭐ 从 deployments 取 proxy
    const deployment = await deployments.get('NftAuction');
    proxy = await ethers.getContractAt(deployment.abi, deployment.address);

    proxyAddress = await proxy.getAddress();
  }

  async function initConfig() {
    const DECIMALS = 8; // 价格预言机的小数位
    // // 部署 Mock 预言机合约
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
    await nft.mint(addr2.address, 'ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re');
    await nft.mint(addr1.address, 'ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re');

    //  转账 USDC 做测试数据
    await erc20.connect(owner).transfer(addr1.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr1).approve(proxyAddress, ethers.parseUnits('200', 6));

    await erc20.connect(owner).transfer(addr2.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr2).approve(proxyAddress, ethers.parseUnits('200', 6));

    await erc20.connect(owner).transfer(addr3.address, ethers.parseUnits('200', 6));
    await erc20.connect(addr3).approve(proxyAddress, ethers.parseUnits('200', 6));
  }

  describe('NftAuction Contract', function () {
    before(async function () {
      console.log('Network name:', hre.network.name);
      await initContract();
      // 本地的网络
      if (hre.network.name == 'hardhat' || hre.network.name == 'localhost') {
        await initConfig();
        await initData();
      }
      console.log('Proxy address:', proxyAddress);
    });

    it('setPriceFeed', async function () {
      console.log('设置价格预言机地址');
      await proxy.setPriceFeed(ethers.ZeroAddress, ethChainLink);
      await proxy.setPriceFeed(UsdcAddress, usdcChainLink);

      console.log('ETH:', await proxy.getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress));
      console.log('USDC:', await proxy.getChainlinkDataFeedLatestAnswer(UsdcAddress));
    });

    it('创建拍卖1 USDC胜拍 Addr2 -200usdc +1nft, addr1 +200usdc -1nft', async function () {
      printUserData();

      await nft.connect(addr1).setApprovalForAll(proxyAddress, true); // 授权合约操作 NFT

      expect(await nft.connect(addr1).isApprovedForAll(addr1.address, proxyAddress)).to.equal(true);

      console.log('Addr1 创建拍卖');
      await proxy.connect(addr1).startAuction(10, ethers.parseEther('0.002'), NftAddress, 1, ethers.ZeroAddress); // USDC 6位小数，10 USDC 起拍价，持续300秒
      const auction = await getAuctionDetails(1);
      expect(auction.seller).to.equal(addr1.address);
    });

    it('创建拍卖2 无人竞拍的', async function () {
      await nft.connect(addr2).setApprovalForAll(proxyAddress, true); // 授权合约操作 NFT

      expect(await nft.connect(addr2).isApprovedForAll(addr2.address, proxyAddress)).to.equal(true);

      console.log('Addr2 创建拍卖');
      await proxy.connect(addr2).startAuction(10, ethers.parseEther('0.002'), NftAddress, 2, ethers.ZeroAddress); // USDC 6位小数，10 USDC 起拍价，持续300秒
      const auction = await getAuctionDetails(2);
      expect(auction.seller).to.equal(addr2.address);
    });

    it('创建拍卖3 ETH胜拍 addr3 -100eth +1nft, addr1 +100eth -1nft', async function () {
      console.log('Addr1 创建拍卖');
      await proxy.connect(addr1).startAuction(10, ethers.parseEther('0.002'), NftAddress, 3, ethers.ZeroAddress); // USDC 6位小数，10 USDC 起拍价，持续300秒
      const auction = await getAuctionDetails(3);
      expect(auction.seller).to.equal(addr1.address);
    });

    it('参与拍卖', async function () {
      printUserData();
      let auction;
      await proxy.connect(addr2).placeBid(1, ethers.ZeroAddress, 0, {
        value: ethers.parseEther('0.02')
      });
      auction = await getAuctionDetails(1);
      console.log('Addr2 出价 0.02 ETH');
      console.log('auction:', auction);
      expect(auction.highestBidder).to.equal(addr2.address);

      await proxy.connect(addr3).placeBid(1, UsdcAddress, ethers.parseUnits('100', 6));
      auction = await getAuctionDetails(1);
      console.log('Addr3 出价 100 USDC');
      expect(auction.highestBidder).to.equal(addr3.address);

      await proxy.connect(addr2).placeBid(1, UsdcAddress, ethers.parseUnits('200', 6));
      auction = await getAuctionDetails(1);
      console.log('Addr2 出价 200 USDC');
      expect(auction.highestBidder).to.equal(addr2.address);

      // 测试 ETH 为最高拍卖进行结束
      await proxy.connect(addr3).placeBid(3, ethers.ZeroAddress, 0, {
        value: ethers.parseEther('100')
      });
      auction = await getAuctionDetails(3);
      console.log('Addr3 出价 100 ETH');
      expect(auction.highestBidder).to.equal(addr3.address);

      printUserData();
    });

    it('结束拍卖', async function () {
      console.log('等待拍卖时间结束...');
      await ethers.provider.send('evm_increaseTime', [11]); // 增加 11 秒
      await ethers.provider.send('evm_mine'); // 挖一个块

      console.log('结束拍卖');
      await proxy.endAuction(1); // 结束addr1拍卖
      await proxy.endAuction(2); // 结束addr2拍卖
      await proxy.endAuction(3); // 结束addr1拍卖

      printUserData();
    });

    async function printUserData() {
      console.log('Addr1 USDC:', await erc20.balanceOf(addr1.address));
      console.log('Addr2 USDC:', await erc20.balanceOf(addr2.address));
      console.log('Addr3 USDC:', await erc20.balanceOf(addr3.address));

      console.log('Addr1 NFT:', await nft.balanceOf(addr1.address));
      console.log('Addr2 NFT:', await nft.balanceOf(addr2.address));
      console.log('Addr3 NFT:', await nft.balanceOf(addr3.address));

      console.log('Addr1 ETH:', await ethers.provider.getBalance(addr1.address));
      console.log('Addr2 ETH:', await ethers.provider.getBalance(addr2.address));
      console.log('Addr3 ETH:', await ethers.provider.getBalance(addr3.address));
    }

    async function getAuctionDetails(auctionId) {
      const a = await proxy.getAuctionDetails(auctionId); // 返回数组

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
  });
}
// NftAuction();
module.exports = { NftAuction };
