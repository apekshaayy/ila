import { ArrowDown, ArrowRight, Check, Eye, ScanSearch, ShieldX } from 'lucide-react'
import type { HealthStatus, HistoryItem } from '../types/moderation'
import type { PageId } from '../components/Navbar'
import { BrutalistButton } from '../components/BrutalistButton'
import { MetricCard } from '../components/MetricCard'
import { SystemStatus } from '../components/SystemStatus'

export function DashboardPage({
  history,
  health,
  apiOffline,
  onNavigate,
}: {
  history: HistoryItem[]
  health: HealthStatus | null
  apiOffline: boolean
  onNavigate: (page: PageId) => void
}) {
  const approved = history.filter((item) => item.result.decision === 'approved').length
  const review = history.filter((item) => item.result.decision === 'review').length
  const rejected = history.filter((item) => item.result.decision === 'rejected').length

  return (
    <div className="space-y-16 pb-10">
      <section className="grid min-h-[650px] border-b-4 border-ink lg:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col justify-center bg-paper px-5 py-16 sm:px-10 lg:px-16">
          <div className="mb-8 flex items-center gap-3">
            <span className="border-2 border-ink bg-signal-blue px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.16em] text-white">System / ILA-01</span>
            <span className="h-0.5 w-16 bg-ink" aria-hidden="true" />
          </div>
          <h1 className="font-display text-[clamp(3.2rem,8vw,7.8rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
            AI Content<br /><span className="text-signal-blue [-webkit-text-stroke:2px_#111]">Moderation</span><br />Infrastructure
          </h1>
          <p className="mt-8 max-w-2xl border-l-6 border-ink pl-5 text-lg font-bold leading-relaxed sm:text-xl">
            Analyze user-generated content for policy violations, severity, confidence, and human escalation—then route the result through an event-driven AWS pipeline.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <BrutalistButton onClick={() => onNavigate('moderate')}>
              <ScanSearch className="size-5" strokeWidth={3} aria-hidden="true" /> Moderate content
            </BrutalistButton>
            <BrutalistButton tone="plain" onClick={() => onNavigate('architecture')}>
              View architecture <ArrowRight className="size-5" strokeWidth={3} aria-hidden="true" />
            </BrutalistButton>
          </div>
        </div>

        <div className="relative flex items-center justify-center overflow-hidden border-t-4 border-ink bg-signal-blue p-8 lg:border-l-4 lg:border-t-0">
          <span className="absolute -right-8 top-5 rotate-12 border-3 border-ink bg-signal-yellow px-5 py-2 font-mono text-xs font-black uppercase shadow-brutal">Classify / Route</span>
          <div className="w-full max-w-sm space-y-2">
            {['Content', 'Analyze', 'Normalize', 'Route'].map((step, index) => (
              <div key={step}>
                <div className={`border-4 border-ink p-5 font-display text-3xl font-black uppercase shadow-brutal ${index === 3 ? 'bg-signal-green' : 'bg-white'}`}>
                  <span className="mr-4 font-mono text-sm">0{index + 1}</span>{step}
                </div>
                {index < 3 && <ArrowDown className="mx-auto my-2 size-7 text-white" strokeWidth={4} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 sm:px-8" aria-labelledby="metrics-title">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em]">Current browser session</p>
            <h2 id="metrics-title" className="font-display text-4xl font-black uppercase sm:text-5xl">No invented numbers.</h2>
          </div>
          <button onClick={() => onNavigate('analytics')} className="border-b-3 border-ink font-mono text-xs font-black uppercase tracking-wider hover:bg-signal-yellow">Open session analytics →</button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total analyzed" value={history.length} accent="blue" icon={<ScanSearch className="size-5" strokeWidth={3} />} />
          <MetricCard label="Approved" value={approved} accent="green" icon={<Check className="size-5" strokeWidth={3} />} />
          <MetricCard label="Review" value={review} accent="yellow" icon={<Eye className="size-5" strokeWidth={3} />} />
          <MetricCard label="Rejected" value={rejected} accent="red" icon={<ShieldX className="size-5" strokeWidth={3} />} />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_0.85fr]">
        <div className="border-3 border-ink bg-signal-yellow p-6 shadow-brutal sm:p-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.18em]">Control surface</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase">One policy engine.<br />Two entry points.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border-3 border-ink bg-white p-5">
              <p className="font-mono text-xs font-black uppercase">S3 ingestion</p>
              <p className="mt-2 font-semibold">Object-created events moderate `.txt`, `.json`, and `.csv` content.</p>
            </div>
            <div className="border-3 border-ink bg-white p-5">
              <p className="font-mono text-xs font-black uppercase">HTTP API</p>
              <p className="mt-2 font-semibold">The frontend calls the same model client and normalization rules synchronously.</p>
            </div>
          </div>
        </div>
        <SystemStatus health={health} apiOffline={apiOffline} />
      </section>
    </div>
  )
}
