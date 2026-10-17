import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Shield, LayoutDashboard, Settings, Zap, Clock, Code2 } from 'lucide-react'
import { activeArcChain } from './config'

import { OverviewScreen } from './components/OverviewScreen'
import { ConfigureScreen } from './components/ConfigureScreen'
import { AgentPayScreen } from './components/AgentPayScreen'
import { HistoryScreen } from './components/HistoryScreen'
import { DevIntegrationScreen } from './components/DevIntegrationScreen'

type Screen = 'overview' | 'configure' | 'agent-pay' | 'history' | 'dev'

interface NavItem {
  id: Screen
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" /> },
  { id: 'configure', label: 'Configure', icon: <Settings className="size-4" /> },
  { id: 'agent-pay', label: 'Agent Pay', icon: <Zap className="size-4" /> },
  { id: 'history', label: 'History', icon: <Clock className="size-4" /> },
  { id: 'dev', label: 'Dev Guide', icon: <Code2 className="size-4" /> },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview')

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'rgba(7,11,18,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <a
              href="/"
              className="flex items-center gap-2.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: 'var(--accent)' }}
              aria-label="Back to AgentPay Guard homepage"
            >
              <div
                className="flex size-8 items-center justify-center rounded-md"
                style={{ background: 'var(--accent-soft)', border: '1px solid rgba(74,158,255,0.28)' }}
              >
                <Shield className="size-4" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <span className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                  AgentPay Guard
                </span>
                <span
                  className="hidden sm:inline-flex ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {activeArcChain.name}
                </span>
              </div>
            </a>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">

          {/* Sidebar nav — desktop */}
          <nav className="hidden lg:flex flex-col w-44 shrink-0 gap-1 self-start sticky top-24">
            {NAV.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left"
                style={{
                  background: screen === id ? 'var(--accent-soft)' : 'transparent',
                  color: screen === id ? 'var(--accent)' : 'var(--subtle)',
                  border: screen === id ? '1px solid rgba(74,158,255,0.28)' : '1px solid transparent',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          {/* Mobile tab bar */}
          <div
            className="lg:hidden flex overflow-x-auto gap-1 pb-2 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {NAV.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
                style={{
                  background: screen === id ? 'var(--accent-soft)' : 'rgba(255,255,255,0.06)',
                  color: screen === id ? 'var(--accent)' : 'var(--subtle)',
                  border: screen === id ? '1px solid rgba(74,158,255,0.28)' : '1px solid var(--border)',
                }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {screen === 'overview' && <OverviewScreen />}
            {screen === 'configure' && <ConfigureScreen />}
            {screen === 'agent-pay' && <AgentPayScreen />}
            {screen === 'history' && <HistoryScreen />}
            {screen === 'dev' && <DevIntegrationScreen />}
          </main>
        </div>
      </div>
    </div>
  )
}
