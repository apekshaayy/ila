import { Code2, ExternalLink, GraduationCap, ShieldCheck } from 'lucide-react'
import type { HealthStatus } from '../types/moderation'
import { SystemStatus } from '../components/SystemStatus'

export function AboutPage({ health, apiOffline }: { health: HealthStatus | null; apiOffline: boolean }) {
  return (
    <div className="mx-auto max-w-[1300px] px-5 py-10 sm:px-8 sm:py-14">
      <header className="grid gap-8 border-b-4 border-ink pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em]">About the project</p>
          <h1 className="mt-2 font-display text-7xl font-black uppercase leading-none sm:text-9xl">ILA.</h1>
          <p className="mt-5 max-w-2xl border-l-6 border-signal-blue pl-5 text-xl font-bold">AI-powered content moderation infrastructure for practical, secure, event-driven policy triage.</p>
        </div>
        <div className="rotate-1 border-4 border-ink bg-signal-yellow p-6 shadow-brutal-lg">
          <GraduationCap className="size-12" strokeWidth={3} aria-hidden="true" />
          <p className="mt-4 font-display text-3xl font-black uppercase">Built to explain.<br />Built to demonstrate.</p>
          <p className="mt-3 font-semibold">A modular cloud-computing project with explicit safety rules, observable failure modes, and no secret-bearing browser code.</p>
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="space-y-5">
          <div className="border-3 border-ink bg-white p-6 shadow-brutal">
            <div className="flex items-center gap-3"><Code2 className="size-7" strokeWidth={3} /><h2 className="font-display text-2xl font-black uppercase">Technology</h2></div>
            <p className="mt-4 font-semibold leading-relaxed">Python 3.12, AWS Lambda, S3, Secrets Manager, EventBridge, API Gateway, Ollama, React, TypeScript, Vite, and Tailwind CSS.</p>
          </div>
          <div className="border-3 border-ink bg-signal-blue p-6 text-white shadow-brutal">
            <div className="flex items-center gap-3"><ShieldCheck className="size-7" strokeWidth={3} /><h2 className="font-display text-2xl font-black uppercase">Safety position</h2></div>
            <p className="mt-4 font-semibold leading-relaxed">ILA is a triage system, not an oracle. Model classifications can be wrong. Production deployments require human oversight, monitoring, evaluation, appeals, and jurisdiction-specific response processes.</p>
          </div>
          <a className="flex items-center justify-between border-3 border-ink bg-white p-5 font-display text-xl font-black uppercase shadow-brutal transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-brutal-sm" href="https://github.com/apekshaayy/ila" target="_blank" rel="noreferrer">
            Project repository <ExternalLink className="size-6" strokeWidth={3} aria-hidden="true" />
          </a>
        </section>
        <SystemStatus health={health} apiOffline={apiOffline} />
      </div>
    </div>
  )
}
