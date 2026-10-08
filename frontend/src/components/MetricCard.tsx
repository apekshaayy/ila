import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  note?: string
  accent: 'blue' | 'green' | 'yellow' | 'red'
  icon?: ReactNode
}

const accents = {
  blue: 'bg-signal-blue text-white',
  green: 'bg-signal-green',
  yellow: 'bg-signal-yellow',
  red: 'bg-signal-red text-white',
}

export function MetricCard({ label, value, note = 'current session', accent, icon }: MetricCardProps) {
  return (
    <article className="relative border-3 border-ink bg-white p-5 shadow-brutal">
      <div className={`absolute -right-3 -top-3 grid size-11 place-items-center border-3 border-ink ${accents[accent]}`} aria-hidden="true">
        {icon}
      </div>
      <p className="font-mono text-xs font-black uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-4 font-display text-5xl font-black leading-none">{value}</p>
      <p className="mt-3 border-t-2 border-ink pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/65">{note}</p>
    </article>
  )
}
