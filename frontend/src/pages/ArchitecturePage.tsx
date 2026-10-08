import { ArrowDown, CloudCog, Database, Eye, FileJson, KeyRound, Laptop, RadioTower, ScrollText, ServerCog } from 'lucide-react'
import type { ReactNode } from 'react'

function Node({ label, detail, tone = 'white', icon }: { label: string; detail: string; tone?: 'white' | 'yellow' | 'blue' | 'green'; icon: ReactNode }) {
  const colors = { white: 'bg-white', yellow: 'bg-signal-yellow', blue: 'bg-signal-blue text-white', green: 'bg-signal-green' }
  return (
    <div className={`border-3 border-ink p-4 shadow-brutal-sm ${colors[tone]}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center border-2 border-current bg-paper text-ink">{icon}</span>
        <div>
          <p className="font-display text-lg font-black uppercase">{label}</p>
          <p className="font-mono text-[10px] font-bold uppercase leading-relaxed opacity-75">{detail}</p>
        </div>
      </div>
    </div>
  )
}

function DownArrow() {
  return <ArrowDown className="mx-auto my-3 size-7" strokeWidth={4} aria-hidden="true" />
}

export function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10 border-b-4 border-ink pb-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.2em]">System map / deployable AWS path</p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-none sm:text-7xl">How ILA<br /><span className="text-signal-blue">Moves data.</span></h1>
        <p className="mt-5 max-w-3xl text-lg font-semibold">Browser and S3 inputs converge on one Lambda moderation engine. The browser never communicates with Ollama, Secrets Manager, or AWS credentials directly.</p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1fr_auto_1fr] xl:items-start">
        <section className="border-4 border-ink bg-paper p-5 shadow-brutal" aria-labelledby="sync-flow-title">
          <h2 id="sync-flow-title" className="border-b-3 border-ink pb-3 font-display text-2xl font-black uppercase">Synchronous frontend flow</h2>
          <div className="mx-auto mt-6 max-w-md">
            <Node label="User / Browser" detail="React + Vite + Tailwind" icon={<Laptop className="size-5" strokeWidth={3} />} />
            <DownArrow />
            <Node label="HTTP API" detail="API Gateway / validated JSON" tone="yellow" icon={<RadioTower className="size-5" strokeWidth={3} />} />
            <DownArrow />
            <Node label="Analysis Lambda" detail="Shared moderate_text function" tone="blue" icon={<ServerCog className="size-5" strokeWidth={3} />} />
          </div>
        </section>

        <div className="hidden h-full w-1 bg-ink xl:block" aria-hidden="true" />

        <section className="border-4 border-ink bg-white p-5 shadow-brutal" aria-labelledby="event-flow-title">
          <h2 id="event-flow-title" className="border-b-3 border-ink pb-3 font-display text-2xl font-black uppercase">Asynchronous upload flow</h2>
          <div className="mx-auto mt-6 max-w-md">
            <Node label="Application" detail="Uploads text / JSON / CSV" icon={<FileJson className="size-5" strokeWidth={3} />} />
            <DownArrow />
            <Node label="Amazon S3" detail="Encrypted private input bucket" tone="green" icon={<Database className="size-5" strokeWidth={3} />} />
            <DownArrow />
            <Node label="Analysis Lambda" detail="Shared extraction + moderate_text" tone="blue" icon={<ServerCog className="size-5" strokeWidth={3} />} />
          </div>
        </section>
      </div>

      <DownArrow />
      <section className="border-4 border-ink bg-signal-yellow p-6 shadow-brutal-lg" aria-labelledby="core-title">
        <h2 id="core-title" className="text-center font-display text-3xl font-black uppercase">One moderation core</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Node label="Ollama" detail="Deterministic semantic classification" icon={<CloudCog className="size-5" strokeWidth={3} />} />
          <Node label="Normalization" detail="Controlled fields + safety overrides" icon={<ScrollText className="size-5" strokeWidth={3} />} />
          <Node label="Fail-safe" detail="Failures become human review" icon={<Eye className="size-5" strokeWidth={3} />} />
        </div>
      </section>

      <DownArrow />
      <section className="border-4 border-ink bg-ink p-6 text-white shadow-brutal-lg" aria-labelledby="route-title">
        <h2 id="route-title" className="text-center font-display text-3xl font-black uppercase">EventBridge routing</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border-3 border-white bg-signal-green p-5 text-ink"><p className="font-display text-2xl font-black uppercase">Approved</p><p className="mt-1 font-mono text-xs font-bold uppercase">Allowed workflow</p></div>
          <div className="border-3 border-white bg-signal-orange p-5 text-ink"><p className="font-display text-2xl font-black uppercase">Review</p><p className="mt-1 font-mono text-xs font-bold uppercase">Human queue</p></div>
          <div className="border-3 border-white bg-signal-red p-5"><p className="font-display text-2xl font-black uppercase">Rejected</p><p className="mt-1 font-mono text-xs font-bold uppercase">Block / escalate</p></div>
        </div>
      </section>

      <div className="mt-9 grid gap-6 md:grid-cols-2">
        <div className="border-3 border-ink bg-white p-5 shadow-brutal-sm">
          <div className="flex items-center gap-3"><KeyRound className="size-7" strokeWidth={3} /><h2 className="font-display text-2xl font-black uppercase">Secrets Manager</h2></div>
          <p className="mt-3 font-semibold">The Lambda retrieves and warm-process-caches the Ollama key. No secret reaches EventBridge or the browser.</p>
        </div>
        <div className="border-3 border-ink bg-white p-5 shadow-brutal-sm">
          <div className="flex items-center gap-3"><ScrollText className="size-7" strokeWidth={3} /><h2 className="font-display text-2xl font-black uppercase">CloudWatch</h2></div>
          <p className="mt-3 font-semibold">Structured lifecycle and error logs omit full moderated content, authorization headers, and credentials.</p>
        </div>
      </div>
    </div>
  )
}
