// Kleine wrapper rond fetch voor de Videeke-API.

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

async function request(method, path, body, isBinary = false) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': isBinary ? body.type : 'application/json' },
    body: body === undefined ? undefined : isBinary ? body : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* geen JSON */
  }
  if (res.status === 401 && data?.login) onUnauthorized();
  if (!res.ok) throw new ApiError(data?.error || `Fout ${res.status}`, res.status, data);
  return data;
}

export const api = {
  session: () => request('GET', '/session'),
  login: (password) => request('POST', '/login', { password }),
  logout: () => request('POST', '/logout', {}),
  recipes: () => request('GET', '/recipes'),
  recipe: (id) => request('GET', `/recipes/${id}`),
  createRecipe: (data) => request('POST', '/recipes', data),
  updateRecipe: (id, data) => request('PUT', `/recipes/${id}`, data),
  deleteRecipe: (id) => request('DELETE', `/recipes/${id}`),
  importUrl: (url) => request('POST', '/import', { url }),
  uploadImage: (blob) => request('POST', '/images', blob, true),
  menus: () => request('GET', '/menus'),
  menu: (id) => request('GET', `/menus/${id}`),
  createMenu: (data) => request('POST', '/menus', data),
  updateMenu: (id, data) => request('PUT', `/menus/${id}`, data),
  deleteMenu: (id) => request('DELETE', `/menus/${id}`),
};

export const imageSrc = (id) => (id ? `/api/images/${id}` : null);
