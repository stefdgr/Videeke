import { useEffect, useMemo, useState } from 'preact/hooks';
import { api, imageSrc } from '../api.js';
import { ErrorBox, Loading, Modal, Stepper } from '../components/ui.jsx';
import { COURSES, MAKE_AHEAD, formatDate, label } from '../labels.js';
import { navigate } from '../router.js';
import { dropMenu, putMenu, useStore } from '../store.js';
import { buildShoppingList } from '../../shared/ingredients.js';
import { filterRecipes } from './Library.jsx';

const COURSE_ORDER = ['hapje', 'voorgerecht', 'hoofdgerecht', 'bijgerecht', 'dessert', ''];

function RecipePicker({ recipes, chosen, onPick, onClose }) {
  const [q, setQ] = useState('');
  const list = filterRecipes(recipes, { q }).filter((r) => !chosen.includes(r.id));
  return (
    <Modal title="Gerecht toevoegen" onClose={onClose}>
      <input class="search" type="search" placeholder="Zoek een recept…" value={q} onInput={(e) => setQ(e.target.value)} autoFocus />
      <div class="picker-list">
        {list.map((r) => (
          <button key={r.id} type="button" class="picker-item" onClick={() => onPick(r)}>
            {(r.image_id || r.image_url) ? <img src={imageSrc(r.image_id) || r.image_url} alt="" /> : <span class="picker-noimg">🍲</span>}
            <span>
              <strong>{r.title}</strong>
              <span class="muted small">{[label(COURSES, r.course), label(MAKE_AHEAD, r.make_ahead)].filter(Boolean).join(' · ')}</span>
            </span>
          </button>
        ))}
        {!list.length && <p class="muted">Geen recepten gevonden.</p>}
      </div>
    </Modal>
  );
}

function listAsText(menu, groups, extra) {
  const lines = [`Boodschappen: ${menu.name}${menu.date ? ` (${formatDate(menu.date)})` : ''}`, ''];
  for (const g of groups) {
    const open = g.items.filter((i) => !(menu.checked || []).includes(i.key));
    if (!open.length) continue;
    lines.push(g.section.toUpperCase(), ...open.map((i) => `- ${i.text}`), '');
  }
  const openExtra = extra.filter((e) => !(menu.checked || []).includes(`extra|${e}`));
  if (openExtra.length) lines.push('EXTRA', ...openExtra.map((e) => `- ${e}`));
  return lines.join('\n').trim();
}

