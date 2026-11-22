import { checkPassword, sessionCookie } from '../../server/auth.js';
import { json, readJson, route } from '../../server/db.js';

export const onRequest = route({
  async POST({ request, env }) {
    if (!env.APP_PASSWORD) return json({ error: 'Er is nog geen wachtwoord ingesteld (APP_PASSWORD).' }, 500);
    const { password } = await readJson(request);
    if (!(await checkPassword(env, String(password || '')))) {
      await new Promise((r) => setTimeout(r, 800)); // gokken vertragen
      return json({ error: 'Verkeerd wachtwoord.' }, 401);
    }
    return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(env, request) });
  },
});
