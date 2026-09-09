import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getArtPiece } from '@/lib/art'
import { ArtMedia } from '../ArtMedia'

vi.mock('../LiveStreamPlayer', () => ({
  LiveStreamPlayer: ({
    fallbackUrl,
    baseUrl,
    fill,
  }: {
    fallbackUrl: string
    baseUrl?: string
    fill?: boolean
  }) => (
    <div
      data-testid="mock-live-player"
      data-fallback={fallbackUrl}
      data-base-url={baseUrl}
      data-fill={fill}
    />
  ),
}))

describe('ArtMedia', () => {
  it('uses the live player for livestream-art', () => {
    render(<ArtMedia piece={getArtPiece('livestream-art')!} />)

    expect(screen.getByTestId('mock-live-player')).toHaveAttribute(
      'data-fallback',
      'https://portfolio-worthy.s3.us-east-1.amazonaws.com/abbey_road_best.mp4',
    )
  })

  it('forwards the fill layout to livestream-art', () => {
    render(<ArtMedia piece={getArtPiece('livestream-art')!} fill />)

    expect(screen.getByTestId('mock-live-player')).toHaveAttribute('data-fill', 'true')
  })

  it('keeps an ordinary looping video for other video artwork', () => {
    const { container } = render(<ArtMedia piece={getArtPiece('ai-architecture')!} />)

    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'https://portfolio-worthy.s3.us-east-1.amazonaws.com/flesh_digression.mp4',
    )
    expect(screen.queryByTestId('mock-live-player')).not.toBeInTheDocument()
  })
})
