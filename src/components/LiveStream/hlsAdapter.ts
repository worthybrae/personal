import Hls from 'hls.js'

export interface StreamHandle {
  destroy(): void
}

export function attachHls(
  video: HTMLVideoElement,
  playlistUrl: string,
  onFatal: () => void,
): StreamHandle {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
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

  const hls = new Hls({ lowLatencyMode: false, liveSyncDurationCount: 3 })
  hls.loadSource(playlistUrl)
  hls.attachMedia(video)
  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      onFatal()
    }
  })

  return {
    destroy() {
      hls.destroy()
    },
  }
}
