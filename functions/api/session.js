import { json, route } from '../../server/db.js';

// De middleware heeft al gecontroleerd dat je ingelogd bent.
export const onRequest = route({ GET: () => json({ ok: true }) });
