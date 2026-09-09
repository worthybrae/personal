import type { ReactNode } from 'react'
import type { ArtPiece } from '@/lib/art'
import { ArtMedia } from './ArtMedia'

export function LivestreamArtHero({ piece }: { piece: ArtPiece }) {
  return (
    <section
      data-testid="livestream-art-hero"
      aria-label="Abbey Road live artwork"
      className="relative left-1/2 h-[100dvh] w-screen -translate-x-1/2 overflow-hidden bg-black"
    >
      <ArtMedia piece={piece} fill />
    </section>
  )
}

export function LivestreamArtScrollRegion({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  if (!active) return <>{children}</>

  return (
    <div
      data-testid="livestream-art-scroll-region"
      className="min-h-[calc(100dvh-100px)]"
    >
      {children}
    </div>
  )
}
