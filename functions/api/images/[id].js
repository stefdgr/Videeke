import { db, json, route } from '../../../server/db.js';

export const onRequest = route({
  async GET({ env, params }) {
    const row = await (await db(env)).prepare('SELECT mime, data FROM images WHERE id = ?').bind(params.id).first();
    if (!row) return json({ error: 'Foto niet gevonden.' }, 404);
    const body = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data);
    return new Response(body, {
      headers: { 'content-type': row.mime, 'cache-control': 'private, max-age=31536000, immutable' },
    });
  },
});
