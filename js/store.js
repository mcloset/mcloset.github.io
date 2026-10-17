// Estado do app em memória + gravação no banco local.
import * as db from './db.js';
import { GONE, CODE_PREFIX } from './catalog.js';
import { todayStr, daysBetween, climaDoMes, uid } from './util.js';

export const LIST_STORES = ['profiles', 'items', 'looks', 'events', 'trips', 'wishes'];
export const S = { profiles: [], items: [], looks: [], events: [], trips: [], wishes: [], settings: {} };

const DEFAULT_SETTINGS = { id: 'settings', backupDays: 7, lastBackup: null, currentProfile: null, view: 'grid' };

export async function load() {
  for (const s of LIST_STORES) S[s] = await db.getAll(s);
  S.settings = { ...DEFAULT_SETTINGS, ...(await db.get('meta', 'settings') || {}) };
  if (!S.profiles.length) {
    const p = { id: uid(), name: 'Eu', kind: 'adulto', color: '#7A2340', createdAt: todayStr() };
    await save('profiles', p);
    S.settings.currentProfile = p.id;
    await saveSettings();
  }
  if (!S.profiles.find(p => p.id === S.settings.currentProfile)) S.settings.currentProfile = S.profiles[0].id;
  // dá código para peças antigas que ainda não têm
  for (const it of S.items.filter(i => !i.code)) { it.code = nextCode(it); await db.put('items', it); }
  invalidate();
}

// Código curto da peça, ex.: CIM-007 (pode ser trocado na edição)
export function nextCode(it) {
  const pre = CODE_PREFIX[it.category] || 'PEC';
  let max = 0;
  for (const o of S.items) {
    const m = String(o.code || '').match(new RegExp('^' + pre + '-(\\d+)$'));
    if (m) max = Math.max(max, +m[1]);
  }
  return `${pre}-${String(max + 1).padStart(3, '0')}`;
}

export async function save(store, obj) {
  obj.updatedAt = new Date().toISOString();
  await db.put(store, obj);
  const arr = S[store];
  const i = arr.findIndex(o => o.id === obj.id);
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  invalidate();
  return obj;
}
export async function remove(store, id) {
  await db.del(store, id);
  S[store] = S[store].filter(o => o.id !== id);
  invalidate();
}
export async function saveSettings() { await db.put('meta', S.settings); }

export const curProfile = () => S.profiles.find(p => p.id === S.settings.currentProfile) || S.profiles[0];
export const profile = id => S.profiles.find(p => p.id === id);
export const item = id => S.items.find(i => i.id === id);
export const look = id => S.looks.find(l => l.id === id);
export const isActive = it => !GONE.includes(it.status);
export const profileItems = (pid, { all = false } = {}) => S.items.filter(i => i.profileId === pid && (all || isActive(i)));
export const lookItems = lk => (lk.itemIds || []).map(item).filter(Boolean);
export const lookProfiles = lk => [...new Set(lookItems(lk).map(i => i.profileId))].map(profile).filter(Boolean);

// ---------- uso / termômetro ----------
let _usage = null;
export function invalidate() { _usage = null; }
function usage() {
  if (_usage) return _usage;
  const items = new Map(), looks = new Map();
  const bump = (m, id, date) => { const u = m.get(id) || { uses: 0, last: null, dates: [] }; u.uses++; u.dates.push(date); if (!u.last || date > u.last) u.last = date; m.set(id, u); };
  for (const e of S.events) {
    if (e.status !== 'registrado') continue;
    for (const id of new Set(e.itemIds || [])) bump(items, id, e.date);
    if (e.lookId) bump(looks, e.lookId, e.date);
  }
  _usage = { items, looks };
  return _usage;
}
export function itemUsage(it) {
  const u = usage().items.get(it.id) || { uses: 0, last: null, dates: [] };
  let last = u.last;
  if (it.seedLastUsed && (!last || it.seedLastUsed > last)) last = it.seedLastUsed;
  return { uses: u.uses, last, registeredLast: u.last };
}
export const lookUsage = lk => usage().looks.get(lk.id) || { uses: 0, last: null };

