import { useCallback, useEffect, useState } from 'react'
import { ApiError, getHealth, moderateContent } from './lib/api'
import { addSessionResult, clearSessionHistory, loadSessionHistory } from './lib/session'
import type { HealthStatus, HistoryItem, ModerationResult } from './types/moderation'
import { Navbar, type PageId } from './components/Navbar'
import { AboutPage } from './pages/AboutPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { ModeratePage } from './pages/ModeratePage'

const pages: PageId[] = ['dashboard', 'moderate', 'history', 'analytics', 'architecture', 'about']

function pageFromHash(): PageId {
  const candidate = window.location.hash.replace(/^#\/?/, '') as PageId
  return pages.includes(candidate) ? candidate : 'dashboard'
}

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromHash)
  const [history, setHistory] = useState<HistoryItem[]>(loadSessionHistory)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [apiOffline, setApiOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [result, setResult] = useState<ModerationResult | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)

  const refreshHealth = useCallback(async () => {
    try {
      const next = await getHealth()
      setHealth(next)
      setApiOffline(false)
    } catch {
      setHealth(null)
      setApiOffline(true)
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshHealth(), 0)
    const interval = window.setInterval(() => void refreshHealth(), 30000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [refreshHealth])

  const navigate = (next: PageId) => {
    window.location.hash = next
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleModeration = async (content: string) => {
    setBusy(true)
    setError(null)
    setResult(null)
    setPipelineStep(0)
    const progress = window.setInterval(() => {
      setPipelineStep((current) => Math.min(current + 1, 2))
    }, 650)
    try {
      const moderationResult = await moderateContent(content)
      setResult(moderationResult)
      setHistory(addSessionResult(content, moderationResult))
      setPipelineStep(3)
    } catch (caught) {
      const apiError = caught instanceof ApiError
        ? caught
        : new ApiError('An unexpected client error occurred.', 'server_error')
      setError({ code: apiError.code, message: apiError.message })
      if (apiError.result) {
        setResult(apiError.result)
        setHistory(addSessionResult(content, apiError.result))
        setPipelineStep(3)
      }
    } finally {
      window.clearInterval(progress)
      setBusy(false)
      void refreshHealth()
    }
  }

  let content
  switch (page) {
    case 'moderate':
      content = <ModeratePage maxChars={health?.maxChars ?? 8000} busy={busy} pipelineStep={pipelineStep} result={result} error={error} onSubmit={handleModeration} />
      break
    case 'history':
      content = <HistoryPage items={history} onClear={() => setHistory(clearSessionHistory())} />
      break
    case 'analytics':
      content = <AnalyticsPage items={history} />
      break
    case 'architecture':
      content = <ArchitecturePage />
      break
    case 'about':
      content = <AboutPage health={health} apiOffline={apiOffline} />
      break
    default:
      content = <DashboardPage history={history} health={health} apiOffline={apiOffline} onNavigate={navigate} />
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar page={page} health={health} apiOffline={apiOffline} onNavigate={navigate} />
      <main id="main-content">{content}</main>
      <footer className="border-t-4 border-ink bg-ink text-white">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-8 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-display text-4xl font-black">ILA.</p>
            <p className="mt-2 max-w-xl font-mono text-xs font-bold uppercase leading-relaxed text-white/70">AI-powered moderation infrastructure. Automated decisions require human oversight in high-risk production use.</p>
          </div>
          <button className="border-2 border-white bg-signal-yellow px-4 py-3 font-mono text-xs font-black uppercase text-ink hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-signal-yellow" onClick={() => navigate('about')}>About this project →</button>
        </div>
      </footer>
    </div>
  )
}
