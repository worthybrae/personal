import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LiveComparison } from '../LiveComparison'
import { attachHls } from '../hlsAdapter'
vi.mock('../hlsAdapter',()=>({attachHls:vi.fn()}))
beforeEach(()=>{vi.useFakeTimers();vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.clearAllMocks()})
it('shows the divider immediately, aligns matching segments, and tears down on unmount',()=>{
  const destroy=vi.fn()
  const timeFor=vi.fn(()=>12)
  vi.mocked(attachHls).mockReturnValue({destroy,timeFor})
  const edited=document.createElement('video')
  Object.defineProperty(edited,'readyState',{value:4})
  const position={id:'session-123.ts',offset:2}
  const {unmount}=render(<LiveComparison baseUrl="https://example.com" editedVideo={{current:edited}} editedHandle={{current:{destroy:vi.fn(),position:()=>position}}}/> )
  expect(screen.getByRole('slider')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  const raw=screen.getByLabelText('Raw Abbey Road livestream') as HTMLVideoElement
  Object.defineProperty(raw,'readyState',{value:4})
  Object.defineProperty(raw,'seekable',{value:{length:1,start:()=>0,end:()=>20}})
  act(()=>vi.advanceTimersByTime(100))
  expect(timeFor).toHaveBeenCalledWith(position)
  expect(raw.currentTime).toBe(12)
  act(()=>vi.advanceTimersByTime(100))
  expect(raw.style.opacity).toBe('1')
  fireEvent.keyDown(screen.getByRole('slider'),{key:'End'})
  expect(raw.style.clipPath).toBe('inset(0 0% 0 0)')
  timeFor.mockReturnValue(15)
  act(()=>vi.advanceTimersByTime(100))
  expect(raw.style.opacity).toBe('0')
  unmount()
  expect(destroy).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})
it('keeps the drawing available if the browser cannot align segment positions',()=>{
  render(<LiveComparison baseUrl="https://example.com" editedVideo={{current:null}} editedHandle={{current:{destroy:vi.fn()}}}/> )
  expect(screen.getByRole('slider')).toHaveAccessibleDescription(/Media Source support/)
  expect(attachHls).not.toHaveBeenCalled()
})
