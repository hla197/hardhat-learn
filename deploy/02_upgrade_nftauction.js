const { ethers, upgrades, deployments } = require("hardhat");
const fs = require("fs");
const path = require("path");

module.exports = async function ({ getNamedAccounts }) {
  const { deployer } = await getNamedAccounts();
  const { save } = deployments;
  console.log("Upgrading NFTAuction to V2, deployer:", deployer);

  // 读取之前部署的 proxy 地址
  const storePath = "./deploy/cache/proxyNftAuction.json";
  const deployedData = JSON.parse(fs.readFileSync(storePath, "utf8"));
  const proxyAddress = deployedData.proxyAddress;
  console.log("Existing proxy address:", proxyAddress);

  const NftAuctionV2 = await ethers.getContractFactory("NftAuctionV2");

  // 升级并自动调用 initialize
  const nftAuctionV2 = await upgrades.upgradeProxy(proxyAddress, NftAuctionV2, {
    call: { fn: "initializeV2", args: [500, deployer] }
  }); 

  // 获取新逻辑合约实现地址
  const implAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );
  console.log("NftAuction V2 implementation address:", implAddress);

  const storePath2 = path.resolve(__dirname, "./cache/proxyNftAuctionV2.json");

  // 存储代理地址
  fs.writeFileSync(
    storePath2,
    JSON.stringify({
      proxyAddress: proxyAddress,
      implAddress: implAddress,
      abi: NftAuctionV2.interface.format("json"),
    }),
    "utf8"
  );

  // 保存代理地址
  await save("NftAuctionV2", {
    address: proxyAddress,
    abi: NftAuctionV2.interface.format("json"),
  });
  // 保存 V2 实现地址
  await save("NftAuctionImplV2", {
    address: implAddress,
    abi: NftAuctionV2.interface.format("json"),
  });
};

module.exports.tags = ["NftAuctionV2"];
