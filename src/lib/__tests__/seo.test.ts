import { describe, it, expect } from 'vitest';
import { humanize, allRoutes, routeMeta, SITE } from '../seo';
import { PROJECTS } from '../projects';
import { ART_PIECES } from '../art';

describe('humanize', () => {
  it('downcases the all-caps canvas copy', () => {
    expect(humanize('STREAMING ANALYTICS DASHBOARD')).toBe('Streaming Analytics Dashboard');
  });

  it('keeps acronyms and brand casing', () => {
    expect(humanize('AI-POWERED HIRING TOOLS')).toBe('AI-Powered Hiring Tools');
    expect(humanize('STREAMCLOUT')).toBe('StreamClout');
    expect(humanize('STYLEGAN-GENERATED ARCHITECTURAL SPACES')).toBe(
      'StyleGAN-Generated Architectural Spaces'
    );
  });
});

describe('allRoutes', () => {
  it('covers every project and art piece', () => {
    const paths = allRoutes().map((r) => r.path);
    for (const p of PROJECTS) expect(paths).toContain(`/work/${p.slug}`);
    for (const a of ART_PIECES) expect(paths).toContain(`/art/${a.slug}`);
  });

  it('keeps titles inside the search-result cutoff', () => {
    for (const route of allRoutes()) {
      expect(route.title.length, route.path).toBeLessThanOrEqual(60);
    }
  });

  it('gives every route a description short enough to survive a snippet', () => {
    for (const route of allRoutes()) {
      expect(route.description.length, route.path).toBeGreaterThan(50);
      expect(route.description.length, route.path).toBeLessThanOrEqual(200);
    }
  });
});

describe('routeMeta', () => {
  it('ignores a trailing slash', () => {
    expect(routeMeta('/work/coderview/').path).toBe('/work/coderview');
    expect(routeMeta('/work/coderview/').title).toBe(routeMeta('/work/coderview').title);
  });

  it('falls back to the site defaults for unknown paths', () => {
    expect(routeMeta('/nope').title).toBe(SITE.title);
  });
});
