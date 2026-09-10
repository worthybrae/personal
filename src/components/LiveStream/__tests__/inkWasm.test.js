// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import definitions from '../inkParams.json'
describe('shipped Rust WebAssembly artifact',()=>{
  it('matches the public parameter definitions and applies arbitrary settings',()=>{
    const module=new WebAssembly.Module(readFileSync('public/media/ink-studio/ink.wasm'));
    expect(WebAssembly.Module.imports(module)).toEqual([]);
    const e=new WebAssembly.Instance(module).exports;
    expect(e.ink_init(4096,2160)).toBe(0);
    expect(e.ink_init(64,32)).toBe(1);
    const actual=JSON.parse(new TextDecoder().decode(new Uint8Array(e.memory.buffer,e.ink_definitions(),e.ink_definitions_len())));
    expect(actual).toEqual(definitions);
    expect(e.ink_set_param(999,1)).toBe(0);
    expect(e.ink_set_param(0,NaN)).toBe(0);
    const charcoal=definitions.findIndex(p=>p.id==='charcoal');
    e.ink_set_param(charcoal,47);
    new Uint8Array(e.memory.buffer,e.ink_pixels(),64*32*4).fill(0);
    expect(e.ink_render(0,1/30)).toBe(1);
    const pixels=new Uint8Array(e.memory.buffer,e.ink_pixels(),64*32*4);
    expect(Array.from(pixels.slice(0,4))).toEqual([47,47,47,255]);
  })
})
