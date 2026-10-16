// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RevertingERC20
 * @notice Minimal ERC-20 mock used only in Foundry unit tests.
 *         Supports configurable failure modes:
 *           - revertTransfer    : transfer() always reverts
 *           - revertTransferFrom: transferFrom() always reverts
 *         All other ERC-20 methods behave normally so the vault constructor
 *         and deposit path compile/deploy correctly.
 *         NOT intended for production use.
 */
contract RevertingERC20 {
    string public name;
    string public symbol;
    uint8  public decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool public revertTransfer;
    bool public revertTransferFrom;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8  _decimals,
        bool   _revertTransfer,
        bool   _revertTransferFrom
    ) {
        name               = _name;
        symbol             = _symbol;
        decimals           = _decimals;
        revertTransfer     = _revertTransfer;
        revertTransferFrom = _revertTransferFrom;
    }

    // ── ERC-20 ────────────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        if (revertTransfer) revert("RevertingERC20: transfer reverted");
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (revertTransferFrom) revert("RevertingERC20: transferFrom reverted");
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "RevertingERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function mint(address to, uint256 amount) external {
        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "RevertingERC20: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
    }
}
