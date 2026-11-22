// D1-helpers. Het schema wordt automatisch aangemaakt bij het eerste verzoek,
// zodat er bij het uitrollen geen migratiestap nodig is.

let schemaReady = false;

export async function db(env) {
  if (!env.DB) throw new HttpError(500, 'Geen database gekoppeld. Voeg een D1-binding met de naam DB toe.');
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS menus (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL)'),
    ]);
    schemaReady = true;
  }
  return env.DB;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Ongeldige gegevens.');
  }
}

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);
export const now = () => new Date().toISOString();

// Generieke opslag voor JSON-documenten (recepten en menu's).
export function collection(table) {
  return {
    async list(env) {
      const { results } = await (await db(env)).prepare(`SELECT id, data, created_at, updated_at FROM ${table} ORDER BY created_at DESC`).all();
      return results.map(toDoc);
    },
    async get(env, id) {
      const row = await (await db(env)).prepare(`SELECT id, data, created_at, updated_at FROM ${table} WHERE id = ?`).bind(id).first();
      if (!row) throw new HttpError(404, 'Niet gevonden.');
      return toDoc(row);
    },
    async create(env, data) {
      const id = newId();
      const t = now();
      await (await db(env)).prepare(`INSERT INTO ${table} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`).bind(id, JSON.stringify(data), t, t).run();
      return { ...data, id, created_at: t, updated_at: t };
    },
    async update(env, id, data) {
      const existing = await this.get(env, id);
      const t = now();
      const merged = { ...strip(existing), ...strip(data) };
      await (await db(env)).prepare(`UPDATE ${table} SET data = ?, updated_at = ? WHERE id = ?`).bind(JSON.stringify(merged), t, id).run();
      return { ...merged, id, created_at: existing.created_at, updated_at: t };
    },
    async remove(env, id) {
      await (await db(env)).prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    },
  };
}

function strip(doc) {
  const { id, created_at, updated_at, ...rest } = doc || {};
  return rest;
}

function toDoc(row) {
  return { ...JSON.parse(row.data), id: row.id, created_at: row.created_at, updated_at: row.updated_at };
}

export function route(handlers) {
  return async (context) => {
    try {
      const handler = handlers[context.request.method];
      if (!handler) return json({ error: 'Methode niet toegestaan.' }, 405);
      return await handler(context);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Er ging iets mis op de server.' }, 500);
    }
  };
}
