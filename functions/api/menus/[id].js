import { json, readJson, route } from '../../../server/db.js';
import { cleanMenu, menus } from '../../../server/menus.js';

export const onRequest = route({
  async GET({ env, params }) {
    return json(await menus.get(env, params.id));
  },
  async PUT({ request, env, params }) {
    return json(await menus.update(env, params.id, cleanMenu(await readJson(request), true)));
  },
  async DELETE({ env, params }) {
    await menus.remove(env, params.id);
    return json({ ok: true });
  },
});
