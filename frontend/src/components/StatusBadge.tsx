import type { ReactNode } from 'react'

interface StatusBadgeProps {
  children: ReactNode
  tone: 'green' | 'yellow' | 'red' | 'blue' | 'neutral'
}

const tones = {
  green: 'bg-signal-green',
  yellow: 'bg-signal-yellow',
  red: 'bg-signal-red text-white',
  blue: 'bg-signal-blue text-white',
  neutral: 'bg-white',
}

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-2 border-2 border-ink px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.12em] ${tones[tone]}`}>
      <span className="size-2 border border-ink bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}
