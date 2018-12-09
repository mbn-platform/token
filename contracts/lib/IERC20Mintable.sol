pragma solidity 0.4.25;

contract IERC20Mintable {
  function mint(address to, uint256 value) public returns (bool);
}
