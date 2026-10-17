/**
 * Illustrative vault-control composition — not a live dashboard.
 */

const NODES = [
  { id: 'user', label: 'Owner', sub: 'Funds & rules', x: 8, y: 22 },
  { id: 'vault', label: 'Vault', sub: 'USDC balance', x: 38, y: 12 },
  { id: 'rules', label: 'Policies', sub: 'Limits · allowlist', x: 38, y: 48 },
  { id: 'agent', label: 'Authorized agent', sub: 'Within rules only', x: 72, y: 22 },
  { id: 'pay', label: 'Payment request', sub: 'recipient · amount', x: 72, y: 58 },
] as const

export function HeroVisual() {
  return (
    <div
      className="relative overflow-hidden rounded-lg border"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
      }}
      role="img"
      aria-label="Illustrative diagram: owner funds a vault, configures policies, authorizes an agent, and payment requests are evaluated against on-chain rules before execution."
    >
      <div
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--subtle)' }}>
          Control model
        </span>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-hover)',
            border: '1px solid rgba(74, 158, 255, 0.25)',
          }}
        >
          Illustrative
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
        <svg
          viewBox="0 0 100 72"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <marker id="mkt-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(74,158,255,0.55)" />
            </marker>
          </defs>

          {/* User → Vault */}
          <path
            className="mkt-flow-line"
            d="M22 26 C28 26, 30 18, 36 16"
            fill="none"
            stroke="rgba(74,158,255,0.45)"
            strokeWidth="0.35"
            pathLength="1"
            markerEnd="url(#mkt-arrow)"
          />
          {/* User → Rules */}
          <path
            className="mkt-flow-line"
            d="M22 30 C28 34, 30 48, 36 52"
            fill="none"
            stroke="rgba(74,158,255,0.35)"
            strokeWidth="0.35"
            pathLength="1"
            markerEnd="url(#mkt-arrow)"
            style={{ animationDelay: '0.55s' }}
          />
          {/* Vault + Rules → Agent */}
          <path
            className="mkt-flow-line"
            d="M52 20 C60 20, 64 24, 68 26"
            fill="none"
            stroke="rgba(74,158,255,0.45)"
            strokeWidth="0.35"
            pathLength="1"
            markerEnd="url(#mkt-arrow)"
            style={{ animationDelay: '0.7s' }}
          />
          <path
            className="mkt-flow-line"
            d="M52 52 C60 48, 64 36, 68 30"
            fill="none"
            stroke="rgba(74,158,255,0.35)"
            strokeWidth="0.35"
            pathLength="1"
            style={{ animationDelay: '0.85s' }}
          />
          {/* Agent → Payment */}
          <path
            className="mkt-flow-line"
            d="M78 34 L78 52"
            fill="none"
            stroke="rgba(74,158,255,0.4)"
            strokeWidth="0.35"
            pathLength="1"
            markerEnd="url(#mkt-arrow)"
            style={{ animationDelay: '1s' }}
          />

          {/* Decision outcome badge area */}
          <rect
            x="58"
            y="64"
            width="34"
            height="6"
            rx="1"
            fill="rgba(61,154,106,0.12)"
            stroke="rgba(61,154,106,0.4)"
            strokeWidth="0.25"
          />
          <text
            x="75"
            y="68.1"
            textAnchor="middle"
            fill="#3d9a6a"
            fontSize="2.4"
            fontFamily="DM Sans, sans-serif"
            fontWeight="600"
          >
            Allowed · within policy
          </text>
        </svg>

        {/* HTML nodes overlaid for crisp type */}
        <div className="absolute inset-0 p-[6%] sm:p-[7%]">
          <div className="relative h-full w-full">
            {NODES.map((node, i) => (
              <div
                key={node.id}
                className={`mkt-reveal absolute rounded-md border px-2.5 py-2 sm:px-3 sm:py-2.5 ${
                  i === 0
                    ? 'mkt-reveal-d1'
                    : i < 3
                      ? 'mkt-reveal-d2'
                      : i === 3
                        ? 'mkt-reveal-d3'
                        : 'mkt-reveal-d4'
                }`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(13, 21, 32, 0.95)',
                  borderColor:
                    node.id === 'agent' || node.id === 'vault'
                      ? 'rgba(74, 158, 255, 0.35)'
                      : 'var(--border)',
                  minWidth: '5.5rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}
              >
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]"
                  style={{ color: node.id === 'agent' ? 'var(--accent)' : 'var(--subtle)' }}
                >
                  {node.label}
                </div>
                <div className="mt-0.5 text-[11px] sm:text-xs" style={{ color: 'var(--muted)' }}>
                  {node.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="border-t px-4 py-2.5 text-[11px] leading-relaxed sm:text-xs" style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}>
        The agent may initiate payments only after authorization. Funds move only when the request satisfies on-chain limits and recipient rules.
      </p>
    </div>
  )
}
