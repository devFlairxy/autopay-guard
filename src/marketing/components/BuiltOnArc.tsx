import { ExternalLink } from 'lucide-react'
import { EXPLORER_URL, NETWORK, VAULT_ADDRESS } from '../site'

function shorten(addr: string) {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`
}

export function BuiltOnArc() {
  return (
    <section className="border-t" style={{ borderColor: 'var(--border)' }} aria-labelledby="arc-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h2
              id="arc-heading"
              className="display text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'var(--ink)' }}
            >
              Built on Arc
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
              AgentPay Guard uses Arc as its settlement layer for USDC vault payments. The AgentBudgetVault contract is
              deployed and operable on {NETWORK.deployment} — evidence of a working implementation, not an endorsement
              by Arc.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div
              className="rounded-lg border p-5 sm:p-6"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--subtle)' }}>
                AgentBudgetVault · {NETWORK.deployment}
              </p>
              <p className="mono mt-3 break-all text-sm sm:text-[15px]" style={{ color: 'var(--ink)' }}>
                <span className="sm:hidden">{shorten(VAULT_ADDRESS)}</span>
                <span className="hidden sm:inline">{VAULT_ADDRESS}</span>
              </p>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt style={{ color: 'var(--subtle)' }}>Network</dt>
                  <dd style={{ color: 'var(--ink-2)' }}>{NETWORK.deployment}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt style={{ color: 'var(--subtle)' }}>USDC</dt>
                  <dd className="mono text-xs sm:text-sm" style={{ color: 'var(--ink-2)' }}>
                    {shorten(NETWORK.usdc)}
                  </dd>
                </div>
              </dl>

              <a
                href={EXPLORER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mkt-focus mt-6 inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors duration-100"
                style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(74,158,255,0.4)'
                  e.currentTarget.style.color = 'var(--accent-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--ink)'
                }}
              >
                Verify the Contracts
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
