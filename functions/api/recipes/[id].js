import { json, readJson, route } from '../../../server/db.js';
import { deleteImages } from '../../../server/images.js';
import { cleanRecipe, recipes, withCachedImage } from '../../../server/recipes.js';

export const onRequest = route({
  async GET({ env, params }) {
    return json(await recipes.get(env, params.id));
  },
  async PUT({ request, env, params }) {
    const before = await recipes.get(env, params.id);
    const data = cleanRecipe(await readJson(request), true);
    if ('image_url' in data && data.image_url !== before.image_url && !('image_id' in data)) data.image_id = null;
    const updated = await recipes.update(env, params.id, await withCachedImage(env, { ...before, ...data }));
    // Foto's die niet meer gebruikt worden opruimen
    const keep = [updated.image_id, updated.own_image_id, updated.page_image_id];
    const unused = [before.image_id, before.own_image_id, before.page_image_id].filter((id) => id && !keep.includes(id));
    await deleteImages(env, unused);
    return json(updated);
  },
  async DELETE({ env, params }) {
    const before = await recipes.get(env, params.id);
    await recipes.remove(env, params.id);
    await deleteImages(env, [...new Set([before.image_id, before.own_image_id, before.page_image_id])]);
    return json({ ok: true });
  },
});
