import { useEffect, useState } from 'preact/hooks';

// Hash-router: #/recept/abc -> { path: '/recept/abc', query: {...} }
function parse() {
  const hash = location.hash.slice(1) || '/';
  const [path, qs] = hash.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const navigate = (path) => {
  location.hash = path;
};

export function match(pattern, path) {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
