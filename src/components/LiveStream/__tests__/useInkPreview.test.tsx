import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInkPreview } from '../useInkPreview'
let worker: FakeWorker
let visibility: (entries: {isIntersecting:boolean}[])=>void
class FakeWorker {
  onmessage: ((event: {data:unknown})=>void) | null = null
  onerror = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {worker=this}
  emit(data: unknown) {this.onmessage?.({data})}
}
const initial={charcoal:32}
function Harness({params=initial}:{params?:Record<string,number>}) {
  const p=useInkPreview(true,64,params)
  return <div ref={p.region}><video ref={p.video}/><canvas ref={p.canvas}/><button disabled={!!p.error} onClick={p.togglePlayback}>Play</button><p>{p.playbackError}</p></div>
}
function frame() {return {type:'frame',buffer:new Uint8ClampedArray(64*36*4).buffer,time:0,version:1,milliseconds:3}}
async function emit(data:unknown) {await act(async()=>{worker.emit(data);await Promise.resolve()})}
beforeEach(()=>{
  vi.stubGlobal('Worker',FakeWorker)
  vi.stubGlobal('OffscreenCanvas',class {})
  vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({close:vi.fn()}))
  vi.stubGlobal('ImageData',class {constructor(public data:Uint8ClampedArray,public width:number,public height:number){}})
  vi.stubGlobal('IntersectionObserver',class {constructor(cb:typeof visibility){visibility=cb}observe(){}disconnect(){}})
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({putImageData:vi.fn()} as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLMediaElement.prototype,'readyState','get').mockReturnValue(2)
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})
  vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined)
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
describe('preview lifecycle',()=>{
  it('redraws offscreen parameter edits when the paused preview returns',async()=>{
    const view=render(<Harness/>);await emit({type:'ready'});await emit(frame());
    await act(async()=>visibility([{isIntersecting:false}]))
    const before=worker.postMessage.mock.calls.length
    view.rerender(<Harness params={{charcoal:50}}/>);
    expect(worker.postMessage).toHaveBeenCalledTimes(before)
    await act(async()=>{visibility([{isIntersecting:true}]);await Promise.resolve()})
    expect(worker.postMessage.mock.calls.slice(-1)[0]?.[0].params).toEqual({charcoal:50})
  })
  it('queues the paused source frame behind an in-flight render',async()=>{
    const view=render(<Harness/>);await emit({type:'ready'});
    const before=worker.postMessage.mock.calls.length
    fireEvent.pause(view.container.querySelector('video')!)
    expect(worker.postMessage).toHaveBeenCalledTimes(before)
    await emit(frame())
    expect(worker.postMessage).toHaveBeenCalledTimes(before+1)
  })
  it('allows retry after the browser rejects play',async()=>{
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(undefined)
    render(<Harness/>);
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Play'})))
    expect(screen.getByText(/Try pressing Play again/)).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Play'})).toBeEnabled()
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Play'})))
    expect(screen.queryByText(/Try pressing Play again/)).not.toBeInTheDocument()
  })
})
