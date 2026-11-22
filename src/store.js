import { useEffect, useState } from 'preact/hooks';
import { api } from './api.js';

// Eenvoudige gedeelde cache: één gebruiker, dus alle recepten in één keer laden is prima.
const state = { recipes: null, menus: null, error: null };
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn({ ...state }));

export function useStore() {
  const [s, set] = useState({ ...state });
  useEffect(() => {
    listeners.add(set);
    if (state.recipes === null) reload();
    return () => listeners.delete(set);
  }, []);
  return s;
}

export async function reload() {
  try {
    const [recipes, menus] = await Promise.all([api.recipes(), api.menus()]);
    Object.assign(state, { recipes, menus, error: null });
  } catch (err) {
    state.error = err.message;
  }
  emit();
}

export function putRecipe(recipe) {
  const list = state.recipes || [];
  const i = list.findIndex((r) => r.id === recipe.id);
  state.recipes = i >= 0 ? list.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...list];
  emit();
}

export function dropRecipe(id) {
  state.recipes = (state.recipes || []).filter((r) => r.id !== id);
  emit();
}

export function putMenu(menu) {
  const list = state.menus || [];
  const i = list.findIndex((m) => m.id === menu.id);
  state.menus = i >= 0 ? list.map((m) => (m.id === menu.id ? menu : m)) : [menu, ...list];
  emit();
}

export function dropMenu(id) {
  state.menus = (state.menus || []).filter((m) => m.id !== id);
  emit();
}

export function resetStore() {
  Object.assign(state, { recipes: null, menus: null, error: null });
}

// Een concept-recept doorgeven van "Toevoegen" naar het formulier.
let draft = null;
export const setDraft = (d) => (draft = d);
export const takeDraft = () => {
  const d = draft;
  draft = null;
  return d;
};
