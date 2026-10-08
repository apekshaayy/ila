import { isModerationResult } from './api'
import type { HistoryItem, ModerationResult } from '../types/moderation'

const STORAGE_KEY = 'ila.current-session-history'

export function loadSessionHistory(): HistoryItem[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is HistoryItem => {
      if (typeof item !== 'object' || item === null) return false
      const record = item as Record<string, unknown>
      return (
        typeof record.id === 'string' &&
        typeof record.timestamp === 'string' &&
        typeof record.contentPreview === 'string' &&
        isModerationResult(record.result)
      )
    })
  } catch {
    return []
  }
}

export function addSessionResult(content: string, result: ModerationResult): HistoryItem[] {
  const current = loadSessionHistory()
  const collapsed = content.trim().replace(/\s+/g, ' ')
  const item: HistoryItem = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    contentPreview: collapsed.length > 120 ? `${collapsed.slice(0, 117)}…` : collapsed,
    result,
  }
  const next = [item, ...current].slice(0, 100)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearSessionHistory(): HistoryItem[] {
  sessionStorage.removeItem(STORAGE_KEY)
  return []
}
