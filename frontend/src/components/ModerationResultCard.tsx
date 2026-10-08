import { AlertOctagon, CheckSquare, Eye, ShieldAlert } from 'lucide-react'
import type { ModerationResult } from '../types/moderation'
import { CategoryTags } from './CategoryTags'
import { ConfidenceBar } from './ConfidenceBar'

const styles = {
  approved: { bg: 'bg-signal-green', label: 'Approved', icon: CheckSquare },
  review: { bg: 'bg-signal-orange', label: 'Review', icon: Eye },
  rejected: { bg: 'bg-signal-red text-white', label: 'Rejected', icon: AlertOctagon },
}

export function ModerationResultCard({ result, compact = false }: { result: ModerationResult; compact?: boolean }) {
  const style = styles[result.decision]
  const Icon = style.icon
  const unavailable = result.reason === 'Automated moderation unavailable; human review required.'

  return (
    <section className="border-4 border-ink bg-white shadow-brutal-lg" aria-labelledby="result-title" aria-live="polite">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b-4 border-ink p-4 ${style.bg}`}>
        <div className="flex items-center gap-3">
          <Icon className="size-8" strokeWidth={3} aria-hidden="true" />
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">Moderation result</p>
            <h2 id="result-title" className="font-display text-3xl font-black uppercase sm:text-4xl">{style.label}</h2>
          </div>
        </div>
        <div className="border-3 border-current bg-white px-4 py-2 text-ink">
          <span className="font-mono text-[10px] font-black uppercase tracking-wider">Severity </span>
          <strong className="font-display text-lg uppercase">{result.severity}</strong>
        </div>
      </div>

      {result.escalate && (
        <div className="flex items-center gap-3 border-b-4 border-ink bg-ink px-4 py-3 text-white">
          <ShieldAlert className="size-6 shrink-0 text-signal-yellow" strokeWidth={3} aria-hidden="true" />
          <p className="font-display text-lg font-black uppercase tracking-wide">
            {result.severity === 'severe' ? 'Critical review required' : 'Human escalation required'}
          </p>
        </div>
      )}

      {unavailable && (
        <div className="border-b-3 border-ink bg-signal-yellow p-3 font-mono text-xs font-black uppercase">
          AI service unavailable — this is a fail-safe review result, not an approval.
        </div>
      )}

      <div className={`grid gap-6 p-5 ${compact ? '' : 'lg:grid-cols-[0.8fr_1.2fr] lg:p-7'}`}>
        <ConfidenceBar confidence={result.confidence} />
        <div>
          <p className="mb-3 font-mono text-xs font-black uppercase tracking-widest">Policy categories</p>
          <CategoryTags categories={result.categories} />
        </div>
        <div className={compact ? '' : 'lg:col-span-2'}>
          <p className="mb-2 font-mono text-xs font-black uppercase tracking-widest">Reason</p>
          <p className="border-l-6 border-ink bg-paper px-4 py-3 text-base font-semibold leading-relaxed">{result.reason}</p>
        </div>
      </div>
    </section>
  )
}
