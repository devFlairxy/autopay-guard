import { Shield } from 'lucide-react'
import { appHref, EXPLORER_URL, NETWORK, PRODUCT } from '../site'

const year = new Date().getFullYear()

export function MarketingFooter() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-7 items-center justify-center rounded-md"
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid rgba(74, 158, 255, 0.28)',
                }}
                aria-hidden
              >
                <Shield className="size-3.5" style={{ color: 'var(--accent)' }} />
              </span>
              <span className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {PRODUCT.name}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>
              Programmable on-chain payment control for AI agents on {NETWORK.name}.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a href="#top" className="mkt-focus rounded" style={{ color: 'var(--muted)' }}>
              Home
            </a>
            <a href={appHref()} className="mkt-focus rounded" style={{ color: 'var(--muted)' }}>
              Application
            </a>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mkt-focus rounded"
              style={{ color: 'var(--muted)' }}
            >
              Contract explorer
            </a>
            <a
              href="https://studio.arc.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="mkt-focus rounded"
              style={{ color: 'var(--muted)' }}
            >
              Arc Studio
            </a>
          </nav>
        </div>

        <div
          className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}
        >
          <p>© {year} {PRODUCT.name}</p>
          <p>Built for {NETWORK.name} · Deployed on {NETWORK.deployment}</p>
        </div>
      </div>
    </footer>
  )
}
