const { expect } = require("chai"); 
const { ethers, upgrades, deployments } = require("hardhat");

describe("TransparentProxy", function () { 
   let proxy;
  let deployer;

  describe("V1 Contract", function () {
    beforeEach(async function () {
      // ⭐ 核心：重放 deploy 脚本 hardhat-deploy 的 fixture() 会 自动运行指定的 deploy 脚本。
      // 默认会复用合约网络
      await deployments.fixture(["MyContract"]);
      // await deployments.fixture(["MyContract"], { reset: true }); // 每次重置网络，重新部署
      deployer = (await ethers.getSigners())[0];

      // ⭐ 从 deployments 取 proxy
      const deployment = await deployments.get("MyContractProxy");

      proxy = await ethers.getContractAt(
        deployment.abi,
        deployment.address
      );

      console.log("Proxy address:", deployment.address);
    });

    it("Should return initial message", async function () {
        expect(await proxy.getMessage()).to.equal("Hello V1");
    });

    it("Should update message", async function () {
        await proxy.setMessage("New Message");
        expect(await proxy.getMessage()).to.equal("New Message");
    });    
  });

  describe("V2 Contract", function () {
 
    beforeEach(async function () {
      const MyContractV2 = await ethers.getContractFactory("MyContractV2");


      proxy = await upgrades.upgradeProxy(await proxy.getAddress(), MyContractV2);

      const proxyAddress = await proxy.getAddress();
      const implAddressV2 = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      console.log("Upgraded Proxy address:", proxyAddress);
      console.log("V2 Implementation address:", implAddressV2);
    });

    it("should return hello V2", async function () {
      expect(await proxy.hello()).to.equal("Hello World V2");
    });

  });
});