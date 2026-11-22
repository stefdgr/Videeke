import { collection, HttpError } from './db.js';
import { cacheRemoteImage } from './images.js';

export const recipes = collection('recipes');

const COURSES = ['hapje', 'voorgerecht', 'hoofdgerecht', 'bijgerecht', 'dessert', ''];
const OCCASIONS = ['etentje', 'doordeweeks', 'beide', ''];
const MAKE_AHEAD = ['nee', 'deels', 'volledig', ''];
const STATUS = ['wil_ik', 'gemaakt'];

const str = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const list = (v, max = 200) => (Array.isArray(v) ? v.map((x) => str(x, 2000)).filter(Boolean).slice(0, max) : []);
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const oneOf = (v, options, fallback) => (options.includes(v) ? v : fallback);

/** Controleer en normaliseer een recept dat van de app komt. */
export function cleanRecipe(input, partial = false) {
  const r = {};
  const has = (k) => !partial || k in input;
  if (has('title')) r.title = str(input.title, 200);
  if (!partial && !r.title) throw new HttpError(400, 'Geef het recept een titel.');
  if (has('source_url')) r.source_url = str(input.source_url, 2000);
  if (has('source_type')) r.source_type = oneOf(input.source_type, ['link', 'instagram', 'tiktok', 'youtube', 'foto', 'zelf'], 'zelf');
  if (has('source_name')) r.source_name = str(input.source_name, 200);
  if (has('description')) r.description = str(input.description, 2000);
  if (has('image_url')) r.image_url = str(input.image_url, 2000);
  if (has('image_id')) r.image_id = str(input.image_id, 40) || null;
  if (has('page_image_id')) r.page_image_id = str(input.page_image_id, 40) || null;
  if (has('own_image_id')) r.own_image_id = str(input.own_image_id, 40) || null;
  if (has('ingredients')) r.ingredients = list(input.ingredients);
  if (has('steps')) r.steps = list(input.steps);
  if (has('tags')) r.tags = list(input.tags, 20).map((t) => t.toLowerCase());
  if (has('servings')) r.servings = int(input.servings);
  if (has('total_minutes')) r.total_minutes = int(input.total_minutes);
  if (has('course')) r.course = oneOf(input.course, COURSES, '');
  if (has('occasion')) r.occasion = oneOf(input.occasion, OCCASIONS, '');
  if (has('make_ahead')) r.make_ahead = oneOf(input.make_ahead, MAKE_AHEAD, '');
  if (has('status')) r.status = oneOf(input.status, STATUS, 'wil_ik');
  if (has('notes')) r.notes = str(input.notes, 5000);
  if (has('made_at')) r.made_at = str(input.made_at, 40) || null;
  if (has('favorite')) r.favorite = Boolean(input.favorite);
  return r;
}

/** Externe foto lokaal bewaren als dat nog niet gebeurd is. */
export async function withCachedImage(env, recipe) {
  if (recipe.image_url && !recipe.image_id && /^https?:\/\//.test(recipe.image_url)) {
    recipe.image_id = await cacheRemoteImage(env, recipe.image_url);
  }
  return recipe;
}
