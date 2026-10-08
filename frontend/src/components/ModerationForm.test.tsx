import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModerationForm } from './ModerationForm'

describe('ModerationForm', () => {
  it('blocks empty and oversized submissions while reporting the configured limit', () => {
    const onSubmit = vi.fn(async () => undefined)
    render(<ModerationForm maxChars={10} busy={false} onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Content input')
    const submit = screen.getByRole('button', { name: 'Analyze content' })
    expect(submit).toBeDisabled()
    fireEvent.change(input, { target: { value: '12345678901' } })
    expect(screen.getByText(/Content too large/)).toBeInTheDocument()
    expect(submit).toBeDisabled()
    fireEvent.submit(input.closest('form')!)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid quick-fill sample', () => {
    const onSubmit = vi.fn(async () => undefined)
    render(<ModerationForm maxChars={8000} busy={false} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Safe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Analyze content' }))
    expect(onSubmit).toHaveBeenCalledWith('I enjoy learning computer science and helping my classmates.')
  })
})
