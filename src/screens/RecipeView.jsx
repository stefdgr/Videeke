import { useEffect, useState } from 'preact/hooks';
import { api, imageSrc } from '../api.js';
import { ErrorBox, Loading, Modal, PhotoButton, Stepper } from '../components/ui.jsx';
import { COURSES, MAKE_AHEAD, OCCASIONS, SOURCES, formatDate, formatMinutes, label } from '../labels.js';
import { navigate } from '../router.js';
import { dropRecipe, putMenu, putRecipe, useStore } from '../store.js';
import { scaleLine } from '../../shared/ingredients.js';

function MadeDialog({ recipe, onClose, onSaved }) {
  const [photo, setPhoto] = useState(recipe.own_image_id || null);
  const [notes, setNotes] = useState(recipe.notes || '');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const saved = await api.updateRecipe(recipe.id, {
      status: 'gemaakt',
      made_at: new Date().toISOString().slice(0, 10),
      own_image_id: photo,
      notes,
    });
    onSaved(saved);
  }
  return (
    <Modal title="Gemaakt! 🎉" onClose={onClose}>
      <div class="stack">
        <p class="muted">Leg vast hoe het eruitzag. Allebei optioneel.</p>
        {photo && <img class="made-photo" src={imageSrc(photo)} alt="Jouw foto" />}
        <PhotoButton label={photo ? 'Andere foto' : '📷 Foto van jouw versie'} onUploaded={setPhoto} />
        <label>
          Notities voor de volgende keer
          <textarea rows={3} value={notes} onInput={(e) => setNotes(e.target.value)} placeholder="bv. Iets meer zout, saus kan de dag ervoor" />
        </label>
        <button type="button" class="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Opslaan…' : 'Opslaan'}</button>
      </div>
    </Modal>
  );
}

function AddToMenuDialog({ recipe, onClose }) {
  const { menus } = useStore();
  const [busy, setBusy] = useState(false);
  async function add(menu) {
    setBusy(true);
    const items = menu.items || [];
    const saved = items.some((i) => i.recipe_id === recipe.id)
      ? menu
      : await api.updateMenu(menu.id, { items: [...items, { recipe_id: recipe.id }] });
    putMenu(saved);
    navigate(`/menu/${menu.id}`);
  }
  async function create() {
    setBusy(true);
    const saved = await api.createMenu({ name: 'Etentje', guests: 6, items: [{ recipe_id: recipe.id }] });
    putMenu(saved);
    navigate(`/menu/${saved.id}`);
  }
  return (
    <Modal title="Toevoegen aan menu" onClose={onClose}>
      <div class="stack">
        {(menus || []).map((m) => (
          <button key={m.id} type="button" class="list-btn" disabled={busy} onClick={() => add(m)}>
            <strong>{m.name}</strong>
            <span class="muted small">{[m.date && formatDate(m.date), `${m.guests} personen`, `${(m.items || []).length} gerechten`].filter(Boolean).join(' · ')}</span>
          </button>
        ))}
        <button type="button" class="btn btn-primary" disabled={busy} onClick={create}>+ Nieuw menu</button>
      </div>
    </Modal>
  );
}

function useWakeLock() {
  const [lock, setLock] = useState(null);
  useEffect(() => () => lock?.release(), [lock]);
  if (!('wakeLock' in navigator)) return null;
  return {
    on: Boolean(lock),
    toggle: async () => {
      if (lock) {
        await lock.release();
        setLock(null);
      } else {
        try {
          setLock(await navigator.wakeLock.request('screen'));
        } catch {
          /* niet ondersteund */
        }
      }
    },
  };
}

