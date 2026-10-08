import { AlertTriangle } from 'lucide-react'
import type { ModerationResult } from '../types/moderation'
import { ModerationForm } from '../components/ModerationForm'
import { ModerationResultCard } from '../components/ModerationResultCard'
import { PipelineVisualizer } from '../components/PipelineVisualizer'

const errorLabels: Record<string, string> = {
  backend_offline: 'Backend offline',
  request_timeout: 'Request timed out',
  invalid_response: 'Invalid response',
  content_too_large: 'Content too large',
  empty_content: 'Empty content',
  event_publish_failed: 'Event pipeline failure',
  server_error: 'Server error',
}

export function ModeratePage({
  maxChars,
  busy,
  pipelineStep,
  result,
  error,
  onSubmit,
}: {
  maxChars: number
  busy: boolean
  pipelineStep: number
  result: ModerationResult | null
  error: { code: string; message: string } | null
  onSubmit: (content: string) => Promise<void>
}) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-5 py-10 sm:px-8 sm:py-14">
      <header className="grid gap-6 border-b-4 border-ink pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em]">Workspace / synchronous API</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase leading-none sm:text-7xl">Moderate<br /><span className="text-signal-blue">Content.</span></h1>
        </div>
        <p className="max-w-xl border-3 border-ink bg-white p-4 font-semibold shadow-brutal-sm">
          Submit text to the real backend. ILA applies model analysis, controlled output validation, confidence routing, and code-enforced safety escalation.
        </p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <ModerationForm maxChars={maxChars} busy={busy} onSubmit={onSubmit} />
        <div className="space-y-6 xl:sticky xl:top-28">
          <section className="border-3 border-ink bg-paper p-4 shadow-brutal-sm" aria-live="polite">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-black uppercase">Analysis pipeline</h2>
              <span className={`border-2 border-ink px-2 py-1 font-mono text-[10px] font-black uppercase ${busy ? 'animate-pulse bg-signal-yellow' : result ? 'bg-signal-green' : 'bg-white'}`}>
                {busy ? 'Running' : result ? 'Complete' : 'Ready'}
              </span>
            </div>
            <PipelineVisualizer activeStep={pipelineStep} running={busy} />
          </section>

          {error && (
            <div className="border-4 border-ink bg-signal-red p-5 text-white shadow-brutal" role="alert">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-7 shrink-0" strokeWidth={3} aria-hidden="true" />
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-wider">{errorLabels[error.code] ?? 'Request error'}</p>
                  <p className="mt-2 font-bold">{error.message}</p>
                  <p className="mt-2 font-mono text-xs">No approval was inferred from this failure.</p>
                </div>
              </div>
            </div>
          )}

          {result ? (
            <ModerationResultCard result={result} />
          ) : (
            <div className="border-4 border-dashed border-ink bg-white p-8 text-center">
              <p className="font-display text-2xl font-black uppercase">Awaiting content</p>
              <p className="mt-2 font-mono text-sm font-semibold text-ink/60">A real moderation result will appear here. No demo result is prefilled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
