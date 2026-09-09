import type { ArtPiece } from '@/lib/art'
import { ArtMedia } from './ArtMedia'

export function LivestreamArtHero({ piece }: { piece: ArtPiece }) {
  return (
    <section
      data-testid="livestream-art-hero"
      aria-label="Abbey Road live artwork"
      className="relative left-1/2 -mt-5 h-[calc(100dvh-100px)] min-h-[360px] w-screen -translate-x-1/2 overflow-hidden bg-black"
    >
      <ArtMedia piece={piece} fill />
    </section>
  )
}
