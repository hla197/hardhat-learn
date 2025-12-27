const { ethers, upgrades } = require("hardhat");

module.exports = async function ({ getNamedAccounts, deployments }) {

  const { deployer } = await getNamedAccounts();
  const { save } = deployments;
  console.log("Deloper address:", deployer);

  const MyContractV1 = await ethers.getContractFactory("MyContractV1");


  const proxy = await upgrades.deployProxy(MyContractV1, [], {
    initializer: "initialize",
    kind: "uups",
  });
  


  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("proxy address:", proxyAddress);

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Implementation address:", implAddress);

    // ⭐ 关键：保存到 deployments
  await save("MyContractProxy", {
    address: proxyAddress,
    abi: MyContractV1.interface.format("json"),
  });

  await save("MyContractImplV1", {
    address: implAddress,
    abi: MyContractV1.interface.format("json"),
  });

};

module.exports.tags = ["MyContract"];