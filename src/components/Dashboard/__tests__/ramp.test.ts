import { describe, it, expect } from 'vitest';
import { RAMP } from '../ramp';

describe('RAMP', () => {
  it('contains only letters of "worthy rae" (either case)', () => {
    const allowed = new Set('worthyraeWORTHYRAE');
    for (const ch of RAMP) expect(allowed.has(ch), `char ${ch}`).toBe(true);
  });

  it('has enough levels for smooth terrain shading', () => {
    expect(RAMP.length).toBeGreaterThanOrEqual(16);
  });

  it('starts lowercase (light) and ends with W (dense)', () => {
    expect(RAMP[0]).toBe(RAMP[0].toLowerCase());
    expect(RAMP[RAMP.length - 1]).toBe('W');
  });
});
