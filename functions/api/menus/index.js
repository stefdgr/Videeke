import { json, readJson, route } from '../../../server/db.js';
import { cleanMenu, menus } from '../../../server/menus.js';

export const onRequest = route({
  async GET({ env }) {
    return json(await menus.list(env));
  },
  async POST({ request, env }) {
    return json(await menus.create(env, { items: [], checked: [], extra: [], ...cleanMenu(await readJson(request)) }), 201);
  },
});
