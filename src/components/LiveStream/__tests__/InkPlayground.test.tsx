import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InkPlayground } from '../InkPlayground'

describe('recorded ink playground', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('loads no video before interaction and changes only the selected static sample', () => {
    const fetch = vi.spyOn(window, 'fetch')
    const { container } = render(<InkPlayground />)
    expect(container.querySelector('video')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Bold' }))
    expect(container.querySelector('video')).toHaveAttribute('src', '/media/ink-studies/bold-flowing.mp4')
    fireEvent.click(screen.getByRole('radio', { name: 'Still' }))
    expect(container.querySelector('video')).toHaveAttribute('src', '/media/ink-studies/bold-still.mp4')
    expect(screen.getByRole('radio', { name: 'Still' })).toBeChecked()
    expect(screen.getByRole('link', { name: /Download this study/ })).toHaveAttribute('href', '/media/ink-studies/bold-still.json')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves the moment when switching styles and does not restart after a manual pause', () => {
    const { container } = render(<InkPlayground />)
    fireEvent.click(screen.getByRole('button', { name: /Explore recorded sample/ }))
    let video = container.querySelector('video')!
    Object.defineProperty(video, 'currentTime', { value: 2.5, writable: true })
    fireEvent.click(screen.getByRole('radio', { name: 'Delicate' }))
    video = container.querySelector('video')!
    Object.defineProperty(video, 'duration', { value: 6.006 })
    fireEvent.loadedMetadata(video)
    expect(video.currentTime).toBe(2.5)
    fireEvent.canPlay(video)
    expect(video.play).toHaveBeenCalledTimes(1)
    fireEvent.pause(video)
    fireEvent.canPlay(video)
    expect(video.play).toHaveBeenCalledTimes(1)
  })

  it('pauses when the page is hidden and gives recovery instructions on failure', () => {
    const { container } = render(<InkPlayground />)
    fireEvent.click(screen.getByRole('button', { name: /Explore recorded sample/ }))
    const video = container.querySelector('video')!
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    fireEvent(document, new Event('visibilitychange'))
    expect(video.pause).toHaveBeenCalled()
    fireEvent.canPlay(video)
    expect(video.play).not.toHaveBeenCalled()
    fireEvent.error(video)
    expect(screen.getByRole('status')).toHaveTextContent('Try another style or reload the page')
  })
})
