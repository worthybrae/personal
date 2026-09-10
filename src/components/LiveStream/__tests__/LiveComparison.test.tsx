import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LiveComparison } from '../LiveComparison'
import { attachHls } from '../hlsAdapter'
vi.mock('../hlsAdapter',()=>({attachHls:vi.fn()}))
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.clearAllMocks()})
it('loads raw video only on demand, aligns matching segments, and tears it down when closed',()=>{
  const destroy=vi.fn()
  const timeFor=vi.fn(()=>12)
  vi.mocked(attachHls).mockReturnValue({destroy,timeFor})
  const edited=document.createElement('video')
  Object.defineProperty(edited,'readyState',{value:4})
  const position={id:'session-123.ts',offset:2}
  render(<LiveComparison baseUrl="https://example.com" editedVideo={{current:edited}} editedHandle={{current:{destroy:vi.fn(),position:()=>position}}}/> )
  expect(attachHls).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Compare camera'}))
  const raw=screen.getByLabelText('Raw Abbey Road livestream') as HTMLVideoElement
  Object.defineProperty(raw,'readyState',{value:4})
  Object.defineProperty(raw,'seekable',{value:{length:1,start:()=>0,end:()=>20}})
  act(()=>vi.advanceTimersByTime(100))
  expect(timeFor).toHaveBeenCalledWith(position)
  expect(raw.currentTime).toBe(12)
  act(()=>vi.advanceTimersByTime(100))
  expect(raw.style.opacity).toBe('1')
  fireEvent.change(screen.getByRole('slider'),{target:{value:75}})
  expect(raw.style.clipPath).toBe('inset(0 25% 0 0)')
  timeFor.mockReturnValue(15)
  act(()=>vi.advanceTimersByTime(100))
  expect(raw.style.opacity).toBe('0')
  fireEvent.click(screen.getByRole('button',{name:'Close comparison'}))
  expect(destroy).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})
it('keeps the drawing available if the browser cannot align segment positions',()=>{
  render(<LiveComparison baseUrl="https://example.com" editedVideo={{current:null}} editedHandle={{current:{destroy:vi.fn()}}}/> )
  fireEvent.click(screen.getByRole('button',{name:'Compare camera'}))
  expect(screen.getByRole('status')).toHaveTextContent('Media Source support')
  expect(attachHls).not.toHaveBeenCalled()
})
