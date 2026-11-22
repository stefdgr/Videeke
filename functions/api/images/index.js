import { json, route } from '../../../server/db.js';
import { storeImage } from '../../../server/images.js';

export const onRequest = route({
  async POST({ request, env }) {
    const mime = (request.headers.get('content-type') || '').split(';')[0].trim();
    const id = await storeImage(env, await request.arrayBuffer(), mime);
    return json({ id }, 201);
  },
});