export function RecipeView({ id }) {
  const { recipes } = useStore();
  const cached = recipes?.find((r) => r.id === id);
  const [recipe, setRecipe] = useState(cached || null);
  const [error, setError] = useState('');
  const [servings, setServings] = useState(cached?.servings || 4);
  const [dialog, setDialog] = useState(null);
  const [done, setDone] = useState([]);
  const wake = useWakeLock();

  useEffect(() => {
    api.recipe(id).then((r) => {
      setRecipe(r);
      setServings(r.servings || 4);
    }).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!recipe) return <Loading />;

  const factor = recipe.servings ? servings / recipe.servings : 1;
  const hero = imageSrc(recipe.own_image_id || recipe.image_id) || recipe.image_url;

  const update = (saved) => {
    setRecipe(saved);
    putRecipe(saved);
    setDialog(null);
  };

  async function remove() {
    if (!confirm(`"${recipe.title}" verwijderen?`)) return;
    await api.deleteRecipe(recipe.id);
    dropRecipe(recipe.id);
    navigate('/');
  }

  async function toggleStatus() {
    if (recipe.status !== 'gemaakt') return setDialog('made');
    update(await api.updateRecipe(recipe.id, { status: 'wil_ik' }));
  }

  const meta = [
    recipe.course && label(COURSES, recipe.course),
    recipe.occasion && label(OCCASIONS, recipe.occasion),
    recipe.total_minutes && `⏱ ${formatMinutes(recipe.total_minutes)}`,
    recipe.make_ahead && label(MAKE_AHEAD, recipe.make_ahead),
  ].filter(Boolean);

  return (
    <article class="recipe">
      {hero && <img class="hero" src={hero} alt="" />}
      <div class="recipe-head">
        <h1>{recipe.title}</h1>
        <div class="badges">{meta.map((m) => <span key={m} class="badge">{m}</span>)}</div>
        {recipe.description && <p class="description">{recipe.description}</p>}
        <p class="muted small">
          {SOURCES[recipe.source_type] || 'Bron'}
          {recipe.source_name && ` · ${recipe.source_name}`}
          {recipe.source_url && (<> · <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">origineel openen ↗</a></>)}
          {recipe.page_image_id && (<> · <a href={imageSrc(recipe.page_image_id)} target="_blank" rel="noopener">foto van de pagina</a></>)}
        </p>
        {recipe.status === 'gemaakt' && (
          <p class="made-line">✓ Gemaakt{recipe.made_at ? ` op ${formatDate(recipe.made_at)}` : ''}</p>
        )}
      </div>

      <div class="actions">
        <button type="button" class={recipe.status === 'gemaakt' ? 'btn' : 'btn btn-primary'} onClick={toggleStatus}>
          {recipe.status === 'gemaakt' ? 'Terug naar "wil ik maken"' : '✓ Gemaakt'}
        </button>
        {recipe.status === 'gemaakt' && <button type="button" class="btn" onClick={() => setDialog('made')}>📷 Foto / notities</button>}
        <button type="button" class="btn" onClick={() => setDialog('menu')}>🍽️ Aan menu toevoegen</button>
        <a class="btn" href={`#/recept/${recipe.id}/bewerken`}>Bewerken</a>
        {wake && <button type="button" class={wake.on ? 'btn on' : 'btn'} onClick={wake.toggle}>{wake.on ? '☀️ Scherm blijft aan' : '☀️ Scherm aan houden'}</button>}
      </div>

      {recipe.notes && <div class="notes"><strong>Notities</strong><p>{recipe.notes}</p></div>}

      <div class="recipe-body">
        <section>
          <div class="section-head">
            <h2>Ingrediënten</h2>
            <Stepper value={servings} onChange={setServings} suffix=" pers." />
          </div>
          {!recipe.servings && <p class="muted small">Aantal personen onbekend: hoeveelheden worden niet herrekend.</p>}
          <ul class="ingredients">
            {(recipe.ingredients || []).map((line, i) =>
              /:$/.test(line) ? <li key={i} class="subhead">{line}</li> : <li key={i}>{scaleLine(line, factor)}</li>,
            )}
          </ul>
          {!recipe.ingredients?.length && <p class="muted">Nog geen ingrediënten. <a href={`#/recept/${recipe.id}/bewerken`}>Toevoegen</a></p>}
        </section>
        <section>
          <h2>Bereiding</h2>
          <ol class="steps">
            {(recipe.steps || []).map((step, i) =>
              /:$/.test(step) ? (
                <li key={i} class="subhead">{step}</li>
              ) : (
                <li key={i} class={done.includes(i) ? 'done' : ''} onClick={() => setDone(done.includes(i) ? done.filter((d) => d !== i) : [...done, i])}>
                  {step}
                </li>
              ),
            )}
          </ol>
          {!recipe.steps?.length && <p class="muted">Nog geen stappen.</p>}
        </section>
      </div>

      {recipe.tags?.length > 0 && <div class="badges tags">{recipe.tags.map((t) => <span key={t} class="badge">#{t}</span>)}</div>}

      <button type="button" class="link-btn danger" onClick={remove}>Recept verwijderen</button>

      {dialog === 'made' && <MadeDialog recipe={recipe} onClose={() => setDialog(null)} onSaved={update} />}
      {dialog === 'menu' && <AddToMenuDialog recipe={recipe} onClose={() => setDialog(null)} />}
    </article>
  );
}
