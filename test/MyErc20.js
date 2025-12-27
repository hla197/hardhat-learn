const { expect } = require("chai"); 
const { ethers } = require("hardhat");

describe("MyErc20", function () { 
    let owner;
    let addr1, addr2, addr3;
    let deploy;
    
    before(async function () { 
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        this.MyErc20 = await ethers.getContractFactory("MyErc20");
        deploy = await this.MyErc20.deploy("MyErc20", "MEC20");
        await deploy.waitForDeployment();
    })

    it("部署成功", async function () { 
        expect(await deploy.name()).to.equal("MyErc20");
        expect(await deploy.symbol()).to.equal("MEC20");
        expect(await deploy.totalSupply()).to.equal(ethers.parseEther("10000"));
        expect(await deploy.balanceOf(owner.address)).to.equal(ethers.parseEther("10000"));
    })

    it("转账transfer", async function () { 
        await deploy.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
        const addr1Balance = await deploy.balanceOf(addr1.address);
        expect(ethers.formatEther(addr1Balance)).to.equal("100.0");
    })

    it("授权approve & transferFrom", async function () { 
        await deploy.connect(addr1).approve(addr2.address, ethers.parseEther("50"));
        const allowance = await deploy.allowance(addr1.address, addr2.address);
        expect(ethers.formatEther(allowance)).to.equal("50.0");

        await deploy.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseEther("20"));
        const addr3Balance = await deploy.balanceOf(addr3.address);
        expect(ethers.formatEther(addr3Balance)).to.equal("20.0");

        const remainingAllowance = await deploy.allowance(addr1.address, addr2.address);
        expect(ethers.formatEther(remainingAllowance)).to.equal("30.0");
    })

});