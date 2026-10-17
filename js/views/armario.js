import { S, curProfile, profileItems, itemBand, itemUsage, saveSettings } from '../store.js';
import { CATEGORIES, BANDS, CLIMAS, STATUS, OCASIOES, GONE, ESTILOS, ESTAMPAS, PIRAMIDE, CARTELAS, cartelaName } from '../catalog.js';
import { FAMILIES } from '../color.js';
import { header, icon, chips, itemCard, itemRow, hydrate, openSheet, closeSheet, choose, nav, emptyState, avatar, textSheet } from '../ui.js';
import { closetPrompt, PURPOSES } from '../describe.js';
import { todayCardHTML, happyCard, placeSheet } from '../fun.js';
import { $, esc, norm, todayStr, daysBetween, brl, toast } from '../util.js';

const BLANK = { clima: '', family: '', status: 'ativas', ocasiao: '', sort: 'recentes', brand: '', tag: '', estilo: '', cartela: '', estampa: '', piramide: '', color: '', extra: '' };
const F = { q: '', cat: 'tudo', band: 'tudo', ...BLANK };
const EXTRA = [
  { id: 'semlook', name: 'Em nenhum look' }, { id: 'semfoto', name: 'Sem foto' }, { id: 'sempreco', name: 'Sem preço' },
  { id: 'semficha', name: 'Sem descrição' }, { id: 'naousada', name: 'Nunca usada' }, { id: 'pendente', name: 'Para conferir' },
];
const ADV = ['clima', 'family', 'ocasiao', 'brand', 'tag', 'estilo', 'cartela', 'estampa', 'piramide', 'color', 'extra'];

// usado pelo Painel: abre o closet já filtrado
export function applyFilter(f) {
  Object.assign(F, { q: '', cat: 'tudo', band: 'tudo', ...BLANK }, f);
}
const activeLabel = k => {
  const v = F[k];
  if (k === 'clima') return CLIMAS.find(c => c.id === v)?.name;
  if (k === 'family') return FAMILIES[v] || 'Colorido / estampado';
  if (k === 'cartela') return cartelaName(v);
  if (k === 'piramide') return PIRAMIDE.find(x => x.id === v)?.name;
  if (k === 'tag') return '#' + v;
  if (k === 'extra') return EXTRA.find(x => x.id === v)?.name;
  return v;
};

export function render(main) {
  const p = curProfile();
  const all = profileItems(p.id, { all: true });
  const view = S.settings.view || 'grid';
  const extra = ADV.filter(k => F[k]).length + (F.status !== 'ativas' ? 1 : 0) + (F.sort !== 'recentes' ? 1 : 0);
  main.innerHTML = `
    ${header('MCLOSET', { logo: true, right: `<a class="icon-btn" href="#/painel" aria-label="Painel">${icon('chart')}</a>`, sub: S.profiles.length > 1 ? 'Closet de ' + esc(p.name) + (p.sharedFrom ? ' (compartilhado)' : '') : '' })}
    ${backupBanner()}
    ${pendingBanner()}
    ${S.items.length ? todayCardHTML() : ''}
    ${S.items.length ? happyCard(S.profiles.filter(x => !x.sharedFrom).map(x => x.id), { compact: true }) : ''}
    <div class="toolbar">
      <label class="search">${icon('search')}<input id="q" type="search" placeholder="Buscar peças, marcas, tags…" value="${esc(F.q)}"></label>
      <div class="seg">
        <button class="${view === 'grid' ? 'on' : ''}" data-act="view" data-v="grid" aria-label="Grade">${icon('grid')}</button>
        <button class="${view === 'list' ? 'on' : ''}" data-act="view" data-v="list" aria-label="Lista">${icon('list')}</button>
      </div>
      <button class="icon-btn boxed ${extra ? 'badge' : ''}" data-act="filters" aria-label="Filtros" data-n="${extra || ''}">${icon('settings')}</button>
    </div>
    ${ADV.some(k => F[k]) ? `<div class="active-f">${ADV.filter(k => F[k]).map(k => `<button class="chip on" data-act="unf" data-v="${k}">${esc(activeLabel(k) || '')} ${icon('x')}</button>`).join('')}<button class="link small" data-act="unf-all">limpar</button></div>` : ''}
    <div class="sticky-chips">
      ${chips([{ id: 'tudo', name: 'Tudo' }, ...CATEGORIES], F.cat, 'cat')}
      ${chips([{ id: 'tudo', name: 'Tudo' }, ...BANDS], F.band, 'band', { dots: true })}
    </div>
    <div id="grid"></div>
    <button class="fab" data-act="fab" aria-label="Adicionar">${icon('plus')}</button>`;
  renderGrid(all);

  main.oninput = e => { if (e.target.id === 'q') { F.q = e.target.value; renderGrid(all); } };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'cat') { F.cat = v; nav.refresh(); }
    else if (act === 'band') { F.band = v; nav.refresh(); }
    else if (act === 'view') { S.settings.view = v; await saveSettings(); nav.refresh(); }
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'filters') openFilters(all);
    else if (act === 'wx-place') placeSheet();
    else if (act === 'unf') { F[v] = ''; nav.refresh(); }
    else if (act === 'unf-all') { applyFilter({ cat: F.cat, band: F.band }); nav.refresh(); }
    else if (act === 'fab') {
      const r = await choose('Adicionar', [
        { name: 'Nova peça', desc: 'uma peça com uma ou várias fotos', icon: 'hanger', value: '#/nova-peca' },
        { name: 'Importar em lote', desc: 'escolha a pasta com fotos e fichas — junta tudo pelo código', icon: 'box', value: '#/lote' },
        { name: 'Antes de comprar', desc: 'compare uma peça da loja com o seu closet', icon: 'bag', value: '#/comprar' },
        { name: 'Exportar descrição do closet', desc: 'gera um prompt com todas as peças, uma por uma', icon: 'file', value: 'export' },
      ]);
      if (r === 'export') exportSheet(filtered(all));
      else if (r) nav.go(r);
    }
  };
}

