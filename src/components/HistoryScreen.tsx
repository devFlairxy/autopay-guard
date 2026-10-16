import { arcTestnet } from 'viem/chains'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import { AGENT_BUDGET_VAULT } from '../contract'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { requireChain } from '@/onchain-facts'

const TARGET_CHAIN = arcTestnet.id
const chainFact = requireChain(TARGET_CHAIN)

function formatUsdc(raw: bigint): string {
  return Amount.fromRaw(raw, usdcDecimalsFor(TARGET_CHAIN)).toFixed(2)
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function shortenHash(h: string): string {
  return `${h.slice(0, 10)}...${h.slice(-8)}`
}

interface PaymentEvent {
  jobRef: `0x${string}`
  recipient: string
  amount: bigint
  agent: string
  txHash: `0x${string}`
  blockNumber: bigint
}

const agentPaymentEvent = parseAbiItem(
  'event AgentPayment(bytes32 indexed jobRef, address indexed recipient, uint256 amount, address indexed agent)'
)

export function HistoryScreen() {
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchEvents() {
      setLoading(true)
      setError(null)
      try {
        const client = createPublicClient({
          chain: arcTestnet,
          transport: http(chainFact.rpcUrls[0]),
        })
        const logs = await client.getLogs({
          address: AGENT_BUDGET_VAULT.address,
          event: agentPaymentEvent,
          fromBlock: 0n,
          toBlock: 'latest',
        })
        if (!cancelled) {
          const parsed: PaymentEvent[] = logs.map((log) => ({
            jobRef: log.args.jobRef as `0x${string}`,
            recipient: log.args.recipient as string,
            amount: log.args.amount as bigint,
            agent: log.args.agent as string,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber ?? 0n,
          }))
          setEvents(parsed.reverse()) // newest first
        }
      } catch (_err) {
        if (!cancelled) setError('Could not load events. RPC may be rate-limiting — try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchEvents()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Payment History
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
          Real onchain AgentPayment events from the vault contract.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12" style={{ color: 'var(--subtle)' }}>
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Fetching events from Arc Testnet…</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(232,109,122,0.1)', border: '1px solid rgba(232,109,122,0.25)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-sm" style={{ color: 'var(--subtle)' }}>No payments yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Execute a payment from the Agent Pay screen to see events here.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={`${ev.txHash}-${ev.jobRef}`}
              className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {formatUsdc(ev.amount)} USDC
                  </p>
                  <p className="mono text-xs mt-0.5 truncate" style={{ color: 'var(--subtle)', maxWidth: '28ch' }}>
                    job: {ev.jobRef}
                  </p>
                </div>
                <a
                  href={`${chainFact.explorerBase}/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold shrink-0"
                  style={{ color: 'var(--accent)' }}
                >
                  {shortenHash(ev.txHash)} <ArrowUpRight className="size-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p style={{ color: 'var(--muted)' }}>Recipient</p>
                  <p className="mono mt-0.5" style={{ color: 'var(--ink-2)' }}>{shortenAddr(ev.recipient)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Agent</p>
                  <p className="mono mt-0.5" style={{ color: 'var(--ink-2)' }}>{shortenAddr(ev.agent)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Block</p>
                  <p className="tabular-nums mt-0.5" style={{ color: 'var(--ink-2)' }}>{String(ev.blockNumber)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--muted)' }}>Status</p>
                  <p className="mt-0.5 font-semibold" style={{ color: 'var(--success)' }}>Confirmed</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
