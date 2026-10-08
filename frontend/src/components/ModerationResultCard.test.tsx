import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ModerationResult } from '../types/moderation'
import { ModerationResultCard } from './ModerationResultCard'

describe('ModerationResultCard', () => {
  it('shows a severe rejection and unavoidable escalation copy', () => {
    const result: ModerationResult = {
      decision: 'rejected',
      confidence: 0.96,
      categories: ['rape_threat'],
      severity: 'severe',
      reason: 'A severe policy violation was detected.',
      escalate: true,
    }
    render(<ModerationResultCard result={result} />)
    expect(screen.getByRole('heading', { name: 'Rejected' })).toBeInTheDocument()
    expect(screen.getByText('Critical review required')).toBeInTheDocument()
    expect(screen.getByText('Rape Threat')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '96')
  })

  it('identifies the backend fail-safe as review rather than approval', () => {
    const result: ModerationResult = {
      decision: 'review',
      confidence: 0,
      categories: [],
      severity: 'medium',
      reason: 'Automated moderation unavailable; human review required.',
      escalate: true,
    }
    render(<ModerationResultCard result={result} />)
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByText(/AI service unavailable/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Approved' })).not.toBeInTheDocument()
  })
})
