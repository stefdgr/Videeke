import { extractRecipe, sourceType, splitRecipeText, guessCourse } from '../../shared/extract.js';
import { HttpError, json, readJson, route } from '../../server/db.js';
import { BROWSER_UA } from '../../server/images.js';

async function fetchText(url, accept = 'text/html') {
  const res = await fetch(url, {
    headers: { 'user-agent': BROWSER_UA, accept, 'accept-language': 'nl-BE,nl;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new HttpError(502, `De site gaf een fout (${res.status}).`);
  return { text: await res.text(), finalUrl: res.url || url };
}

function fromCaption(caption, base) {
  const parts = splitRecipeText(caption);
  return {
    ...base,
    title: base.title || parts.title,
    ingredients: parts.ingredients,
    steps: parts.steps,
    description: caption.slice(0, 2000),
    course: base.course || guessCourse(caption),
  };
}

async function importTikTok(url) {
  // TikTok heeft een openbare oEmbed-API met de caption en een thumbnail.
  const { text } = await fetchText(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, 'application/json');
  const data = JSON.parse(text);
  const caption = String(data.title || '');
  return fromCaption(caption, {
    found: false,
    title: '',
    image_url: data.thumbnail_url || null,
    source_name: data.author_name ? `@${data.author_unique_id || data.author_name}` : 'TikTok',
    servings: null,
    total_minutes: null,
    tags: [],
    course: '',
  });
}

function instagramCaption(description) {
  // og:description ziet er meestal uit als: '123 likes, 4 comments - naam on 1 januari 2026: "caption"'
  const m = description.match(/:\s*"([\s\S]*)"\s*\.?$/);
  return m ? m[1] : description;
}

export const onRequest = route({
  async POST({ request }) {
    const { url } = await readJson(request);
    let parsed;
    try {
      parsed = new URL(String(url || '').trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    } catch {
      throw new HttpError(400, 'Dat is geen geldige link.');
    }
    const type = sourceType(parsed.href);
    let result;
    try {
      if (type === 'tiktok') {
        result = await importTikTok(parsed.href);
      } else {
        const { text, finalUrl } = await fetchText(parsed.href);
        result = extractRecipe(text, finalUrl);
        result.source_name = new URL(finalUrl).hostname.replace(/^www\./, '');
        if (type === 'instagram' && !result.found) {
          result = fromCaption(instagramCaption(result.description), { ...result, title: '', source_name: 'Instagram' });
        }
      }
    } catch (err) {
      // Lukt het ophalen niet (bv. Instagram blokkeert), dan bewaren we gewoon de link.
      return json({
        found: false,
        partial: true,
        message: err instanceof HttpError ? err.message : 'Kon de pagina niet ophalen.',
        title: '', ingredients: [], steps: [], tags: [], image_url: null,
        source_url: parsed.href, source_type: type,
      });
    }
    return json({ ...result, source_url: parsed.href, source_type: type });
  },
});
