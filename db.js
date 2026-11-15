// Banco local (IndexedDB) — tudo fica salvo no próprio aparelho.
const DB_NAME = 'meu-closet';
const VERSION = 1;
export const STORES = ['profiles', 'items', 'photos', 'looks', 'events', 'trips', 'wishes', 'meta'];

let dbPromise;
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbPromise;
}

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error); });

// ---------- fotos ----------
// No iPhone (Safari), fotos guardadas como Blob no banco podem virar link quebrado,
// principalmente no app instalado na tela de início. Por isso as fotos são guardadas
// como bytes (ArrayBuffer) e viram Blob só na hora de mostrar.
const isBlob = v => typeof Blob !== 'undefined' && v instanceof Blob;
async function photoToStore(p) {
  const o = { ...p };
  for (const k of ['full', 'thumb']) {
    if (isBlob(o[k])) { o.type = o[k].type || o.type || 'image/jpeg'; o[k] = await o[k].arrayBuffer(); }
  }
  o.type ||= 'image/jpeg';
  return o;
}
function photoFromStore(p) {
  if (!p) return p;
  const o = { ...p };
  for (const k of ['full', 'thumb']) if (o[k] && !isBlob(o[k])) o[k] = new Blob([o[k]], { type: o.type || 'image/jpeg' });
  return o;
}

export async function getAll(store) {
  const d = await open();
  const all = await req(d.transaction(store).objectStore(store).getAll());
  return store === 'photos' ? all.map(photoFromStore) : all;
}
export async function get(store, id) {
  const d = await open();
  const v = await req(d.transaction(store).objectStore(store).get(id));
  return store === 'photos' ? photoFromStore(v) : v;
}
// leitura sem conversão (usada para migrar fotos antigas)
export async function getRaw(store, id) {
  const d = await open();
  return req(d.transaction(store).objectStore(store).get(id));
}
export async function getAllKeys(store) {
  const d = await open();
  return req(d.transaction(store).objectStore(store).getAllKeys());
}
export async function put(store, obj) {
  if (store === 'photos') obj = await photoToStore(obj);   // converte ANTES de abrir a transação
  const d = await open();
  const t = d.transaction(store, 'readwrite');
  t.objectStore(store).put(obj);
  return done(t);
}
export async function putMany(store, arr) {
  if (!arr.length) return;
  if (store === 'photos') arr = await Promise.all(arr.map(photoToStore));
  const d = await open();
  const t = d.transaction(store, 'readwrite');
  const s = t.objectStore(store);
  for (const o of arr) s.put(o);
  return done(t);
}
export async function del(store, id) {
  const d = await open();
  const t = d.transaction(store, 'readwrite');
  t.objectStore(store).delete(id);
  return done(t);
}
export async function delMany(store, ids) {
  if (!ids.length) return;
  const d = await open();
  const t = d.transaction(store, 'readwrite');
  const s = t.objectStore(store);
  for (const id of ids) s.delete(id);
  return done(t);
}
export async function clearAll() {
  const d = await open();
  const t = d.transaction(STORES, 'readwrite');
  for (const s of STORES) t.objectStore(s).clear();
  return done(t);
}

// Converte fotos antigas (guardadas como Blob) para bytes. Devolve quantas não puderam ser lidas.
export async function migratePhotos() {
  const keys = await getAllKeys('photos');
  let broken = 0;
  for (const id of keys) {
    const raw = await getRaw('photos', id);
    if (!raw || (!isBlob(raw.full) && !isBlob(raw.thumb))) continue;
    try { await put('photos', raw); }
    catch { broken++; }
  }
  return broken;
}
