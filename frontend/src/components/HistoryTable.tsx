import { ChevronRight, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Decision, HistoryItem } from '../types/moderation'
import { BrutalistButton } from './BrutalistButton'
import { ModerationResultCard } from './ModerationResultCard'

const decisionColors: Record<Decision, string> = {
  approved: 'bg-signal-green',
  review: 'bg-signal-orange',
  rejected: 'bg-signal-red text-white',
}

export function HistoryTable({ items, onClear }: { items: HistoryItem[]; onClear: () => void }) {
  const [filter, setFilter] = useState<'all' | Decision>('all')
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.result.decision === filter),
    [filter, items],
  )

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter moderation history">
          {(['all', 'approved', 'review', 'rejected'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`border-2 border-ink px-4 py-2 font-mono text-xs font-black uppercase tracking-wider ${filter === value ? 'bg-ink text-white' : 'bg-white hover:bg-signal-yellow'}`}
            >
              {value}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <BrutalistButton tone="plain" onClick={onClear}>
            <Trash2 className="size-4" strokeWidth={3} aria-hidden="true" /> Clear session
          </BrutalistButton>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border-4 border-dashed border-ink bg-white p-10 text-center">
          <p className="font-display text-2xl font-black uppercase">No session results</p>
          <p className="mt-2 font-mono text-sm font-semibold text-ink/65">Run a moderation request to populate this view. No historical data is fabricated.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-3 border-ink bg-white shadow-brutal">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <caption className="sr-only">Moderation attempts in the current browser session</caption>
            <thead className="bg-ink text-white">
              <tr className="font-mono text-xs uppercase tracking-wider">
                <th className="p-4">Time</th>
                <th className="p-4">Content preview</th>
                <th className="p-4">Decision</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Confidence</th>
                <th className="p-4"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t-2 border-ink hover:bg-paper">
                  <td className="whitespace-nowrap p-4 font-mono text-xs font-bold">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td className="max-w-sm p-4 text-sm font-semibold">{item.contentPreview}</td>
                  <td className="p-4"><span className={`border-2 border-ink px-2 py-1 font-mono text-xs font-black uppercase ${decisionColors[item.result.decision]}`}>{item.result.decision}</span></td>
                  <td className="p-4 font-mono text-xs font-black uppercase">{item.result.severity}</td>
                  <td className="p-4 font-display text-lg font-black">{Math.round(item.result.confidence * 100)}%</td>
                  <td className="p-4">
                    <button onClick={() => setSelected(item)} className="grid size-10 place-items-center border-2 border-ink bg-signal-yellow hover:translate-x-0.5 hover:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-signal-blue" aria-label={`View details for ${item.contentPreview}`}>
                      <ChevronRight className="size-5" strokeWidth={3} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-black uppercase">Selected result</h2>
            <button className="border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-black uppercase hover:bg-signal-yellow" onClick={() => setSelected(null)}>Close detail</button>
          </div>
          <ModerationResultCard result={selected.result} compact />
        </div>
      )}
    </div>
  )
}
