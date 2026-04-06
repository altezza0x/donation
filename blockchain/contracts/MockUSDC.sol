// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockUSDC
 * @dev Mock ERC-20 token yang merepresentasikan USDC untuk keperluan prototype/testing
 * @notice Token ini memiliki 6 desimal (sama seperti USDC asli)
 */
contract MockUSDC {
    string public name = "Mock USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    fallback() external {
        // Do nothing
    }

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockUSDC: bukan owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Mint token USDC ke suatu address (Publik untuk keperluan testing)
     * @param _to Address penerima
     * @param _amount Jumlah token (dalam satuan terkecil, 6 desimal)
     */
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "MockUSDC: mint ke zero address");
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
        emit Mint(_to, _amount);
    }

    /**
     * @dev Transfer token ke address lain
     */
    function transfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "MockUSDC: transfer ke zero address");
        require(balanceOf[msg.sender] >= _amount, "MockUSDC: saldo tidak cukup");
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += _amount;
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }

    /**
     * @dev Approve spender untuk menggunakan token
     */
    function approve(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "MockUSDC: approve ke zero address");
        allowance[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * @dev Transfer dari address lain (menggunakan allowance)
     */
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "MockUSDC: transfer ke zero address");
        require(balanceOf[_from] >= _amount, "MockUSDC: saldo tidak cukup");
        require(allowance[_from][msg.sender] >= _amount, "MockUSDC: allowance tidak cukup");
        allowance[_from][msg.sender] -= _amount;
        balanceOf[_from] -= _amount;
        balanceOf[_to] += _amount;
        emit Transfer(_from, _to, _amount);
        return true;
    }
}
