import { collection, HttpError } from './db.js';

export const menus = collection('menus');

export function cleanMenu(input, partial = false) {
  const m = {};
  const has = (k) => !partial || k in input;
  if (has('name')) m.name = String(input.name || '').trim().slice(0, 200);
  if (!partial && !m.name) throw new HttpError(400, 'Geef het menu een naam.');
  if (has('date')) m.date = String(input.date || '').slice(0, 10);
  if (has('guests')) m.guests = Math.min(Math.max(parseInt(input.guests, 10) || 6, 1), 100);
  if (has('items')) {
    m.items = (Array.isArray(input.items) ? input.items : []).slice(0, 30).map((it) => ({
      recipe_id: String(it.recipe_id || '').slice(0, 40),
      servings: it.servings ? Math.min(Math.max(parseInt(it.servings, 10) || 0, 1), 200) : null,
    })).filter((it) => it.recipe_id);
  }
  if (has('checked')) m.checked = (Array.isArray(input.checked) ? input.checked : []).map(String).slice(0, 500);
  if (has('extra')) m.extra = (Array.isArray(input.extra) ? input.extra : []).map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 100);
  if (has('notes')) m.notes = String(input.notes || '').slice(0, 5000);
  return m;
}
