import { useRef, useState } from 'preact/hooks';
import { api, imageSrc } from '../api.js';
import { resizeImage } from '../lib/image.js';
import { COURSES, MAKE_AHEAD, formatMinutes, label } from '../labels.js';

export function RecipeCard({ recipe }) {
  const img = imageSrc(recipe.own_image_id || recipe.image_id) || recipe.image_url;
  return (
    <a class="card" href={`#/recept/${recipe.id}`}>
      <div class="card-img">
        {img ? <img src={img} alt="" loading="lazy" /> : <span class="card-placeholder">🍲</span>}
        {recipe.status === 'gemaakt' && <span class="made-badge">Gemaakt ✓</span>}
      </div>
      <div class="card-body">
        <h3>{recipe.title}</h3>
        <div class="badges">
          {recipe.course && <span class="badge">{label(COURSES, recipe.course)}</span>}
          {recipe.total_minutes && <span class="badge">⏱ {formatMinutes(recipe.total_minutes)}</span>}
          {(recipe.make_ahead === 'volledig' || recipe.make_ahead === 'deels') && (
            <span class="badge badge-accent">{label(MAKE_AHEAD, recipe.make_ahead)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

export function Chips({ options, value, onChange, allLabel }) {
  return (
    <div class="chips" role="group">
      {allLabel && (
        <button type="button" class={!value ? 'chip on' : 'chip'} onClick={() => onChange('')}>
          {allLabel}
        </button>
      )}
      {options.map(([v, text]) => (
        <button key={v} type="button" class={value === v ? 'chip on' : 'chip'} onClick={() => onChange(value === v && allLabel ? '' : v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div class="modal-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="Sluiten">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Foto kiezen of nemen, verkleinen en uploaden. Geeft het id van de foto terug. */
export function PhotoButton({ onUploaded, label: text = 'Foto toevoegen', capture = true, className = 'btn' }) {
  const input = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const blob = await resizeImage(file);
      const { id } = await api.uploadImage(blob);
      onUploaded(id, file);
    } catch (err) {
      setError(err.message || 'Uploaden mislukt.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" class={className} disabled={busy} onClick={() => input.current.click()}>
        {busy ? 'Bezig met uploaden…' : text}
      </button>
      <input ref={input} type="file" accept="image/*" capture={capture ? 'environment' : undefined} hidden onChange={onFile} />
      {error && <p class="error">{error}</p>}
    </>
  );
}

export function Stepper({ value, onChange, min = 1, max = 100, suffix = '' }) {
  return (
    <div class="stepper">
      <button type="button" aria-label="Minder" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <span>{value}{suffix}</span>
      <button type="button" aria-label="Meer" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}

export const Loading = () => <div class="loading">Laden…</div>;
export const ErrorBox = ({ message }) => <div class="error-box">{message}</div>;
