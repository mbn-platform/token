pragma solidity 0.4.25;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import './lib/IERC20Controllable.sol';
import './lib/IERC20Releasable.sol';
import './lib/IERC20Mintable.sol';

contract IToken is ERC20, IERC20Controllable, IERC20Releasable, IERC20Mintable {}
