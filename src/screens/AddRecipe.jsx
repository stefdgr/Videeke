import { useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api.js';
import { resizeImage } from '../lib/image.js';
import { navigate } from '../router.js';
import { setDraft } from '../store.js';
import { findUrl, splitRecipeText } from '../../shared/extract.js';

const TABS = [
  ['link', '🔗 Link'],
  ['foto', '📷 Kookboek'],
  ['zelf', '✍️ Zelf typen'],
];

function openForm(draft) {
  setDraft(draft);
  navigate('/nieuw/formulier');
}

function LinkImport({ initialUrl, initialText, auto }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [caption, setCaption] = useState(initialText || '');
  const [showCaption, setShowCaption] = useState(Boolean(initialText));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  async function run(e) {
    e?.preventDefault();
    const link = findUrl(url) || (url.includes('.') ? `https://${url.trim()}` : '');
    if (!link) {
      setError('Plak een link naar een recept.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.importUrl(link);
      let draft = { ...result };
      // Geen ingrediënten gevonden, maar wel tekst geplakt? Dan halen we ze daaruit.
      if (caption.trim() && !draft.ingredients?.length) {
        const parts = splitRecipeText(caption);
        draft = { ...draft, title: draft.title || parts.title, ingredients: parts.ingredients, steps: parts.steps, description: draft.description || caption };
      }
      if (result.partial) draft.notice = `${result.message} De link is wel bewaard; vul de rest zelf aan.`;
      else if (!result.found && !draft.ingredients?.length) draft.notice = 'Er stond geen herkenbaar recept op deze pagina. Vul de ingrediënten en stappen zelf aan, of plak de caption.';
      openForm(draft);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (auto && initialUrl && !started.current) {
      started.current = true;
      run();
    }
  }, []);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(findUrl(text) || text);
    } catch {
      setError('Plakken lukte niet. Houd het veld ingedrukt en kies "Plakken".');
    }
  }

  return (
    <form onSubmit={run} class="stack">
      <p class="muted">Werkt met de meeste receptensites (Dagelijkse Kost, 15gram, BBC Good Food, NYT Cooking…), plus Instagram- en TikTok-links.</p>
      <div class="row">
        <input type="url" inputMode="url" placeholder="https://…" value={url} onInput={(e) => setUrl(e.target.value)} />
        {navigator.clipboard?.readText && <button type="button" class="btn" onClick={paste}>Plakken</button>}
      </div>
      {showCaption ? (
        <label>
          Caption of recepttekst (optioneel)
          <textarea rows={6} placeholder="Plak hier de tekst onder de post, als het recept daarin staat." value={caption} onInput={(e) => setCaption(e.target.value)} />
        </label>
      ) : (
        <button type="button" class="link-btn" onClick={() => setShowCaption(true)}>+ Caption of tekst plakken (handig voor Instagram)</button>
      )}
      {error && <p class="error">{error}</p>}
      <button class="btn btn-primary" disabled={busy}>{busy ? 'Recept ophalen…' : 'Recept ophalen'}</button>
    </form>
  );
}

function PhotoImport() {
  const input = useRef();
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [useAsImage, setUseAsImage] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setProgress(0);
    if (!preview) setPreview(URL.createObjectURL(file));
    try {
      const blob = await resizeImage(file, 2400, 0.9);
      // Uploaden en tekst herkennen tegelijk
      const [upload, recognized] = await Promise.all([
        imageId ? Promise.resolve({ id: imageId }) : api.uploadImage(await resizeImage(file)),
        (await import('../lib/ocr.js')).readText(blob, setProgress),
      ]);
      setImageId(upload.id);
      setText((t) => (t ? `${t}\n\n${recognized.trim()}` : recognized.trim()));
    } catch (err) {
      setError(err.message || 'Tekst herkennen mislukt.');
    } finally {
      setProgress(null);
    }
  }

  function next() {
    const parts = splitRecipeText(text);
    openForm({
      title: parts.title,
      ingredients: parts.ingredients,
      steps: parts.steps,
      source_type: 'foto',
      page_image_id: imageId,
      image_id: useAsImage ? imageId : null,
      notice: 'Controleer de herkende tekst even: zet regels die bij het verkeerde blok staan op de juiste plek.',
    });
  }

  return (
    <div class="stack">
      <p class="muted">Neem een foto van de receptpagina. De tekst wordt herkend op je toestel, daarna kun je hem nakijken.</p>
      {preview && <img class="ocr-preview" src={preview} alt="Foto van de receptpagina" />}
      <button type="button" class="btn btn-primary" disabled={progress !== null} onClick={() => input.current.click()}>
        {progress !== null ? `Tekst lezen… ${progress}%` : text ? '+ Nog een pagina' : '📷 Foto nemen of kiezen'}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      {progress !== null && progress === 0 && <p class="muted small">De eerste keer wordt de tekstherkenning gedownload (± 10 MB), daarna gaat het sneller.</p>}
      {error && <p class="error">{error}</p>}
      {text && (
        <>
          <label>
            Herkende tekst
            <textarea rows={12} value={text} onInput={(e) => setText(e.target.value)} />
          </label>
          <label class="check">
            <input type="checkbox" checked={useAsImage} onChange={(e) => setUseAsImage(e.target.checked)} />
            Deze foto ook als receptfoto gebruiken
          </label>
          <button type="button" class="btn btn-primary" onClick={next}>Verder naar het recept</button>
        </>
      )}
    </div>
  );
}

export function AddRecipe({ shared }) {
  const sharedUrl = findUrl(shared);
  const sharedText = shared ? shared.replace(sharedUrl || '', '').trim() : '';
  const [tab, setTab] = useState('link');
  return (
    <div class="narrow">
      <h1>Recept toevoegen</h1>
      <div class="segmented">
        {TABS.map(([t, text]) => (
          <button key={t} type="button" class={tab === t ? 'on' : ''} onClick={() => (t === 'zelf' ? openForm({ source_type: 'zelf' }) : setTab(t))}>
            {text}
          </button>
        ))}
      </div>
      {tab === 'link' && <LinkImport initialUrl={sharedUrl} initialText={sharedText} auto={Boolean(sharedUrl)} />}
      {tab === 'foto' && <PhotoImport />}
    </div>
  );
}
