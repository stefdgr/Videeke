import { db, HttpError, newId, now } from './db.js';

const MAX_BYTES = 4 * 1024 * 1024;

export async function storeImage(env, bytes, mime) {
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(mime)) throw new HttpError(415, 'Alleen afbeeldingen zijn toegestaan.');
  if (bytes.byteLength > MAX_BYTES) throw new HttpError(413, 'Foto is te groot (max. 4 MB).');
  const id = newId();
  await (await db(env)).prepare('INSERT INTO images (id, mime, data, created_at) VALUES (?, ?, ?, ?)').bind(id, mime, bytes, now()).run();
  return id;
}

/** Download een foto van een andere site en bewaar hem, zodat hij niet verdwijnt als de link verloopt. */
export async function cacheRemoteImage(env, url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA, accept: 'image/*' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
    const bytes = await res.arrayBuffer();
    return await storeImage(env, bytes, mime);
  } catch {
    return null;
  }
}

export async function deleteImages(env, ids) {
  const list = ids.filter(Boolean);
  if (!list.length) return;
  const d = await db(env);
  await d.batch(list.map((id) => d.prepare('DELETE FROM images WHERE id = ?').bind(id)));
}

export const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
