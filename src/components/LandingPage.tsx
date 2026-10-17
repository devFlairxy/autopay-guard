import { Shield, Zap, Lock, Users, ArrowRight, CheckCircle, Code2 } from 'lucide-react'
import { VAULT_ADDRESS, EXPLORER_BASE } from '../contract'
import { activeArcChain } from '../config'

interface LandingPageProps {
  onEnterApp: () => void
}

const features = [
  {
    icon: <Lock className="size-5" />,
    title: 'Contract-enforced limits',
    body: 'Payment caps and spending limits are enforced by Solidity, not by frontend validation or an AI model.',
  },
  {
    icon: <Users className="size-5" />,
    title: 'Authorized agent model',
    body: 'One owner. One agent. An explicit allowlist of approved recipients. No surprises.',
  },
  {
    icon: <Zap className="size-5" />,
    title: 'Sub-second finality',
    body: 'Built on Arc — USDC is the native gas token, giving fast confirmations at predictable cost.',
  },
  {
    icon: <Code2 className="size-5" />,
    title: 'Minimal surface area',
    body: 'Non-upgradeable. No proxy. No factory. 350 lines of audited Solidity with 79 passing tests.',
  },
]

const steps = [
  { n: '01', title: 'Fund the vault', body: 'Deposit USDC from the Configure screen. Set your total spending cap.' },
  { n: '02', title: 'Authorize an agent', body: 'Assign a wallet address that is allowed to execute payments on your behalf.' },
  { n: '03', title: 'Allowlist recipients', body: 'Add the service provider addresses that can receive funds.' },
  { n: '04', title: 'Agent pays services', body: 'The agent submits agentPay(recipient, amount, jobRef). The contract enforces every rule.' },
]

export function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>

      {/* Nav */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'rgba(13,27,47,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-xl"
              style={{ background: 'rgba(172,198,233,0.15)', border: '1px solid rgba(172,198,233,0.25)' }}
            >
              <Shield className="size-4" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              AgentPay Guard
            </span>
          </div>
          <button
            onClick={onEnterApp}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
            style={{ background: 'rgba(172,198,233,0.15)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.25)' }}
          >
            Open app
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-6"
          style={{ background: 'rgba(172,198,233,0.1)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.2)' }}
        >
          <span className="size-1.5 rounded-full bg-current inline-block" />
          Live on {activeArcChain.name}
        </div>

        <h1
          className="display text-4xl sm:text-5xl font-bold mb-5 leading-tight"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}
        >
          Programmable USDC budgets<br className="hidden sm:block" /> for AI agents and services
        </h1>

        <p className="mx-auto max-w-xl text-base mb-10" style={{ color: 'var(--subtle)', lineHeight: 1.7 }}>
          Fund a smart contract, authorize an agent wallet, set payment limits.
          The contract enforces every rule — no server, no API key, no trust required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onEnterApp}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
          >
            Open the dashboard
            <ArrowRight className="size-4" />
          </button>
          <a
            href={`${EXPLORER_BASE}/address/${VAULT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--subtle)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            View contract
            <ArrowRight className="size-3.5 opacity-60" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex size-9 items-center justify-center rounded-xl mb-3"
                style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)' }}
              >
                {icon}
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{title}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--subtle)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2
          className="display text-xl font-bold mb-6"
          style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ n, title, body }) => (
            <div
              key={n}
              className="rounded-2xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span
                className="mono text-xs font-bold mb-3 block"
                style={{ color: 'var(--accent)', opacity: 0.7 }}
              >
                {n}
              </span>
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contract details */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <div className="flex-1">
              <h2 className="display text-base font-bold mb-1" style={{ color: 'var(--ink)' }}>
                Deployed contract
              </h2>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                Verified source on {activeArcChain.name} — Solidity 0.8.28, EVM Paris, MIT license
              </p>
            </div>
            <a
              href={`${EXPLORER_BASE}/address/${VAULT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
              style={{ background: 'rgba(172,198,233,0.1)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.2)' }}
            >
              Explorer
              <ArrowRight className="size-3" />
            </a>
          </div>

          <p
            className="mono text-xs mb-5 truncate rounded-lg px-3 py-2"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--ink-2)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {VAULT_ADDRESS}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tests', value: '79 passing' },
              { label: 'Audit rounds', value: '2 (max severity)' },
              { label: 'Findings resolved', value: '3 / 3' },
              { label: 'Unresolved issues', value: 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'var(--subtle)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section
        className="border-t py-10"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            AgentPay Guard — contract-enforced USDC budgets for AI agents
          </p>
          <a
            href={`${EXPLORER_BASE}/address/${VAULT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            View on {activeArcChain.name} Explorer
            <ArrowRight className="size-3" />
          </a>
        </div>
      </section>

      {/* Security checklist */}
      <section
        className="border-t py-10"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-semibold mb-4" style={{ color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Security properties
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {[
              'ReentrancyGuard on all state-mutating functions',
              'SafeERC20 — failed transfers always revert',
              'Checks-effects-interactions ordering throughout',
              'Two-step ownership transfer (Ownable2Step)',
              'renounceOwnership permanently disabled',
              'bytes32(0) job references rejected',
              'Duplicate job references rejected onchain',
              'Pause blocks deposits and agent payments',
              'Emergency owner withdrawal available while paused',
              'maxPaymentAmount ≤ totalSpendingLimit invariant enforced',
              'EVM Paris target — no PUSH0, Arc-compatible',
              'Non-upgradeable — no proxy, no admin key',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 py-1">
                <CheckCircle className="size-3.5 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--subtle)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
