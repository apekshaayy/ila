import { Activity } from 'lucide-react'
import type { HealthStatus } from '../types/moderation'
import { StatusBadge } from './StatusBadge'

export type PageId = 'dashboard' | 'moderate' | 'history' | 'analytics' | 'architecture' | 'about'

interface NavbarProps {
  page: PageId
  health: HealthStatus | null
  apiOffline: boolean
  onNavigate: (page: PageId) => void
}

const links: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'history', label: 'History' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'architecture', label: 'Architecture' },
]

export function Navbar({ page, health, apiOffline, onNavigate }: NavbarProps) {
  const aiLabel = apiOffline
    ? 'API OFFLINE'
    : health?.ollamaStatus === 'online'
      ? 'AI ONLINE'
      : health?.ollamaStatus === 'offline'
        ? 'AI OFFLINE'
        : health?.ollamaStatus === 'misconfigured'
          ? 'AI MISCONFIGURED'
          : health?.ollamaStatus === 'error'
            ? 'AI ERROR'
            : 'AI UNCHECKED'
  const tone = apiOffline || ['offline', 'error', 'misconfigured'].includes(health?.ollamaStatus ?? '')
    ? 'red'
    : health?.ollamaStatus === 'online'
      ? 'green'
      : 'yellow'

  return (
    <header className="sticky top-0 z-50 border-b-3 border-ink bg-paper">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-stretch">
        <button
          className="flex items-center gap-3 border-r-3 border-ink bg-signal-yellow px-5 py-3 focus-visible:outline-4 focus-visible:outline-inset focus-visible:outline-signal-blue"
          onClick={() => onNavigate('dashboard')}
          aria-label="Go to ILA dashboard"
        >
          <span className="font-display text-3xl font-black leading-none">ILA.</span>
          <span className="hidden font-mono text-[10px] font-bold uppercase leading-tight tracking-wider sm:block">Content<br />Control</span>
        </button>
        <nav className="order-3 grid w-full grid-cols-3 border-t-3 border-ink lg:order-none lg:flex lg:w-auto lg:flex-1 lg:border-t-0" aria-label="Primary navigation">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              aria-current={page === link.id ? 'page' : undefined}
              className={`min-h-14 border-b-2 border-r-2 border-ink px-2 font-mono text-[10px] font-black uppercase tracking-wider transition-colors focus-visible:outline-4 focus-visible:outline-inset focus-visible:outline-signal-blue sm:px-4 sm:text-xs lg:border-b-0 xl:px-6 ${page === link.id ? 'bg-ink text-white' : 'bg-paper hover:bg-white'}`}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 px-4 py-3">
          <Activity className="hidden size-5 sm:block" strokeWidth={3} aria-hidden="true" />
          <StatusBadge tone={tone}>{aiLabel}</StatusBadge>
        </div>
      </div>
    </header>
  )
}
