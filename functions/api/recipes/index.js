import { json, readJson, route } from '../../../server/db.js';
import { cleanRecipe, recipes, withCachedImage } from '../../../server/recipes.js';

export const onRequest = route({
  async GET({ env }) {
    return json(await recipes.list(env));
  },
  async POST({ request, env }) {
    const data = cleanRecipe(await readJson(request));
    return json(await recipes.create(env, await withCachedImage(env, data)), 201);
  },
});
