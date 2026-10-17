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

export async function getAll(store) {
  const d = await open();
  return req(d.transaction(store).objectStore(store).getAll());
}
export async function get(store, id) {
  const d = await open();
  return req(d.transaction(store).objectStore(store).get(id));
}
export async function getAllKeys(store) {
  const d = await open();
  return req(d.transaction(store).objectStore(store).getAllKeys());
}
export async function put(store, obj) {
  const d = await open();
  const t = d.transaction(store, 'readwrite');
  t.objectStore(store).put(obj);
  return done(t);
}
export async function putMany(store, arr) {
  if (!arr.length) return;
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
