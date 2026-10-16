// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgentBudgetVault
 * @notice Programmable USDC payment budget for AI agents and software services.
 *
 * An owner funds this vault with USDC, authorizes exactly one agent wallet, defines
 * per-payment and total spending limits, and maintains an allowlist of approved
 * service-recipient addresses. The authorized agent may then pay approved recipients
 * up to the configured limits, with each payment uniquely identified by a job reference.
 *
 * Security model:
 *  - checks-effects-interactions on every state-mutating path.
 *  - ReentrancyGuard prevents re-entrant calls.
 *  - SafeERC20 reverts on any failed token transfer.
 *  - Pausing blocks deposits and agent payments; the owner can still withdraw.
 *  - Integer arithmetic uses Solidity ^0.8 built-in overflow protection.
 *  - No delegatecall, no assembly, non-upgradeable.
 */
contract AgentBudgetVault is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The USDC token this vault operates on.
    IERC20 public immutable usdc;

    /// @notice The single wallet address authorised to call `agentPay`.
    address public authorizedAgent;

    /// @notice Maximum USDC (in token units) that may be sent in a single payment.
    uint256 public maxPaymentAmount;

    /// @notice Cumulative spending cap.  Total paid out can never exceed this.
    uint256 public totalSpendingLimit;

    /// @notice Running total of every successful payment.
    uint256 public totalSpent;

    /// @notice Whether an address is an approved payment recipient.
    mapping(address => bool) public approvedRecipients;

    /**
     * @notice Whether a job reference has already been paid.
     * @dev    Stored as bytes32 to avoid redundant keccak inside the function.
     *         Callers should pass keccak256(abi.encodePacked(jobRef)) when the
     *         reference is a string; the contract accepts the pre-hashed form so
     *         it is compatible with any encoding scheme the agent uses.
     */
    mapping(bytes32 => bool) public usedJobRefs;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Deposited(address indexed sender, uint256 amount);
    event AgentAuthorized(address indexed previousAgent, address indexed newAgent);
    event RecipientAdded(address indexed recipient);
    event RecipientRemoved(address indexed recipient);
    event MaxPaymentAmountUpdated(uint256 oldMax, uint256 newMax);
    event TotalSpendingLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event AgentPayment(
        bytes32 indexed jobRef,
        address indexed recipient,
        uint256 amount,
        address indexed agent
    );
    event OwnerWithdrawal(address indexed to, uint256 amount);
    event VaultPaused(address indexed triggeredBy);
    event VaultUnpaused(address indexed triggeredBy);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error NotAuthorizedAgent();
    error RecipientNotApproved();
    error ExceedsMaxPaymentAmount();
    error ExceedsTotalSpendingLimit();
    error InsufficientVaultBalance();
    error DuplicateJobReference();
    error WithdrawAmountExceedsBalance();
    error SpendingLimitBelowTotalSpent();
    error SpendingLimitBelowMaxPayment();
    error MaxPaymentExceedsSpendingLimit();
    error ZeroJobReference();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param _usdc               Address of the USDC token contract.
     * @param initialOwner_       Address that will own this vault.
     * @param _authorizedAgent    Initial agent wallet (may be address(0) to start
     *                             with no agent and configure later via setAgent).
     * @param _maxPaymentAmount   Initial per-payment cap in USDC token units.
     * @param _totalSpendingLimit Initial cumulative spending cap in USDC token units.
     */
    constructor(
        address _usdc,
        address initialOwner_,
        address _authorizedAgent,
        uint256 _maxPaymentAmount,
        uint256 _totalSpendingLimit
    ) Ownable(initialOwner_) {
        if (_usdc == address(0)) revert ZeroAddress();
        // initialOwner_ zero check is handled by Ownable base constructor (OwnableInvalidOwner)
        // _authorizedAgent may be zero (owner can set it later via setAgent)
        if (_maxPaymentAmount == 0) revert ZeroAmount();
        if (_totalSpendingLimit == 0) revert ZeroAmount();
        if (_maxPaymentAmount > _totalSpendingLimit) revert MaxPaymentExceedsSpendingLimit();

        usdc = IERC20(_usdc);
        authorizedAgent = _authorizedAgent;
        maxPaymentAmount = _maxPaymentAmount;
        totalSpendingLimit = _totalSpendingLimit;

        if (_authorizedAgent != address(0)) {
            emit AgentAuthorized(address(0), _authorizedAgent);
        }
    }

    // -------------------------------------------------------------------------
    // Ownership safety
    // -------------------------------------------------------------------------

    /**
     * @notice Permanently disabled.
     * @dev    Renouncing ownership would brick all admin controls (pause recovery,
     *         agent rotation, limit updates, and owner withdrawals) with no
     *         recovery path.  Vaults are always owned.
     */
    function renounceOwnership() public pure override {
        revert("AgentBudgetVault: renounce disabled");
    }

    // -------------------------------------------------------------------------
    // Owner configuration
    // -------------------------------------------------------------------------

    /**
     * @notice Deposit USDC into the vault.
     * @dev    Caller must have approved this contract on the USDC token first.
     *         Blocked while paused to prevent accidental funding of a locked vault.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        // effects before interaction
        emit Deposited(msg.sender, amount);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Set the authorised agent wallet.
     * @dev    Pass address(0) to revoke the current agent without setting a new one.
     *         A zero agent means no one can call agentPay (msg.sender is never
     *         address(0)), which is the intended behaviour for a revoked vault.
     *         slither-disable-next-line missing-zero-check
     */
    function setAgent(address newAgent) external onlyOwner {
        address prev = authorizedAgent;
        // Intentional: address(0) revokes agent authority
        authorizedAgent = newAgent; // slither-disable-line missing-zero-check
        emit AgentAuthorized(prev, newAgent);
    }

    /**
     * @notice Add an address to the approved-recipient allowlist.
     */
    function addRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        approvedRecipients[recipient] = true;
        emit RecipientAdded(recipient);
    }

    /**
     * @notice Remove an address from the approved-recipient allowlist.
     */
    function removeRecipient(address recipient) external onlyOwner {
        approvedRecipients[recipient] = false;
        emit RecipientRemoved(recipient);
    }

    /**
     * @notice Update the per-payment maximum.
     * @dev    Cannot exceed the current totalSpendingLimit.
     */
    function setMaxPaymentAmount(uint256 newMax) external onlyOwner {
        if (newMax == 0) revert ZeroAmount();
        if (newMax > totalSpendingLimit) revert MaxPaymentExceedsSpendingLimit();
        uint256 old = maxPaymentAmount;
        maxPaymentAmount = newMax;
        emit MaxPaymentAmountUpdated(old, newMax);
    }

    /**
     * @notice Update the total cumulative spending cap.
     * @dev    Three invariants are enforced in priority order:
     *           1. newLimit must not be zero.
     *           2. newLimit must not be below totalSpent (would create negative headroom).
     *           3. newLimit must not be below maxPaymentAmount (would make every
     *              future payment immediately violate the per-payment cap, since the
     *              per-payment check only guards amount <= maxPaymentAmount, not
     *              amount <= newLimit directly — lowering the limit below maxPaymentAmount
     *              leaves the two invariants in contradiction).
     */
    function setTotalSpendingLimit(uint256 newLimit) external onlyOwner {
        if (newLimit == 0) revert ZeroAmount();
        if (newLimit < totalSpent) revert SpendingLimitBelowTotalSpent();
        if (newLimit < maxPaymentAmount) revert SpendingLimitBelowMaxPayment();
        uint256 old = totalSpendingLimit;
        totalSpendingLimit = newLimit;
        emit TotalSpendingLimitUpdated(old, newLimit);
    }

    /**
     * @notice Pause the vault.  Blocks deposit and agentPay; owner can still withdraw.
     */
    function pause() external onlyOwner {
        _pause();
        emit VaultPaused(msg.sender);
    }

    /**
     * @notice Unpause the vault.
     */
    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused(msg.sender);
    }

    /**
     * @notice Withdraw unspent USDC back to the owner.
     * @dev    Available while paused so the owner can recover funds in an emergency.
     *         Uses checks-effects-interactions.
     */
    function ownerWithdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = usdc.balanceOf(address(this));
        if (amount > bal) revert WithdrawAmountExceedsBalance();
        // effects before interaction
        emit OwnerWithdrawal(msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Agent payment
    // -------------------------------------------------------------------------

    /**
     * @notice Execute a USDC payment to an approved recipient.
     *
     * @param recipient Address to pay.  Must be in approvedRecipients.
     * @param amount    USDC amount in token units.  Must be > 0 and <= maxPaymentAmount.
     * @param jobRef    Unique reference for this job.  Pass keccak256 of the
     *                  string identifier.  Each reference can only be used once.
     *
     * Invariants enforced:
     *  1. Caller must be the authorized agent.
     *  2. Recipient must be approved.
     *  3. Amount must be > 0 and <= maxPaymentAmount.
     *  4. totalSpent + amount must not exceed totalSpendingLimit.
     *  5. Vault must hold enough USDC.
     *  6. jobRef must not be bytes32(0).
     *  7. jobRef must not have been used before.
     *  8. Token transfer must succeed (SafeERC20).
     */
    function agentPay(
        address recipient,
        uint256 amount,
        bytes32 jobRef
    ) external nonReentrant whenNotPaused {
        // --- checks ---
        if (msg.sender != authorizedAgent) revert NotAuthorizedAgent();
        if (!approvedRecipients[recipient]) revert RecipientNotApproved();
        if (amount == 0) revert ZeroAmount();
        if (amount > maxPaymentAmount) revert ExceedsMaxPaymentAmount();
        if (totalSpent + amount > totalSpendingLimit) revert ExceedsTotalSpendingLimit();
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientVaultBalance();
        // bytes32(0) is rejected as an invalid job reference.
        // Rationale: a zero bytes32 is the Solidity default value; accepting it would
        // allow a caller to pass an uninitialised or omitted reference and have it
        // recorded as "used", which would silently block any future payment that also
        // forgot to supply a reference.  The only cost of rejecting it is that callers
        // must supply a real identifier, which is the intended usage anyway.
        if (jobRef == bytes32(0)) revert ZeroJobReference();
        if (usedJobRefs[jobRef]) revert DuplicateJobReference();

        // --- effects ---
        usedJobRefs[jobRef] = true;
        totalSpent += amount;

        // --- interactions ---
        emit AgentPayment(jobRef, recipient, amount, msg.sender);
        usdc.safeTransfer(recipient, amount);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /// @notice USDC currently held in the vault.
    function vaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /// @notice Remaining headroom before the total spending limit is hit.
    function remainingBudget() external view returns (uint256) {
        return totalSpendingLimit - totalSpent;
    }
}
