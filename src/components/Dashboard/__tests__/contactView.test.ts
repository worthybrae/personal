import { describe, it, expect } from 'vitest';
import {
  contactLayout,
  computeContactZones,
  drawContactChrome,
  isContactFormValid,
  wrapContactMessage,
  sendLabel,
} from '../contactView';
import type { ContactGeom, ContactUIState } from '../contactView';

const geom: ContactGeom = { cols: 100, rows: 60, charW: 6, charH: 10, fontSize: 10, headingBottomRow: 10 };

function makeStubCtx() {
  return {
    fillRect: () => {},
    fillText: () => {},
    font: '',
    textBaseline: 'top',
    fillStyle: '#000',
  } as unknown as CanvasRenderingContext2D;
}

function makeState(overrides: Partial<ContactUIState> = {}): ContactUIState {
  return { name: '', email: '', message: '', activeField: 'name', status: 'idle', ...overrides };
}

describe('contactLayout', () => {
  it('lays out three field rows in order below the heading, then a send row', () => {
    const layout = contactLayout(geom);
    expect(layout.rows.map((r) => r.field)).toEqual(['name', 'email', 'message']);
    expect(layout.rows[0].labelRow).toBe(geom.headingBottomRow);
    // Rows strictly increase top-to-bottom, ending with sendRow last.
    for (let i = 1; i < layout.rows.length; i++) {
      expect(layout.rows[i].labelRow).toBeGreaterThan(layout.rows[i - 1].labelRow);
    }
    expect(layout.sendRow).toBeGreaterThan(layout.rows[layout.rows.length - 1].stripRow);
  });

  it('gives the message field 3 lines and name/email 1 line', () => {
    const layout = contactLayout(geom);
    const byField = Object.fromEntries(layout.rows.map((r) => [r.field, r]));
    expect(byField.name.lines).toBe(1);
    expect(byField.email.lines).toBe(1);
    expect(byField.message.lines).toBe(3);
  });

  it('caps strip width to fit a narrow (375px-class) column count', () => {
    const narrow: ContactGeom = { ...geom, cols: 40 };
    const layout = contactLayout(narrow);
    for (const row of layout.rows) {
      expect(row.width).toBeLessThanOrEqual(narrow.cols);
      expect(row.left).toBeGreaterThanOrEqual(0);
      expect(row.left + row.width).toBeLessThanOrEqual(narrow.cols + 1);
    }
  });
});

describe('computeContactZones', () => {
  it('returns one zone per field plus a send zone', () => {
    const layout = contactLayout(geom);
    const zones = computeContactZones(layout, geom.charW, geom.charH);
    expect(zones.map((z) => z.action)).toEqual(['field:name', 'field:email', 'field:message', 'send']);
    for (const z of zones) {
      expect(z.w).toBeGreaterThan(0);
      expect(z.h).toBeGreaterThan(0);
    }
  });
});

describe('isContactFormValid', () => {
  it('requires all three fields non-empty and an @ in email', () => {
    expect(isContactFormValid(makeState())).toBe(false);
    expect(isContactFormValid(makeState({ name: 'A', email: 'no-at-sign', message: 'hi' }))).toBe(false);
    expect(isContactFormValid(makeState({ name: 'A', email: 'a@b.com', message: '' }))).toBe(false);
    expect(isContactFormValid(makeState({ name: 'A', email: 'a@b.com', message: 'hi' }))).toBe(true);
  });
});

describe('wrapContactMessage', () => {
  it('wraps on word boundaries without exceeding the line width', () => {
    const lines = wrapContactMessage('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', 10);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(10);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toContain('QUICK');
  });

  it('hard-breaks a single word longer than one line', () => {
    const lines = wrapContactMessage('SUPERCALIFRAGILISTICEXPIALIDOCIOUS', 8);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(8);
    expect(lines.join('')).toBe('SUPERCALIFRAGILISTICEXPIALIDOCIOUS');
  });

  it('returns a single empty line for empty input', () => {
    expect(wrapContactMessage('', 10)).toEqual(['']);
  });
});

describe('sendLabel', () => {
  it('reflects each status', () => {
    expect(sendLabel('idle')).toBe('SEND MESSAGE');
    expect(sendLabel('sending')).toBe('SENDING…');
    expect(sendLabel('sent')).toBe('MESSAGE SENT — THANKS');
    expect(sendLabel('error')).toBe('FAILED — TRY AGAIN');
  });
});

describe('drawContactChrome', () => {
  it('does not throw for an empty idle form', () => {
    const layout = contactLayout(geom);
    expect(() => drawContactChrome(makeStubCtx(), geom, layout, makeState(), true, '#000', null)).not.toThrow();
  });

  it('does not throw with all fields filled, active field set, and hover on send', () => {
    const layout = contactLayout(geom);
    const state = makeState({ name: 'Ada', email: 'ada@example.com', message: 'Hello there, this is a longer message that should wrap across lines.', activeField: 'message', status: 'idle' });
    expect(() => drawContactChrome(makeStubCtx(), geom, layout, state, true, '#000', 'send')).not.toThrow();
  });

  it('does not throw across every status value', () => {
    const layout = contactLayout(geom);
    for (const status of ['idle', 'sending', 'sent', 'error'] as const) {
      const state = makeState({ name: 'Ada', email: 'ada@example.com', message: 'Hi', status });
      expect(() => drawContactChrome(makeStubCtx(), geom, layout, state, false, '#000', null)).not.toThrow();
    }
  });
});
