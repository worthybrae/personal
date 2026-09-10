import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InkStudio } from '../InkStudio'
import definitions from '../inkParams.json'
vi.mock('../useInkPreview', () => ({ useInkPreview: () => ({ video:{current:null},canvas:{current:null},region:{current:null},error:'',ready:false,playing:false,metrics:{fps:0,milliseconds:0},togglePlayback:vi.fn() }) }))
afterEach(()=>{cleanup();localStorage.clear()})
describe('full public studio',()=>{
  it('exposes every native parameter without loading the source before starting',()=>{
    const {container}=render(<InkStudio/>);
    expect(screen.getAllByRole('slider')).toHaveLength(definitions.length);
    expect(container.querySelector('video')).toBeNull();
    fireEvent.change(screen.getByRole('slider',{name:/Flow amplitude/}),{target:{value:'0.027'}});
    expect(screen.getByRole('slider',{name:/Flow amplitude/})).toHaveValue('0.027');
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect(screen.getByRole('slider',{name:/Flow amplitude/})).toHaveValue('0.012');
  });
  it('saves and restores arbitrary values and rejects malformed saved settings',()=>{
    render(<InkStudio/>);
    fireEvent.change(screen.getByRole('slider',{name:/Fine threshold/}),{target:{value:'31'}});
    fireEvent.click(screen.getByRole('button',{name:'Save'}));
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    fireEvent.click(screen.getByRole('button',{name:'Restore'}));
    expect(screen.getByRole('slider',{name:/Fine threshold/})).toHaveValue('31');
    localStorage.setItem('public-ink-settings','{"fine_threshold":999}');
    fireEvent.click(screen.getByRole('button',{name:'Restore'}));
    expect(screen.getByRole('status')).toHaveTextContent('No valid saved settings');
    expect(screen.getByRole('slider',{name:/Fine threshold/})).toHaveValue('31');
  });
})
