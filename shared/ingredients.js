// Ingrediënten ontleden, schalen en samenvoegen tot een boodschappenlijst.
// Werkt met Nederlandse en Engelse recepten, omdat veel recepten van internet Engels zijn.

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

// Eenheid -> [genormaliseerde eenheid, factor naar basiseenheid (g / ml / stuk-eenheid zelf)]
const UNITS = {
  g: ['g', 1], gr: ['g', 1], gram: ['g', 1], grams: ['g', 1], gramm: ['g', 1],
  kg: ['g', 1000], kilo: ['g', 1000], kilogram: ['g', 1000],
  mg: ['g', 0.001],
  ml: ['ml', 1], milliliter: ['ml', 1],
  cl: ['ml', 10], centiliter: ['ml', 10],
  dl: ['ml', 100], deciliter: ['ml', 100],
  l: ['ml', 1000], liter: ['ml', 1000], litre: ['ml', 1000], liters: ['ml', 1000],
  el: ['el', 1], eetlepel: ['el', 1], eetlepels: ['el', 1], tbsp: ['el', 1], tablespoon: ['el', 1], tablespoons: ['el', 1], tbs: ['el', 1],
  tl: ['tl', 1], theelepel: ['tl', 1], theelepels: ['tl', 1], tsp: ['tl', 1], teaspoon: ['tl', 1], teaspoons: ['tl', 1],
  kop: ['kop', 1], kopje: ['kop', 1], kopjes: ['kop', 1], cup: ['kop', 1], cups: ['kop', 1],
  oz: ['g', 28.35], ounce: ['g', 28.35], ounces: ['g', 28.35],
  lb: ['g', 453.6], lbs: ['g', 453.6], pound: ['g', 453.6], pounds: ['g', 453.6],
  teen: ['teen', 1], teentje: ['teen', 1], teentjes: ['teen', 1], tenen: ['teen', 1], clove: ['teen', 1], cloves: ['teen', 1],
  snuf: ['snuf', 1], snufje: ['snuf', 1], pinch: ['snuf', 1],
  bos: ['bos', 1], bosje: ['bos', 1], bunch: ['bos', 1],
  blik: ['blik', 1], blikje: ['blik', 1], can: ['blik', 1], cans: ['blik', 1], tin: ['blik', 1],
  pak: ['pak', 1], pakje: ['pak', 1], pack: ['pak', 1], zak: ['zak', 1], zakje: ['zak', 1],
  plak: ['plak', 1], plakjes: ['plak', 1], plakken: ['plak', 1], slice: ['plak', 1], slices: ['plak', 1],
  takje: ['takje', 1], takjes: ['takje', 1], sprig: ['takje', 1], sprigs: ['takje', 1],
  stuk: ['stuk', 1], stuks: ['stuk', 1], piece: ['stuk', 1], pieces: ['stuk', 1],
  scheut: ['scheut', 1], splash: ['scheut', 1],
  handvol: ['handvol', 1], handful: ['handvol', 1],
};

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const FRACTION = String.raw`\d+\s*\/\s*\d+`;
const UNI = `[${Object.keys(UNICODE_FRACTIONS).join('')}]`;
const QTY = `(?:${NUM}\\s*${UNI}|${NUM}\\s+${FRACTION}|${FRACTION}|${NUM}|${UNI})`;
const QTY_RE = new RegExp(`^\\s*(${QTY})(?:\\s*(?:-|–|tot|to)\\s*(${QTY}))?\\s*`, 'i');

function toNumber(str) {
  if (!str) return null;
  let s = str.trim();
  let total = 0;
  const uni = s.match(new RegExp(UNI));
  if (uni) {
    total += UNICODE_FRACTIONS[uni[0]];
    s = s.replace(uni[0], '').trim();
  }
  if (!s) return total;
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return total + Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return total + Number(frac[1]) / Number(frac[2]);
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? total + n : null;
}

/** Ontleed één ingrediëntregel, bv. "200 g bloem" -> { qty: 200, unit: 'g', name: 'bloem' } */
export function parseIngredient(line) {
  const raw = String(line || '').replace(/\s+/g, ' ').trim();
  let rest = raw.replace(/^[-•*·]\s*/, '');
  let qty = null;
  let qtyMax = null;
  const m = rest.match(QTY_RE);
  if (m) {
    qty = toNumber(m[1]);
    qtyMax = m[2] ? toNumber(m[2]) : null;
    rest = rest.slice(m[0].length);
  }
  let unit = null;
  let factor = 1;
  // "200g" is al afgehandeld doordat QTY_RE geen spatie vereist; nu de eenheid
  const um = rest.match(/^([a-zA-Zéë]+)\.?(?=\s|$|\))/);
  if (um && qty !== null) {
    const key = um[1].toLowerCase();
    if (UNITS[key]) {
      [unit, factor] = UNITS[key];
      rest = rest.slice(um[0].length);
    }
  }
  rest = rest.replace(/^\s*van\s+/i, '').trim();
  if (qty !== null && factor !== 1) {
    qty *= factor;
    if (qtyMax !== null) qtyMax *= factor;
  }
  return { raw, qty, qtyMax, unit, name: rest || raw };
}

