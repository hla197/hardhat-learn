// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract MyContractV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    string private message;

    function initialize() public initializer {
        __Ownable_init(_msgSender());  
        message = "Hello V1";
    }

    function getMessage() public view returns (string memory) {
        return message;
    }

    function setMessage(string memory _message) public {
        message = _message;
    }

    // UUPS 升级重写权限
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

}