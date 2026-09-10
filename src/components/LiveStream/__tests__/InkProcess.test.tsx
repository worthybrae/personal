import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InkProcess } from '../InkProcess'
afterEach(cleanup)
describe('livestream pipeline explanation',()=>{
  it('explains decoding, full-resolution drawing, encoding and continuous playback',()=>{
    render(<InkProcess/>);
    fireEvent.click(screen.getByRole('button',{name:'2 Decode'}));
    expect(screen.getByText('6.006 seconds × 29.97 fps = 180 frames')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'3 Draw'}));
    expect(screen.getByText(/1920 × 1080 pixels · three bounded workers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'4 Encode'}));
    expect(screen.getByText('Drawn frames → H.264 → MPEG-TS segment')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'5 Play'}));
    expect(screen.getByText('Rolling output playlist → browser playback at 29.97 fps')).toBeInTheDocument();
  });
  it('lets the reader run or pause the walkthrough and stops it on manual selection',()=>{
    render(<InkProcess/>);
    fireEvent.click(screen.getByRole('button',{name:'Follow a segment'}));
    expect(screen.getByRole('button',{name:'Pause walkthrough'})).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole('button',{name:'2 Decode'}));
    expect(screen.getByRole('button',{name:'Follow a segment'})).toHaveAttribute('aria-pressed','false');
  });
})