function round(n) {
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 100) / 100;
}

const NICE_FRACTIONS = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];

export function formatQty(n, unit) {
  if (n === null || n === undefined) return '';
  if (unit === 'g' && n >= 1000) return `${round(n / 1000).toString().replace('.', ',')} kg`;
  if (unit === 'ml' && n >= 1000) return `${round(n / 1000).toString().replace('.', ',')} l`;
  let text;
  if (!unit || !['g', 'ml'].includes(unit)) {
    const whole = Math.floor(n);
    const frac = n - whole;
    const nice = NICE_FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.04);
    if (frac < 0.04) text = String(whole);
    else if (frac > 0.96) text = String(whole + 1);
    else if (nice) text = whole ? `${whole}${nice[1]}` : nice[1];
    else text = String(round(n)).replace('.', ',');
  } else {
    text = String(round(n)).replace('.', ',');
  }
  return unit ? `${text} ${unit}` : text;
}

/** Schaal een ingrediëntregel met een factor en geef de tekst terug. */
export function scaleLine(line, factor) {
  const p = parseIngredient(line);
  if (p.qty === null || factor === 1) return p.raw;
  const qtyText = p.qtyMax !== null
    ? `${formatQty(p.qty * factor, null)}–${formatQty(p.qtyMax * factor, p.unit)}`
    : formatQty(p.qty * factor, p.unit);
  return `${qtyText} ${p.name}`.trim();
}

// Afdelingen in de supermarkt, in de volgorde waarin je er meestal langs loopt.
export const SECTIONS = [
  'Groente & fruit',
  'Vlees & vis',
  'Kaas, zuivel & eieren',
  'Brood & bakkerij',
  'Pasta, rijst & wereldkeuken',
  'Kruiden, olie & sauzen',
  'Bakken & ontbijt',
  'Conserven & droogwaren',
  'Diepvries',
  'Dranken',
  'Overig',
];