export function outOfSeason(it, clima = climaDoMes()) {
  const c = it.climas || [];
  if (!c.length || c.includes('meia') || clima === 'meia') return false;
  return !c.includes(clima);
}
export function daysUnused(it, today = todayStr()) {
  const { last } = itemUsage(it);
  return daysBetween(last || (it.createdAt || today).slice(0, 10), today);
}
export function itemBand(it, today = todayStr()) {
  const { last } = itemUsage(it);
  const created = (it.createdAt || today).slice(0, 10);
  if (!last && daysBetween(created, today) < 30) return 'avaliacao';
  const days = daysBetween(last || created, today);
  if (days <= 30) return 'recente';
  if (days <= 60) return 'regular';
  if (outOfSeason(it)) return 'fora';
  if (days <= 90) return 'esfriando';
  if (days < 120) return 'alerta';
  return 'esquecida';
}
export function costPerUse(price, uses) {
  if (price == null || price === '') return null;
  return uses > 0 ? price / uses : price;
}
export const lookPrice = lk => lookItems(lk).reduce((s, i) => s + (Number(i.price) || 0), 0);

// peça possivelmente pequena para criança (tamanho numérico menor que o atual)
export function maybeSmall(it) {
  const p = profile(it.profileId);
  if (!p || p.kind !== 'crianca') return false;
  const cur = parseFloat(p.sizeNow), sz = parseFloat(it.size);
  return !isNaN(cur) && !isNaN(sz) && sz < cur;
}

// ---------- fotos ----------
const urlCache = new Map();
export async function photoURL(id, size = 'thumb') {
  if (!id) return '';
  const k = id + ':' + size;
  if (urlCache.has(k)) return urlCache.get(k);
  const p = await db.get('photos', id);
  if (!p) return '';
  const b = size === 'full' ? p.full : (p.thumb || p.full);
  const u = URL.createObjectURL(b);
  urlCache.set(k, u);
  return u;
}
export async function getPhoto(id) { return db.get('photos', id); }
export async function savePhoto({ full, thumb }) {
  const id = uid();
  await db.put('photos', { id, full, thumb });
  return id;
}
export async function deletePhotos(ids) {
  ids = ids.filter(Boolean);
  for (const id of ids) for (const s of ['thumb', 'full']) { const k = id + ':' + s; if (urlCache.has(k)) { URL.revokeObjectURL(urlCache.get(k)); urlCache.delete(k); } }
  await db.delMany('photos', ids);
}
export function clearPhotoCache() {
  for (const u of urlCache.values()) URL.revokeObjectURL(u);
  urlCache.clear();
}

// ---------- exclusões em cascata ----------
export async function deleteItem(id) {
  const it = item(id);
  if (!it) return;
  for (const lk of S.looks.filter(l => (l.itemIds || []).includes(id))) {
    lk.itemIds = lk.itemIds.filter(x => x !== id);
    await save('looks', lk);
  }
  await deletePhotos(it.photos || []);
  await remove('items', id);
}
export async function deleteLook(id) {
  for (const e of S.events.filter(e => e.lookId === id)) {
    if (e.status === 'registrado') { e.lookId = null; await save('events', e); }   // mantém o histórico de uso das peças
    else await remove('events', e.id);
  }
  for (const t of S.trips) {
    let changed = false;
    for (const d of t.days || []) { const n = (d.lookIds || []).filter(x => x !== id); if (n.length !== (d.lookIds || []).length) { d.lookIds = n; changed = true; } }
    if (changed) await save('trips', t);
  }
  await remove('looks', id);
}
export async function deleteEvent(id) {
  const e = S.events.find(x => x.id === id);
  if (e?.photoId) await deletePhotos([e.photoId]);
  await remove('events', id);
}
export async function deleteProfile(id) {
  for (const it of S.items.filter(i => i.profileId === id)) await deleteItem(it.id);
  for (const lk of S.looks.filter(l => !(l.itemIds || []).length)) await deleteLook(lk.id);
  for (const w of S.wishes.filter(w => w.profileId === id)) await remove('wishes', w.id);
  await remove('profiles', id);
  if (S.settings.currentProfile === id) { S.settings.currentProfile = S.profiles[0]?.id; await saveSettings(); }
}
