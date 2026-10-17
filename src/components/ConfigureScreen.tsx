import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useAccount, useWriteContract, useWaitForTransactionReceipt,
  useSwitchChain, useReadContracts, useReadContract,
} from 'wagmi'
import { createPublicClient, http, erc20Abi, parseAbiItem } from 'viem'
import { Loader2, ArrowUpRight, AlertTriangle, DollarSign, User, Shield, Power, ArrowDownLeft, CheckCircle2, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AGENT_BUDGET_VAULT, VAULT_DEPLOY_BLOCK, EXPLORER_BASE } from '../contract'
import { activeArcChain } from '../config'
import { getUsdc, requireChain } from '@/onchain-facts'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

const TARGET_CHAIN = activeArcChain.id
const usdcFact = getUsdc(TARGET_CHAIN)!
const USDC_ADDRESS = usdcFact.address as `0x${string}`
const chainFact = requireChain(TARGET_CHAIN)

const recipientAddedEvent = parseAbiItem('event RecipientAdded(address indexed recipient)')
const recipientRemovedEvent = parseAbiItem('event RecipientRemoved(address indexed recipient)')
const CHUNK = 4_900n

// Fetch the current approved-recipient set by replaying RecipientAdded/Removed events.
// Returns a sorted array of checksummed addresses that are currently approved.
async function fetchApprovedRecipients(): Promise<string[]> {
  const client = createPublicClient({
    chain: activeArcChain,
    transport: http(chainFact.rpcUrls[0]),
  })
  const latest = await client.getBlockNumber()
  const from = latest > CHUNK ? latest - CHUNK : VAULT_DEPLOY_BLOCK

  const [addedLogs, removedLogs] = await Promise.all([
    client.getLogs({ address: AGENT_BUDGET_VAULT.address, event: recipientAddedEvent, fromBlock: from, toBlock: 'latest' }),
    client.getLogs({ address: AGENT_BUDGET_VAULT.address, event: recipientRemovedEvent, fromBlock: from, toBlock: 'latest' }),
  ])

  const added = new Set(addedLogs.map(l => (l.args.recipient as string).toLowerCase()))
  const removed = new Set(removedLogs.map(l => (l.args.recipient as string).toLowerCase()))

  // net set: added minus removed
  const net = [...added].filter(a => !removed.has(a))
  return net.sort()
}

/** Walk viem's nested cause chain to surface the deepest revert reason. */
function extractTxError(label: string, err: unknown): string {
  const parts: string[] = []
  let cur: unknown = err
  while (cur && typeof cur === 'object') {
    const e = cur as { message?: string; shortMessage?: string; cause?: unknown; details?: string }
    if (e.shortMessage) parts.push(e.shortMessage)
    else if (e.message) parts.push(e.message)
    if (e.details) parts.push(e.details)
    cur = e.cause
  }
  const full = parts.join(' | ')
  const lower = full.toLowerCase()
  if (lower.includes('user rejected') || lower.includes('denied') || lower.includes('4001'))
    return `${label} rejected in wallet.`
  return full || `${label} failed.`
}

function formatUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  return Amount.fromRaw(raw, usdcDecimalsFor(TARGET_CHAIN)).toFixed(2)
}

type ActionTab = 'deposit' | 'agent' | 'recipients' | 'limits' | 'pause' | 'withdraw'

// Fine-grained deposit state machine
type DepositStep =
  | 'idle'          // nothing in flight
  | 'approving'     // approve tx sent, waiting for wallet sig
  | 'approve-wait'  // approve tx mining
  | 'depositing'    // deposit tx sent, waiting for wallet sig
  | 'deposit-wait'  // deposit tx mining
  | 'done'          // deposit confirmed

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
          {isPending ? 'Confirm in wallet…' : 'Confirming onchain…'}
        </span>
      ) : (
        label
      )}
    </button>
  )
}

