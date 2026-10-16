import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContracts } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { erc20Abi } from 'viem'
import { Loader2, ArrowUpRight, AlertTriangle, DollarSign, User, Shield, Power, ArrowDownLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AGENT_BUDGET_VAULT } from '../contract'
import { getUsdc } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

const TARGET_CHAIN = arcTestnet.id
const usdcFact = getUsdc(TARGET_CHAIN)!
const USDC_ADDRESS = usdcFact.address as `0x${string}`

function formatUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  return Amount.fromRaw(raw, usdcDecimalsFor(TARGET_CHAIN)).toFixed(2)
}

type ActionTab = 'deposit' | 'agent' | 'recipients' | 'limits' | 'pause' | 'withdraw'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}
function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
      style={{
        background: active ? 'rgba(172,198,233,0.2)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--subtle)',
        border: active ? '1px solid rgba(172,198,233,0.3)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  )
}

interface TxButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  isPending: boolean
  isConfirming: boolean
  danger?: boolean
}
function TxButton({ label, onClick, disabled, isPending, isConfirming, danger }: TxButtonProps) {
  const busy = isPending || isConfirming
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: danger ? 'rgba(232,109,122,0.2)' : 'var(--accent)',
        color: danger ? 'var(--danger)' : '#0d1b2f',
        border: danger ? '1px solid rgba(232,109,122,0.4)' : 'none',
      }}
    >
      {busy ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {isPending ? 'Confirm in wallet…' : 'Confirming…'}
        </span>
      ) : (
        label
      )}
    </button>
  )
}

