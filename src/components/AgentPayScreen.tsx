import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContracts } from 'wagmi'
import { arcTestnet } from 'viem/chains'
import { keccak256, toBytes } from 'viem'
import { Loader2, ArrowUpRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { AGENT_BUDGET_VAULT } from '../contract'
import { parseAmount, Amount, usdcDecimalsFor } from '@/onchain-money'

const TARGET_CHAIN = arcTestnet.id

function formatUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  return Amount.fromRaw(raw, usdcDecimalsFor(TARGET_CHAIN)).toFixed(2)
}

function parseOnchainError(err: unknown): string {
  const msg = (err as Error)?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('4001')) return 'Transaction cancelled.'
  if (msg.includes('notauthorizedagent')) return 'Your wallet is not the authorized agent.'
  if (msg.includes('recipientnotapproved')) return 'Recipient is not on the approved list.'
  if (msg.includes('exceedsmaxpaymentamount')) return 'Amount exceeds the per-payment limit.'
  if (msg.includes('exceedstotalspending')) return 'This payment would exceed the total spending limit.'
  if (msg.includes('insufficientvaultbalance')) return 'Vault does not hold enough USDC.'
  if (msg.includes('duplicatejob')) return 'This job reference has already been paid.'
  if (msg.includes('zeroamount')) return 'Amount must be greater than zero.'
  if (msg.includes('paused')) return 'Vault is paused. Contact the owner.'
  if (msg.includes('reverted')) return 'Transaction reverted. Check inputs.'
  return 'Transaction failed. Please try again.'
}

export function AgentPayScreen() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = isConnected && chainId !== TARGET_CHAIN

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [jobRefStr, setJobRefStr] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { writeContract, data: txHash, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const { data: vaultData } = useReadContracts({
    contracts: [
      { ...AGENT_BUDGET_VAULT, functionName: 'authorizedAgent', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'paused', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'maxPaymentAmount', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'remainingBudget', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'vaultBalance', chainId: TARGET_CHAIN },
    ],
  })
  const rawAgt = vaultData?.map((r) => r.result) ?? []
  const agent = rawAgt[0] as string | undefined
  const paused = rawAgt[1] as boolean | undefined
  const maxPayment = rawAgt[2] as bigint | undefined
  const remaining = rawAgt[3] as bigint | undefined
  const vaultBal = rawAgt[4] as bigint | undefined

  const isAgent = isConnected && address && agent && address.toLowerCase() === agent.toLowerCase()

  function handlePay() {
    setError(null)
    if (wrongChain) { switchChain({ chainId: TARGET_CHAIN }); return }
    if (!recipient.startsWith('0x')) { setError('Enter a valid 0x recipient address'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid USDC amount > 0'); return }
    if (!jobRefStr.trim()) { setError('Enter a unique job reference'); return }

    const jobRef = keccak256(toBytes(jobRefStr.trim()))
    const parsed = parseAmount(TARGET_CHAIN, amount)

    writeContract(
      {
        ...AGENT_BUDGET_VAULT,
        functionName: 'agentPay',
        args: [recipient as `0x${string}`, parsed.raw, jobRef],
        chainId: TARGET_CHAIN,
      },
      {
        onError(err) {
          setError(parseOnchainError(err))
        },
      }
    )
  }

  function handleReset() {
    setError(null)
    reset()
    setAmount('')
    setJobRefStr('')
    setJobDesc('')
  }

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none'
  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'var(--ink)',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Execute Agent Payment
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
          Only the authorized agent can submit payments. All limits enforced onchain.
        </p>
      </div>

      {/* Vault stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Max per payment', val: formatUsdc(maxPayment as bigint) + ' USDC' },
          { label: 'Remaining budget', val: formatUsdc(remaining as bigint) + ' USDC' },
          { label: 'Vault balance', val: formatUsdc(vaultBal as bigint) + ' USDC' },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded-xl p-3 space-y-1"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>{label}</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Agent check */}
      {isConnected && !isAgent && (
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)' }}
        >
          <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
          <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
            <p>
              Your wallet{' '}
              <span className="mono text-xs">{address ? `${address.slice(0, 8)}…` : ''}</span>{' '}
              is not the authorized agent.
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
              Authorized: <span className="mono">{agent ?? 'None'}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
              Connect the authorized agent wallet to submit payments.
            </p>
          </div>
        </div>
      )}

      {paused && (
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)' }}
        >
          <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Vault is paused. No payments can be submitted until the owner resumes it.
          </span>
        </div>
      )}

      {/* Form */}
      {isSuccess ? (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="size-6" style={{ color: 'var(--success)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Payment confirmed onchain</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                Job: <span className="mono">{jobRefStr}</span>
              </p>
            </div>
          </div>
          <a
            href={`https://explorer.testnet.arc.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            View transaction <ArrowUpRight className="size-4" />
          </a>
          <p className="mono text-xs break-all" style={{ color: 'var(--subtle)' }}>
            Tx: {txHash}
          </p>
          <button
            onClick={handleReset}
            className="w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--ink-2)' }}
          >
            New Payment
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Payment Details</h3>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--subtle)' }}>Recipient address</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--subtle)' }}>Amount (USDC)</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--subtle)' }}>
              Job reference <span className="opacity-60">(unique string — will be hashed to bytes32)</span>
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. invoice-2026-001 or task-abc123"
              value={jobRefStr}
              onChange={(e) => setJobRefStr(e.target.value)}
            />
            {jobRefStr && (
              <p className="mono text-xs mt-0.5 truncate" style={{ color: 'var(--subtle)' }}>
                bytes32: {keccak256(toBytes(jobRefStr))}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--subtle)' }}>
              Description <span className="opacity-60">(optional, stored offchain only)</span>
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Human-readable job description"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>

          {/* Preview */}
          {recipient && amount && jobRefStr && (
            <div
              className="rounded-xl p-3 space-y-1.5 text-xs"
              style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.15)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--ink-2)' }}>Transaction preview</p>
              <p style={{ color: 'var(--subtle)' }}>
                agentPay(<span className="mono">{recipient.slice(0, 10)}…</span>,{' '}
                <span className="mono">{amount} USDC</span>,{' '}
                <span className="mono">keccak256("{jobRefStr}")</span>)
              </p>
              <p style={{ color: 'var(--subtle)' }}>Contract: {AGENT_BUDGET_VAULT.address}</p>
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)', color: 'var(--danger)' }}
            >
              <XCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            disabled={!isConnected || isPending || isConfirming || !!paused}
            onClick={handlePay}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            {!isConnected
              ? 'Connect Wallet'
              : wrongChain
              ? 'Switch to Arc Testnet'
              : isPending
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirm in wallet…</span>
              : isConfirming
              ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Confirming…</span>
              : 'Submit Payment'}
          </button>
        </div>
      )}
    </div>
  )
}