function TxReceipt({ hash, label }: { hash: `0x${string}` | undefined; label: string }) {
  const { isSuccess, isLoading } = useWaitForTransactionReceipt({ hash })
  if (!hash) return null
  if (isLoading) return (
    <div className="flex items-center gap-2 rounded-xl p-3 text-xs"
      style={{ background: 'rgba(172,198,233,0.08)', color: 'var(--subtle)' }}>
      <Loader2 className="size-3 animate-spin" />
      {label} mining…
    </div>
  )
  if (!isSuccess) return null
  return (
    <div className="flex items-center justify-between rounded-xl p-3 text-xs"
      style={{ background: 'rgba(141,216,159,0.1)', border: '1px solid rgba(141,216,159,0.25)' }}>
      <span className="flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
        <CheckCircle2 className="size-3.5" />
        {label} confirmed
      </span>
      <a href={`${EXPLORER_BASE}/tx/${hash}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
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

  // ── deposit state machine ──────────────────────────────────────────────
  const [depositAmount, setDepositAmount] = useState('')
  const [depositStep, setDepositStep] = useState<DepositStep>('idle')
  // Keep a snapshot of the parsed amount so auto-deposit uses the same value
  // as the approval, even if the user edits the input between steps.
  const [pendingDepositRaw, setPendingDepositRaw] = useState<bigint>(0n)

  // Two independent write hooks: one for approve, one for deposit.
  // Using a single hook would overwrite data/isPending on the second call.
  const {
    writeContract: approveWrite,
    data: approveHash,
    isPending: approveSigning,
    error: approveWriteError,
    reset: approveReset,
  } = useWriteContract()

  const {
    writeContract: depositWrite,
    data: depositHash,
    isPending: depositSigning,
    error: depositWriteError,
    reset: depositReset,
  } = useWriteContract()

  const { isLoading: approveMining, isSuccess: approveConfirmed, isError: approveFailed,
          data: approveReceipt } =
    useWaitForTransactionReceipt({ hash: approveHash })

  const { isLoading: depositMining, isSuccess: depositConfirmed, isError: depositFailed,
          data: depositReceipt } =
    useWaitForTransactionReceipt({ hash: depositHash })

  // ── live USDC allowance + wallet balance ───────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', AGENT_BUDGET_VAULT.address],
    chainId: TARGET_CHAIN,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 4_000,
    },
  })

  const { data: walletUsdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: TARGET_CHAIN,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 4_000,
    },
  })

  // ── vault state ────────────────────────────────────────────────────────
  const { data: vaultData, refetch: refetchVault } = useReadContracts({
    contracts: [
      { ...AGENT_BUDGET_VAULT, functionName: 'paused', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'vaultBalance', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'totalSpendingLimit', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'owner', chainId: TARGET_CHAIN },
    ],
    query: { refetchInterval: 4_000, refetchOnWindowFocus: true },
  })

  const rawCfg = vaultData?.map((r) => r.result) ?? []
  const paused = rawCfg[0] as boolean | undefined
  const vaultBal = rawCfg[1] as bigint | undefined
  const spendingLimit = rawCfg[2] as bigint | undefined
  const owner = rawCfg[3] as string | undefined
  const isOwner = isConnected && address && owner && address.toLowerCase() === owner.toLowerCase()

  // ── approved recipient list (event-sourced) ────────────────────────────
  const [recipients, setRecipients] = useState<string[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [recipientsError, setRecipientsError] = useState<string | null>(null)
  const recipientsCancelRef = useRef(false)

  const loadRecipients = useCallback(async (silent = false) => {
    recipientsCancelRef.current = false
    if (!silent) setRecipientsLoading(true)
    setRecipientsError(null)
    try {
      const list = await fetchApprovedRecipients()
      if (!recipientsCancelRef.current) setRecipients(list)
    } catch (err) {
      console.error('[ConfigureScreen] fetchApprovedRecipients failed:', err)
      if (!recipientsCancelRef.current) setRecipientsError('Could not load recipients from chain.')
    } finally {
      if (!recipientsCancelRef.current) setRecipientsLoading(false)
    }
  }, [])

  // Load on mount; reload when switching to recipients tab or after a tx confirms
  useEffect(() => {
    if (tab !== 'recipients') return
    void loadRecipients()
    return () => { recipientsCancelRef.current = true }
  }, [tab, loadRecipients])

  // ── side-effect: sync deposit step with receipt outcomes ───────────────
  // Forward step when signing completes
  useEffect(() => {
    if (approveSigning && depositStep === 'idle') setDepositStep('approving')
  }, [approveSigning, depositStep])

  useEffect(() => {
    if (approveMining && depositStep === 'approving') setDepositStep('approve-wait')
  }, [approveMining, depositStep])

  useEffect(() => {
    if (depositSigning && (depositStep === 'approve-wait' || depositStep === 'done' || depositStep === 'idle'))
      setDepositStep('depositing')
  }, [depositSigning, depositStep])

  useEffect(() => {
    if (depositMining && depositStep === 'depositing') setDepositStep('deposit-wait')
  }, [depositMining, depositStep])

  // ── AUTO-DEPOSIT: fires once when approval confirms ────────────────────
  // This is the primary fix: the previous code had a dead comment here.
  useEffect(() => {
    if (!approveConfirmed || depositStep !== 'approve-wait') return
    if (!approveReceipt || approveReceipt.status !== 'success') {
      toast.error('Approval transaction reverted — deposit cancelled')
      setDepositStep('idle')
      return
    }
    // Approval landed; submit the deposit automatically
    void refetchAllowance()
    depositWrite({
      ...AGENT_BUDGET_VAULT,
      functionName: 'deposit',
      args: [pendingDepositRaw],
      chainId: TARGET_CHAIN,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed, approveReceipt])

  // ── Deposit confirmed: refresh balances + set done ─────────────────────
  useEffect(() => {
    if (!depositConfirmed) return
    if (!depositReceipt || depositReceipt.status !== 'success') {
      toast.error('Deposit transaction reverted')
      setDepositStep('idle')
      return
    }
    setDepositStep('done')
    toast.success(`Deposited ${formatUsdc(pendingDepositRaw)} USDC into vault`)
    void Promise.all([refetchVault(), refetchAllowance(), refetchUsdcBalance()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositConfirmed, depositReceipt])

  // ── Surface write errors immediately ──────────────────────────────────
  useEffect(() => {
    if (!approveWriteError) return
    toast.error(extractTxError('Approval', approveWriteError))
    setDepositStep('idle')
  }, [approveWriteError])

  useEffect(() => {
    if (!depositWriteError) return
    toast.error(extractTxError('Deposit', depositWriteError))
    setDepositStep('idle')
  }, [depositWriteError])

  // ── Failed receipt errors ──────────────────────────────────────────────
  useEffect(() => {
    if (approveFailed && depositStep === 'approve-wait') {
      toast.error('Approval transaction failed onchain')
      setDepositStep('idle')
    }
  }, [approveFailed, depositStep])

  useEffect(() => {
    if (depositFailed && depositStep === 'deposit-wait') {
      toast.error('Deposit transaction failed onchain')
      setDepositStep('idle')
    }
  }, [depositFailed, depositStep])

  // ── helpers ────────────────────────────────────────────────────────────
  function checkChain(): boolean {
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN }); return false }
    return true
  }

  function resetDeposit() {
    approveReset()
    depositReset()
    setDepositStep('idle')
    setPendingDepositRaw(0n)
  }

  // Parse + validate the current depositAmount field
  function parseDepositInput(): bigint | null {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Enter a valid USDC amount greater than zero')
      return null
    }
    try {
      return parseAmount(TARGET_CHAIN, depositAmount).raw
    } catch {
      toast.error('Invalid amount')
      return null
    }
  }

  const handleDeposit = useCallback(() => {
    if (!checkChain()) return
    if (depositStep !== 'idle' && depositStep !== 'done') return // already in flight

    const raw = parseDepositInput()
    if (raw === null) return

    // Wallet USDC balance guard
    if (walletUsdcBalance !== undefined && raw > walletUsdcBalance) {
      toast.error(`Insufficient USDC — wallet has ${formatUsdc(walletUsdcBalance)} USDC`)
      return
    }

    // Reset any stale state from a previous attempt
    resetDeposit()
    setPendingDepositRaw(raw)

    const currentAllowance = (allowance) ?? 0n

    if (currentAllowance >= raw) {
      // Sufficient allowance — skip approval, deposit directly
      toast.info('Allowance sufficient — depositing directly')
      depositWrite({
        ...AGENT_BUDGET_VAULT,
        functionName: 'deposit',
        args: [raw],
        chainId: TARGET_CHAIN,
      })
    } else {
      // Need approval first; auto-deposit fires in the useEffect above
      approveWrite({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [AGENT_BUDGET_VAULT.address, raw],
        chainId: TARGET_CHAIN,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositStep, depositAmount, allowance, walletUsdcBalance, checkChain])

  // ── other vault actions (unchanged behavior) ───────────────────────────
  const { writeContract, data: txHash, isPending, reset, error: txError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (txConfirmed) void refetchVault()
  }, [txConfirmed, refetchVault])

  // Reload recipient list after add/remove tx confirms
  useEffect(() => {
    if (txConfirmed && tab === 'recipients') void loadRecipients(true)
  }, [txConfirmed, tab, loadRecipients])

  useEffect(() => {
    if (!txError) return
    toast.error(extractTxError('Transaction', txError))
  }, [txError])

  const [agentAddr, setAgentAddr] = useState('')
  const [recipientAddr, setRecipientAddr] = useState('')
  const [newMaxPayment, setNewMaxPayment] = useState('')
  const [newSpendingLimit, setNewSpendingLimit] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  function handleSetAgent() {
    if (!checkChain()) return
    if (!agentAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'setAgent', args: [agentAddr as `0x${string}`], chainId: TARGET_CHAIN })
  }
  function handleAddRecipient() {
    if (!checkChain()) return
    if (!recipientAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'addRecipient', args: [recipientAddr as `0x${string}`], chainId: TARGET_CHAIN })
  }
  function handleRemoveRecipient() {
    if (!checkChain()) return
    if (!recipientAddr.startsWith('0x')) { toast.error('Enter a valid 0x address'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'removeRecipient', args: [recipientAddr as `0x${string}`], chainId: TARGET_CHAIN })
  }
  function handleRemoveRecipientAddr(addr: string) {
    if (!checkChain()) return
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'removeRecipient', args: [addr as `0x${string}`], chainId: TARGET_CHAIN })
  }
  function handleSetMaxPayment() {
    if (!checkChain()) return
    if (!newMaxPayment) { toast.error('Enter amount'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'setMaxPaymentAmount', args: [parseAmount(TARGET_CHAIN, newMaxPayment).raw], chainId: TARGET_CHAIN })
  }
  function handleSetSpendingLimit() {
    if (!checkChain()) return
    if (!newSpendingLimit) { toast.error('Enter amount'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'setTotalSpendingLimit', args: [parseAmount(TARGET_CHAIN, newSpendingLimit).raw], chainId: TARGET_CHAIN })
  }
  function handlePause() {
    if (!checkChain()) return
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: paused ? 'unpause' : 'pause', chainId: TARGET_CHAIN })
  }
  function handleWithdraw() {
    if (!checkChain()) return
    if (!withdrawAmount) { toast.error('Enter amount'); return }
    writeContract({ ...AGENT_BUDGET_VAULT, functionName: 'ownerWithdraw', args: [parseAmount(TARGET_CHAIN, withdrawAmount).raw], chainId: TARGET_CHAIN })
  }

  // ── deposit step label ─────────────────────────────────────────────────
  function depositStepLabel(): string {
    const needsApproval = ((allowance) ?? 0n) < ((pendingDepositRaw > 0n ? pendingDepositRaw : parseDepositSafe()))
    switch (depositStep) {
      case 'approving':     return 'Confirm approval in wallet…'
      case 'approve-wait':  return 'Approval mining…'
      case 'depositing':    return 'Confirm deposit in wallet…'
      case 'deposit-wait':  return 'Deposit mining…'
      case 'done':          return `Deposited ${formatUsdc(pendingDepositRaw)} USDC ✓`
      default:              return needsApproval
        ? `Approve & Deposit ${depositAmount || '0'} USDC`
        : `Deposit ${depositAmount || '0'} USDC`
    }
  }

  function parseDepositSafe(): bigint {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) return 0n
    try { return parseAmount(TARGET_CHAIN, depositAmount).raw } catch { return 0n }
  }

  const depositBusy = depositStep === 'approving' || depositStep === 'approve-wait'
    || depositStep === 'depositing' || depositStep === 'deposit-wait'

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors'
  const inputStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--ink)' }

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
            Connected wallet is not the vault owner. Owner-only transactions will revert.
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
              Switch to {activeArcChain.name}
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

        {/* ── DEPOSIT ── */}
        {tab === 'deposit' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Deposit USDC</h3>

            {/* Balances row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>Wallet USDC</p>
                <p className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {formatUsdc(walletUsdcBalance)} USDC
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>Vault balance</p>
                <p className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {formatUsdc(vaultBal)} USDC
                </p>
              </div>
            </div>

            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Amount (USDC)"
              inputMode="decimal"
              value={depositAmount}
              disabled={depositBusy}
              onChange={(e) => {
                setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))
                if (depositStep === 'done') resetDeposit()
              }}
            />

            {/* Current allowance indicator */}
            {isConnected && (allowance) !== undefined && (
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Current USDC allowance for vault:{' '}
                <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
                  {formatUsdc(allowance)} USDC
                </span>
                {(allowance) >= parseDepositSafe() && parseDepositSafe() > 0n && (
                  <span className="ml-1.5 text-xs font-semibold" style={{ color: 'var(--success)' }}>
                    (sufficient — approval will be skipped)
                  </span>
                )}
              </p>
            )}

            {/* Step progress indicator */}
            {depositStep !== 'idle' && depositStep !== 'done' && (
              <div className="rounded-xl p-3 flex items-center gap-2 text-xs"
                style={{ background: 'rgba(172,198,233,0.08)', color: 'var(--accent)' }}>
                <Loader2 className="size-3.5 animate-spin shrink-0" />
                <span>
                  {depositStep === 'approving' && 'Step 1/2: Check wallet for approval signature…'}
                  {depositStep === 'approve-wait' && 'Step 1/2: Approval mining — deposit will auto-submit…'}
                  {depositStep === 'depositing' && 'Step 2/2: Check wallet for deposit signature…'}
                  {depositStep === 'deposit-wait' && 'Step 2/2: Deposit mining…'}
                </span>
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={!isConnected || !depositAmount || depositBusy}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            >
              {depositBusy
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />{depositStepLabel()}</span>
                : depositStepLabel()
              }
            </button>

            {depositStep === 'done' && (
              <button onClick={resetDeposit} className="w-full rounded-xl py-2 text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--subtle)' }}>
                Deposit again
              </button>
            )}

            <TxReceipt hash={approveHash} label="Approval" />
            <TxReceipt hash={depositHash} label="Deposit" />
          </>
        )}

        {/* ── AGENT ── */}
        {tab === 'agent' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Authorized Agent</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              The single wallet that can call agentPay. Pass <span className="mono">0x000…000</span> to revoke.
            </p>
            <input className={inputClass} style={inputStyle} placeholder="0x… agent wallet address"
              value={agentAddr} onChange={(e) => setAgentAddr(e.target.value)} />
            <TxButton label="Set Agent" onClick={handleSetAgent}
              disabled={!isConnected || !agentAddr} isPending={isPending} isConfirming={isConfirming} />
            <TxReceipt hash={txHash} label="setAgent" />
          </>
        )}

        {/* ── RECIPIENTS ── */}
        {tab === 'recipients' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Recipient Allowlist</h3>
              <button
                onClick={() => { void loadRecipients() }}
                disabled={recipientsLoading}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-40"
                style={{ color: 'var(--accent)', background: 'rgba(172,198,233,0.08)' }}
              >
                <RefreshCw className={`size-3 ${recipientsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Only approved addresses can receive agent payments. Sourced from onchain events.
            </p>

            {/* Current allowlist */}
            {recipientsLoading && (
              <div className="flex items-center gap-2 py-3 text-xs" style={{ color: 'var(--subtle)' }}>
                <Loader2 className="size-3.5 animate-spin" /> Loading from chain…
              </div>
            )}

            {recipientsError && (
              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(232,109,122,0.1)', color: 'var(--danger)' }}>
                {recipientsError}
              </div>
            )}

            {!recipientsLoading && !recipientsError && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {recipients.length === 0 ? (
                  <div className="px-4 py-5 text-center text-xs" style={{ color: 'var(--subtle)' }}>
                    No approved recipients yet. Add one below.
                  </div>
                ) : (
                  <ul>
                    {recipients.map((addr, i) => (
                      <li
                        key={addr}
                        className="flex items-center justify-between px-4 py-2.5 gap-3"
                        style={{
                          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : undefined,
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                        }}
                      >
                        <span className="mono text-xs truncate flex-1" style={{ color: 'var(--ink)' }}>
                          {addr}
                        </span>
                        {isOwner && (
                          <button
                            title="Remove recipient"
                            onClick={() => {
                              setRecipientAddr(addr)
                              handleRemoveRecipientAddr(addr)
                            }}
                            disabled={isPending || isConfirming}
                            className="shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-30"
                            style={{ color: 'var(--danger)', background: 'rgba(232,109,122,0.1)' }}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Add/remove form */}
            <div className="pt-2 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Add or remove an address</p>
              <input className={inputClass} style={inputStyle} placeholder="0x… recipient address"
                value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} />
              <div className="flex gap-3">
                <TxButton label="Add Recipient" onClick={handleAddRecipient}
                  disabled={!isConnected || !recipientAddr} isPending={isPending} isConfirming={isConfirming} />
                <TxButton label="Remove" onClick={handleRemoveRecipient}
                  disabled={!isConnected || !recipientAddr} isPending={isPending} isConfirming={isConfirming} danger />
              </div>
            </div>
            <TxReceipt hash={txHash} label="Recipient update" />
          </>
        )}

        {/* ── LIMITS ── */}
        {tab === 'limits' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Spending Limits</h3>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--subtle)' }}>Max payment per transaction (USDC)</label>
              <input className={inputClass} style={inputStyle} placeholder="e.g. 100" inputMode="decimal"
                value={newMaxPayment} onChange={(e) => setNewMaxPayment(e.target.value.replace(/[^0-9.]/g, ''))} />
              <TxButton label="Update Max Payment" onClick={handleSetMaxPayment}
                disabled={!isConnected || !newMaxPayment} isPending={isPending} isConfirming={isConfirming} />
            </div>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--subtle)' }}>
                Total spending limit (USDC) — current: {formatUsdc(spendingLimit)}
              </label>
              <input className={inputClass} style={inputStyle} placeholder="e.g. 1000" inputMode="decimal"
                value={newSpendingLimit} onChange={(e) => setNewSpendingLimit(e.target.value.replace(/[^0-9.]/g, ''))} />
              <TxButton label="Update Spending Limit" onClick={handleSetSpendingLimit}
                disabled={!isConnected || !newSpendingLimit} isPending={isPending} isConfirming={isConfirming} />
            </div>
            <TxReceipt hash={txHash} label="Limit update" />
          </>
        )}

        {/* ── PAUSE ── */}
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
            <div className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: paused ? 'rgba(141,216,159,0.1)' : 'rgba(232,109,122,0.1)',
                border: `1px solid ${paused ? 'rgba(141,216,159,0.25)' : 'rgba(232,109,122,0.25)'}`,
              }}>
              <Power className="size-4" style={{ color: paused ? 'var(--success)' : 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Vault is currently <strong>{paused ? 'PAUSED' : 'ACTIVE'}</strong>
              </span>
            </div>
            <TxButton label={paused ? 'Unpause Vault' : 'Pause Vault'} onClick={handlePause}
              disabled={!isConnected} isPending={isPending} isConfirming={isConfirming} danger={!paused} />
            <TxReceipt hash={txHash} label={paused ? 'Unpause' : 'Pause'} />
          </>
        )}

        {/* ── WITHDRAW ── */}
        {tab === 'withdraw' && (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Owner Withdrawal</h3>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>
              Withdraw unspent USDC to the owner wallet. Available even while paused.
              Balance: <span className="tabular-nums">{formatUsdc(vaultBal)} USDC</span>
            </p>
            <input className={inputClass} style={inputStyle} placeholder="Amount (USDC)" inputMode="decimal"
              value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            <TxButton label={`Withdraw ${withdrawAmount || '0'} USDC`} onClick={handleWithdraw}
              disabled={!isConnected || !withdrawAmount} isPending={isPending} isConfirming={isConfirming} danger />
            <TxReceipt hash={txHash} label="Withdraw" />
          </>
        )}
      </div>
    </div>
  )
}
