import { describe, expect, it } from 'vitest';
import { extractRecipe, findUrl, parseDuration, sourceType, splitRecipeText } from '../shared/extract.js';

const page = (ld) => `<html><head><title>x</title><script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`;

describe('extractRecipe', () => {
  it('leest een schema.org Recipe uit @graph', () => {
    const html = page({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'pagina' },
        {
          '@type': ['Recipe'],
          name: 'Tiramisu &amp; zo',
          image: [{ url: '/img/klein.jpg' }, { url: '/img/groot.jpg' }],
          recipeIngredient: ['250 g mascarpone', '3 eieren'],
          recipeInstructions: [
            { '@type': 'HowToSection', name: 'Crème', itemListElement: [{ '@type': 'HowToStep', text: 'Klop de eieren.' }] },
            { '@type': 'HowToStep', text: '<p>Laat opstijven.</p>' },
          ],
          recipeYield: ['6 personen'],
          totalTime: 'PT4H30M',
          recipeCategory: 'Dessert',
          keywords: 'italiaans, koffie',
        },
      ],
    });
    const r = extractRecipe(html, 'https://example.com/tiramisu');
    expect(r.found).toBe(true);
    expect(r.title).toBe('Tiramisu & zo');
    expect(r.image_url).toBe('https://example.com/img/groot.jpg');
    expect(r.ingredients).toEqual(['250 g mascarpone', '3 eieren']);
    expect(r.steps).toEqual(['Crème:', 'Klop de eieren.', 'Laat opstijven.']);
    expect(r.servings).toBe(6);
    expect(r.total_minutes).toBe(270);
    expect(r.course).toBe('dessert');
    expect(r.tags).toContain('italiaans');
  });

  it('valt terug op Open Graph', () => {
    const html = '<meta property="og:title" content="Lekker"><meta property="og:image" content="https://x.com/a.jpg"><meta property="og:description" content="Mmm">';
    const r = extractRecipe(html, 'https://x.com/');
    expect(r).toMatchObject({ found: false, title: 'Lekker', image_url: 'https://x.com/a.jpg', description: 'Mmm' });
  });

  it('telt prep- en kooktijd op als er geen totaal is', () => {
    const r = extractRecipe(page({ '@type': 'Recipe', name: 'x', prepTime: 'PT15M', cookTime: 'PT1H' }), 'https://a.b');
    expect(r.total_minutes).toBe(75);
  });
});

describe('hulpjes', () => {
  it('parseDuration', () => {
    expect(parseDuration('PT45M')).toBe(45);
    expect(parseDuration('P0DT1H')).toBe(60);
    expect(parseDuration('')).toBe(null);
  });
  it('herkent bronnen en links', () => {
    expect(sourceType('https://www.instagram.com/p/abc/')).toBe('instagram');
    expect(sourceType('https://vm.tiktok.com/xyz')).toBe('tiktok');
    expect(sourceType('https://dagelijksekost.vrt.be/gerechten/x')).toBe('link');
    expect(findUrl('Kijk dit eens! https://vm.tiktok.com/ZM123/ #food')).toBe('https://vm.tiktok.com/ZM123/');
  });
});

describe('splitRecipeText', () => {
  it('splitst een caption in titel, ingrediënten en stappen', () => {
    const text = `Burrata met perzik 🍑
Ingrediënten:
- 1 burrata
- 2 perziken
snuf zeezout
Bereiding:
1. Grill de perziken.
2. Leg de burrata erbij.
#zomer #recept`;
    const r = splitRecipeText(text);
    expect(r.title).toBe('Burrata met perzik 🍑');
    expect(r.ingredients).toEqual(['1 burrata', '2 perziken', 'snuf zeezout']);
    expect(r.steps).toEqual(['Grill de perziken.', 'Leg de burrata erbij.']);
  });
  it('raadt zonder kopjes op basis van hoeveelheden', () => {
    const r = splitRecipeText('Soep\n500 g pompoen\n1 ui\nFruit de ui aan en voeg de pompoen toe.');
    expect(r.ingredients).toEqual(['500 g pompoen', '1 ui']);
    expect(r.steps).toEqual(['Fruit de ui aan en voeg de pompoen toe.']);
  });
});
