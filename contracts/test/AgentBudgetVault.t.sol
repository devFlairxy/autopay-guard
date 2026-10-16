// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test}     from "forge-std/Test.sol";
import {Ownable}  from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {AgentBudgetVault} from "../AgentBudgetVault.sol";
import {MockERC20}        from "../test-helpers/MockERC20.sol";
import {RevertingERC20}   from "../test-helpers/RevertingERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixture
// ─────────────────────────────────────────────────────────────────────────────

contract AgentBudgetVaultTestBase is Test {
    // ── Actors ────────────────────────────────────────────────────────────────
    address internal owner     = makeAddr("owner");
    address internal agent     = makeAddr("agent");
    address internal recipient = makeAddr("recipient");
    address internal alice     = makeAddr("alice");   // generic non-privileged EOA
    address internal bob       = makeAddr("bob");     // second non-privileged EOA

    // ── Token ─────────────────────────────────────────────────────────────────
    MockERC20          internal usdc;

    // ── Vault params ──────────────────────────────────────────────────────────
    uint256 internal constant MAX_PAY   = 100e6;   // 100 USDC
    uint256 internal constant TOT_LIMIT = 500e6;   // 500 USDC
    uint256 internal constant DEPOSIT   = 1_000e6; // 1 000 USDC seed

    // ── Contract ──────────────────────────────────────────────────────────────
    AgentBudgetVault internal vault;

    // ── Job references ────────────────────────────────────────────────────────
    bytes32 internal constant JOB_A = keccak256("job-A");
    bytes32 internal constant JOB_B = keccak256("job-B");
    bytes32 internal constant JOB_C = keccak256("job-C");

    function setUp() public virtual {
        // Deploy mock USDC (6 decimals, matches Arc USDC)
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        // Deploy vault
        vault = new AgentBudgetVault(
            address(usdc),
            owner,
            agent,
            MAX_PAY,
            TOT_LIMIT
        );

        // Seed owner with USDC and approve vault for deposits
        usdc.mint(owner, DEPOSIT);
        vm.prank(owner);
        usdc.approve(address(vault), type(uint256).max);

        // Fund vault via deposit
        vm.prank(owner);
        vault.deposit(DEPOSIT);

        // Register recipient
        vm.prank(owner);
        vault.addRecipient(recipient);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deployment & initialisation
// ─────────────────────────────────────────────────────────────────────────────

contract DeploymentTest is AgentBudgetVaultTestBase {

    // ── TC-20: Constructor reverts on zero USDC address ──────────────────────
    function test_Constructor_RevertsOnZeroUsdc() public {
        vm.expectRevert(AgentBudgetVault.ZeroAddress.selector);
        new AgentBudgetVault(address(0), owner, agent, MAX_PAY, TOT_LIMIT);
    }

    // ── TC-20b: Constructor reverts on zero owner address ────────────────────
    // OZ Ownable(address(0)) fires OwnableInvalidOwner before our ZeroAddress check.
    // The observable revert IS OwnableInvalidOwner — this is the correct behaviour
    // since the base constructor runs first and protects against a zero owner.
    function test_Constructor_RevertsOnZeroOwner() public {
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0))
        );
        new AgentBudgetVault(address(usdc), address(0), agent, MAX_PAY, TOT_LIMIT);
    }

    // ── TC-21: Constructor reverts when maxPayment > totalSpendingLimit ───────
    function test_Constructor_RevertsWhenMaxPayExceedsSpendingLimit() public {
        vm.expectRevert(AgentBudgetVault.MaxPaymentExceedsSpendingLimit.selector);
        new AgentBudgetVault(address(usdc), owner, agent, 600e6, 500e6);
    }

    // Constructor reverts when maxPaymentAmount is zero
    function test_Constructor_RevertsOnZeroMaxPayment() public {
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        new AgentBudgetVault(address(usdc), owner, agent, 0, TOT_LIMIT);
    }

    // Constructor reverts when totalSpendingLimit is zero
    function test_Constructor_RevertsOnZeroSpendingLimit() public {
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        new AgentBudgetVault(address(usdc), owner, agent, MAX_PAY, 0);
    }

    // State is correctly initialised after deploy
    function test_Constructor_SetsInitialState() public view {
        assertEq(address(vault.usdc()),           address(usdc));
        assertEq(vault.owner(),                   owner);
        assertEq(vault.authorizedAgent(),         agent);
        assertEq(vault.maxPaymentAmount(),        MAX_PAY);
        assertEq(vault.totalSpendingLimit(),      TOT_LIMIT);
        assertEq(vault.totalSpent(),              0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. deposit()
// ─────────────────────────────────────────────────────────────────────────────

contract DepositTest is AgentBudgetVaultTestBase {

    // ── TC-1: Successful deposit increases vault balance ──────────────────────
    function test_Deposit_IncreasesVaultBalance() public {
        uint256 extra = 200e6;
        usdc.mint(alice, extra);

        vm.prank(alice);
        usdc.approve(address(vault), extra);

        uint256 balBefore = vault.vaultBalance();

        vm.prank(alice);
        vault.deposit(extra);

        assertEq(vault.vaultBalance(), balBefore + extra);
    }

    // deposit emits Deposited event
    function test_Deposit_EmitsEvent() public {
        uint256 extra = 50e6;
        usdc.mint(alice, extra);
        vm.prank(alice);
        usdc.approve(address(vault), extra);

        vm.expectEmit(true, false, false, true, address(vault));
        emit AgentBudgetVault.Deposited(alice, extra);

        vm.prank(alice);
        vault.deposit(extra);
    }

    // ── TC-11: deposit while paused reverts ────────────────────────────────
    function test_Deposit_RevertsWhenPaused() public {
        vm.prank(owner);
        vault.pause();

        usdc.mint(alice, 10e6);
        vm.prank(alice);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(alice);
        vault.deposit(10e6);
    }

    // deposit with zero amount reverts
    function test_Deposit_RevertsOnZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        vault.deposit(0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. agentPay()
// ─────────────────────────────────────────────────────────────────────────────

contract AgentPayTest is AgentBudgetVaultTestBase {

    // ── TC-2: Successful agentPay from authorized agent to approved recipient ──
    function test_AgentPay_HappyPath() public {
        uint256 amount = 50e6;
        uint256 recipientBefore = usdc.balanceOf(recipient);
        uint256 vaultBefore     = vault.vaultBalance();

        vm.prank(agent);
        vault.agentPay(recipient, amount, JOB_A);

        assertEq(usdc.balanceOf(recipient), recipientBefore + amount, "recipient balance");
        assertEq(vault.vaultBalance(),      vaultBefore - amount,     "vault balance");
        assertEq(vault.totalSpent(),        amount,                   "totalSpent");
        assertTrue(vault.usedJobRefs(JOB_A),                          "jobRef recorded");
    }

    // agentPay emits AgentPayment event
    function test_AgentPay_EmitsEvent() public {
        uint256 amount = 30e6;

        vm.expectEmit(true, true, true, true, address(vault));
        emit AgentBudgetVault.AgentPayment(JOB_A, recipient, amount, agent);

        vm.prank(agent);
        vault.agentPay(recipient, amount, JOB_A);
    }

    // ── TC-3: Unauthorized address attempting agentPay reverts NotAuthorizedAgent
    function test_AgentPay_RevertsForUnauthorizedCaller() public {
        vm.expectRevert(AgentBudgetVault.NotAuthorizedAgent.selector);
        vm.prank(alice);
        vault.agentPay(recipient, 10e6, JOB_A);
    }

    // ── TC-4: Authorized agent paying unapproved recipient reverts ─────────────
    function test_AgentPay_RevertsForUnapprovedRecipient() public {
        vm.expectRevert(AgentBudgetVault.RecipientNotApproved.selector);
        vm.prank(agent);
        vault.agentPay(bob, 10e6, JOB_A);
    }

    // ── TC-5: Payment above maxPaymentAmount reverts ──────────────────────────
    function test_AgentPay_RevertsWhenExceedsMaxPayment() public {
        uint256 overMax = MAX_PAY + 1;
        vm.expectRevert(AgentBudgetVault.ExceedsMaxPaymentAmount.selector);
        vm.prank(agent);
        vault.agentPay(recipient, overMax, JOB_A);
    }

    // ── TC-6: Cumulative spending above totalSpendingLimit reverts ─────────────
    function test_AgentPay_RevertsWhenExceedsTotalSpendingLimit() public {
        // Make 5 x MAX_PAY payments to exhaust the limit (5 * 100 = 500 == TOT_LIMIT)
        bytes32[5] memory refs = [
            keccak256("x1"), keccak256("x2"), keccak256("x3"),
            keccak256("x4"), keccak256("x5")
        ];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(agent);
            vault.agentPay(recipient, MAX_PAY, refs[i]);
        }
        // totalSpent == 500 == TOT_LIMIT; any further payment must revert
        vm.expectRevert(AgentBudgetVault.ExceedsTotalSpendingLimit.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 1, JOB_A); // even 1 wei exceeds the limit now
    }

    // ── TC-6b: Direct single-payment that exactly causes the breach ────────────
    function test_AgentPay_RevertsWhenSinglePaymentExceedsSpendingLimit() public {
        // Deploy a vault where maxPayment == totalSpendingLimit == 100e6
        AgentBudgetVault small = new AgentBudgetVault(
            address(usdc),
            owner,
            agent,
            100e6,
            100e6
        );
        usdc.mint(owner, 300e6);
        vm.startPrank(owner);
        usdc.approve(address(small), type(uint256).max);
        small.deposit(200e6);
        small.addRecipient(recipient);
        vm.stopPrank();

        // First payment consumes the full limit
        vm.prank(agent);
        small.agentPay(recipient, 100e6, JOB_A);

        // Second payment should revert
        vm.expectRevert(AgentBudgetVault.ExceedsTotalSpendingLimit.selector);
        vm.prank(agent);
        small.agentPay(recipient, 100e6, JOB_B);
    }

    // ── TC-7: Duplicate jobRef reverts DuplicateJobReference ──────────────────
    function test_AgentPay_RevertsDuplicateJobRef() public {
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);

        vm.expectRevert(AgentBudgetVault.DuplicateJobReference.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);
    }

    // ── NEW-8: agentPay with jobRef == bytes32(0) reverts ZeroJobReference ────
    function test_AgentPay_RevertsOnZeroJobRef() public {
        vm.expectRevert(AgentBudgetVault.ZeroJobReference.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, bytes32(0));
    }

    // ── NEW-9: Zero-jobRef revert must not mark bytes32(0) as used ────────────
    function test_AgentPay_ZeroJobRefNotMarkedUsed() public {
        vm.expectRevert(AgentBudgetVault.ZeroJobReference.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, bytes32(0));

        // bytes32(0) must NOT have been recorded as used
        assertFalse(vault.usedJobRefs(bytes32(0)), "bytes32(0) must not be marked used");
    }

    // ── NEW-10: After a zero-jobRef revert, a real jobRef then a dup revert ───
    function test_AgentPay_DuplicateJobRefAfterZeroJobRef() public {
        // Zero-ref attempt must revert (not DuplicateJobReference)
        vm.expectRevert(AgentBudgetVault.ZeroJobReference.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, bytes32(0));

        // First real payment
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);

        // Duplicate of that real payment must revert DuplicateJobReference
        vm.expectRevert(AgentBudgetVault.DuplicateJobReference.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);
    }

    // ── TC-8: agentPay when vault balance insufficient reverts ─────────────────
    function test_AgentPay_RevertsInsufficientVaultBalance() public {
        // Deploy a fresh vault with no funds
        AgentBudgetVault empty = new AgentBudgetVault(
            address(usdc),
            owner,
            agent,
            MAX_PAY,
            TOT_LIMIT
        );
        vm.prank(owner);
        empty.addRecipient(recipient);

        vm.expectRevert(AgentBudgetVault.InsufficientVaultBalance.selector);
        vm.prank(agent);
        empty.agentPay(recipient, 10e6, JOB_A);
    }

    // ── TC-9: Zero-value agentPay reverts ZeroAmount ───────────────────────────
    function test_AgentPay_RevertsOnZeroAmount() public {
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 0, JOB_A);
    }

    // ── TC-10: agentPay while paused reverts ──────────────────────────────────
    function test_AgentPay_RevertsWhenPaused() public {
        vm.prank(owner);
        vault.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ownerWithdraw()
// ─────────────────────────────────────────────────────────────────────────────

contract OwnerWithdrawTest is AgentBudgetVaultTestBase {

    // ── TC-12: ownerWithdraw after pause succeeds (emergency recovery) ─────────
    function test_OwnerWithdraw_SucceedsWhilePaused() public {
        vm.prank(owner);
        vault.pause();

        uint256 ownerBefore = usdc.balanceOf(owner);
        uint256 amount      = 100e6;

        vm.expectEmit(true, false, false, true, address(vault));
        emit AgentBudgetVault.OwnerWithdrawal(owner, amount);

        vm.prank(owner);
        vault.ownerWithdraw(amount);

        assertEq(usdc.balanceOf(owner),  ownerBefore + amount);
        assertEq(vault.vaultBalance(),   DEPOSIT - amount);
    }

    // ownerWithdraw happy path (unpaused)
    function test_OwnerWithdraw_TransfersFundsToOwner() public {
        uint256 ownerBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        vault.ownerWithdraw(50e6);

        assertEq(usdc.balanceOf(owner), ownerBefore + 50e6);
        assertEq(vault.vaultBalance(),  DEPOSIT - 50e6);
    }

    // ── TC-13: ownerWithdraw beyond vault balance reverts ─────────────────────
    function test_OwnerWithdraw_RevertsWhenExceedsBalance() public {
        vm.expectRevert(AgentBudgetVault.WithdrawAmountExceedsBalance.selector);
        vm.prank(owner);
        vault.ownerWithdraw(DEPOSIT + 1);
    }

    // ownerWithdraw with zero amount reverts
    function test_OwnerWithdraw_RevertsOnZeroAmount() public {
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        vm.prank(owner);
        vault.ownerWithdraw(0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. setTotalSpendingLimit() / setMaxPaymentAmount()
// ─────────────────────────────────────────────────────────────────────────────

contract LimitConfigTest is AgentBudgetVaultTestBase {

    // ── TC-14: setTotalSpendingLimit below totalSpent reverts ──────────────────
    function test_SetTotalSpendingLimit_RevertsWhenBelowTotalSpent() public {
        // Spend 100 USDC first
        vm.prank(agent);
        vault.agentPay(recipient, 100e6, JOB_A);

        // Try to set limit below totalSpent
        vm.expectRevert(AgentBudgetVault.SpendingLimitBelowTotalSpent.selector);
        vm.prank(owner);
        vault.setTotalSpendingLimit(50e6);
    }

    // setTotalSpendingLimit happy path
    function test_SetTotalSpendingLimit_UpdatesValue() public {
        uint256 newLimit = 1000e6;

        vm.expectEmit(false, false, false, true, address(vault));
        emit AgentBudgetVault.TotalSpendingLimitUpdated(TOT_LIMIT, newLimit);

        vm.prank(owner);
        vault.setTotalSpendingLimit(newLimit);

        assertEq(vault.totalSpendingLimit(), newLimit);
    }

    // setTotalSpendingLimit to exactly totalSpent succeeds (boundary)
    function test_SetTotalSpendingLimit_EqualsSpentSucceeds() public {
        vm.prank(agent);
        vault.agentPay(recipient, 100e6, JOB_A);

        vm.prank(owner);
        vault.setTotalSpendingLimit(100e6); // == totalSpent, should NOT revert
        assertEq(vault.totalSpendingLimit(), 100e6);
    }

    // ── TC-15: setMaxPaymentAmount above totalSpendingLimit reverts ────────────
    function test_SetMaxPaymentAmount_RevertsWhenExceedsSpendingLimit() public {
        vm.expectRevert(AgentBudgetVault.MaxPaymentExceedsSpendingLimit.selector);
        vm.prank(owner);
        vault.setMaxPaymentAmount(TOT_LIMIT + 1);
    }

    // setMaxPaymentAmount happy path
    function test_SetMaxPaymentAmount_UpdatesValue() public {
        uint256 newMax = 200e6;
        // First raise the spending limit to accommodate
        vm.prank(owner);
        vault.setTotalSpendingLimit(1000e6);

        vm.expectEmit(false, false, false, true, address(vault));
        emit AgentBudgetVault.MaxPaymentAmountUpdated(MAX_PAY, newMax);

        vm.prank(owner);
        vault.setMaxPaymentAmount(newMax);

        assertEq(vault.maxPaymentAmount(), newMax);
    }

    // setMaxPaymentAmount with zero amount reverts
    function test_SetMaxPaymentAmount_RevertsOnZeroAmount() public {
        vm.expectRevert(AgentBudgetVault.ZeroAmount.selector);
        vm.prank(owner);
        vault.setMaxPaymentAmount(0);
    }

    // ── NEW-1: setTotalSpendingLimit reverts when newLimit < maxPaymentAmount ──
    // Fixture: MAX_PAY=100e6, TOT_LIMIT=500e6.  50e6 < MAX_PAY → SpendingLimitBelowMaxPayment.
    function test_SetTotalSpendingLimit_RevertsWhenBelowMaxPayment() public {
        vm.expectRevert(AgentBudgetVault.SpendingLimitBelowMaxPayment.selector);
        vm.prank(owner);
        vault.setTotalSpendingLimit(50e6); // 50e6 < MAX_PAY (100e6)
    }

    // ── NEW-2: setTotalSpendingLimit(MAX_PAY) succeeds when totalSpent==0 ──────
    function test_SetTotalSpendingLimit_EqualsMaxPaymentSucceeds() public {
        // totalSpent == 0, newLimit == MAX_PAY — boundary: should NOT revert
        vm.prank(owner);
        vault.setTotalSpendingLimit(MAX_PAY);

        assertEq(vault.totalSpendingLimit(), MAX_PAY);
    }

    // ── NEW-3: Valid reduction (>= totalSpent AND >= maxPaymentAmount) succeeds ─
    function test_SetTotalSpendingLimit_ValidReductionSucceeds() public {
        // Spend 100 USDC so totalSpent == 100e6
        vm.prank(agent);
        vault.agentPay(recipient, 100e6, JOB_A);

        // New limit 200e6: >= totalSpent (100e6) AND >= maxPaymentAmount (100e6)
        vm.prank(owner);
        vault.setTotalSpendingLimit(200e6);

        assertEq(vault.totalSpendingLimit(), 200e6);
    }

    // ── NEW-4: Raising the limit must not reset totalSpent ────────────────────
    function test_SetTotalSpendingLimit_DoesNotResetTotalSpent() public {
        uint256 payAmount = 50e6;
        vm.prank(agent);
        vault.agentPay(recipient, payAmount, JOB_A);

        uint256 spentBefore = vault.totalSpent();
        assertEq(spentBefore, payAmount, "pre-condition: totalSpent should equal payment");

        // Raise the limit
        vm.prank(owner);
        vault.setTotalSpendingLimit(1000e6);

        // totalSpent must be unchanged
        assertEq(vault.totalSpent(), spentBefore, "totalSpent must not change after limit update");
    }

    // ── NEW-5: ownerWithdraw must not affect totalSpent ───────────────────────
    function test_OwnerWithdraw_DoesNotAffectTotalSpent() public {
        uint256 payAmount = 75e6;
        vm.prank(agent);
        vault.agentPay(recipient, payAmount, JOB_A);

        uint256 spentAfterPayment = vault.totalSpent();
        assertEq(spentAfterPayment, payAmount, "pre-condition: totalSpent should equal payment");

        // Owner withdraws some USDC
        vm.prank(owner);
        vault.ownerWithdraw(100e6);

        // totalSpent must remain the same — withdrawal is not a payment
        assertEq(vault.totalSpent(), spentAfterPayment, "ownerWithdraw must not change totalSpent");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Access control (owner-only functions)
// ─────────────────────────────────────────────────────────────────────────────

contract AccessControlTest is AgentBudgetVaultTestBase {

    // ── TC-18: Only owner can call owner-only functions ───────────────────────

    function test_OnlyOwner_AddRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.addRecipient(bob);
    }

    function test_OnlyOwner_RemoveRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.removeRecipient(recipient);
    }

    function test_OnlyOwner_SetAgent() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.setAgent(alice);
    }

    function test_OnlyOwner_Pause() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.pause();
    }

    function test_OnlyOwner_Unpause() public {
        vm.prank(owner);
        vault.pause();

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.unpause();
    }

    function test_OnlyOwner_OwnerWithdraw() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.ownerWithdraw(10e6);
    }

    function test_OnlyOwner_SetMaxPaymentAmount() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.setMaxPaymentAmount(50e6);
    }

    function test_OnlyOwner_SetTotalSpendingLimit() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.setTotalSpendingLimit(1000e6);
    }

    // addRecipient with zero address reverts ZeroAddress
    function test_AddRecipient_RevertsOnZeroAddress() public {
        vm.expectRevert(AgentBudgetVault.ZeroAddress.selector);
        vm.prank(owner);
        vault.addRecipient(address(0));
    }

    // removeRecipient works (idempotent on already-false)
    function test_RemoveRecipient_Works() public {
        vm.expectEmit(true, false, false, false, address(vault));
        emit AgentBudgetVault.RecipientRemoved(recipient);

        vm.prank(owner);
        vault.removeRecipient(recipient);

        assertFalse(vault.approvedRecipients(recipient));
    }

    // setAgent happy path + event
    function test_SetAgent_UpdatesAgent() public {
        vm.expectEmit(true, true, false, false, address(vault));
        emit AgentBudgetVault.AgentAuthorized(agent, alice);

        vm.prank(owner);
        vault.setAgent(alice);

        assertEq(vault.authorizedAgent(), alice);
    }

    // setAgent to zero revokes agent (no one can agentPay)
    function test_SetAgent_ZeroRevokesAgent() public {
        vm.prank(owner);
        vault.setAgent(address(0));

        assertEq(vault.authorizedAgent(), address(0));

        // Former agent can no longer pay
        vm.expectRevert(AgentBudgetVault.NotAuthorizedAgent.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. renounceOwnership() — TC-16
// ─────────────────────────────────────────────────────────────────────────────

contract RenounceOwnershipTest is AgentBudgetVaultTestBase {

    // ── TC-16: renounceOwnership always reverts ────────────────────────────────
    function test_RenounceOwnership_AlwaysReverts() public {
        vm.expectRevert(bytes("AgentBudgetVault: renounce disabled"));
        vm.prank(owner);
        vault.renounceOwnership();
    }

    // Non-owner call also reverts (different revert message order — OZ checks onlyOwner first
    // but renounceOwnership is `pure override` with no modifier; pure revert wins)
    function test_RenounceOwnership_AlwaysRevertsForNonOwner() public {
        vm.expectRevert(bytes("AgentBudgetVault: renounce disabled"));
        vm.prank(alice);
        vault.renounceOwnership();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Two-step ownership transfer — TC-19
// ─────────────────────────────────────────────────────────────────────────────

contract Ownable2StepTest is AgentBudgetVaultTestBase {

    // ── TC-19: Two-step ownership transfer works correctly ────────────────────

    function test_TransferOwnership_TwoStepFlow() public {
        // Step 1 – propose
        vm.prank(owner);
        vault.transferOwnership(alice);

        // Ownership NOT yet transferred
        assertEq(vault.owner(),           owner);
        assertEq(vault.pendingOwner(),    alice);

        // Step 2 – accept
        vm.prank(alice);
        vault.acceptOwnership();

        assertEq(vault.owner(),           alice);
        assertEq(vault.pendingOwner(),    address(0));
    }

    // Pending owner cannot use owner functions before acceptance
    function test_TransferOwnership_PendingCannotActAsOwner() public {
        vm.prank(owner);
        vault.transferOwnership(alice);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        vault.pause(); // should still fail — alice is only pending owner
    }

    // Only the pending owner can accept
    function test_TransferOwnership_NonPendingCannotAccept() public {
        vm.prank(owner);
        vault.transferOwnership(alice);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        vm.prank(bob);
        vault.acceptOwnership();
    }

    // ── NEW-15: Full two-step flow with intermediate state verification ────────
    function test_TransferOwnership_RequiresAcceptance() public {
        // Step 1 – propose transfer to alice
        vm.prank(owner);
        vault.transferOwnership(alice);

        // Ownership must NOT have flipped yet
        assertEq(vault.owner(),        owner, "owner must not change until accepted");
        assertEq(vault.pendingOwner(), alice, "pendingOwner must be alice after proposal");

        // Step 2 – alice accepts
        vm.prank(alice);
        vault.acceptOwnership();

        // Now ownership must have flipped
        assertEq(vault.owner(),        alice,          "owner must be alice after acceptance");
        assertEq(vault.pendingOwner(), address(0),     "pendingOwner must be cleared");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Accounting correctness — TC-17
// ─────────────────────────────────────────────────────────────────────────────

contract AccountingTest is AgentBudgetVaultTestBase {

    // ── TC-17: totalSpent and remainingBudget accounting after multiple payments ─
    function test_Accounting_MultiplePayments() public {
        uint256 p1 = 50e6;
        uint256 p2 = 75e6;
        uint256 p3 = 100e6;

        vm.prank(agent);
        vault.agentPay(recipient, p1, JOB_A);
        assertEq(vault.totalSpent(),      p1);
        assertEq(vault.remainingBudget(), TOT_LIMIT - p1);

        vm.prank(agent);
        vault.agentPay(recipient, p2, JOB_B);
        assertEq(vault.totalSpent(),      p1 + p2);
        assertEq(vault.remainingBudget(), TOT_LIMIT - p1 - p2);

        vm.prank(agent);
        vault.agentPay(recipient, p3, JOB_C);
        assertEq(vault.totalSpent(),      p1 + p2 + p3);
        assertEq(vault.remainingBudget(), TOT_LIMIT - p1 - p2 - p3);
    }

    // vaultBalance reflects token transfers correctly
    function test_Accounting_VaultBalanceMatchesToken() public {
        uint256 payment = 80e6;
        vm.prank(agent);
        vault.agentPay(recipient, payment, JOB_A);

        assertEq(vault.vaultBalance(), usdc.balanceOf(address(vault)));
        assertEq(vault.vaultBalance(), DEPOSIT - payment);
    }

    // remainingBudget never underflows (totalSpent can never exceed totalSpendingLimit)
    function test_Accounting_RemainingBudgetNeverUnderflows() public {
        // Exhaust the budget: 5 * 100 = 500 == TOT_LIMIT
        bytes32[5] memory refs = [
            keccak256("r1"), keccak256("r2"), keccak256("r3"),
            keccak256("r4"), keccak256("r5")
        ];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(agent);
            vault.agentPay(recipient, MAX_PAY, refs[i]);
        }
        assertEq(vault.totalSpent(),      TOT_LIMIT);
        assertEq(vault.remainingBudget(), 0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Pause / Unpause
// ─────────────────────────────────────────────────────────────────────────────

contract PauseTest is AgentBudgetVaultTestBase {

    function test_Pause_EmitsBothEvents() public {
        vm.expectEmit(true, false, false, false, address(vault));
        emit AgentBudgetVault.VaultPaused(owner);
        vm.prank(owner);
        vault.pause();

        assertEq(vault.paused(), true);

        vm.expectEmit(true, false, false, false, address(vault));
        emit AgentBudgetVault.VaultUnpaused(owner);
        vm.prank(owner);
        vault.unpause();

        assertEq(vault.paused(), false);
    }

    // Unpause re-enables deposits and agent payments
    function test_Unpause_ReenablesDepositsAndPayments() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(owner);
        vault.unpause();

        // Deposit should succeed again
        usdc.mint(alice, 10e6);
        vm.prank(alice);
        usdc.approve(address(vault), 10e6);
        vm.prank(alice);
        vault.deposit(10e6); // no revert

        // agentPay should succeed again
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A); // no revert
    }

    // ── NEW-13: pause blocks both deposit and agentPay ───────────────────────
    function test_Pause_BlocksDepositsAndAgentPay() public {
        vm.prank(owner);
        vault.pause();

        // Deposit must revert with EnforcedPause
        usdc.mint(alice, 10e6);
        vm.prank(alice);
        usdc.approve(address(vault), 10e6);

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(alice);
        vault.deposit(10e6);

        // agentPay must also revert with EnforcedPause
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 10e6, JOB_A);
    }

    // ── NEW-14: ownerWithdraw succeeds while paused and vault balance is correct
    function test_Pause_OwnerWithdrawSucceedsWhilePaused() public {
        // Make a payment to change state before pausing
        uint256 payAmount = 50e6;
        vm.prank(agent);
        vault.agentPay(recipient, payAmount, JOB_A);

        uint256 spentBeforePause  = vault.totalSpent();
        uint256 limitBeforePause  = vault.totalSpendingLimit();
        uint256 vaultBalBefore    = vault.vaultBalance();

        vm.prank(owner);
        vault.pause();

        uint256 withdrawAmount  = 100e6;
        uint256 ownerBalBefore  = usdc.balanceOf(owner);

        vm.prank(owner);
        vault.ownerWithdraw(withdrawAmount);

        // USDC balances updated correctly
        assertEq(usdc.balanceOf(owner),  ownerBalBefore + withdrawAmount, "owner USDC balance");
        assertEq(vault.vaultBalance(),   vaultBalBefore - withdrawAmount, "vault USDC balance");

        // No other state changed — totalSpent and totalSpendingLimit must be intact
        assertEq(vault.totalSpent(),         spentBeforePause, "totalSpent unchanged");
        assertEq(vault.totalSpendingLimit(), limitBeforePause, "totalSpendingLimit unchanged");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Fuzz — TC-22
// ─────────────────────────────────────────────────────────────────────────────

contract AgentPayFuzzTest is AgentBudgetVaultTestBase {

    /**
     * @dev TC-22: Fuzz that agentPay amounts always respect limits.
     *
     * Strategy: bound the fuzz `amount` to [1, MAX_PAY] so the per-payment cap
     * is never exceeded by construction, then call agentPay up to N times with
     * distinct job refs.  After each successful payment:
     *   - totalSpent increases by exactly `amount`
     *   - remainingBudget decreases by exactly `amount`
     *   - vaultBalance decreases by exactly `amount`
     *   - The invariant totalSpent + remainingBudget == totalSpendingLimit holds
     */
    function testFuzz_AgentPay_RespectsLimitsOnEachPayment(
        uint256 amount,
        uint256 seed
    ) public {
        // Bound amount so it is always valid per-payment
        amount = bound(amount, 1, MAX_PAY);

        // Ensure the vault has enough funds (top-up if needed)
        uint256 vbal = vault.vaultBalance();
        if (vbal < amount) {
            usdc.mint(owner, amount - vbal);
            vm.prank(owner);
            usdc.approve(address(vault), amount - vbal);
            vm.prank(owner);
            vault.deposit(amount - vbal);
        }

        // Only proceed if budget headroom allows
        vm.assume(vault.remainingBudget() >= amount);

        uint256 spentBefore    = vault.totalSpent();
        uint256 budgetBefore   = vault.remainingBudget();
        uint256 vaultBefore    = vault.vaultBalance();

        // Derive a unique job ref from seed + current totalSpent to avoid collisions
        bytes32 jobRef = keccak256(abi.encodePacked(seed, vault.totalSpent(), amount));

        // Skip if jobRef already used (unlikely but possible with small seed space)
        vm.assume(!vault.usedJobRefs(jobRef));

        vm.prank(agent);
        vault.agentPay(recipient, amount, jobRef);

        assertEq(vault.totalSpent(),      spentBefore  + amount, "totalSpent delta");
        assertEq(vault.remainingBudget(), budgetBefore - amount, "remainingBudget delta");
        assertEq(vault.vaultBalance(),    vaultBefore  - amount, "vaultBalance delta");
        assertEq(
            vault.totalSpent() + vault.remainingBudget(),
            vault.totalSpendingLimit(),
            "conservation invariant"
        );
    }

    /**
     * @dev Fuzz: any payment strictly above maxPaymentAmount always reverts.
     */
    function testFuzz_AgentPay_AlwaysRevertsAboveMaxPayment(uint256 overAmount) public {
        overAmount = bound(overAmount, MAX_PAY + 1, type(uint128).max);

        vm.expectRevert(AgentBudgetVault.ExceedsMaxPaymentAmount.selector);
        vm.prank(agent);
        vault.agentPay(recipient, overAmount, JOB_A);
    }

    /**
     * @dev Fuzz: any caller that is not the authorized agent always gets
     *      NotAuthorizedAgent regardless of other parameters.
     */
    function testFuzz_AgentPay_UnauthorizedCallerAlwaysReverts(
        address caller,
        uint256 amount,
        bytes32 jobRef
    ) public {
        vm.assume(caller != agent);
        amount = bound(amount, 1, MAX_PAY);

        vm.expectRevert(AgentBudgetVault.NotAuthorizedAgent.selector);
        vm.prank(caller);
        vault.agentPay(recipient, amount, jobRef);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. TC-6 edge — spending limit exactly at boundary
// ─────────────────────────────────────────────────────────────────────────────

contract SpendingLimitBoundaryTest is AgentBudgetVaultTestBase {

    // Payment that brings totalSpent exactly to totalSpendingLimit succeeds,
    // and the very next payment reverts
    function test_SpendingLimit_ExactBoundaryThenRevert() public {
        // Consume 400 of 500
        bytes32[4] memory refs = [
            keccak256("b1"), keccak256("b2"), keccak256("b3"), keccak256("b4")
        ];
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(agent);
            vault.agentPay(recipient, MAX_PAY, refs[i]);
        }
        assertEq(vault.totalSpent(), 400e6);

        // Payment of exactly 100 reaches the limit — should succeed
        vm.prank(agent);
        vault.agentPay(recipient, 100e6, JOB_A);
        assertEq(vault.totalSpent(), TOT_LIMIT);

        // Any further payment (even 1 wei) should revert
        vm.expectRevert(AgentBudgetVault.ExceedsTotalSpendingLimit.selector);
        vm.prank(agent);
        vault.agentPay(recipient, 1, JOB_B);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Agent revocation
// ─────────────────────────────────────────────────────────────────────────────

contract AgentRevocationTest is AgentBudgetVaultTestBase {

    // ── NEW-6: Revoked agent cannot make subsequent payments ─────────────────
    function test_AgentRevocation_PreventsSubsequentPayment() public {
        // Alice is initially NOT the agent; set her as the agent
        vm.prank(owner);
        vault.setAgent(alice);

        // Alice can pay successfully
        vm.prank(alice);
        vault.agentPay(recipient, 10e6, JOB_A);

        // Owner revokes alice's agent role
        vm.prank(owner);
        vault.setAgent(address(0));

        // Alice can no longer pay
        vm.expectRevert(AgentBudgetVault.NotAuthorizedAgent.selector);
        vm.prank(alice);
        vault.agentPay(recipient, 10e6, JOB_B);
    }

    // ── NEW-7: Old agent blocked, new agent can pay ───────────────────────────
    function test_AgentRevocation_NewAgentCanPay() public {
        // Set alice as agent
        vm.prank(owner);
        vault.setAgent(alice);

        // Revoke alice and appoint bob as new agent
        vm.prank(owner);
        vault.setAgent(bob);

        // alice (old agent) must now be blocked
        vm.expectRevert(AgentBudgetVault.NotAuthorizedAgent.selector);
        vm.prank(alice);
        vault.agentPay(recipient, 10e6, JOB_A);

        // bob (new agent) can pay
        vm.prank(bob);
        vault.agentPay(recipient, 10e6, JOB_B);
        assertEq(vault.totalSpent(), 10e6, "new agent payment must be recorded");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Failed token transfer (RevertingERC20 mock)
// ─────────────────────────────────────────────────────────────────────────────

contract FailedTransferTest is Test {
    // ── Actors ────────────────────────────────────────────────────────────────
    address internal owner     = makeAddr("owner");
    address internal agent     = makeAddr("agent");
    address internal recipient = makeAddr("recipient");

    // ── Vault params ──────────────────────────────────────────────────────────
    uint256 internal constant MAX_PAY   = 100e6;
    uint256 internal constant TOT_LIMIT = 500e6;
    uint256 internal constant DEPOSIT   = 1_000e6;

    // ── Job references ────────────────────────────────────────────────────────
    bytes32 internal constant JOB_A = keccak256("job-A");

    // ── NEW-11: Token transfer() failure in agentPay reverts all state ────────
    function test_AgentPay_TokenTransferFailureRevertsAllState() public {
        // Deploy a token whose transfer() always reverts
        RevertingERC20 badToken = new RevertingERC20(
            "Bad USDC", "bUSDC", 6,
            true,  // revertTransfer
            false  // revertTransferFrom (deposit uses transferFrom, must succeed)
        );

        AgentBudgetVault vault = new AgentBudgetVault(
            address(badToken),
            owner,
            agent,
            MAX_PAY,
            TOT_LIMIT
        );

        // Fund vault: transferFrom is not broken, so deposit succeeds
        badToken.mint(owner, DEPOSIT);
        vm.startPrank(owner);
        badToken.approve(address(vault), type(uint256).max);
        vault.deposit(DEPOSIT);
        vault.addRecipient(recipient);
        vm.stopPrank();

        // agentPay will attempt transfer() → must revert
        vm.prank(agent);
        vm.expectRevert();
        vault.agentPay(recipient, 10e6, JOB_A);

        // State must not have been mutated by the reverted call
        assertFalse(vault.usedJobRefs(JOB_A),  "jobRef must not be marked used after revert");
        assertEq(vault.totalSpent(), 0,         "totalSpent must be 0 after failed transfer");
    }

    // ── NEW-12: Token transferFrom() failure in deposit reverts state ─────────
    function test_Deposit_TokenTransferFromFailureRevertsState() public {
        // Deploy a token whose transferFrom() always reverts
        RevertingERC20 badToken = new RevertingERC20(
            "Bad USDC", "bUSDC", 6,
            false, // revertTransfer
            true   // revertTransferFrom
        );

        AgentBudgetVault vault = new AgentBudgetVault(
            address(badToken),
            owner,
            agent,
            MAX_PAY,
            TOT_LIMIT
        );

        // Mint tokens directly to the test contract (never reaches vault)
        badToken.mint(address(this), DEPOSIT);
        badToken.approve(address(vault), type(uint256).max);

        uint256 vaultBalBefore = badToken.balanceOf(address(vault));

        // deposit() calls transferFrom → must revert
        vm.expectRevert();
        vault.deposit(DEPOSIT);

        // Vault balance must be unchanged
        assertEq(
            badToken.balanceOf(address(vault)),
            vaultBalBefore,
            "vault balance must not change after failed deposit"
        );
    }
}
