import { describe, expect, it } from 'vitest';
import { colorFamily, cosine, overlap, scoreMatch, tokens, type MatchInput } from '../server/matching';
import type { Descriptor } from '../server/types';

const bottle: Descriptor = {
  category: 'bottles', primaryColor: 'blue', secondaryColors: ['silver'], brand: 'Decathlon',
  distinctiveFeatures: ['dent on side', 'steel cap'], material: 'metal', size: 'medium', condition: 'used',
  itemDescription: 'A blue insulated steel bottle with a dent on one side', source: 'vision',
};
const q = (d: Partial<Descriptor>, extra: Partial<MatchInput> = {}): MatchInput => ({ descriptor: { ...bottle, ...d }, ...extra });

describe('text helpers', () => {
  it('maps colour shades to families', () => {
    expect(colorFamily('navy blue')).toBe('blue');
    expect(colorFamily('Space Grey')).toBe('grey');
    expect(colorFamily('sparkly')).toBeNull();
    expect(colorFamily('')).toBeNull();
  });
  it('normalises plurals and synonyms', () => {
    expect([...tokens('Stickers on the lid')]).toEqual(['sticker', 'lid']);
    expect(tokens('wireless earphones').has('earbud')).toBe(true);
  });
  it('overlap uses the smaller set', () => {
    expect(overlap(new Set(['dent']), new Set(['dent', 'cap', 'scratch']))).toBe(1);
    expect(overlap(new Set(), new Set(['a']))).toBe(0);
  });
  it('cosine handles bad input', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [1])).toBeNull();
    expect(cosine(undefined, [1])).toBeNull();
  });
});

describe('scoreMatch: positives', () => {
  it('identical items score very high with high confidence', () => {
    const r = scoreMatch(q({}), q({}));
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.confidence).toBe('high');
  });
  it('survives wording differences (the original === bug)', () => {
    const r = scoreMatch(q({}), q({ primaryColor: 'navy', brand: 'decathlon', distinctiveFeatures: ['side has a dent'], itemDescription: 'Navy steel water bottle, dented' }));
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.warnings).toEqual([]);
  });
  it('unknown brand is NOT a penalty', () => {
    const withBrand = scoreMatch(q({}), q({})).score;
    const unknown = scoreMatch(q({}), q({ brand: null })).score;
    expect(withBrand - unknown).toBeLessThan(8);
  });
  it('embeddings add evidence', () => {
    const v = [0.1, 0.9, 0.3];
    const weakText = { distinctiveFeatures: ['cap'], itemDescription: 'container' };
    const without = scoreMatch(q({}), q(weakText)).score;
    const withEmb = scoreMatch(q({}, { embedding: v }), q(weakText, { embedding: v })).score;
    expect(withEmb).toBeGreaterThan(without);
  });
});

describe('scoreMatch: negatives and contradictions', () => {
  it('different category is heavily penalised', () => {
    const r = scoreMatch(q({}), q({ category: 'bags', material: 'fabric' }));
    expect(r.score).toBeLessThan(40);
    expect(r.warnings).toContain('Different type of item');
  });
  it('brand clash is penalised and explained', () => {
    const r = scoreMatch(q({}), q({ brand: 'Milton' }));
    expect(r.score).toBeLessThan(60);
    expect(r.warnings.some((w) => w.startsWith('Brand differs'))).toBe(true);
  });
  it('colour clash is penalised, near colours are not', () => {
    expect(scoreMatch(q({}), q({ primaryColor: 'red' })).warnings.some((w) => w.startsWith('Colour differs'))).toBe(true);
    expect(scoreMatch(q({ primaryColor: 'black' }), q({ primaryColor: 'charcoal grey' })).warnings).toEqual([]);
  });
  it('found before it was lost is nearly impossible', () => {
    const ok = scoreMatch(q({}, { type: 'lost', date: '2026-11-10' }), q({}, { type: 'found', date: '2026-11-12' }));
    const bad = scoreMatch(q({}, { type: 'lost', date: '2026-11-20' }), q({}, { type: 'found', date: '2026-11-01' }));
    expect(ok.score).toBeGreaterThan(bad.score * 2);
    expect(bad.warnings).toContain('Found before it was reported lost');
  });
  it('a generic same-category item scores well below a specific match', () => {
    const generic = scoreMatch(q({}), q({ brand: null, distinctiveFeatures: ['plastic lid'], itemDescription: 'blue bottle', material: 'plastic' }));
    const specific = scoreMatch(q({}), q({}));
    expect(specific.score - generic.score).toBeGreaterThan(20);
  });
  it('text-only reports are low confidence and capped', () => {
    const r = scoreMatch(q({ source: 'text' }), q({}));
    expect(r.confidence).toBe('low');
    expect(r.score).toBeLessThanOrEqual(75);
    expect(r.signals.size).toBeNull();
  });
});

describe('scoreMatch: robustness', () => {
  it('handles missing descriptors', () => {
    expect(scoreMatch({ descriptor: null }, q({})).score).toBe(0);
  });
  it('handles empty fields without NaN', () => {
    const r = scoreMatch(q({ primaryColor: '', distinctiveFeatures: [], itemDescription: '', material: '' }), q({ secondaryColors: [] }));
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('is symmetric', () => {
    const a = q({ primaryColor: 'navy' });
    const b = q({ brand: null, distinctiveFeatures: ['dent'] });
    expect(scoreMatch(a, b).score).toBe(scoreMatch(b, a).score);
  });
});