function pendingBanner() {
  const n = S.items.filter(i => i.pendente).length;
  return n ? `<a class="banner conf" href="#/conferir">${icon('check')}<span>${n} peça${n > 1 ? 's' : ''} importada${n > 1 ? 's' : ''} para conferir. <b>Conferir</b></span></a>` : '';
}

function backupBanner() {
  if (!S.items.length) return '';
  const last = S.settings.lastBackup;
  const days = last ? daysBetween(last.slice(0, 10), todayStr()) : null;
  if (days != null && days < (S.settings.backupDays || 7)) return '';
  return `<a class="banner" href="#/backup">${icon('download')}<span>${days == null ? 'Você ainda não fez nenhum backup.' : `Faz ${days} dias desde o último backup.`} <b>Fazer agora</b></span></a>`;
}

function filtered(all) {
  const q = norm(F.q);
  let list = all.filter(it => {
    if (F.status === 'ativas' && GONE.includes(it.status)) return false;
    if (F.status !== 'ativas' && F.status !== 'todas' && it.status !== F.status) return false;
    if (F.cat !== 'tudo' && it.category !== F.cat) return false;
    if (F.band !== 'tudo' && itemBand(it) !== F.band) return false;
    if (F.clima && !(it.climas || []).includes(F.clima)) return false;
    if (F.family && it.family !== F.family && !(it.colors || []).some(c => c.family === F.family)) return false;
    if (F.ocasiao && !(it.ocasioes || []).includes(F.ocasiao)) return false;
    if (F.brand && (it.brand || '') !== F.brand) return false;
    if (F.tag && !(it.tags || []).includes(F.tag)) return false;
    if (F.estilo && it.estilo !== F.estilo) return false;
    if (F.cartela && it.cartela !== F.cartela) return false;
    if (F.estampa && (it.estampa || 'Lisa') !== F.estampa) return false;
    if (F.piramide && it.piramide !== F.piramide) return false;
    if (F.color && !(it.colors || []).some(c => c.name === F.color)) return false;
    if (F.extra === 'semlook' && S.looks.some(l => (l.itemIds || []).includes(it.id))) return false;
    if (F.extra === 'semfoto' && (it.photos || []).length) return false;
    if (F.extra === 'sempreco' && it.price) return false;
    if (F.extra === 'semficha' && it.descricao) return false;
    if (F.extra === 'naousada' && itemUsage(it).uses) return false;
    if (F.extra === 'pendente' && !it.pendente) return false;
    if (q) {
      const hay = norm([it.name, it.sub, it.brand, (it.tags || []).join(' '), (it.colors || []).map(c => c.name).join(' '), it.location, it.notes].join(' '));
      if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  });
  const by = {
    recentes: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
    nome: (a, b) => a.name.localeCompare(b.name),
    mais: (a, b) => itemUsage(b).uses - itemUsage(a).uses,
    menos: (a, b) => itemUsage(a).uses - itemUsage(b).uses,
    preco: (a, b) => (b.price || 0) - (a.price || 0),
  }[F.sort];
  return list.sort(by);
}

function renderGrid(all) {
  const box = $('#grid');
  if (!all.length) {
    box.innerHTML = emptyState('Seu closet ainda está vazio.<br>Cadastre a primeira peça ou importe várias fotos de uma vez.', 'hanger',
      `<div class="row-btns"><a class="btn" href="#/nova-peca">Nova peça</a><a class="btn ghost" href="#/lote">Importar em lote</a></div><a class="link" href="#/guia">Como preparar as fotos</a>`);
    return;
  }
  const list = filtered(all);
  if (!list.length) { box.innerHTML = emptyState('Nenhuma peça com esses filtros.', 'search'); return; }
  const count = `<div class="count">${list.length} ${list.length === 1 ? 'peça' : 'peças'}</div>`;
  if (S.settings.view === 'list') {
    box.innerHTML = count + `<div class="rows">${list.map(it => {
      const u = itemUsage(it);
      return itemRow(it, `<span class="muted small">${u.uses} uso${u.uses === 1 ? '' : 's'}${it.price ? '<br>' + brl(it.price) : ''}</span>`);
    }).join('')}</div>`;
  } else {
    box.innerHTML = count + `<div class="igrid">${list.map(it => itemCard(it)).join('')}</div>`;
  }
  hydrate(box);
}

function openFilters(all) {
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((x, y) => x.localeCompare(y));
  const brands = uniq(all.map(i => i.brand));
  const tags = uniq(all.flatMap(i => i.tags || []));
  const colors = uniq(all.flatMap(i => (i.colors || []).map(c => c.name)));
  const sel = (key, opts, label = 'Todas') => `<select data-fs="${key}"><option value="">${label}</option>${opts.map(o => { const id = typeof o === 'string' ? o : o.id, nm = typeof o === 'string' ? o : o.name; return `<option value="${esc(id)}" ${F[key] === id ? 'selected' : ''}>${esc(nm)}</option>`; }).join('')}</select>`;
  const draw = () => `
    <div class="field"><label>Clima</label>${chips([{ id: '', name: 'Todos' }, ...CLIMAS.map(c => ({ id: c.id, name: c.icon + ' ' + c.name }))], F.clima, 'f-clima')}</div>
    <div class="field"><label>Paleta</label>${chips([{ id: '', name: 'Todas' }, ...Object.entries(FAMILIES).map(([id, name]) => ({ id, name })), { id: 'estampado', name: 'Colorido / estampado' }], F.family, 'f-family')}</div>
    <div class="field"><label>Estilo</label>${chips([{ id: '', name: 'Todos' }, ...ESTILOS.map(e => ({ id: e, name: e }))], F.estilo, 'f-estilo')}</div>
    <div class="field"><label>Ocasião</label>${chips([{ id: '', name: 'Todas' }, ...OCASIOES.map(o => ({ id: o, name: o }))], F.ocasiao, 'f-ocasiao')}</div>
    <div class="grid2">
      <div class="field"><label>Cor</label>${sel('color', colors)}</div>
      <div class="field"><label>Estampa</label>${sel('estampa', ESTAMPAS)}</div>
      <div class="field"><label>Marca / loja</label>${sel('brand', brands)}</div>
      <div class="field"><label>Tag</label>${sel('tag', tags.map(t => ({ id: t, name: '#' + t })))}</div>
      <div class="field"><label>Cartela</label>${sel('cartela', CARTELAS)}</div>
      <div class="field"><label>Pirâmide</label>${sel('piramide', PIRAMIDE)}</div>
    </div>
    <div class="field"><label>Organização</label>${chips([{ id: '', name: 'Todas' }, ...EXTRA], F.extra, 'f-extra')}</div>
    <div class="field"><label>Situação</label>${chips([{ id: 'ativas', name: 'No closet' }, { id: 'todas', name: 'Todas (inclui doadas)' }, ...STATUS.filter(s => s.id !== 'armario').map(s => ({ id: s.id, name: s.name }))], F.status, 'f-status')}</div>
    <div class="field"><label>Ordenar por</label>${chips([{ id: 'recentes', name: 'Mais recentes' }, { id: 'nome', name: 'Nome' }, { id: 'mais', name: 'Mais usadas' }, { id: 'menos', name: 'Menos usadas' }, { id: 'preco', name: 'Maior preço' }], F.sort, 'f-sort')}</div>
    <div class="row-btns"><button class="btn ghost" data-act="f-clear">Limpar</button><button class="btn" data-act="f-ok">Ver peças</button></div>`;
  const body = openSheet(draw(), {
    title: 'Filtros',
    onInput: e => { const k = e.target.dataset?.fs; if (k) F[k] = e.target.value; },
    onAct: (act, el) => {
      const v = el.dataset.v;
      const map = { 'f-clima': 'clima', 'f-family': 'family', 'f-ocasiao': 'ocasiao', 'f-status': 'status', 'f-sort': 'sort', 'f-estilo': 'estilo', 'f-extra': 'extra' };
      if (map[act]) F[map[act]] = v;
      else if (act === 'f-clear') Object.assign(F, BLANK);
      else if (act === 'f-ok') { closeSheet(); nav.refresh(); return; }
      else return;
      body.innerHTML = draw();
    },
  });
}

// Exporta a descrição das peças como um texto pronto para colar numa IA
export function exportSheet(visible = null) {
  const o = { pids: [curProfile().id], purpose: 'looks', usage: true, price: false, scope: 'todas' };
  const hasFilter = visible && visible.length !== profileItems(curProfile().id).length;
  const draw = () => {
    const n = pickItems().length;
    return `
    <div class="field"><label>De quem</label><div class="chips">${S.profiles.map(p => `<button class="chip ${o.pids.includes(p.id) ? 'on' : ''}" data-act="who" data-v="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
    ${hasFilter ? `<div class="field"><label>Quais peças</label>${chips([{ id: 'todas', name: 'Todas' }, { id: 'filtradas', name: `Só as ${visible.length} filtradas` }], o.scope, 'scope')}</div>` : ''}
    <div class="field"><label>Para quê</label><div class="menu">${PURPOSES.map(p => `<button class="menu-item" data-act="purpose" data-v="${p.id}">${icon(o.purpose === p.id ? 'checkCircle' : 'file')}<span>${p.name}<small>${p.desc}</small></span></button>`).join('')}</div></div>
    <label class="ck"><input type="checkbox" id="xu" ${o.usage ? 'checked' : ''}><span>Incluir uso e termômetro</span></label>
    <label class="ck"><input type="checkbox" id="xp" ${o.price ? 'checked' : ''}><span>Incluir preços</span></label>
    <button class="btn block" data-act="go">Gerar descrição (${n} peça${n === 1 ? '' : 's'})</button>`;
  };
  const pickItems = () => (o.scope === 'filtradas' && hasFilter ? visible : S.items.filter(i => o.pids.includes(i.profileId) && !GONE.includes(i.status)));
  const body = openSheet(draw(), {
    title: 'Exportar descrição do closet',
    onAct: (act, el) => {
      o.usage = $('#xu').checked; o.price = $('#xp').checked;
      const v = el.dataset.v;
      if (act === 'who') { o.pids = o.pids.includes(v) ? (o.pids.length > 1 ? o.pids.filter(x => x !== v) : o.pids) : [...o.pids, v]; o.scope = 'todas'; }
      else if (act === 'scope') o.scope = v;
      else if (act === 'purpose') o.purpose = v;
      else if (act === 'go') {
        const its = pickItems();
        if (!its.length) return toast('Nenhuma peça para exportar.');
        const names = [...new Set(its.map(i => i.profileId))].map(id => S.profiles.find(p => p.id === id)?.name).join(' e ');
        const txt = closetPrompt(its, { purpose: o.purpose, usage: o.usage, price: o.price, title: 'GUARDA-ROUPA DE ' + names.toUpperCase() });
        closeSheet();
        return textSheet('Descrição do closet', txt, `closet-${names.replace(/\s+/g, '-').toLowerCase()}.txt`);
      }
      body.innerHTML = draw();
    },
  });
}
