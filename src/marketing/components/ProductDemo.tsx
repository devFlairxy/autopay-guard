import { useState } from 'react'
import { Check, X } from 'lucide-react'

type Scenario = 'allowed' | 'rejected'

export function ProductDemo() {
  const [scenario, setScenario] = useState<Scenario>('allowed')

  const isAllowed = scenario === 'allowed'
  const amount = isAllowed ? '12.00' : '250.00'
  const reason = isAllowed
    ? 'Within max payment · recipient approved · budget remaining'
    : 'Exceeds max payment amount (100.00 USDC)'

  return (
    <section
      className="border-t"
      style={{ borderColor: 'var(--border)' }}
      aria-labelledby="demo-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2
              id="demo-heading"
              className="display text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'var(--ink)' }}
            >
              Policy before payment
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
              A simplified view of the control surface: vault state, authorization, limits, and how a payment request is
              evaluated. Sample values are illustrative — not live balances.
            </p>
          </div>

          <div
            className="inline-flex rounded-md border p-1"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            role="group"
            aria-label="Payment scenario"
          >
            {(
              [
                ['allowed', 'Permitted'],
                ['rejected', 'Rejected'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="mkt-focus rounded px-3 py-2 text-sm font-medium transition-colors duration-100"
                style={{
                  background: scenario === id ? 'var(--accent-soft)' : 'transparent',
                  color: scenario === id ? 'var(--accent-hover)' : 'var(--subtle)',
                  minHeight: 40,
                }}
                aria-pressed={scenario === id}
                onClick={() => setScenario(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-12 overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--subtle)' }}>
              Vault control — illustrative
            </span>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>
              Simulated sample data
            </span>
          </div>

          <div className="grid lg:grid-cols-12">
            {/* Left: vault state */}
            <div className="space-y-6 border-b p-5 sm:p-6 lg:col-span-5 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--subtle)' }}>
                  Vault balance
                </p>
                <p className="display mt-2 text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--ink)' }}>
                  1,000.00 <span className="text-lg font-semibold" style={{ color: 'var(--subtle)' }}>USDC</span>
                </p>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--subtle)' }}>Agent status</dt>
                  <dd className="font-medium" style={{ color: 'var(--success)' }}>
                    Authorized
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--subtle)' }}>Max per payment</dt>
                  <dd className="mono tabular-nums" style={{ color: 'var(--ink-2)' }}>
                    100.00 USDC
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--subtle)' }}>Total spending limit</dt>
                  <dd className="mono tabular-nums" style={{ color: 'var(--ink-2)' }}>
                    1,000.00 USDC
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--subtle)' }}>Spent to date</dt>
                  <dd className="mono tabular-nums" style={{ color: 'var(--ink-2)' }}>
                    240.00 USDC
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--subtle)' }}>Recipients</dt>
                  <dd style={{ color: 'var(--ink-2)' }}>Allowlist enforced</dd>
                </div>
              </dl>
            </div>

            {/* Right: request + evaluation */}
            <div className="space-y-5 p-5 sm:p-6 lg:col-span-7">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--subtle)' }}>
                  Payment request
                </p>
                <div
                  className="mt-3 grid gap-3 rounded-md border p-4 sm:grid-cols-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <div>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                      Recipient
                    </p>
                    <p className="mono mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
                      0xA1b2…9f3c
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                      Amount
                    </p>
                    <p className="mono mt-1 text-sm tabular-nums" style={{ color: 'var(--ink)' }}>
                      {amount} USDC
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                      Job reference
                    </p>
                    <p className="mono mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
                      job_invoice_8841
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-md border p-4 transition-colors duration-200"
                style={{
                  borderColor: isAllowed ? 'rgba(61,154,106,0.4)' : 'rgba(212,93,106,0.4)',
                  background: isAllowed ? 'var(--success-soft)' : 'var(--danger-soft)',
                }}
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: isAllowed ? 'rgba(61,154,106,0.25)' : 'rgba(212,93,106,0.25)',
                    }}
                    aria-hidden
                  >
                    {isAllowed ? (
                      <Check className="size-3.5" style={{ color: 'var(--success)' }} />
                    ) : (
                      <X className="size-3.5" style={{ color: 'var(--danger)' }} />
                    )}
                  </span>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isAllowed ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {isAllowed ? 'Policy check passed' : 'Policy check failed'}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                      {reason}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
                      {isAllowed
                        ? 'Outcome: USDC transfer may proceed on-chain.'
                        : 'Outcome: transaction reverts — no funds move.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
