// Compartilhar closet ou look com outra pessoa que também usa o Meu Closet.
// O arquivo .zip leva só as peças, looks e fotos escolhidos — nada do resto do seu app.
import * as db from './db.js';
import { S, save, profile, item, look, lookItems, deleteItem, deleteLook, clearPhotoCache, invalidate } from './store.js';
import { makeZip } from './zip.js';
import { uid, deliverFile, todayStr } from './util.js';

const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

async function pack(scope, profs, items, looks, title) {
  const clean = it => { const c = { ...it }; delete c.seedLastUsed; delete c.price; delete c.purchaseDate; delete c.statusNote; delete c.location; return c; };
  const data = {
    app: 'meu-closet', kind: 'share', scope, exportedAt: new Date().toISOString(),
    profiles: profs.map(p => ({ id: p.sharedFrom || p.id, name: p.name, color: p.color, kind: p.kind, cartela: p.cartela || '', sizes: p.sizes || '' })),
    items: items.map(it => ({ ...clean(it), profileId: profile(it.profileId)?.sharedFrom || it.profileId })),
    looks: looks.map(l => ({ id: l.id, name: l.name, group: l.group || '', ocasiao: l.ocasiao || '', itemIds: l.itemIds, paleta: l.paleta || '', base: l.base || '', createdAt: l.createdAt })),
  };
  const entries = [{ name: 'share.json', data: JSON.stringify(data) }];
  const photoIds = new Set(items.flatMap(i => i.photos || []));
  for (const id of photoIds) {
    const p = await db.get('photos', id);
    if (!p) continue;
    entries.push({ name: `photos/${id}.jpg`, data: p.full });
    if (p.thumb) entries.push({ name: `photos/${id}.thumb.jpg`, data: p.thumb });
  }
  const zip = await makeZip(entries);
  return deliverFile(zip, `meu-closet-${slug(title)}-${todayStr()}.zip`);
}

// opts.withPrices: incluir preços (por padrão não vão)
export async function shareCloset(pid) {
  const p = profile(pid);
  const items = S.items.filter(i => i.profileId === pid && !['doada', 'vendida'].includes(i.status));
  const ids = new Set(items.map(i => i.id));
  const looks = S.looks.filter(l => (l.itemIds || []).length && l.itemIds.every(id => ids.has(id)));
  return pack('closet', [p], items, looks, 'closet-' + p.name);
}
export async function shareLook(lookId) {
  const l = look(lookId);
  const items = lookItems(l);
  const profs = [...new Set(items.map(i => i.profileId))].map(profile).filter(Boolean);
  return pack('look', profs, items, [l], 'look-' + l.name);
}

// Recebe o arquivo: cada pessoa vira um closet "compartilhado" no seu app.
// Receber de novo o closet da mesma pessoa atualiza (não duplica).
export async function importShare(zip, data) {
  const pmap = new Map();   // id de origem -> perfil local
  for (const sp of data.profiles || []) {
    let local = S.profiles.find(p => p.sharedFrom === sp.id);
    if (!local) local = { id: uid(), sharedFrom: sp.id, createdAt: todayStr() };
    Object.assign(local, { name: sp.name, color: sp.color, kind: sp.kind || 'adulto', cartela: sp.cartela || local.cartela || '', sizes: sp.sizes || '', sharedAt: data.exportedAt });
    await save('profiles', local);
    pmap.set(sp.id, local);
  }
  const tag = sp => 's' + String(sp).slice(-6) + '-';
  const mapItem = it => tag(it.profileId) + it.id;
  const mapPhoto = (it, ph) => tag(it.profileId) + ph;
  const newIds = new Set((data.items || []).map(mapItem));
  // closet inteiro: o que a pessoa tirou do closet dela some daqui também
  if (data.scope === 'closet') {
    for (const sp of data.profiles || []) {
      const local = pmap.get(sp.id);
      for (const old of S.items.filter(i => i.profileId === local.id && !newIds.has(i.id))) await deleteItem(old.id);
    }
  }
  let nItems = 0;
  for (const it of data.items || []) {
    const local = pmap.get(it.profileId);
    if (!local) continue;
    const photos = [];
    const labels = {};
    for (const ph of it.photos || []) {
      const full = await zip.blob(`photos/${ph}.jpg`, 'image/jpeg');
      if (!full) continue;
      const thumb = await zip.blob(`photos/${ph}.thumb.jpg`, 'image/jpeg') || full;
      const id = mapPhoto(it, ph);
      await db.put('photos', { id, full, thumb });
      photos.push(id);
      if (it.photoLabels?.[ph]) labels[id] = it.photoLabels[ph];
    }
    const old = item(mapItem(it));
    await save('items', { ...it, id: mapItem(it), profileId: local.id, photos, photoLabels: labels, shared: true, status: old?.status || it.status || 'armario' });
    nItems++;
  }
  const byOrigin = new Map((data.items || []).map(it => [it.id, mapItem(it)]));
  let nLooks = 0;
  for (const l of data.looks || []) {
    const itemIds = (l.itemIds || []).map(id => byOrigin.get(id)).filter(Boolean);
    if (!itemIds.length) continue;
    const id = 'sl-' + l.id;
    await save('looks', { ...l, id, itemIds, shared: true, sharedBy: [...pmap.values()].map(p => p.name).join(' e ') });
    nLooks++;
  }
  clearPhotoCache();
  invalidate();
  return { names: [...pmap.values()].map(p => p.name), nItems, nLooks, scope: data.scope };
}
