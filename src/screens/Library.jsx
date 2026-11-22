import { useMemo, useState } from 'preact/hooks';
import { Chips, ErrorBox, Loading, RecipeCard } from '../components/ui.jsx';
import { COURSES, MAKE_AHEAD, OCCASIONS, STATUSES, TIMES } from '../labels.js';
import { useStore } from '../store.js';

const FILTER_KEY = 'videeke-filters';

function loadFilters() {
  try {
    return { status: 'wil_ik', ...JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}') };
  } catch {
    return { status: 'wil_ik' };
  }
}

function matchesTime(recipe, time) {
  if (!time) return true;
  const t = recipe.total_minutes;
  if (!t) return false;
  if (time === '30') return t <= 30;
  if (time === '60') return t <= 60;
  return t > 60;
}

export function filterRecipes(recipes, f) {
  const q = (f.q || '').trim().toLowerCase();
  return recipes.filter((r) => {
    if (f.status && r.status !== f.status) return false;
    if (f.course && r.course !== f.course) return false;
    if (f.occasion && !(r.occasion === f.occasion || r.occasion === 'beide')) return false;
    if (f.make_ahead && r.make_ahead !== f.make_ahead) return false;
    if (!matchesTime(r, f.time)) return false;
    if (q) {
      const hay = [r.title, r.description, r.notes, r.source_name, ...(r.tags || []), ...(r.ingredients || [])].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
}

export function Library() {
  const { recipes, error } = useStore();
  const [f, setF] = useState(loadFilters);
  const [showFilters, setShowFilters] = useState(false);
  const set = (k) => (v) => {
    const next = { ...f, [k]: v };
    setF(next);
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(next));
    } catch {
      /* niet erg */
    }
  };
  const list = useMemo(() => (recipes ? filterRecipes(recipes, f) : []), [recipes, f]);
  const activeFilters = ['course', 'occasion', 'make_ahead', 'time'].filter((k) => f[k]).length;

  if (error) return <ErrorBox message={error} />;
  if (!recipes) return <Loading />;

  if (!recipes.length) {
    return (
      <div class="empty">
        <div class="empty-icon">📖</div>
        <h2>Nog geen recepten</h2>
        <p>Zag je ergens iets lekkers? Plak de link, deel het vanuit Instagram of TikTok, of neem een foto van je kookboek.</p>
        <a class="btn btn-primary" href="#/nieuw">Eerste recept toevoegen</a>
      </div>
    );
  }

  return (
    <div>
      <div class="toolbar">
        <input class="search" type="search" placeholder="Zoek op naam, ingrediënt of tag…" value={f.q || ''} onInput={(e) => set('q')(e.target.value)} />
        <button type="button" class={activeFilters ? 'btn btn-small on' : 'btn btn-small'} onClick={() => setShowFilters(!showFilters)}>
          Filters{activeFilters ? ` (${activeFilters})` : ''}
        </button>
      </div>
      <Chips options={[...STATUSES, ['', 'Alles']]} value={f.status ?? ''} onChange={set('status')} />
      {showFilters && (
        <div class="filters">
          <div class="filter-row"><span class="filter-label">Gang</span><Chips options={COURSES} value={f.course} onChange={set('course')} allLabel="Alle" /></div>
          <div class="filter-row"><span class="filter-label">Gelegenheid</span><Chips options={OCCASIONS.slice(0, 2)} value={f.occasion} onChange={set('occasion')} allLabel="Alle" /></div>
          <div class="filter-row"><span class="filter-label">Voorbereiden</span><Chips options={MAKE_AHEAD} value={f.make_ahead} onChange={set('make_ahead')} allLabel="Maakt niet uit" /></div>
          <div class="filter-row"><span class="filter-label">Tijd</span><Chips options={TIMES} value={f.time} onChange={set('time')} allLabel="Maakt niet uit" /></div>
          {activeFilters > 0 && (
            <button type="button" class="link-btn" onClick={() => setF({ status: f.status, q: f.q })}>Filters wissen</button>
          )}
        </div>
      )}
      <p class="muted count">{list.length} {list.length === 1 ? 'recept' : 'recepten'}</p>
      {list.length ? (
        <div class="grid">{list.map((r) => <RecipeCard key={r.id} recipe={r} />)}</div>
      ) : (
        <div class="empty small"><p>Geen recepten gevonden met deze filters.</p></div>
      )}
    </div>
  );
}
