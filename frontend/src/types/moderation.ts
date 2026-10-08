export const moderationCategories = [
  'misinformation',
  'spam_scam',
  'hate_speech',
  'harassment',
  'violence',
  'sexual_content',
  'rape_threat',
  'child_sexual_abuse',
  'self_harm',
  'animal_abuse',
] as const

export type ModerationCategory = (typeof moderationCategories)[number]
export type Decision = 'approved' | 'rejected' | 'review'
export type Severity = 'low' | 'medium' | 'high' | 'severe'
export type OllamaStatus = 'unknown' | 'online' | 'offline' | 'error' | 'misconfigured'

export interface ModerationResult {
  decision: Decision
  confidence: number
  categories: ModerationCategory[]
  severity: Severity
  reason: string
  escalate: boolean
}

export interface HealthStatus {
  status: 'ok'
  api: boolean
  ollamaConfigured: boolean
  ollamaStatus: OllamaStatus
  lastOllamaCheck: string | null
  eventPipeline: 'configured' | 'not_configured'
  maxChars: number
}

export interface HistoryItem {
  id: string
  timestamp: string
  contentPreview: string
  result: ModerationResult
}
