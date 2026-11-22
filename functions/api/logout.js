import { clearCookie } from '../../server/auth.js';
import { json, route } from '../../server/db.js';

export const onRequest = route({
  POST: () => json({ ok: true }, 200, { 'set-cookie': clearCookie }),
});
