// In-memory dossier store
// Stores dossier data and progress events keyed by UUID
// Auto-expires entries after 1 hour

const dossiers = new Map();
const progress = new Map();

const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of dossiers) {
    if (now - entry.createdAt > EXPIRY_MS) {
      dossiers.delete(id);
      progress.delete(id);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// ── Dossier CRUD ────────────────────────────────────────────────

export function createDossier(id, input) {
  const entry = {
    id,
    input,
    status: 'pending',
    createdAt: Date.now(),
    rawData: {},
    synthesis: null,
    score: null,
    error: null,
  };
  dossiers.set(id, entry);
  progress.set(id, []);
  return entry;
}

export function getDossier(id) {
  return dossiers.get(id) || null;
}

export function updateDossier(id, updates) {
  const entry = dossiers.get(id);
  if (!entry) return null;
  Object.assign(entry, updates);
  return entry;
}

export function setDossierRawData(id, source, data) {
  const entry = dossiers.get(id);
  if (!entry) return;
  entry.rawData[source] = data;
}

export function setDossierSynthesis(id, synthesis) {
  const entry = dossiers.get(id);
  if (!entry) return;
  entry.synthesis = synthesis;
}

export function setDossierScore(id, score) {
  const entry = dossiers.get(id);
  if (!entry) return;
  entry.score = score;
}

// ── Progress Events ─────────────────────────────────────────────

export function addProgressEvent(id, event) {
  const events = progress.get(id);
  if (!events) return;
  events.push({ ...event, timestamp: Date.now() });
}

export function getProgressEvents(id, since = 0) {
  const events = progress.get(id);
  if (!events) return [];
  return events.filter(e => e.timestamp > since);
}

export function getLatestProgress(id) {
  const events = progress.get(id);
  if (!events || events.length === 0) return null;
  return events[events.length - 1];
}

// ── SSE Listeners ───────────────────────────────────────────────

const listeners = new Map();

export function addListener(id, callback) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id).add(callback);
  return () => listeners.get(id)?.delete(callback);
}

export function notifyListeners(id, event) {
  addProgressEvent(id, event);
  const cbs = listeners.get(id);
  if (cbs) {
    for (const cb of cbs) {
      try { cb(event); } catch (e) { /* ignore */ }
    }
  }
}
