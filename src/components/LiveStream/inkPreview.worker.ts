/// <reference lib="webworker" />
type InkExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory
  ink_init(w: number, h: number): number
  ink_pixels(): number
  ink_definitions(): number
  ink_definitions_len(): number
  ink_set_param(index: number, value: number): number
  ink_clear_history(): void
  ink_render(time: number, delta: number): number
}
let ink: InkExports
let surface: OffscreenCanvas
let context: OffscreenCanvasRenderingContext2D
let definitions: { id: string }[] = []
let previousTime: number | null = null
let previousParams = ''

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const response = await fetch('/media/ink-studio/ink.wasm')
      if (!response.ok) throw new Error('The drawing engine could not load.')
      const result = await WebAssembly.instantiate(await response.arrayBuffer(), {})
      ink = result.instance.exports as InkExports
      if (!ink.ink_init(data.width, data.height)) throw new Error('Unsupported preview dimensions.')
      definitions = JSON.parse(new TextDecoder().decode(new Uint8Array(ink.memory.buffer, ink.ink_definitions(), ink.ink_definitions_len())))
      surface = new OffscreenCanvas(data.width, data.height)
      const ctx = surface.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('This browser cannot create the preview surface.')
      context = ctx
      self.postMessage({ type: 'ready' })
      return
    }
    if (data.type !== 'frame') return
    const start = performance.now()
    const bitmap = data.bitmap as ImageBitmap
    try { context.drawImage(bitmap, 0, 0, surface.width, surface.height) }
    finally { bitmap.close() }
    const signature = JSON.stringify(data.params)
    const discontinuity = previousTime === null || data.time < previousTime || data.time - previousTime > 0.5
    if (discontinuity || signature !== previousParams) ink.ink_clear_history()
    const delta = discontinuity ? 1 / 29.97002997 : Math.max(0, data.time - previousTime!)
    previousTime = data.time
    previousParams = signature
    definitions.forEach((def, index) => {
      if (!ink.ink_set_param(index, data.params[def.id])) throw new Error(`Invalid setting: ${def.id}`)
    })
    const rgba = context.getImageData(0, 0, surface.width, surface.height)
    new Uint8Array(ink.memory.buffer, ink.ink_pixels(), rgba.data.length).set(rgba.data)
    if (!ink.ink_render(data.time, delta)) throw new Error('The drawing engine could not render this frame.')
    const output = new Uint8ClampedArray(ink.memory.buffer, ink.ink_pixels(), rgba.data.length).slice()
    self.postMessage({ type: 'frame', buffer: output.buffer, time: data.time, version: data.version, milliseconds: performance.now() - start }, { transfer: [output.buffer] })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Preview failed.' })
  }
}
