// Haal een recept uit de HTML van een webpagina.
// 1. schema.org Recipe in JSON-LD (gebruikt door bijna alle receptensites)
// 2. anders: Open Graph-tags (titel, beschrijving, foto) zodat de link toch bewaard wordt.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decodeEntities(str) {
  return String(str || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+|#39);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function clean(str) {
  return decodeEntities(String(str || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** ISO 8601-duur (PT1H30M) naar minuten. */
export function parseDuration(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const m = String(value).match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || !(m[1] || m[2] || m[3])) return null;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function findRecipe(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  const type = node['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return node;
  if (node['@graph']) return findRecipe(node['@graph']);
  if (node.mainEntity) return findRecipe(node.mainEntity);
  return null;
}

function imageUrl(img) {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return imageUrl(img[img.length > 1 ? img.length - 1 : 0]) || imageUrl(img[0]);
  return img.url || img.contentUrl || null;
}

function flattenSteps(instr) {
  if (!instr) return [];
  if (typeof instr === 'string') {
    return instr.replace(/<\/(p|li)>|<br\s*\/?>/gi, '\n').split('\n').map(clean).filter(Boolean);
  }
  if (Array.isArray(instr)) return instr.flatMap(flattenSteps);
  if (instr['@type'] === 'HowToSection') {
    const name = clean(instr.name);
    const steps = flattenSteps(instr.itemListElement);
    return name ? [`${name}:`, ...steps] : steps;
  }
  if (instr.itemListElement) return flattenSteps(instr.itemListElement);
  return [clean(instr.text || instr.name)].filter(Boolean);
}

function servingsOf(yieldValue) {
  const v = Array.isArray(yieldValue) ? yieldValue[0] : yieldValue;
  const m = String(v ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

function keywords(recipe) {
  const k = recipe.keywords;
  const list = Array.isArray(k) ? k : String(k || '').split(',');
  const cats = [recipe.recipeCategory, recipe.recipeCuisine].flat().filter(Boolean);
  return [...new Set([...list, ...cats].map(clean).filter(Boolean).map((s) => s.toLowerCase()))].slice(0, 12);
}

export function guessCourse(text) {
  const t = String(text || '').toLowerCase();
  if (/dessert|nagerecht|toetje|taart|cake|pudding|tiramisu|panna cotta|ijs\b|mousse|crumble/.test(t)) return 'dessert';
  if (/voorgerecht|starter|appetizer|entrée|carpaccio|tartaar|soep|soup/.test(t)) return 'voorgerecht';
  if (/hapje|borrel|snack|amuse|tapas|dip\b|canap/.test(t)) return 'hapje';
  if (/bijgerecht|side dish|\bside\b|salade|salad/.test(t)) return 'bijgerecht';
  if (/hoofdgerecht|main|dinner|diner|stoof|stew|ovenschotel|curry|pasta|risotto/.test(t)) return 'hoofdgerecht';
  return '';
}

function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i);
  return c ? decodeEntities(c[1]).trim() : null;
}

function absolute(url, base) {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

/** @returns {{title, description, image_url, ingredients, steps, servings, total_minutes, tags, course, found: boolean}} */
export function extractRecipe(html, pageUrl) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of blocks) {
    let data;
    try {
      data = JSON.parse(json.trim().replace(/^<!--|-->$/g, ''));
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const total = parseDuration(r.totalTime) ?? ((parseDuration(r.prepTime) || 0) + (parseDuration(r.cookTime) || 0) || null);
    const tags = keywords(r);
    const title = clean(r.name);
    return {
      found: true,
      title,
      description: clean(r.description).slice(0, 500),
      image_url: absolute(imageUrl(r.image), pageUrl),
      ingredients: (r.recipeIngredient || r.ingredients || []).map(clean).filter(Boolean),
      steps: flattenSteps(r.recipeInstructions),
      servings: servingsOf(r.recipeYield),
      total_minutes: total,
      tags,
      course: guessCourse([r.recipeCategory, title, tags.join(' ')].flat().join(' ')),
    };
  }
  const title = meta(html, 'og:title') || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const description = meta(html, 'og:description') || meta(html, 'description') || '';
  return {
    found: false,
    title: title || '',
    description: description.slice(0, 2000),
    image_url: absolute(meta(html, 'og:image'), pageUrl),
    ingredients: [],
    steps: [],
    servings: null,
    total_minutes: null,
    tags: [],
    course: guessCourse(`${title} ${description}`),
  };
}

/** Bron van een link herkennen. */
export function sourceType(url) {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  if (/instagram\.com$/.test(host)) return 'instagram';
  if (/tiktok\.com$/.test(host)) return 'tiktok';
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
  return 'link';
}

/** Eerste URL uit een gedeelde tekst halen (Instagram/TikTok delen vaak "tekst + link"). */
export function findUrl(text) {
  return String(text || '').match(/https?:\/\/[^\s<>"']+/i)?.[0] || null;
}

/**
 * Een tekst (bv. een Instagram-caption of OCR van een kookboek) opsplitsen in ingrediënten en bereiding.
 * Heuristiek: regels die met een hoeveelheid beginnen zijn ingrediënten; kopjes sturen de indeling.
 */
export function splitRecipeText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const ingredients = [];
  const steps = [];
  let mode = null;
  let title = '';
  const qtyStart = /^([-•*·]\s*)?(\d|[½¼¾⅓⅔]|een\s|één\s|a\s|an\s|snuf|scheut|handvol)/i;
  for (const line of lines) {
    const l = line.toLowerCase().replace(/[:\s]+$/, '');
    if (/^(ingrediënten|ingredienten|ingredients|wat heb je nodig|benodigdheden|nodig)\b/.test(l)) { mode = 'ing'; continue; }
    if (/^(bereiding|bereidingswijze|werkwijze|instructies|method|instructions|directions|zo maak je het|aan de slag)\b/.test(l)) { mode = 'steps'; continue; }
    if (/^\d+[.)]\s+\S/.test(line)) { steps.push(line.replace(/^\d+[.)]\s*/, '')); continue; }
    if (!title && !mode && !qtyStart.test(line) && line.length < 80) { title = line.replace(/[#@]\S+/g, '').trim(); continue; }
    if (mode === 'ing' || (mode === null && qtyStart.test(line) && line.length < 90)) {
      ingredients.push(line.replace(/^[-•*·]\s*/, ''));
    } else if (line.replace(/[#@]\S+/g, '').trim()) {
      steps.push(line.replace(/^\d+[.)]\s*/, ''));
    }
  }
  return { title, ingredients, steps };
}
