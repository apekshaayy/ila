import type { HistoryItem } from '../types/moderation'
import { HistoryTable } from '../components/HistoryTable'

export function HistoryPage({ items, onClear }: { items: HistoryItem[]; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-9 border-b-4 border-ink pb-7">
        <span className="border-2 border-ink bg-signal-yellow px-3 py-1 font-mono text-xs font-black uppercase tracking-wider">Current session only</span>
        <h1 className="mt-5 font-display text-5xl font-black uppercase sm:text-7xl">Moderation<br />History.</h1>
        <p className="mt-4 max-w-2xl text-lg font-semibold">Stored in this browser tab’s session storage. EventBridge routes cloud results but is not a historical database.</p>
      </header>
      <HistoryTable items={items} onClear={onClear} />
    </div>
  )
}
