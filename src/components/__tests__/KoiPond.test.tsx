import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getArtPiece } from '@/lib/art'
import { ArtMedia } from '../LiveStream/ArtMedia'

describe('KoiPond', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('draws the pond as an image for the koi-pond piece, without the chat veil', async () => {
    let svg = ''
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    vi.stubGlobal('Blob', class {
      constructor(parts: string[]) {
        svg = parts.join('')
      }
    })
    URL.createObjectURL = vi.fn(() => 'blob:koi')
    URL.revokeObjectURL = vi.fn()

    render(<ArtMedia piece={getArtPiece('koi-pond')!} />)

    const img = await screen.findByRole('img', { name: /koi/i })
    expect(img).toHaveAttribute('src', 'blob:koi')
    await waitFor(() => expect(svg).toContain('<svg'))
    expect(svg).not.toContain('url(#veil)')
  })
})
