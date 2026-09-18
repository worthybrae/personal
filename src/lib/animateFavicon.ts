const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')

if (icon) {
  const frames = ['/favicon.svg', '/favicon-violet.svg', '/favicon-pink.svg', '/favicon-cyan.svg']
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let timer: number | undefined

  const update = () => {
    if (document.hidden || reducedMotion.matches) {
      window.clearInterval(timer)
      timer = undefined
      frame = 0
      icon.href = frames[0]
      return
    }

    if (timer !== undefined) return
    timer = window.setInterval(() => {
      frame = (frame + 1) % frames.length
      icon.href = frames[frame]
    }, 1800)
  }

  document.addEventListener('visibilitychange', update)
  reducedMotion.addEventListener('change', update)
  update()
}
