import { isLoggedIn } from '../server/auth.js';
import { json } from '../server/db.js';

const PUBLIC = ['/api/login', '/api/logout'];

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (pathname.startsWith('/api/') && !PUBLIC.includes(pathname)) {
    if (!(await isLoggedIn(context.env, context.request))) {
      return json({ error: 'Niet ingelogd.', login: true }, 401);
    }
  }
  return context.next();
}
