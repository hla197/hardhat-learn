const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lock", function () {

  let Lock;
  let lock;
  let owner, user1, user2;

  beforeEach(async function () {
    // 获取多个测试账户
    [owner, user1, user2] = await ethers.getSigners();

    Lock = await ethers.getContractFactory("Lock");
    lock = await Lock.deploy(); // 初始化
    await lock.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should return Hello", async function () {
      const Lock = await ethers.getContractFactory("Lock");
      const lock = await Lock.deploy(); // 原来构造函数的方法
      await lock.waitForDeployment();

      expect(await lock.hello()).to.equal("Hello Hardhat");
    })
  });
  // 所有测试完成后执行一次
  after(function () {
    console.log("All tests done!");
  });

});
