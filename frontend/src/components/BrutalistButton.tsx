import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface BrutalistButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  tone?: 'yellow' | 'blue' | 'plain' | 'danger'
}

const tones = {
  yellow: 'bg-signal-yellow',
  blue: 'bg-signal-blue text-white',
  plain: 'bg-white',
  danger: 'bg-signal-red text-white',
}

export function BrutalistButton({ children, className = '', tone = 'yellow', ...props }: BrutalistButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 border-3 border-ink px-5 py-3 font-display text-sm font-black uppercase tracking-[0.08em] shadow-brutal transition-transform duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-brutal focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-signal-blue ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
