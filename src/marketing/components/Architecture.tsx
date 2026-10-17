const POINTS = [
  {
    title: 'Rules in contract logic',
    body: 'Per-payment caps, total spending limits, recipient allowlists, and agent authorization are encoded in the vault contract — not left to frontend validation alone.',
  },
  {
    title: 'Verifiable execution',
    body: 'Successful payments emit on-chain events. Anyone can inspect vault state and transaction outcomes on the Arc explorer.',
  },
  {
    title: 'Explicit authorization boundaries',
    body: 'Only the authorized agent can call agentPay. Owners retain pause and withdraw controls. Renouncing ownership is disabled.',
  },
] as const

export function Architecture() {
  return (
    <section
      id="architecture"
      className="border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
      aria-labelledby="arch-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2
            id="arch-heading"
            className="display text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: 'var(--ink)' }}
          >
            Why on-chain enforcement matters
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Smart contracts define what the authorized agent is allowed to do with vault funds. That is different from
            trusting an agent, a dashboard, or a backend to behave correctly every time.
          </p>
        </div>

        <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {POINTS.map((point) => (
            <li key={point.title}>
              <h3 className="display text-lg font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                {point.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--muted)' }}>
                {point.body}
              </p>
            </li>
          ))}
        </ul>

        <aside
          className="mt-14 max-w-3xl border-l-2 pl-5"
          style={{ borderColor: 'rgba(74, 158, 255, 0.45)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--ink-2)' }}>
              Scope note.
            </span>{' '}
            The contract enforces payment rules once a transaction is submitted. Agent software, wallet keys, frontend
            clients, and off-chain systems remain outside that boundary — and still require careful operational control.
          </p>
        </aside>
      </div>
    </section>
  )
}
