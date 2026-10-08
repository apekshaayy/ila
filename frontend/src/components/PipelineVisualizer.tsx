import { ArrowDown } from 'lucide-react'

const steps = ['Ingest', 'AI analysis', 'Policy normalization', 'Decision']

export function PipelineVisualizer({ activeStep, running = false }: { activeStep: number; running?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center" aria-label="Moderation pipeline progress">
      {steps.map((step, index) => {
        const active = index === activeStep
        const complete = index < activeStep
        return (
          <div key={step} className="contents">
            <div
              className={`relative border-3 border-ink px-3 py-4 text-center font-mono text-xs font-black uppercase tracking-wider transition-all ${active ? 'translate-x-[-2px] translate-y-[-2px] bg-signal-yellow shadow-[5px_5px_0_#111]' : complete ? 'bg-signal-green' : 'bg-white'}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="mr-2">0{index + 1}</span>{step}
              {active && running && <span className="absolute -right-2 -top-2 size-3 animate-pulse border-2 border-ink bg-signal-red" aria-hidden="true" />}
            </div>
            {index < steps.length - 1 && <ArrowDown className="mx-auto size-5 sm:-rotate-90" strokeWidth={3} aria-hidden="true" />}
          </div>
        )
      })}
    </div>
  )
}