function Receipt({ hash, label }: { hash: `0x${string}` | undefined; label: string }) {
  const { isSuccess } = useWaitForTransactionReceipt({ hash })
  if (!hash || !isSuccess) return null
  return (
    <div
      className="flex items-center justify-between rounded-xl p-3 text-xs"
      style={{ background: 'rgba(141,216,159,0.1)', border: '1px solid rgba(141,216,159,0.25)' }}
    >
      <span style={{ color: 'var(--success)' }}>{label} confirmed</span>
      <a
        href={`https://explorer.testnet.arc.io/tx/${hash}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1"
        style={{ color: 'var(--accent)' }}
      >
        View <ArrowUpRight className="size-3" />
      </a>
    </div>
  )
}

export function ConfigureScreen() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = isConnected && chainId !== TARGET_CHAIN

  const [tab, setTab] = useState<ActionTab>('deposit')
  const [depositAmount, setDepositAmount] = useState('')
  const [agentAddr, setAgentAddr] = useState('')
  const [recipientAddr, setRecipientAddr] = useState('')
  const [newMaxPayment, setNewMaxPayment] = useState('')
  const [newSpendingLimit, setNewSpendingLimit] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const { writeContract: approveWrite, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { data: vaultData } = useReadContracts({
    contracts: [
      { ...AGENT_BUDGET_VAULT, functionName: 'paused', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'vaultBalance', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'totalSpendingLimit', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'owner', chainId: TARGET_CHAIN },
    ],
  })
  const rawCfg = vaultData?.map((r) => r.result) ?? []
  const paused = rawCfg[0] as boolean | undefined
  const vaultBal = rawCfg[1] as bigint | undefined
  const spendingLimit = rawCfg[2] as bigint | undefined
  const owner = rawCfg[3] as string | undefined
  const isOwner = isConnected && address && owner && address.toLowerCase() === owner.toLowerCase()

  function checkChain() {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN }); return false }
    return true
  }

  function handleDeposit() {
    if (!checkChain()) return
    if (!depositAmount || isNaN(Number(depositAmount))) { toast.error('Enter a valid USDC amount'); return }
    const parsed = parseAmount(TARGET_CHAIN, depositAmount)
    // Step 1: approve
    approveWrite({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [AGENT_BUDGET_VAULT.address, parsed.raw],
      chainId: TARGET_CHAIN,
    })
  }

  // After approve confirms, deposit
  if (approveSuccess && approveHash) {
    // only trigger once
  }

  function handleDepositAfterApprove() {
    if (!checkChain()) return
    if (!depositAmount) return
    const parsed = parseAmount(TARGET_CHAIN, depositAmount)
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'deposit',
      args: [parsed.raw],
      chainId: TARGET_CHAIN,
    })
  }

  function handleSetAgent() {
    if (!checkChain()) return
    if (!agentAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'setAgent',
      args: [agentAddr as `0x${string}`],
      chainId: TARGET_CHAIN,
    })
  }

  function handleAddRecipient() {
    if (!checkChain()) return
    if (!recipientAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'addRecipient',
      args: [recipientAddr as `0x${string}`],
      chainId: TARGET_CHAIN,
    })
  }

  function handleRemoveRecipient() {
    if (!checkChain()) return
    if (!recipientAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'removeRecipient',
      args: [recipientAddr as `0x${string}`],
      chainId: TARGET_CHAIN,
    })
  }

  function handleSetMaxPayment() {
    if (!checkChain()) return
    if (!newMaxPayment) { toast.error('Enter amount'); return }
    const parsed = parseAmount(TARGET_CHAIN, newMaxPayment)
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'setMaxPaymentAmount',
      args: [parsed.raw],
      chainId: TARGET_CHAIN,
    })
  }

  function handleSetSpendingLimit() {
    if (!checkChain()) return
    if (!newSpendingLimit) { toast.error('Enter amount'); return }
    const parsed = parseAmount(TARGET_CHAIN, newSpendingLimit)
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'setTotalSpendingLimit',
      args: [parsed.raw],
      chainId: TARGET_CHAIN,
    })
  }

  function handlePause() {
    if (!checkChain()) return
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: paused ? 'unpause' : 'pause', chainId: TARGET_CHAIN })
  }

  function handleWithdraw() {
    if (!checkChain()) return
    if (!withdrawAmount) { toast.error('Enter amount'); return }
    const parsed = parseAmount(TARGET_CHAIN, withdrawAmount)
    writeContract({
      ...AGENT_BUDGET_VAULT,
      functionName: 'ownerWithdraw',
      args: [parsed.raw],
      chainId: TARGET_CHAIN,
    })
  }

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors'
  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'var(--ink)',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Configure Budget
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
          Owner-only vault settings. Transactions are enforced onchain.
        </p>
      </div>

      {!isConnected && (
        <div className="rounded-xl p-4 text-sm text-center" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--subtle)' }}>
          Connect your wallet to configure the vault.
        </div>
      )}

      {isConnected && !isOwner && (
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)' }}>
          <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Your connected wallet is not the vault owner. Owner-only transactions will revert.
          </span>
        </div>
      )}

      {wrongChain && (
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(232,109,122,0.12)', border: '1px solid rgba(232,109,122,0.3)' }}>
          <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Wrong network.{' '}
            <button className="font-semibold underline" style={{ color: 'var(--accent)' }}
              onClick={() => switchChain({ chainId: TARGET_CHAIN })}>
              Switch to Arc Testnet
            </button>
          </span>
        </div>
      )}

      {/* Tab row */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'deposit'} onClick={() => { setTab('deposit'); reset() }}>
          <DollarSign className="inline size-3 mr-1" />Deposit
        </TabButton>
        <TabButton active={tab === 'agent'} onClick={() => { setTab('agent'); reset() }}>
          <User className="inline size-3 mr-1" />Agent
        </TabButton>
        <TabButton active={tab === 'recipients'} onClick={() => { setTab('recipients'); reset() }}>
          <Shield className="inline size-3 mr-1" />Recipients
        </TabButton>
        <TabButton active={tab === 'limits'} onClick={() => { setTab('limits'); reset() }}>
          <Shield className="inline size-3 mr-1" />Limits
        </TabButton>
        <TabButton active={tab === 'pause'} onClick={() => { setTab('pause'); reset() }}>
          <Power className="inline size-3 mr-1" />{paused ? 'Resume' : 'Pause'}
        </TabButton>
        <TabButton active={tab === 'withdraw'} onClick={() => { setTab('withdraw'); reset() }}>
          <ArrowDownLeft className="inline size-3 mr-1" />Withdraw
        </TabButton>
      </div>

      {/* Panel */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>

        {/* DEPOSIT */}
        {tab === 'deposit' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Deposit USDC</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Vault balance: <span className="tabular-nums">{formatUsdc(vaultBal)} USDC</span>
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Amount (USDC)"
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <div className="text-xs p-3 rounded-xl" style={{ background: 'rgba(172,198,233,0.08)', color: 'var(--subtle)' }}>
              Step 1: Approve USDC spending → Step 2: Deposit into vault
            </div>
            {!approveSuccess ? (
              <TxButton
                label={`Approve ${depositAmount || '0'} USDC`}
                onClick={handleDeposit}
                disabled={!isConnected || !depositAmount}
                isPending={approvePending}
                isConfirming={approveConfirming}
              />
            ) : (
              <TxButton
                label={`Deposit ${depositAmount || '0'} USDC`}
                onClick={handleDepositAfterApprove}
                disabled={!isConnected || !depositAmount}
                isPending={isPending}
                isConfirming={isConfirming}
              />
            )}
            <Receipt hash={approveHash} label="Approve" />
            <Receipt hash={txHash} label="Deposit" />
          </>
        )}

        {/* AGENT */}
        {tab === 'agent' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Authorized Agent</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              The single wallet that can call agentPay. Pass <span className="mono">0x000…000</span> to revoke.
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="0x… agent wallet address"
              value={agentAddr}
              onChange={(e) => setAgentAddr(e.target.value)}
            />
            <TxButton
              label="Set Agent"
              onClick={handleSetAgent}
              disabled={!isConnected || !agentAddr}
              isPending={isPending}
              isConfirming={isConfirming}
            />
            <Receipt hash={txHash} label="setAgent" />
          </>
        )}

        {/* RECIPIENTS */}
        {tab === 'recipients' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Recipient Allowlist</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Only approved addresses can receive payments via agentPay.
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="0x… recipient address"
              value={recipientAddr}
              onChange={(e) => setRecipientAddr(e.target.value)}
            />
            <div className="flex gap-3">
              <TxButton
                label="Add Recipient"
                onClick={handleAddRecipient}
                disabled={!isConnected || !recipientAddr}
                isPending={isPending}
                isConfirming={isConfirming}
              />
              <TxButton
                label="Remove"
                onClick={handleRemoveRecipient}
                disabled={!isConnected || !recipientAddr}
                isPending={isPending}
                isConfirming={isConfirming}
                danger
              />
            </div>
            <Receipt hash={txHash} label="Recipient update" />
          </>
        )}

        {/* LIMITS */}
        {tab === 'limits' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Spending Limits</h3>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--subtle)' }}>Max payment per transaction (USDC)</label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. 100"
                inputMode="decimal"
                value={newMaxPayment}
                onChange={(e) => setNewMaxPayment(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <TxButton
                label="Update Max Payment"
                onClick={handleSetMaxPayment}
                disabled={!isConnected || !newMaxPayment}
                isPending={isPending}
                isConfirming={isConfirming}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--subtle)' }}>
                Total spending limit (USDC) — current: {formatUsdc(spendingLimit)}
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                placeholder="e.g. 1000"
                inputMode="decimal"
                value={newSpendingLimit}
                onChange={(e) => setNewSpendingLimit(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <TxButton
                label="Update Spending Limit"
                onClick={handleSetSpendingLimit}
                disabled={!isConnected || !newSpendingLimit}
                isPending={isPending}
                isConfirming={isConfirming}
              />
            </div>
            <Receipt hash={txHash} label="Limit update" />
          </>
        )}

        {/* PAUSE */}
        {tab === 'pause' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
              {paused ? 'Resume Vault' : 'Emergency Pause'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              {paused
                ? 'The vault is currently paused. Unpausing restores deposits and agent payments.'
                : 'Pausing blocks all deposits and agent payments. Owner withdrawals remain available.'}
            </p>
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: paused ? 'rgba(141,216,159,0.1)' : 'rgba(232,109,122,0.1)',
                border: `1px solid ${paused ? 'rgba(141,216,159,0.25)' : 'rgba(232,109,122,0.25)'}`,
              }}
            >
              <Power className="size-4" style={{ color: paused ? 'var(--success)' : 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Vault is currently <strong>{paused ? 'PAUSED' : 'ACTIVE'}</strong>
              </span>
            </div>
            <TxButton
              label={paused ? 'Unpause Vault' : 'Pause Vault'}
              onClick={handlePause}
              disabled={!isConnected}
              isPending={isPending}
              isConfirming={isConfirming}
              danger={!paused}
            />
            <Receipt hash={txHash} label={paused ? 'Unpause' : 'Pause'} />
          </>
        )}

        {/* WITHDRAW */}
        {tab === 'withdraw' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Owner Withdrawal</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Withdraw unspent USDC to the owner wallet. Available even while paused.
              Balance: <span className="tabular-nums">{formatUsdc(vaultBal)} USDC</span>
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Amount (USDC)"
              inputMode="decimal"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <TxButton
              label={`Withdraw ${withdrawAmount || '0'} USDC`}
              onClick={handleWithdraw}
              disabled={!isConnected || !withdrawAmount}
              isPending={isPending}
              isConfirming={isConfirming}
              danger
            />
            <Receipt hash={txHash} label="Withdraw" />
          </>
        )}
      </div>
    </div>
  )
}
