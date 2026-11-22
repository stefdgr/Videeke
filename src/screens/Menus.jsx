import { useState } from 'preact/hooks';
import { api } from '../api.js';
import { ErrorBox, Loading } from '../components/ui.jsx';
import { formatDate } from '../labels.js';
import { navigate } from '../router.js';
import { putMenu, useStore } from '../store.js';

export function Menus() {
  const { menus, recipes, error } = useStore();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(6);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorBox message={error} />;
  if (!menus) return <Loading />;

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    const menu = await api.createMenu({ name: name.trim() || 'Etentje', date, guests });
    putMenu(menu);
    navigate(`/menu/${menu.id}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...menus].sort((a, b) => {
    const ua = !a.date || a.date >= today;
    const ub = !b.date || b.date >= today;
    if (ua !== ub) return ua ? -1 : 1;
    return (a.date || '9999').localeCompare(b.date || '9999') * (ua ? 1 : -1);
  });
  const titleOf = (id) => recipes?.find((r) => r.id === id)?.title;

  return (
    <div class="narrow">
      <h1>Menu's</h1>
      <form class="card-form stack" onSubmit={create}>
        <h2>Nieuw etentje plannen</h2>
        <label>
          Naam
          <input value={name} onInput={(e) => setName(e.target.value)} placeholder="bv. Etentje met de schoonfamilie" />
        </label>
        <div class="row">
          <label>
            Datum
            <input type="date" value={date} onInput={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Aantal gasten (incl. jezelf)
            <input type="number" min="1" max="100" inputMode="numeric" value={guests} onInput={(e) => setGuests(e.target.value)} />
          </label>
        </div>
        <button class="btn btn-primary" disabled={busy}>Menu maken</button>
      </form>

      {sorted.length > 0 && (
        <div class="stack">
          {sorted.map((m) => (
            <a key={m.id} class={m.date && m.date < today ? 'list-btn past' : 'list-btn'} href={`#/menu/${m.id}`}>
              <strong>{m.name}</strong>
              <span class="muted small">{[m.date ? formatDate(m.date) : 'Nog geen datum', `${m.guests} personen`].join(' · ')}</span>
              {(m.items || []).length > 0 && (
                <span class="small">{m.items.map((i) => titleOf(i.recipe_id)).filter(Boolean).join(' · ')}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
