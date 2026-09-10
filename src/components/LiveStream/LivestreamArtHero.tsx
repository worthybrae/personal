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
      <button type="button" className="absolute bottom-8 left-6 z-10 border border-white/40 bg-black/70 px-4 py-3 font-mono text-xs text-white hover:bg-black focus-visible:outline focus-visible:outline-white"
        onClick={() => document.getElementById('ink-playground')?.scrollIntoView({ behavior: 'instant', block: 'start' })}>
        Explore the styles ↓
      </button>
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
