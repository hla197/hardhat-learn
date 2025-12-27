# README.md


## 项目描述
实现一个拍卖合约，支持以下功能：
创建拍卖：允许用户将 NFT 上架拍卖。
出价：允许用户以 ERC20 或以太坊出价。
结束拍卖：拍卖结束后，NFT 转移给出价最高者，资金转移给卖家。

## 项目结构

hardhat-learn/
├── contracts/           # 智能合约源代码
│   ├── NftAuction.sol # NFT拍卖合约 (支持ERC20和以太坊出价)
│   └── NftAuctionV2.sol # NFT拍卖合约V2 (升级版本)
├── test/               # 合约测试文件
├── ignition/           # Hardhat Ignition部署模块
├── scripts/            # 自定义脚本
├── deployments/        # 部署地址记录
├── hardhat.config.js   # Hardhat 配置文件
├── package.json        # 项目依赖配置
└── README.md          # 项目说明文档


### 合约功能概述
#### NftAuction.sol：核心拍卖合约

支持创建拍卖（将NFT上架）
支持以ERC20代币或以太坊出价
拍卖结束时自动转移NFT给出价最高者
资金自动转移给卖家

#### NftAuctionV2.sol：合约的升级版本
在V1基础上添加了平台手续费

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npx hardhat compile
```

### 3. 运行测试

```bash
npx hardhat test
```

### 4. 启动本地节点

```bash
npx hardhat node
```

### 5. 部署合约

```bash
npx hardhat deploy --network sepolia --tags NftAuction

npx hardhat deploy --network sepolia --tags NftAuctionV2
```
