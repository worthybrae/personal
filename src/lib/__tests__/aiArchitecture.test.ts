import { describe, expect, it } from 'vitest';
import {
  DIAMETER_STUDY,
  LINEAR_WALKS,
  SEED_LOOPS,
  formatWalkLength,
  walkCaption,
  walkPosterUrl,
} from '../aiArchitecture';

const ALL = [...DIAMETER_STUDY, ...LINEAR_WALKS, ...SEED_LOOPS];

describe('aiArchitecture', () => {
  it('uses each loop once', () => {
    const ids = ALL.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(42);
  });

  it('ships a poster for every loop', () => {
    const posters = Object.keys(import.meta.glob('../../../public/media/ai-architecture/*.jpg'))
      .map((path) => path.replace('../../../public', ''));
    for (const walk of ALL) expect(posters).toContain(walkPosterUrl(walk));
  });

  it('formats lengths as m:ss', () => {
    expect(formatWalkLength(8.3)).toBe('0:08');
    expect(formatWalkLength(62.5)).toBe('1:03');
    expect(formatWalkLength(125)).toBe('2:05');
  });

  it('captions circular and linear walks', () => {
    expect(walkCaption(SEED_LOOPS[0])).toBe('SEED 322 · Ø1200 · 1:03');
    expect(walkCaption(LINEAR_WALKS[0])).toBe('SEED 463 → 470 · 0:10');
    expect(walkCaption(LINEAR_WALKS[1])).toBe('MANY SEEDS · 1:04');
  });
});