const SECTION_WORDS = [
  ['Kruiden, olie & sauzen', ['zout', 'peper', 'olie', 'olijfolie', 'azijn', 'balsamico', 'sojasaus', 'ketjap', 'mosterd', 'mayonaise', 'ketchup', 'komijn', 'kurkuma', 'paprikapoeder', 'kaneel', 'nootmuskaat', 'kerrie', 'currypoeder', 'oregano', 'tijm gedroogd', 'laurier', 'chilivlokken', 'sambal', 'harissa', 'vissaus', 'bouillon', 'fond', 'kruidnagel', 'kardemom', 'saffraan', 'vanille', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce', 'mustard', 'cumin', 'cinnamon', 'paprika powder', 'smoked paprika', 'stock', 'broth', 'tahini', 'miso', 'worcester', 'honing', 'honey', 'siroop', 'syrup', 'ras el hanout', 'za\'atar', 'sumak', 'sumac', 'garam masala', 'steranijs', 'venkelzaad']],
  ['Groente & fruit', ['ui', 'uien', 'sjalot', 'knoflook', 'tomaat', 'tomaten', 'paprika', 'courgette', 'aubergine', 'wortel', 'wortelen', 'peen', 'aardappel', 'aardappelen', 'krieltjes', 'spinazie', 'sla', 'rucola', 'komkommer', 'citroen', 'limoen', 'sinaasappel', 'appel', 'peer', 'banaan', 'aardbei', 'framboos', 'frambozen', 'bosbes', 'blauwe bes', 'champignon', 'champignons', 'paddenstoel', 'prei', 'selderij', 'bleekselderij', 'knolselderij', 'venkel', 'broccoli', 'bloemkool', 'spruitjes', 'boontjes', 'sperziebonen', 'erwten', 'doperwten', 'mais', 'avocado', 'gember', 'chili', 'rode peper', 'lente-ui', 'bosui', 'peterselie', 'koriander', 'basilicum', 'munt', 'dille', 'bieslook', 'rozemarijn', 'tijm', 'salie', 'dragon', 'pompoen', 'biet', 'rode biet', 'radijs', 'witlof', 'andijvie', 'boerenkool', 'kool', 'spitskool', 'rode kool', 'asperge', 'asperges', 'artisjok', 'mango', 'ananas', 'granaatappel', 'perzik', 'nectarine', 'abrikoos', 'pruim', 'vijg', 'vijgen', 'druiven', 'meloen', 'rabarber', 'kers', 'kersen', 'pastinaak', 'zoete aardappel', 'shiitake', 'cress', 'tuinkers', 'waterkers', 'onion', 'shallot', 'garlic', 'tomato', 'potato', 'carrot', 'lemon', 'lime', 'orange', 'apple', 'pear', 'spinach', 'lettuce', 'cucumber', 'mushroom', 'leek', 'celery', 'fennel', 'parsley', 'cilantro', 'coriander', 'basil', 'mint', 'dill', 'chives', 'rosemary', 'thyme', 'sage', 'ginger', 'squash', 'pumpkin', 'beetroot', 'zucchini', 'eggplant', 'cabbage', 'kale', 'asparagus', 'berries', 'strawberr', 'raspberr', 'blueberr', 'pomegranate', 'scallion', 'spring onion']],
  ['Vlees & vis', ['kip', 'kipfilet', 'kippendij', 'rund', 'rundvlees', 'biefstuk', 'gehakt', 'varken', 'varkenshaas', 'spek', 'spekjes', 'pancetta', 'ham', 'chorizo', 'worst', 'lam', 'lamsrack', 'lamsbout', 'eend', 'eendenborst', 'kalf', 'ossenhaas', 'entrecote', 'ribeye', 'rib-eye', 'zalm', 'tonijn', 'kabeljauw', 'garnalen', 'gamba', 'gamba\'s', 'mosselen', 'coquilles', 'sint-jakobsschelp', 'vis', 'zeebaars', 'dorade', 'tarbot', 'inktvis', 'octopus', 'ansjovis', 'prosciutto', 'serranoham', 'parmaham', 'chicken', 'beef', 'pork', 'bacon', 'lamb', 'duck', 'veal', 'steak', 'mince', 'sausage', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'mussel', 'scallop', 'fish', 'anchov', 'konijn', 'hert', 'fazant', 'parelhoen']],
  ['Kaas, zuivel & eieren', ['melk', 'room', 'slagroom', 'kookroom', 'crème fraîche', 'creme fraiche', 'zure room', 'yoghurt', 'kwark', 'boter', 'roomboter', 'kaas', 'parmezaan', 'parmigiano', 'pecorino', 'mozzarella', 'burrata', 'feta', 'geitenkaas', 'ricotta', 'mascarpone', 'gruyère', 'gruyere', 'comté', 'cheddar', 'roquefort', 'gorgonzola', 'brie', 'camembert', 'ei', 'eieren', 'eidooier', 'eidooiers', 'eiwit', 'milk', 'cream', 'butter', 'cheese', 'parmesan', 'yogurt', 'yoghurt', 'egg', 'eggs', 'buttermilk', 'karnemelk', 'labneh', 'halloumi']],
  ['Brood & bakkerij', ['brood', 'stokbrood', 'baguette', 'ciabatta', 'focaccia', 'pita', 'wrap', 'wraps', 'tortilla', 'brioche', 'croissant', 'naan', 'zuurdesem', 'bread', 'bun', 'broodjes', 'toast']],
  ['Pasta, rijst & wereldkeuken', ['pasta', 'spaghetti', 'penne', 'tagliatelle', 'linguine', 'lasagne', 'orzo', 'gnocchi', 'rijst', 'risottorijst', 'arborio', 'basmati', 'couscous', 'bulgur', 'quinoa', 'noedels', 'mie', 'rijstnoedels', 'kokosmelk', 'currypasta', 'rice', 'noodles', 'coconut milk', 'polenta', 'freekeh', 'parelgort']],
  ['Bakken & ontbijt', ['bloem', 'meel', 'zelfrijzend', 'suiker', 'basterdsuiker', 'poedersuiker', 'rietsuiker', 'bakpoeder', 'baking soda', 'zuiveringszout', 'gist', 'chocolade', 'cacao', 'maïzena', 'maizena', 'gelatine', 'amandelmeel', 'havermout', 'flour', 'sugar', 'baking powder', 'yeast', 'chocolate', 'cocoa', 'cornstarch', 'oats', 'vanillesuiker', 'puddingpoeder', 'bladerdeeg', 'lange vingers', 'amaretti', 'speculoos', 'filodeeg', 'kruimeldeeg']],
  ['Conserven & droogwaren', ['tomatenpuree', 'passata', 'tomatenblokjes', 'gepelde tomaten', 'kikkererwten', 'linzen', 'bonen', 'kidneybonen', 'witte bonen', 'kappertjes', 'olijven', 'zongedroogde', 'noten', 'amandelen', 'walnoten', 'hazelnoten', 'pijnboompitten', 'pistache', 'cashew', 'pinda', 'pecan', 'rozijnen', 'dadels', 'abrikozen gedroogd', 'sesamzaad', 'zonnebloempitten', 'pompoenpitten', 'chickpea', 'lentil', 'beans', 'capers', 'olives', 'almond', 'walnut', 'hazelnut', 'pine nut', 'pistachio', 'raisin', 'dates', 'sesame', 'tomato paste', 'canned tomatoes', 'augurk', 'augurken', 'jam']],
  ['Diepvries', ['diepvries', 'bevroren', 'ijs', 'roomijs', 'frozen', 'ice cream']],
  ['Dranken', ['wijn', 'witte wijn', 'rode wijn', 'port', 'cognac', 'rum', 'whisky', 'bier', 'prosecco', 'champagne', 'cava', 'sherry', 'marsala', 'vermout', 'madeira', 'wine', 'beer', 'brandy', 'calvados', 'grand marnier', 'cointreau', 'amaretto', 'koffie', 'espresso', 'thee', 'coffee', 'tea', 'sap', 'juice', 'spa', 'water bruisend', 'tonic']],
];

