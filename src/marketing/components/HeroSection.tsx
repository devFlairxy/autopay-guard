import { NETWORK, PRODUCT, appHref } from '../site'
import { HeroVisual } from './HeroVisual'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* Subtle atmosphere — not decorative orbs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 70% 0%, rgba(74,158,255,0.08) 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6 lg:flex lg:flex-col lg:justify-center">
          <p
            className="mkt-reveal text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs"
            style={{ color: 'var(--accent)' }}
          >
            Programmable payment control for AI agents
          </p>

          <h1
            id="hero-heading"
            className="display mkt-reveal mkt-reveal-d1 mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]"
            style={{ color: 'var(--ink)' }}
          >
            {PRODUCT.tagline}
          </h1>

          <p
            className="mkt-reveal mkt-reveal-d2 mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--muted)' }}
          >
            {PRODUCT.description}
          </p>

          <div className="mkt-reveal mkt-reveal-d3 mt-8 flex flex-wrap items-center gap-3">
            <a
              href={appHref()}
              className="mkt-focus inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold transition-colors duration-100"
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
            <a
              href="#how-it-works"
              className="mkt-focus inline-flex h-11 items-center rounded-md border px-5 text-sm font-semibold transition-colors duration-100"
              style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.background = 'var(--surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              See How It Works
            </a>
          </div>

          <div
            className="mkt-reveal mkt-reveal-d4 mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm"
            style={{ color: 'var(--subtle)' }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="mkt-pulse size-1.5 rounded-full" style={{ background: 'var(--accent)' }} aria-hidden />
              Built on {NETWORK.name}
            </span>
            <span style={{ color: 'var(--border)' }} aria-hidden>
              |
            </span>
            <span>Deployed on {NETWORK.deployment}</span>
          </div>
        </div>

        <div className="mkt-reveal mkt-reveal-d3 lg:col-span-6">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