export function MenuView({ id, tab = 'menu' }) {
  const { menus, recipes } = useStore();
  const [menu, setMenu] = useState(() => menus?.find((m) => m.id === id) || null);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [extraInput, setExtraInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.menu(id).then(setMenu).catch((e) => setError(e.message));
  }, [id]);

  const dishes = useMemo(() => {
    if (!menu || !recipes) return [];
    return (menu.items || [])
      .map((item) => ({ item, recipe: recipes.find((r) => r.id === item.recipe_id) }))
      .filter((d) => d.recipe)
      .sort((a, b) => COURSE_ORDER.indexOf(a.recipe.course || '') - COURSE_ORDER.indexOf(b.recipe.course || ''));
  }, [menu, recipes]);

  const groups = useMemo(() => {
    if (!menu) return [];
    return buildShoppingList(
      dishes.map(({ item, recipe }) => ({
        lines: recipe.ingredients,
        factor: (item.servings || menu.guests) / (recipe.servings || 4),
        recipe: recipe.title,
      })),
    );
  }, [dishes, menu]);

  if (error) return <ErrorBox message={error} />;
  if (!menu || !recipes) return <Loading />;

  async function save(changes) {
    const optimistic = { ...menu, ...changes };
    setMenu(optimistic);
    try {
      const saved = await api.updateMenu(menu.id, changes);
      putMenu(saved);
    } catch (err) {
      setError(err.message);
    }
  }

  const checked = menu.checked || [];
  const extra = menu.extra || [];
  const toggle = (key) => save({ checked: checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key] });
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0) + extra.length;
  const doneItems = groups.reduce((n, g) => n + g.items.filter((i) => checked.includes(i.key)).length, 0) + extra.filter((e) => checked.includes(`extra|${e}`)).length;
  const prepAhead = dishes.filter((d) => d.recipe.make_ahead === 'volledig' || d.recipe.make_ahead === 'deels');
  const lastMinute = dishes.filter((d) => d.recipe.make_ahead === 'nee');

  async function share() {
    const text = listAsText(menu, groups, extra);
    try {
      if (navigator.share) await navigator.share({ title: `Boodschappen ${menu.name}`, text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* geannuleerd */
    }
  }

  async function remove() {
    if (!confirm(`Menu "${menu.name}" verwijderen?`)) return;
    await api.deleteMenu(menu.id);
    dropMenu(menu.id);
    navigate('/menus');
  }

  return (
    <div class="narrow">
      <input class="title-input" value={menu.name} onChange={(e) => save({ name: e.target.value || 'Etentje' })} aria-label="Naam van het menu" />
      <div class="row menu-meta">
        <label>
          Datum
          <input type="date" value={menu.date || ''} onChange={(e) => save({ date: e.target.value })} />
        </label>
        <div class="field">
          <span class="field-label">Gasten</span>
          <Stepper value={menu.guests} onChange={(g) => save({ guests: g })} />
        </div>
      </div>

      <div class="segmented">
        <a class={tab !== 'lijst' ? 'on' : ''} href={`#/menu/${menu.id}`}>🍽️ Menu</a>
        <a class={tab === 'lijst' ? 'on' : ''} href={`#/menu/${menu.id}?tab=lijst`}>🛒 Boodschappen{totalItems ? ` (${totalItems - doneItems})` : ''}</a>
      </div>

      {tab !== 'lijst' ? (
        <div class="stack">
          {dishes.map(({ item, recipe }) => (
            <div key={recipe.id} class="dish">
              <a href={`#/recept/${recipe.id}`} class="dish-main">
                {(recipe.image_id || recipe.image_url) ? <img src={imageSrc(recipe.image_id) || recipe.image_url} alt="" /> : <span class="picker-noimg">🍲</span>}
                <span>
                  <span class="muted small">{label(COURSES, recipe.course) || 'Gerecht'}</span>
                  <strong>{recipe.title}</strong>
                  {recipe.make_ahead && <span class="small">{label(MAKE_AHEAD, recipe.make_ahead)}</span>}
                </span>
              </a>
              <div class="dish-side">
                <Stepper
                  value={item.servings || menu.guests}
                  suffix=" p."
                  onChange={(v) => save({ items: menu.items.map((i) => (i.recipe_id === recipe.id ? { ...i, servings: v === menu.guests ? null : v } : i)) })}
                />
                <button type="button" class="link-btn danger" onClick={() => save({ items: menu.items.filter((i) => i.recipe_id !== recipe.id) })}>Verwijderen</button>
              </div>
            </div>
          ))}
          {!dishes.length && <p class="muted">Nog geen gerechten. Voeg er een paar toe uit je recepten.</p>}
          <button type="button" class="btn btn-primary" onClick={() => setPicking(true)}>+ Gerecht toevoegen</button>

          {dishes.length > 0 && (
            <div class="plan">
              <h2>Planning</h2>
              {prepAhead.length > 0 && <p><strong>Op voorhand:</strong> {prepAhead.map((d) => `${d.recipe.title} (${label(MAKE_AHEAD, d.recipe.make_ahead).toLowerCase()})`).join(', ')}</p>}
              {lastMinute.length > 0 && <p><strong>Op het moment zelf:</strong> {lastMinute.map((d) => d.recipe.title).join(', ')}</p>}
              {lastMinute.length > 1 && <p class="muted small">Let op: {lastMinute.length} gerechten moet je last minute maken.</p>}
              {dishes.some((d) => !d.recipe.servings) && <p class="muted small">Bij sommige recepten staat geen aantal personen; daar is gerekend met 4.</p>}
            </div>
          )}
        </div>
      ) : (
        <div class="stack">
          <div class="row">
            <button type="button" class="btn" onClick={share} disabled={!totalItems}>{copied ? 'Gekopieerd ✓' : navigator.share ? 'Delen' : 'Kopiëren'}</button>
            {doneItems > 0 && <button type="button" class="btn" onClick={() => save({ checked: [] })}>Alles weer aanzetten</button>}
          </div>
          {groups.map((g) => (
            <section key={g.section} class="shop-section">
              <h3>{g.section}</h3>
              {g.items.map((i) => (
                <label key={i.key} class={checked.includes(i.key) ? 'shop-item done' : 'shop-item'}>
                  <input type="checkbox" checked={checked.includes(i.key)} onChange={() => toggle(i.key)} />
                  <span>
                    {i.text}
                    {dishes.length > 1 && <span class="muted small"> · {i.recipes.join(', ')}</span>}
                  </span>
                </label>
              ))}
            </section>
          ))}
          <section class="shop-section">
            <h3>Extra</h3>
            {extra.map((e) => (
              <div key={e} class={checked.includes(`extra|${e}`) ? 'shop-item done' : 'shop-item'}>
                <input type="checkbox" checked={checked.includes(`extra|${e}`)} onChange={() => toggle(`extra|${e}`)} aria-label={e} />
                <span>{e}</span>
                <button type="button" class="icon-btn" aria-label={`${e} verwijderen`} onClick={() => save({ extra: extra.filter((x) => x !== e), checked: checked.filter((k) => k !== `extra|${e}`) })}>✕</button>
              </div>
            ))}
            <form
              class="row"
              onSubmit={(ev) => {
                ev.preventDefault();
                const v = extraInput.trim();
                if (v && !extra.includes(v)) save({ extra: [...extra, v] });
                setExtraInput('');
              }}
            >
              <input value={extraInput} onInput={(e) => setExtraInput(e.target.value)} placeholder="bv. wijn, servetten, bloemen" />
              <button class="btn">Toevoegen</button>
            </form>
          </section>
          {!groups.length && <p class="muted">Voeg gerechten toe aan het menu om een boodschappenlijst te krijgen.</p>}
        </div>
      )}

      <button type="button" class="link-btn danger" onClick={remove}>Menu verwijderen</button>

      {picking && (
        <RecipePicker
          recipes={recipes}
          chosen={(menu.items || []).map((i) => i.recipe_id)}
          onClose={() => setPicking(false)}
          onPick={(r) => {
            save({ items: [...(menu.items || []), { recipe_id: r.id }] });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
