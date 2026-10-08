import type { Decision, HistoryItem, ModerationCategory, Severity } from '../types/moderation'

const decisionColors: Record<Decision, string> = { approved: 'bg-signal-green', review: 'bg-signal-orange', rejected: 'bg-signal-red' }
const severityColors: Record<Severity, string> = { low: 'bg-signal-green', medium: 'bg-signal-yellow', high: 'bg-signal-orange', severe: 'bg-deep-red' }

function Bar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="mb-2 flex justify-between gap-4 font-mono text-xs font-black uppercase">
        <span>{label}</span><span>{count} / {percentage}%</span>
      </div>
      <div className="h-9 border-3 border-ink bg-white p-1" role="meter" aria-label={`${label}: ${count}, ${percentage} percent`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className={`h-full border-r-2 border-ink ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsPage({ items }: { items: HistoryItem[] }) {
  const total = items.length
  const decisionCounts = Object.fromEntries(['approved', 'review', 'rejected'].map((value) => [value, items.filter((item) => item.result.decision === value).length])) as Record<Decision, number>
  const severityCounts = Object.fromEntries(['low', 'medium', 'high', 'severe'].map((value) => [value, items.filter((item) => item.result.severity === value).length])) as Record<Severity, number>
  const categoryCounts = new Map<ModerationCategory, number>()
  for (const item of items) {
    for (const category of item.result.categories) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-9 grid gap-4 border-b-4 border-ink pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.18em]">No production data / no fabrication</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-7xl">Session<br />Analytics.</h1>
        </div>
        <div className="border-3 border-ink bg-signal-blue p-5 text-white shadow-brutal">
          <p className="font-mono text-xs font-black uppercase">Total requests</p>
          <p className="font-display text-6xl font-black">{total}</p>
        </div>
      </header>

      {total === 0 ? (
        <div className="border-4 border-dashed border-ink bg-white p-12 text-center">
          <p className="font-display text-3xl font-black uppercase">Nothing to chart yet.</p>
          <p className="mt-3 font-mono text-sm font-semibold">Session analytics appear after real API results are received.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="border-3 border-ink bg-paper p-6 shadow-brutal">
            <h2 className="mb-7 font-display text-3xl font-black uppercase">Decision split</h2>
            <div className="space-y-6">
              {(Object.keys(decisionCounts) as Decision[]).map((decision) => <Bar key={decision} label={decision} count={decisionCounts[decision]} total={total} color={decisionColors[decision]} />)}
            </div>
          </section>
          <section className="border-3 border-ink bg-white p-6 shadow-brutal">
            <h2 className="mb-7 font-display text-3xl font-black uppercase">Severity split</h2>
            <div className="space-y-6">
              {(Object.keys(severityCounts) as Severity[]).map((severity) => <Bar key={severity} label={severity} count={severityCounts[severity]} total={total} color={severityColors[severity]} />)}
            </div>
          </section>
          <section className="border-3 border-ink bg-signal-yellow p-6 shadow-brutal lg:col-span-2">
            <h2 className="font-display text-3xl font-black uppercase">Detected categories</h2>
            {topCategories.length === 0 ? (
              <p className="mt-5 border-2 border-ink bg-white p-4 font-mono text-sm font-bold uppercase">No violation categories in this session.</p>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topCategories.map(([category, count], index) => (
                  <div key={category} className="flex items-center justify-between border-3 border-ink bg-white p-4">
                    <span className="font-mono text-xs font-black uppercase">{String(index + 1).padStart(2, '0')} / {category.replaceAll('_', ' ')}</span>
                    <strong className="font-display text-3xl">{count}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
