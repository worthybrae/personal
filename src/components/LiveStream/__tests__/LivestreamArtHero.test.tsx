import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getArtPiece } from '@/lib/art'
import { LivestreamArtHero, LivestreamArtScrollRegion } from '../LivestreamArtHero'

vi.mock('../ArtMedia', () => ({
  ArtMedia: ({ fill }: { fill?: boolean }) => (
    <div data-testid="mock-art-media" data-fill={String(fill)} />
  ),
}))

describe('LivestreamArtHero', () => {
  it('breaks out to viewport width and gives the player the opening viewport', () => {
    render(<LivestreamArtHero piece={getArtPiece('livestream-art')!} />)

    expect(screen.getByTestId('livestream-art-hero')).toHaveClass(
      'w-screen',
      'h-[calc(100dvh-100px)]',
    )
    expect(screen.getByTestId('livestream-art-hero')).not.toHaveClass('min-h-[360px]')
    expect(screen.getByTestId('mock-art-media')).toHaveAttribute('data-fill', 'true')
  })

  it('reserves an additional viewport only for livestream details', () => {
    const { rerender } = render(
      <LivestreamArtScrollRegion active>
        <p>Artwork details</p>
      </LivestreamArtScrollRegion>,
    )

    expect(screen.getByTestId('livestream-art-scroll-region')).toHaveClass(
      'min-h-[calc(100dvh-100px)]',
    )

    rerender(
      <LivestreamArtScrollRegion active={false}>
        <p>Artwork details</p>
      </LivestreamArtScrollRegion>,
    )

    expect(screen.queryByTestId('livestream-art-scroll-region')).not.toBeInTheDocument()
    expect(screen.getByText('Artwork details')).toBeInTheDocument()
  })
})
