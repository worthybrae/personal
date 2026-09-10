import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LondonClock } from '../LondonClock'

afterEach(() => { cleanup(); vi.useRealTimers() })
describe('London clock', () => {
  it.each([
    ['2026-01-09T12:34:56Z', '12:34:56 PM'],
    ['2026-07-09T12:34:56Z', '1:34:56 PM'],
    ['2026-01-09T00:00:00Z', '12:00:00 AM'],
  ])('uses London local time for %s', (instant, expected) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(instant))
    render(<LondonClock active />)
    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.getByText('ABBEY ROAD · LONDON')).toBeInTheDocument()
  })
  it('ticks while visible, stops when inactive, and catches up on return', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-09T12:34:56Z'))
    const { rerender, unmount } = render(<LondonClock active />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('1:34:57 PM')).toBeInTheDocument()
    rerender(<LondonClock active={false} />)
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(3000))
    rerender(<LondonClock active />)
    expect(screen.getByText('1:35:00 PM')).toBeInTheDocument()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
