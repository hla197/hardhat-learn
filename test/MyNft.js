const { expect } = require("chai"); 
const { ethers } = require("hardhat");

describe("MyNft", function () { 
    let owner;
    let addr1, addr2, addr3;
    let ntf;

    before(async function () { 
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        this.MyNft = await ethers.getContractFactory("MyNft");
        ntf = await this.MyNft.deploy("MyNft", "MNFT");
        await ntf.waitForDeployment();
    })


    it("铸造mint", async function () {
        console.log("Minting NFT to addr1:", addr1.address);
        await ntf.mint(addr1.address, "ipfs://bafkreig6zuolgmcskysrajqblmp3u6rp6vqhfgnscivx75ysizu7xp35re");
        expect(await ntf.balanceOf(addr1.address)).to.equal(1);
    })

    it("授权approve", async function () {
        console.log("Approving NFT to addr2:", addr2.address);

        await expect(ntf.connect(addr2).approve(addr3.address, 1)).to.be
            .revertedWithCustomError(ntf, "ERC721InvalidApprover").withArgs(addr2.address);

        await ntf.connect(addr1).approve(addr2.address, 1);
        expect(await ntf.getApproved(1)).to.equal(addr2.address);


    })

    it("授权transferFrom", async function () { 
        console.log("Transferring NFT from addr1 to addr3:", addr3.address);
        await ntf.connect(addr2).transferFrom(addr1.address, addr3.address, 1);
        expect(await ntf.balanceOf(addr3.address)).to.equal(1);
    })

    it("授权safeTransferFrom", async function () { 
        console.log("Safe Transferring NFT from addr3 to addr1:", addr1.address);
        await ntf.connect(addr3).safeTransferFrom(addr3.address, addr1.address, 1);
        expect(await ntf.balanceOf(addr1.address)).to.equal(1);
    })

    it("授权setApprovalForAll", async function () { 
        console.log("Setting Approval for all NFTs to addr2:", addr2.address);
        await ntf.connect(addr1).setApprovalForAll(addr2.address, true);
        expect(await ntf.connect(addr2).isApprovedForAll(addr1.address, addr2.address)).to.equal(true);
    })
});