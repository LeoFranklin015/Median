// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SyntheticToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    uint8 private _tokenDecimals;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 initialSupply,
        address recipient,
        address initialOwner
    )
        ERC20(tokenName, tokenSymbol)
        Ownable(initialOwner)
        ERC20Permit(tokenName)
    {
        _tokenDecimals = tokenDecimals;
        _mint(recipient, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // ============ Synthetic Token Extensions ============
    // Burner role: authorized addresses can burn tokens from any account (e.g. on redeem)
    mapping(address => bool) private _burners;

    modifier onlyBurner() {
        require(_burners[msg.sender], "caller is not a burner");
        _;
    }

    function addBurner(address account) external onlyOwner {
        require(account != address(0), "zero address");
        _burners[account] = true;
    }

    function removeBurner(address account) external onlyOwner {
        _burners[account] = false;
    }

    function isBurner(address account) external view returns (bool) {
        return _burners[account];
    }

    /// @notice Burns tokens from an account. Callable only by authorized burners (e.g. collateral manager on redeem).
    /// @param from Address to burn tokens from
    /// @param amount Amount of tokens to burn
    function burnFrom(address from, uint256 amount) public override onlyBurner {
        _burn(from, amount);
    }
}