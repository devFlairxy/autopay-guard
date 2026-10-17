import { appHref } from '../site'

export function FinalCta() {
  return (
    <section
      className="border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
      aria-labelledby="cta-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <h2
          id="cta-heading"
          className="display mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: 'var(--ink)' }}
        >
          Build a more controlled agentic economy.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
          Autonomous payments need more than execution. They need clear boundaries.
        </p>
        <a
          href={appHref()}
          className="mkt-focus mt-8 inline-flex h-11 items-center rounded-md px-6 text-sm font-semibold transition-colors duration-100"
          style={{ background: 'var(--accent)', color: '#070b12' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          Explore AgentPay Guard
        </a>
      </div>
    </section>
  )
}
