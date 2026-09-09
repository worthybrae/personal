import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getArtPiece } from '@/lib/art'
import { LivestreamArtHero } from '../LivestreamArtHero'

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
    expect(screen.getByTestId('mock-art-media')).toHaveAttribute('data-fill', 'true')
  })
})
