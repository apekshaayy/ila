import {
  moderationCategories,
  type HealthStatus,
  type ModerationResult,
} from '../types/moderation'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const timeoutValue = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000)
const API_TIMEOUT_MS = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 30000

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly result?: ModerationResult

  constructor(message: string, code: string, status = 0, result?: ModerationResult) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.result = result
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function isModerationResult(value: unknown): value is ModerationResult {
  if (!isRecord(value)) return false
  const decisions = ['approved', 'rejected', 'review']
  const severities = ['low', 'medium', 'high', 'severe']
  return (
    decisions.includes(String(value.decision)) &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    Array.isArray(value.categories) &&
    value.categories.every((item) => moderationCategories.some((category) => category === item)) &&
    severities.includes(String(value.severity)) &&
    typeof value.reason === 'string' &&
    typeof value.escalate === 'boolean'
  )
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ApiError('The backend returned an invalid response.', 'invalid_response', response.status)
    }
    if (!response.ok) {
      const error = isRecord(payload) ? payload : {}
      const embeddedResult = isModerationResult(error.result) ? error.result : undefined
      throw new ApiError(
        typeof error.message === 'string' ? error.message : 'The moderation request failed.',
        typeof error.error === 'string' ? error.error : 'server_error',
        response.status,
        embeddedResult,
      )
    }
    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The moderation request timed out.', 'request_timeout')
    }
    throw new ApiError('The backend API is unreachable.', 'backend_offline')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function moderateContent(content: string): Promise<ModerationResult> {
  const payload = await request('/api/moderate', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
  if (!isModerationResult(payload)) {
    throw new ApiError('The backend returned an invalid moderation result.', 'invalid_response')
  }
  return payload
}

export async function getHealth(): Promise<HealthStatus> {
  const payload = await request('/api/health')
  if (
    !isRecord(payload) ||
    payload.status !== 'ok' ||
    typeof payload.api !== 'boolean' ||
    typeof payload.ollamaConfigured !== 'boolean' ||
    !['unknown', 'online', 'offline', 'error', 'misconfigured'].includes(String(payload.ollamaStatus)) ||
    typeof payload.maxChars !== 'number'
  ) {
    throw new ApiError('The health endpoint returned an invalid response.', 'invalid_response')
  }
  return payload as unknown as HealthStatus
}
