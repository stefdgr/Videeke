import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { api, setUnauthorizedHandler } from './api.js';
import { match, navigate, useRoute } from './router.js';
import { resetStore } from './store.js';
import { Login } from './screens/Login.jsx';
import { Library } from './screens/Library.jsx';
import { RecipeView } from './screens/RecipeView.jsx';
import { RecipeEdit } from './screens/RecipeEdit.jsx';
import { AddRecipe } from './screens/AddRecipe.jsx';
import { Menus } from './screens/Menus.jsx';
import { MenuView } from './screens/MenuView.jsx';
import './styles.css';

// De deelknop (Web Share Target) opent /delen?url=...; dat zetten we om naar een hash-route.
if (location.pathname === '/delen') {
  const params = new URLSearchParams(location.search);
  const shared = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean).join(' ');
  history.replaceState(null, '', `/#/nieuw?gedeeld=${encodeURIComponent(shared)}`);
}

function Nav({ path }) {
  const tabs = [
    ['/', 'Recepten', '📖'],
    ['/nieuw', 'Toevoegen', '＋'],
    ['/menus', "Menu's", '🍽️'],
  ];
  const active = (p) => (p === '/' ? path === '/' || path.startsWith('/recept') : path.startsWith(p) || (p === '/menus' && path.startsWith('/menu')));
  return (
    <nav class="nav">
      <a class="brand" href="#/">
        <img class="brand-logo" src="/logo.svg" alt="" width="34" height="34" />
        Videeke
      </a>
      <div class="tabs">
        {tabs.map(([p, text, icon]) => (
          <a key={p} href={`#${p}`} class={active(p) ? 'tab active' : 'tab'}>
            <span class="tab-icon" aria-hidden="true">{icon}</span>
            <span>{text}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

function Screen({ route }) {
  const { path, query } = route;
  let m;
  if (path === '/') return <Library />;
  if (path === '/nieuw') return <AddRecipe shared={query.gedeeld} />;
  if (path === '/nieuw/formulier') return <RecipeEdit />;
  if ((m = match('/recept/:id/bewerken', path))) return <RecipeEdit id={m.id} />;
  if ((m = match('/recept/:id', path))) return <RecipeView id={m.id} />;
  if (path === '/menus') return <Menus />;
  if ((m = match('/menu/:id', path))) return <MenuView id={m.id} tab={query.tab} />;
  return (
    <div class="empty">
      <p>Deze pagina bestaat niet.</p>
      <a class="btn" href="#/">Naar mijn recepten</a>
    </div>
  );
}

function App() {
  const route = useRoute();
  const [auth, setAuth] = useState('checking');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetStore();
      setAuth('out');
    });
    api.session().then(() => setAuth('in')).catch(() => setAuth('out'));
  }, []);

  if (auth === 'checking') return <div class="loading">Even geduld…</div>;
  if (auth === 'out') return <Login onDone={() => setAuth('in')} />;
  return (
    <>
      <Nav path={route.path} />
      <main class="main">
        <Screen route={route} />
      </main>
    </>
  );
}

render(<App />, document.getElementById('app'));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

export { navigate };
