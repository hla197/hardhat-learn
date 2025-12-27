const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

module.exports = async function ({ getNamedAccounts, deployments }) {

  const { deployer } = await getNamedAccounts();
  const { save } = deployments;
  console.log("Deloper address:", deployer);

  const NftAuction = await ethers.getContractFactory("NftAuction");


  const proxy = await upgrades.deployProxy(NftAuction, [], {
    initializer: "initialize",
    kind: "uups",
  });
  


  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("proxy address:", proxyAddress);

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Implementation address:", implAddress);

  const storePath = path.resolve(__dirname, "./cache/proxyNftAuction.json");

  // 将已部署的 proxy 和 impl 地址保存到本地文件
  fs.writeFileSync(
    storePath,
    JSON.stringify({
        proxyAddress: proxyAddress,
        implAddress: implAddress,
        abi: NftAuction.interface.format("json"),
      })
  );

  console.log("Saved deployed addresses to", storePath);

    // ⭐ 关键：保存到 deployments
  await save("NftAuction", {
    address: proxyAddress,
    abi: NftAuction.interface.format("json"),
  });

  await save("NftAuctionImpl", {
    address: implAddress,
    abi: NftAuction.interface.format("json"),
  });

};

module.exports.tags = ["NftAuction"];