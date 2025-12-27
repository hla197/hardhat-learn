// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./MyContractV1.sol";


contract MyContractV2 is MyContractV1 {

    function hello() public pure returns (string memory) {
        return "Hello World V2";
    }
}