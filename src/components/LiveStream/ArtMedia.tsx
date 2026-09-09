import type { ArtPiece } from '@/lib/art'
import { LiveStreamPlayer } from './LiveStreamPlayer'

export function ArtMedia({ piece, fill = false }: { piece: ArtPiece; fill?: boolean }): JSX.Element | null {
  if (piece.slug === 'livestream-art') {
    return (
      <LiveStreamPlayer
        fallbackUrl={piece.videoUrl!}
        baseUrl={import.meta.env.VITE_LIVE_STREAM_URL}
        fill={fill}
      />
    )
  }

  if (piece.videoUrl) {
    return piece.videoUrl.includes('youtube.com') ? (
      <iframe
        className="w-full rounded-lg shadow-lg shadow-black/30"
        style={{ aspectRatio: '16/9', border: 'none' }}
        src={piece.videoUrl}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : (
      <video
        className="w-full rounded-lg shadow-lg shadow-black/30"
        src={piece.videoUrl}
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }

  if (piece.imageUrl) {
    return <img className="w-full rounded-lg shadow-lg shadow-black/30" src={piece.imageUrl} alt="" />
  }

  return null
}
