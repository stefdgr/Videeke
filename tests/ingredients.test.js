import { describe, expect, it } from 'vitest';
import { baseName, buildShoppingList, formatQty, parseIngredient, scaleLine, sectionFor } from '../shared/ingredients.js';

describe('parseIngredient', () => {
  it('leest hoeveelheid, eenheid en naam', () => {
    expect(parseIngredient('200 g bloem')).toMatchObject({ qty: 200, unit: 'g', name: 'bloem' });
    expect(parseIngredient('200g bloem')).toMatchObject({ qty: 200, unit: 'g', name: 'bloem' });
    expect(parseIngredient('2 el olijfolie')).toMatchObject({ qty: 2, unit: 'el', name: 'olijfolie' });
    expect(parseIngredient('1,5 kg aardappelen')).toMatchObject({ qty: 1500, unit: 'g', name: 'aardappelen' });
    expect(parseIngredient('½ citroen')).toMatchObject({ qty: 0.5, unit: null, name: 'citroen' });
    expect(parseIngredient('1 1/2 cups flour')).toMatchObject({ qty: 1.5, unit: 'kop', name: 'flour' });
    expect(parseIngredient('2-3 teentjes knoflook')).toMatchObject({ qty: 2, qtyMax: 3, unit: 'teen', name: 'knoflook' });
    expect(parseIngredient('zout en peper')).toMatchObject({ qty: null, name: 'zout en peper' });
  });
  it('verwart geen woorden met eenheden', () => {
    expect(parseIngredient('3 eieren')).toMatchObject({ qty: 3, unit: null, name: 'eieren' });
    expect(parseIngredient('1 limoen')).toMatchObject({ qty: 1, unit: null, name: 'limoen' });
  });
});

describe('scaleLine', () => {
  it('schaalt hoeveelheden', () => {
    expect(scaleLine('200 g bloem', 1.5)).toBe('300 g bloem');
    expect(scaleLine('1 ui', 3)).toBe('3 ui');
    expect(scaleLine('1 el suiker', 0.5)).toBe('½ el suiker');
    expect(scaleLine('750 ml room', 2)).toBe('1,5 l room');
    expect(scaleLine('2-3 teentjes knoflook', 2)).toBe('4–6 teen knoflook');
    expect(scaleLine('snuf zout', 2)).toBe('snuf zout');
  });
  it('laat regels ongemoeid bij factor 1', () => {
    expect(scaleLine('200 gram bloem', 1)).toBe('200 gram bloem');
  });
});

describe('formatQty', () => {
  it('rondt netjes af', () => {
    expect(formatQty(333.33, 'g')).toBe('335 g');
    expect(formatQty(2.666, null)).toBe('2⅔');
    expect(formatQty(1250, 'g')).toBe('1,25 kg');
  });
});

describe('sectionFor', () => {
  it('kiest de juiste afdeling', () => {
    expect(sectionFor('rode uien')).toBe('Groente & fruit');
    expect(sectionFor('kipfilet')).toBe('Vlees & vis');
    expect(sectionFor('kokosmelk')).toBe('Pasta, rijst & wereldkeuken');
    expect(sectionFor('slagroom')).toBe('Kaas, zuivel & eieren');
    expect(sectionFor('olijfolie extra vierge')).toBe('Kruiden, olie & sauzen');
    expect(sectionFor('bloem')).toBe('Bakken & ontbijt');
    expect(sectionFor('droge witte wijn')).toBe('Dranken');
    expect(sectionFor('dijonmosterd')).toBe('Kruiden, olie & sauzen');
    expect(sectionFor('zeezout')).toBe('Kruiden, olie & sauzen');
    expect(sectionFor('pistachenoten')).toBe('Conserven & droogwaren');
    expect(sectionFor('perziken')).toBe('Groente & fruit');
    expect(sectionFor('champignons')).toBe('Groente & fruit');
    expect(sectionFor('iets heel raars')).toBe('Overig');
  });
});

describe('buildShoppingList', () => {
  it('telt dezelfde ingrediënten uit verschillende recepten op', () => {
    const groups = buildShoppingList([
      { lines: ['200 g boter', '2 uien, fijngehakt', 'Voor de saus:', 'zout'], factor: 1, recipe: 'A' },
      { lines: ['100 g boter', '1 ui', '1 ui'], factor: 2, recipe: 'B' },
    ]);
    const all = groups.flatMap((g) => g.items);
    const boter = all.find((i) => i.name === 'boter');
    expect(boter.qty).toBe(400);
    expect(boter.text).toBe('400 g boter');
    expect(boter.recipes).toEqual(['A', 'B']);
    expect(all.some((i) => i.name.includes('saus'))).toBe(false);
    expect(groups[0].section).toBe('Groente & fruit');
    const ui = all.filter((i) => i.name.startsWith('ui'));
    expect(ui).toHaveLength(1);
    expect(ui[0].qty).toBe(6);
  });
  it('maakt een basisnaam zonder bereidingswoorden', () => {
    expect(baseName('2 grote uien, fijngehakt')).toBe('2 uien');
    expect(baseName('verse peterselie (fijngehakt)')).toBe('peterselie');
  });
});
