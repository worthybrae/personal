import Hls from 'hls.js'

export interface StreamPosition { id: string; offset: number }

export interface StreamHandle {
  position?(): StreamPosition | null
  timeFor?(position: StreamPosition): number | null
  destroy(): void
}

export function attachHls(
  video: HTMLVideoElement,
  playlistUrl: string,
  onFatal: () => void,
): StreamHandle {
  if (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = playlistUrl
    video.addEventListener('error', onFatal)

    return {
      destroy() {
        video.removeEventListener('error', onFatal)
        video.removeAttribute('src')
        video.load()
      },
    }
  }

  const hls = new Hls({ lowLatencyMode: false, liveSyncDuration: 18 })
  hls.loadSource(playlistUrl)
  hls.attachMedia(video)
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      onFatal()
    }
  })

  return {
    position() {
      const fragment = (hls.levels[hls.currentLevel]?.details ?? hls.levels.find(level => level.details)?.details)?.fragments.find(f => video.currentTime >= f.start && video.currentTime < f.start + f.duration)
      return fragment ? { id: fragment.url.split('/').pop()!, offset: video.currentTime - fragment.start } : null
    },
    timeFor(position) {
      const fragment = (hls.levels[hls.currentLevel]?.details ?? hls.levels.find(level => level.details)?.details)?.fragments.find(f => f.url.split('/').pop() === position.id)
      return fragment ? fragment.start + position.offset : null
    },
    destroy() {
      hls.destroy()
    },
  }
}
