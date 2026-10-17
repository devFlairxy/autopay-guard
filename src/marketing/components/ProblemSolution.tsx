export function ProblemSolution() {
  return (
    <section
      id="product"
      className="border-t"
      style={{ borderColor: 'var(--border)' }}
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <h2
            id="problem-heading"
            className="display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'var(--ink)' }}
          >
            Autonomy shouldn&apos;t mean unrestricted access.
          </h2>
          <p className="mt-5 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--muted)' }}>
            Traditional automation often requires granting systems access that is difficult to constrain. AI agents
            introduce a sharper version of the same problem: they need to act independently, but their owners still need
            clear boundaries around financial activity.
          </p>
        </div>

        <div className="mt-14 grid gap-0 border-t lg:grid-cols-2" style={{ borderColor: 'var(--border)' }}>
          <div className="border-b py-10 pr-0 lg:border-b-0 lg:border-r lg:pr-12" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--subtle)' }}>
              Without control
            </p>
            <p className="display mt-4 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--ink-2)' }}>
              Broad wallet access for agents that need to pay.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted)' }}>
              Handing an agent a funded wallet can enable useful work — and also expose funds beyond the intended scope
              of any single task.
            </p>
          </div>

          <div className="py-10 lg:pl-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
              With AgentPay Guard
            </p>
            <p className="display mt-4 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--ink)' }}>
              A programmable vault with on-chain rules.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted)' }}>
              You fund a smart-contract vault, authorize one agent, set per-payment and total spending limits, and
              approve recipients. Payment attempts are evaluated against those rules before USDC can move.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
