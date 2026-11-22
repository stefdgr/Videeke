import { useEffect, useState } from 'preact/hooks';
import { api, imageSrc } from '../api.js';
import { Chips, ErrorBox, Loading, PhotoButton } from '../components/ui.jsx';
import { COURSES, MAKE_AHEAD, OCCASIONS, STATUSES } from '../labels.js';
import { navigate } from '../router.js';
import { putRecipe, takeDraft } from '../store.js';

const toForm = (r) => ({
  title: r.title || '',
  description: r.description || '',
  source_url: r.source_url || '',
  source_type: r.source_type || 'zelf',
  source_name: r.source_name || '',
  image_url: r.image_url || '',
  image_id: r.image_id || null,
  page_image_id: r.page_image_id || null,
  own_image_id: r.own_image_id || null,
  ingredients: (r.ingredients || []).join('\n'),
  steps: (r.steps || []).join('\n\n'),
  tags: (r.tags || []).join(', '),
  servings: r.servings || 4,
  total_minutes: r.total_minutes || '',
  course: r.course || '',
  occasion: r.occasion || 'etentje',
  make_ahead: r.make_ahead || '',
  status: r.status || 'wil_ik',
  notes: r.notes || '',
});

const fromForm = (f) => ({
  ...f,
  ingredients: f.ingredients.split('\n').map((s) => s.trim()).filter(Boolean),
  steps: f.steps.split(/\n\s*\n|\n(?=\d+[.)]\s)/).map((s) => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean),
  tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean),
});

export function RecipeEdit({ id }) {
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      api.recipe(id).then((r) => setForm(toForm(r))).catch((e) => setError(e.message));
    } else {
      const draft = takeDraft();
      if (!draft) {
        navigate('/nieuw');
        return;
      }
      setNotice(draft.notice || '');
      setForm(toForm(draft));
    }
  }, [id]);

  if (error && !form) return <ErrorBox message={error} />;
  if (!form) return <Loading />;

  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v });
  const heroImage = imageSrc(form.image_id) || form.image_url;

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Geef het recept een titel.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = fromForm(form);
      const saved = id ? await api.updateRecipe(id, data) : await api.createRecipe(data);
      putRecipe(saved);
      navigate(`/recept/${saved.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form class="narrow stack" onSubmit={save}>
      <h1>{id ? 'Recept bewerken' : 'Nieuw recept'}</h1>
      {notice && <div class="notice">{notice}</div>}

      <label>
        Titel
        <input value={form.title} onInput={set('title')} placeholder="bv. Lamsrack met pistachekorst" required />
      </label>

      <div class="photo-edit">
        {heroImage ? <img src={heroImage} alt="" /> : <div class="photo-empty">Geen foto</div>}
        <div class="stack-small">
          <PhotoButton label={heroImage ? 'Andere foto' : 'Foto toevoegen'} capture={false} onUploaded={(imgId) => setForm({ ...form, image_id: imgId, image_url: '' })} />
          {heroImage && <button type="button" class="link-btn" onClick={() => setForm({ ...form, image_id: null, image_url: '' })}>Foto verwijderen</button>}
        </div>
      </div>

      <div class="field">
        <span class="field-label">Gang</span>
        <Chips options={COURSES} value={form.course} onChange={set('course')} allLabel="Onbekend" />
      </div>
      <div class="field">
        <span class="field-label">Gelegenheid</span>
        <Chips options={OCCASIONS} value={form.occasion} onChange={set('occasion')} />
      </div>
      <div class="field">
        <span class="field-label">Kun je het vooraf maken?</span>
        <Chips options={MAKE_AHEAD} value={form.make_ahead} onChange={set('make_ahead')} allLabel="Weet ik niet" />
      </div>

      <div class="row">
        <label>
          Totale tijd (min)
          <input type="number" inputMode="numeric" min="1" value={form.total_minutes} onInput={set('total_minutes')} />
        </label>
        <label>
          Aantal personen
          <input type="number" inputMode="numeric" min="1" value={form.servings} onInput={set('servings')} />
        </label>
      </div>

      <label>
        Ingrediënten <span class="muted small">(één per regel, bv. "200 g bloem")</span>
        <textarea rows={Math.max(6, form.ingredients.split('\n').length + 1)} value={form.ingredients} onInput={set('ingredients')} />
      </label>
      <label>
        Bereiding <span class="muted small">(laat een lege regel tussen de stappen)</span>
        <textarea rows={Math.max(6, form.steps.split('\n').length + 1)} value={form.steps} onInput={set('steps')} />
      </label>
      <label>
        Tags <span class="muted small">(gescheiden door komma's)</span>
        <input value={form.tags} onInput={set('tags')} placeholder="bv. vegetarisch, zomer, indruk maken" />
      </label>
      <label>
        Link naar het origineel
        <input type="url" value={form.source_url} onInput={set('source_url')} placeholder="https://…" />
      </label>
      <label>
        Notities
        <textarea rows={3} value={form.notes} onInput={set('notes')} placeholder="bv. Gezien bij Lisa, minder suiker doen" />
      </label>
      <div class="field">
        <span class="field-label">Status</span>
        <Chips options={STATUSES} value={form.status} onChange={set('status')} />
      </div>

      {error && <p class="error">{error}</p>}
      <div class="row sticky-actions">
        <button type="button" class="btn" onClick={() => history.back()}>Annuleren</button>
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Opslaan…' : 'Opslaan'}</button>
      </div>
    </form>
  );
}
