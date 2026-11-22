// Eenvoudige login voor één gebruiker: het wachtwoord staat in de omgevingsvariabele APP_PASSWORD.
// Na het inloggen krijg je een ondertekend cookie dat een jaar geldig is.

const COOKIE = 'vk_session';
const MAX_AGE = 60 * 60 * 24 * 365;
const enc = new TextEncoder();

async function key(env) {
  const secret = `${env.SESSION_SECRET || ''}:${env.APP_PASSWORD}`;
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(env, value) {
  const sig = await crypto.subtle.sign('HMAC', await key(env), enc.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(env, password) {
  if (!env.APP_PASSWORD) return false;
  // Vergelijk via HMAC zodat de vergelijking niet afhangt van de lengte van het wachtwoord.
  return safeEqual(await sign(env, `pw:${password}`), await sign(env, `pw:${env.APP_PASSWORD}`));
}

export async function sessionCookie(env, request) {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `${expires}.${await sign(env, String(expires))}`;
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export async function isLoggedIn(env, request) {
  if (!env.APP_PASSWORD) return false;
  const cookie = request.headers.get('cookie') || '';
  const value = cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return false;
  const [expires, sig] = value.split('.');
  if (!expires || !sig || Number(expires) < Date.now() / 1000) return false;
  return safeEqual(sig, await sign(env, expires));
}
