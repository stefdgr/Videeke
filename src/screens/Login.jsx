import { useState } from 'preact/hooks';
import { api } from '../api.js';

export function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div class="login">
      <form class="login-card" onSubmit={submit}>
        <img class="login-logo" src="/icon.svg" alt="" width="96" height="96" />
        <h1>Videeke</h1>
        <p class="muted">Je recepten om ooit (echt) te maken.</p>
        <label>
          Wachtwoord
          <input type="password" autoComplete="current-password" value={password} onInput={(e) => setPassword(e.target.value)} autoFocus required />
        </label>
        {error && <p class="error">{error}</p>}
        <button class="btn btn-primary" disabled={busy}>{busy ? 'Inloggen…' : 'Inloggen'}</button>
      </form>
    </div>
  );
}
