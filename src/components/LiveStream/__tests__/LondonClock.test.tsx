import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LondonClock } from '../LondonClock'

afterEach(() => { cleanup(); vi.useRealTimers() })
describe('London clock', () => {
  it.each([
    ['2026-01-09T12:34:56Z', '12:34:56 GMT'],
    ['2026-07-09T12:34:56Z', '13:34:56 BST'],
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
    expect(screen.getByText('13:34:57 BST')).toBeInTheDocument()
    rerender(<LondonClock active={false} />)
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(3000))
    rerender(<LondonClock active />)
    expect(screen.getByText('13:35:00 BST')).toBeInTheDocument()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
