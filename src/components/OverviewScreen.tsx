import { useEffect } from 'react'
import { useAccount, useReadContracts, useSwitchChain } from 'wagmi'
import { activeArcChain } from '../config'
import { ShieldCheck, Pause, Play, Wallet, ArrowUpRight, User, DollarSign, AlertTriangle } from 'lucide-react'
import { AGENT_BUDGET_VAULT, EXPLORER_BASE } from '../contract'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

const TARGET_CHAIN = activeArcChain.id

function formatUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '—'
  return Amount.fromRaw(raw, usdcDecimalsFor(TARGET_CHAIN)).toFixed(2)
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  highlight?: boolean
}

function StatCard({ label, value, sub, icon, highlight }: StatCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: highlight ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: 'rgba(172,198,233,0.15)' }}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
          {label}
        </span>
      </div>
      <span
        className="display text-2xl font-bold tabular-nums"
        style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export function OverviewScreen() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const wrongChain = isConnected && chainId !== TARGET_CHAIN

  const { data: vaultData, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...AGENT_BUDGET_VAULT, functionName: 'vaultBalance', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'totalSpendingLimit', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'totalSpent', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'maxPaymentAmount', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'authorizedAgent', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'paused', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'owner', chainId: TARGET_CHAIN },
      { ...AGENT_BUDGET_VAULT, functionName: 'remainingBudget', chainId: TARGET_CHAIN },
    ],
    // Poll every 4 s so balances stay fresh without a page refresh
    query: { refetchInterval: 4_000, refetchOnWindowFocus: true },
  })

  // Re-fetch immediately when the page becomes visible (covers mobile swipe-back)
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') void refetch() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refetch])

  const rawResults = vaultData?.map((r) => r.result) ?? []
  const vaultBalance = rawResults[0] as bigint | undefined
  const spendingLimit = rawResults[1] as bigint | undefined
  const totalSpent = rawResults[2] as bigint | undefined
  const maxPayment = rawResults[3] as bigint | undefined
  const agent = rawResults[4] as string | undefined
  const paused = rawResults[5] as boolean | undefined
  const owner = rawResults[6] as string | undefined
  const remaining = rawResults[7] as bigint | undefined

  const spentPercent =
    spendingLimit && totalSpent !== undefined
      ? Number((totalSpent * 100n) / spendingLimit)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Vault Overview
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
            Live contract state from {activeArcChain.name}
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            background: paused ? 'rgba(232,109,122,0.15)' : 'rgba(141,216,159,0.15)',
            color: paused ? 'var(--danger)' : 'var(--success)',
            border: `1px solid ${paused ? 'rgba(232,109,122,0.3)' : 'rgba(141,216,159,0.3)'}`,
          }}
        >
          {paused ? <Pause className="size-3" /> : <Play className="size-3" />}
          {paused ? 'Paused' : 'Active'}
        </div>
      </div>

      {wrongChain && (
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: 'rgba(232,109,122,0.12)', border: '1px solid rgba(232,109,122,0.3)' }}
        >
          <AlertTriangle className="size-4 shrink-0" style={{ color: 'var(--danger)' }} />
          <span className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Your wallet is on the wrong network.{' '}
            <button
              className="font-semibold underline"
              style={{ color: 'var(--accent)' }}
              onClick={() => switchChain({ chainId: TARGET_CHAIN })}
            >
              Switch to {activeArcChain.name}
            </button>
          </span>
        </div>
      )}

      {/* Contract address */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <ShieldCheck className="size-5 shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--subtle)' }}>
            Vault Contract
          </p>
          <p className="mono text-sm mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
            {AGENT_BUDGET_VAULT.address}
          </p>
        </div>
        <a
          href={`${EXPLORER_BASE}/address/${AGENT_BUDGET_VAULT.address}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 flex items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Explorer <ArrowUpRight className="size-3" />
        </a>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Available Balance"
          value={isLoading ? '…' : `${formatUsdc(vaultBalance)} USDC`}
          sub="Held in vault"
          icon={<DollarSign className="size-3.5" style={{ color: 'var(--accent)' }} />}
          highlight
        />
        <StatCard
          label="Spending Limit"
          value={isLoading ? '…' : `${formatUsdc(spendingLimit)} USDC`}
          sub="Cumulative cap"
          icon={<ShieldCheck className="size-3.5" style={{ color: 'var(--accent)' }} />}
        />
        <StatCard
          label="Total Spent"
          value={isLoading ? '…' : `${formatUsdc(totalSpent)} USDC`}
          sub={`${spentPercent}% of limit used`}
          icon={<ArrowUpRight className="size-3.5" style={{ color: 'var(--accent)' }} />}
        />
        <StatCard
          label="Max Per Payment"
          value={isLoading ? '…' : `${formatUsdc(maxPayment)} USDC`}
          sub="Single-tx ceiling"
          icon={<DollarSign className="size-3.5" style={{ color: 'var(--accent)' }} />}
        />
      </div>

      {/* Spending progress bar */}
      {!isLoading && spendingLimit !== undefined && (
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--subtle)' }}>
            <span>Budget consumed</span>
            <span className="tabular-nums">{spentPercent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(spentPercent, 100)}%`,
                background: spentPercent > 80 ? 'var(--danger)' : 'var(--accent)',
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            {formatUsdc(remaining)} USDC remaining
          </p>
        </div>
      )}

      {/* Agent + Owner info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-2">
            <User className="size-4" style={{ color: 'var(--subtle)' }} />
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--subtle)' }}>
              Authorized Agent
            </span>
          </div>
          <p className="mono text-sm break-all" style={{ color: 'var(--ink)' }}>
            {isLoading
              ? '…'
              : agent === '0x0000000000000000000000000000000000000000'
              ? 'None — set via Configure'
              : shortenAddr(agent ?? '')}
          </p>
        </div>
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-2">
            <Wallet className="size-4" style={{ color: 'var(--subtle)' }} />
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--subtle)' }}>
              Vault Owner
            </span>
          </div>
          <p className="mono text-sm break-all" style={{ color: 'var(--ink)' }}>
            {isLoading ? '…' : owner ? shortenAddr(owner) : '—'}
          </p>
          {isConnected && address && owner && address.toLowerCase() === owner.toLowerCase() && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'rgba(141,216,159,0.15)', color: 'var(--success)' }}
            >
              You are the owner
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
