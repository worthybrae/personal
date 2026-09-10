import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InkStudio } from '../InkStudio'
import definitions from '../inkParams.json'
import { useInkPreview } from '../useInkPreview'
vi.mock('../useInkPreview', () => ({ useInkPreview: vi.fn(() => ({ video:{current:null},canvas:{current:null},region:{current:null},error:'',ready:false,playing:false,metrics:{fps:0,milliseconds:0},togglePlayback:vi.fn() })) }))
afterEach(()=>{cleanup();localStorage.clear()})
describe('full public studio',()=>{
  it('exposes every native parameter without loading the source before starting',()=>{
    const {container}=render(<InkStudio/>);
    expect(screen.getAllByRole('slider')).toHaveLength(definitions.length);
    expect(container.querySelector('video')).toBeNull();
    fireEvent.change(screen.getByRole('slider',{name:/Flow amplitude/}),{target:{value:'0.027'}});
    expect(screen.getByRole('slider',{name:/Flow amplitude/})).toHaveValue('0.027');
  });
  it('uses a fixed 540p preview without settings management buttons',()=>{
    render(<InkStudio/>);
    expect(useInkPreview).toHaveBeenLastCalledWith(false,960,expect.any(Object));
    expect(screen.getByText(/Recorded sample · 960 × 540/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    for (const name of ['Reset','Save','Restore','Download settings']) {
      expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
    }
  });
})
