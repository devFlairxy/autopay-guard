import { Shield } from 'lucide-react'
import { appHref, PRODUCT } from '../site'

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#architecture', label: 'Architecture' },
] as const

export function MarketingNav() {
  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: 'rgba(7, 11, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="mkt-focus flex items-center gap-2.5 rounded-md"
          aria-label={`${PRODUCT.name} home`}
        >
          <span
            className="flex size-8 items-center justify-center rounded-md"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid rgba(74, 158, 255, 0.28)',
            }}
            aria-hidden
          >
            <Shield className="size-4" style={{ color: 'var(--accent)' }} />
          </span>
          <span className="display text-[15px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            {PRODUCT.name}
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="mkt-focus rounded-md px-3 py-2 text-sm font-medium transition-colors duration-100"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--ink)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)'
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href={appHref()}
          className="mkt-focus inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition-colors duration-100"
          style={{
            background: 'var(--accent)',
            color: '#070b12',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          Launch App
        </a>
      </div>
    </header>
  )
}
