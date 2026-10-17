const STEPS = [
  {
    n: '01',
    title: 'Fund the vault',
    body: 'Deposit USDC into the smart-contract vault. Funding increases available balance — it is not itself a payment.',
  },
  {
    n: '02',
    title: 'Authorize the agent',
    body: 'Grant one agent wallet permission to call payments, configure spending limits, and approve recipients. Authorization is not a transfer of funds.',
  },
  {
    n: '03',
    title: 'Execute within the rules',
    body: 'The authorized agent submits payment requests. The contract checks agent identity, recipient allowlist, per-payment cap, total spending limit, and vault balance before any USDC moves.',
  },
] as const

const FLOW = ['Owner', 'Vault & policies', 'Authorized agent', 'Payment execution'] as const

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2
            id="how-heading"
            className="display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'var(--ink)' }}
          >
            How it works
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Three distinct actions — funding, authorization, and execution — kept separate by design.
          </p>
        </div>

        {/* Flow strip */}
        <ol
          className="mt-10 flex flex-wrap items-center gap-2 text-xs font-medium sm:gap-3 sm:text-sm"
          style={{ color: 'var(--subtle)' }}
        >
          {FLOW.map((label, i) => (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <span
                className="rounded-md border px-2.5 py-1.5"
                style={{
                  borderColor: 'var(--border)',
                  color: i === FLOW.length - 1 ? 'var(--accent)' : 'var(--ink-2)',
                  background: i === FLOW.length - 1 ? 'var(--accent-soft)' : 'var(--surface)',
                }}
              >
                {label}
              </span>
              {i < FLOW.length - 1 && (
                <span aria-hidden style={{ color: 'var(--subtle)' }}>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className="mono text-xs font-medium" style={{ color: 'var(--accent)' }}>
                {step.n}
              </span>
              <h3 className="display mt-3 text-xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--muted)' }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
