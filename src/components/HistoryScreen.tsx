import { createPublicClient, http, parseAbiItem } from 'viem'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Loader2, RefreshCw } from 'lucide-react'
import { AGENT_BUDGET_VAULT, VAULT_DEPLOY_BLOCK, EXPLORER_BASE, IS_MAINNET } from '../contract'
import { activeArcChain } from '../config'
import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { requireChain } from '@/onchain-facts'

const TARGET_CHAIN = activeArcChain.id
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  // Arc RPC rejects getLogs ranges larger than ~5 000 blocks and rate-limits
  // rapid repeated calls. Strategy:
  // - Fetch once on mount (from deploy block to latest).
  // - Cache results; on manual refresh only scan blocks newer than the cache.
  // - No automatic polling interval — history only loads on user action.
  // - Exponential backoff on 429: wait 2s, 4s, 8s then give up.
  const CHUNK = 2_000n   // conservative — well under the 5000-block limit
  const lastScannedRef = useRef<bigint>(VAULT_DEPLOY_BLOCK - 1n)
  const cachedEventsRef = useRef<PaymentEvent[]>([])

  const fetchEvents = useCallback(async (silent = false) => {
    cancelRef.current = false
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    // In production use the same-origin proxy to avoid ad-blocker blocks
    const rpcUrl = import.meta.env.PROD
      ? (IS_MAINNET ? '/rpc/arc' : '/rpc/arc-testnet')
      : chainFact.rpcUrls[0]
    const client = createPublicClient({
      chain: activeArcChain,
      transport: http(rpcUrl),
    })

    try {
      const latestBlock = await client.getBlockNumber()
      if (cancelRef.current) return

      const newLogs: PaymentEvent[] = []
      let from = lastScannedRef.current + 1n

      while (from <= latestBlock) {
        if (cancelRef.current) return
        const to = from + CHUNK - 1n < latestBlock ? from + CHUNK - 1n : latestBlock

        // Retry once with backoff on 429 before surfacing error
        let pageLogs
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            pageLogs = await client.getLogs({
              address: AGENT_BUDGET_VAULT.address,
              event: agentPaymentEvent,
              fromBlock: from,
              toBlock: to,
            })
            break
          } catch (e: unknown) {
            const msg = String(e)
            const is429 = msg.includes('429') || msg.includes('rate limit') || msg.includes('LimitExceeded')
            if (is429 && attempt < 2) {
              await new Promise(r => setTimeout(r, 2_000 * (attempt + 1)))
              continue
            }
            throw e
          }
        }

        for (const log of pageLogs ?? []) {
          newLogs.push({
            jobRef: log.args.jobRef as `0x${string}`,
            recipient: log.args.recipient as string,
            amount: log.args.amount as bigint,
            agent: log.args.agent as string,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber ?? 0n,
          })
        }
        from = to + 1n

        // Brief pause between chunks to avoid rapid-fire requests
        if (from <= latestBlock && !cancelRef.current) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      if (!cancelRef.current) {
        lastScannedRef.current = latestBlock
        const merged = [...cachedEventsRef.current, ...newLogs]
        const seen = new Set<string>()
        const deduped = merged.filter((e) => {
          const key = `${e.txHash}-${e.jobRef}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        cachedEventsRef.current = deduped
        setEvents([...deduped].reverse())
      }
    } catch (err) {
      console.error('[HistoryScreen] getLogs failed:', err)
      if (!cancelRef.current) setError('Could not load events. RPC may be rate-limiting — try again in a moment.')
    } finally {
      if (!cancelRef.current) { setLoading(false); setRefreshing(false) }
    }
  }, [])   // stable ref — no deps change after mount

  useEffect(() => {
    void fetchEvents()
    // No polling interval — fetches on mount and on manual refresh only.
    return () => { cancelRef.current = true }
  }, [fetchEvents])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Payment History
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--subtle)' }}>
            Real onchain AgentPayment events · auto-refreshes every 8 s
          </p>
        </div>
        <button
          onClick={() => { void fetchEvents(true) }}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
          style={{ background: 'rgba(172,198,233,0.1)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.2)' }}
        >
          <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12" style={{ color: 'var(--subtle)' }}>
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Fetching events from {activeArcChain.name}…</span>
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
                  href={`${EXPLORER_BASE}/tx/${ev.txHash}`}
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
