import { Cloud, Cpu, Radio, Server, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { HealthStatus } from '../types/moderation'

function StatusRow({ icon, label, value, state }: { icon: ReactNode; label: string; value: string; state: 'good' | 'warn' | 'bad' }) {
  const color = state === 'good' ? 'bg-signal-green' : state === 'warn' ? 'bg-signal-yellow' : 'bg-signal-red text-white'
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b-2 border-ink p-4 last:border-b-0">
      <span className={`grid size-10 place-items-center border-2 border-ink ${color}`}>{icon}</span>
      <span className="font-mono text-xs font-black uppercase tracking-wider">{label}</span>
      <strong className="text-right font-display text-sm uppercase sm:text-base">{value}</strong>
    </div>
  )
}

export function SystemStatus({ health, apiOffline }: { health: HealthStatus | null; apiOffline: boolean }) {
  const ollamaState = health?.ollamaStatus
  return (
    <section className="border-3 border-ink bg-white shadow-brutal" aria-labelledby="system-status-title">
      <div className="flex items-center gap-3 border-b-3 border-ink bg-ink p-4 text-white">
        <Radio className="size-6 text-signal-yellow" strokeWidth={3} aria-hidden="true" />
        <h2 id="system-status-title" className="font-display text-xl font-black uppercase">Live system status</h2>
      </div>
      <StatusRow icon={<Server className="size-5" strokeWidth={3} />} label="API" value={apiOffline ? 'Offline' : health?.api ? 'Connected' : 'Checking'} state={apiOffline ? 'bad' : health?.api ? 'good' : 'warn'} />
      <StatusRow
        icon={<Cpu className="size-5" strokeWidth={3} />}
        label="Ollama"
        value={ollamaState === 'online' ? 'Connected' : ollamaState === 'unknown' ? 'Not checked' : ollamaState ?? 'Checking'}
        state={ollamaState === 'online' ? 'good' : ollamaState === 'unknown' || !ollamaState ? 'warn' : 'bad'}
      />
      <StatusRow
        icon={<ShieldCheck className="size-5" strokeWidth={3} />}
        label="AI configuration"
        value={health?.ollamaConfigured ? 'Present' : health ? 'Missing' : 'Checking'}
        state={health?.ollamaConfigured ? 'good' : health ? 'bad' : 'warn'}
      />
      <StatusRow
        icon={<Cloud className="size-5" strokeWidth={3} />}
        label="Event pipeline"
        value={health?.eventPipeline === 'configured' ? 'Configured' : health ? 'Local / off' : 'Checking'}
        state={health?.eventPipeline === 'configured' ? 'good' : 'warn'}
      />
      <p className="border-t-3 border-ink bg-paper p-3 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide">
        “Configured” does not claim external availability. Ollama is marked connected only after a successful model response in this backend runtime.
      </p>
    </section>
  )
}