const PREP_WORDS = /\b(fijngehakt|fijngesneden|gehakt|gesneden|in blokjes|in plakjes|in ringen|geraspt|geperst|gepeld|ontpit|ontdooid|gesmolten|op kamertemperatuur|zacht|naar smaak|naar keuze|optioneel|vers|verse|grof|fijn|kleine|klein|grote|groot|middelgrote|middelgroot|biologische|finely|chopped|diced|sliced|minced|grated|peeled|melted|softened|fresh|large|small|medium|to taste|optional|room temperature)\b/gi;

/** Basisnaam van een ingrediënt om dubbele items samen te voegen ("2 uien, fijngehakt" -> "uien"). */
export function baseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[,;]/)[0]
    .replace(PREP_WORDS, ' ')
    .replace(/[^a-z0-9à-ÿ'\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordMatch(text, word) {
  // Woordgrens aan het begin; aan het einde mag een meervoudsvorm volgen.
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Langere trefwoorden mogen ook achteraan een samenstelling staan (dijonmosterd, zeezout, pistachenoten).
  const start = word.length >= 4 ? '' : '(^|[^a-zà-ÿ])';
  return new RegExp(`${start}${esc}(en|s|'s|es|jes)?($|[^a-zà-ÿ])`, 'i').test(text);
}

export function sectionFor(name) {
  const text = baseName(name);
  // Langste trefwoord wint, zodat "kokosmelk" niet als "melk" telt en "rode peper" geen kruid wordt.
  let best = null;
  for (const [section, words] of SECTION_WORDS) {
    for (const w of words) {
      if (wordMatch(text, w) && (!best || w.length > best.len)) best = { section, len: w.length };
    }
  }
  return best ? best.section : 'Overig';
}

/**
 * Maak een boodschappenlijst.
 * @param {Array<{lines: string[], factor: number, recipe: string}>} sources
 * @returns {Array<{section: string, items: Array<{key, name, qty, unit, text, recipes: string[]}>}>}
 */
export function buildShoppingList(sources) {
  const map = new Map();
  for (const { lines, factor = 1, recipe } of sources) {
    for (const line of lines || []) {
      if (!line || !line.trim() || /^#|:$/.test(line.trim())) continue; // kopjes als "Voor de saus:" overslaan
      const p = parseIngredient(line);
      const name = baseName(p.name) || p.name.toLowerCase();
      const stem = name.length > 3 ? name.replace(/(eren|en|s)$/, '') : name; // "uien" en "ui" samen
      const key = `${stem}|${p.unit || ''}|${p.qty === null ? 'x' : 'n'}`;
      const item = map.get(key) || { key, name, displayName: p.name.split(',')[0].trim(), qty: null, unit: p.unit, recipes: [] };
      if (p.qty !== null) item.qty = (item.qty || 0) + p.qty * factor;
      if (recipe && !item.recipes.includes(recipe)) item.recipes.push(recipe);
      map.set(key, item);
    }
  }
  const grouped = new Map(SECTIONS.map((s) => [s, []]));
  for (const item of map.values()) {
    item.text = item.qty !== null ? `${formatQty(item.qty, item.unit)} ${item.displayName}` : item.displayName;
    grouped.get(sectionFor(item.name)).push(item);
  }
  return SECTIONS.map((section) => ({
    section,
    items: grouped.get(section).sort((a, b) => a.name.localeCompare(b.name, 'nl')),
  })).filter((g) => g.items.length);
}
