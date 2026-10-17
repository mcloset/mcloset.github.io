// Peças de interface reaproveitadas por todas as telas.
import { $, esc, toast, deliverFile } from './util.js';
import { S, curProfile, profile, photoURL, itemBand } from './store.js';
import { catName, band, CAT_ORDER, CARTELAS, SEASONS } from './catalog.js';

const P = {
  shirt: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 3.5a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  thermo: '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  suitcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 7v13M16 7v13"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 16v-5M13 16V7M18 16v-3"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
  wand: '<path d="m21.6 2.4-1.2-1.2a1.2 1.2 0 0 0-1.7 0L2.4 17.5a1.2 1.2 0 0 0 0 1.7l1.2 1.2a1.2 1.2 0 0 0 1.7 0L21.6 4.1a1.2 1.2 0 0 0 0-1.7Z"/><path d="m14 7 3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 21h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  hanger: '<path d="M12 7.5a2.2 2.2 0 1 1 2.2-2.2c0 1.1-1 1.5-2.2 2.5v1.1L3 15.3a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8l-9-6.4"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><path d="M7.5 7.5h.01"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  trend: '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};
export const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// navegação registrada pelo app.js (evita import circular)
export const nav = { refresh: () => {}, go: h => { location.hash = h; } };

export const initial = name => esc((name || '?').trim().charAt(0).toUpperCase());
export function avatar(p, size = '') {
  if (!p) return '';
  return `<span class="avatar ${size}" style="background:${p.color}">${p.photo ? `<img data-ph="${p.photo}" alt="">` : initial(p.name)}</span>`;
}

export function header(title, { back, right = '', logo = false, sub = '' } = {}) {
  const p = curProfile();
  return `<header class="top">
    ${back ? `<button class="icon-btn" data-back="${esc(back)}" aria-label="Voltar">${icon('back')}</button>` : ''}
    <div class="top-title"><h1 class="${logo ? 'logo' : ''}">${title}</h1>${sub ? `<div class="top-sub">${sub}</div>` : ''}</div>
    <div class="top-right">${right}<button class="avatar-btn" data-act="switch-profile" aria-label="Trocar perfil">${avatar(p)}</button></div>
  </header>`;
}

export function chips(list, active, act, { counts, dots } = {}) {
  return `<div class="chips">${list.map(c => {
    const id = typeof c === 'string' ? c : c.id;
    const nm = typeof c === 'string' ? c : c.name;
    const on = Array.isArray(active) ? active.includes(id) : active === id;
    const dot = dots && c.color ? `<span class="dot" style="background:${c.color}"></span>` : '';
    const ct = counts ? ` · ${counts[id] ?? 0}` : '';
    return `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(id)}">${dot}${esc(nm)}${ct}</button>`;
  }).join('')}</div>`;
}

export const swatch = (hex, size = '') => `<span class="sw ${size}" style="background:${esc(hex)}"></span>`;

export function itemCard(it, { score, selected, act = 'open-item', showBand = true } = {}) {
  const b = band(itemBand(it));
  return `<div class="icard ${selected ? 'sel' : ''}" data-act="${act}" data-id="${it.id}">
    <div class="ph">${it.photos?.[0] ? `<img data-ph="${it.photos[0]}" alt="">` : `<div class="noph">${icon('hanger')}</div>`}
      ${showBand ? `<span class="bdot" style="background:${b.color}" title="${b.name}"></span>` : ''}
      ${score != null ? `<span class="score ${score >= 80 ? 'hi' : score >= 65 ? 'mid' : 'lo'}">${score}%</span>` : ''}
      ${selected ? `<span class="selmark">${icon('check')}</span>` : ''}
      ${it.pendente ? '<span class="stbadge conf">Conferir</span>' : it.status && it.status !== 'armario' ? `<span class="stbadge">${esc(statusShort(it.status))}</span>` : ''}
    </div>
    <div class="nm">${esc(it.name)}</div>
    <div class="sub">${esc(catName(it.category))}</div>
  </div>`;
}
const statusShort = s => ({ lavanderia: 'Lavanderia', costureira: 'Costureira', emprestada: 'Emprestada', guardada: 'Guardada', pequena: 'Pequena', doada: 'Doada', vendida: 'Vendida' }[s] || '');

export function itemRow(it, right = '', act = 'open-item') {
  return `<div class="irow" data-act="${act}" data-id="${it.id}">
    <div class="thumb">${it.photos?.[0] ? `<img data-ph="${it.photos[0]}" alt="">` : icon('hanger')}</div>
    <div class="irow-main"><div class="nm">${esc(it.name)}</div><div class="sub">${right ? '' : esc(catName(it.category))}</div></div>
    <div class="irow-right">${right}</div>
  </div>`;
}

export const sortByCat = items => [...items].sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));

export function collage(items, cls = '') {
  const its = sortByCat(items);
  if (!its.length) return `<div class="collage empty ${cls}">${icon('hanger')}</div>`;
  const groups = new Map();
  for (const i of its) { if (!groups.has(i.profileId)) groups.set(i.profileId, []); groups.get(i.profileId).push(i); }
  const grid = list => {
    const n = list.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
    return `<div class="cg" style="--c:${cols}">${list.map(i => i.photos?.[0] ? `<img data-ph="${i.photos[0]}" alt="">` : `<div class="noph">${icon('hanger')}</div>`).join('')}</div>`;
  };
  if (groups.size > 1) {
    return `<div class="collage split ${cls}">${[...groups].map(([pid, list]) => `<div class="col">${grid(list)}<span class="who">${avatar(profile(pid), 'xs')}</span></div>`).join('')}</div>`;
  }
  return `<div class="collage ${cls}">${grid(its)}</div>`;
}

// carrega as fotos do banco só quando aparecem na tela
let io;
export function hydrate(root = document) {
  io ||= new IntersectionObserver(ents => {
    for (const e of ents) if (e.isIntersecting) { io.unobserve(e.target); loadImg(e.target); }
  }, { rootMargin: '400px' });
  root.querySelectorAll('img[data-ph]:not([src])').forEach(img => {
    if (!img.dataset.ph) return;
    if (img.dataset.eager) loadImg(img); else io.observe(img);
  });
}
async function loadImg(img) {
  const u = await photoURL(img.dataset.ph, img.dataset.size || 'thumb');
  if (u) img.src = u; else img.classList.add('missing');
}

// ---------- folha inferior (modal) ----------
let sheetHandler = null;
export function openSheet(html, { title = '', onAct, onInput, cls = '' } = {}) {
  const wrap = $('#sheet');
  wrap.innerHTML = `<div class="sheet-bg" data-close></div>
    <div class="sheet-panel ${cls}" role="dialog">
      <div class="grab"></div>
      ${title ? `<div class="sheet-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button></div>` : ''}
      <div class="sheet-body">${html}</div>
    </div>`;
  wrap.classList.add('open');
  document.body.classList.add('noscroll');
  sheetHandler = onAct;
  wrap.onclick = e => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const a = e.target.closest('[data-act]');
    if (a && sheetHandler) sheetHandler(a.dataset.act, a, e);
  };
  wrap.oninput = onInput || null;
  wrap.onchange = onInput || null;
  hydrate(wrap);
  return wrap.querySelector('.sheet-body');
}
export function closeSheet() {
  const wrap = $('#sheet');
  wrap.classList.remove('open');
  document.body.classList.remove('noscroll');
  wrap.innerHTML = '';
  sheetHandler = null;
}

// escolha simples numa lista
export function choose(title, options) {
  return new Promise(res => {
    let done = false;
    openSheet(`<div class="menu">${options.map((o, i) => `<button class="menu-item" data-act="pick" data-i="${i}">${o.icon ? icon(o.icon) : ''}<span>${esc(o.name)}${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</span></button>`).join('')}</div>`, {
      title, onAct: (act, el) => { if (act === 'pick') { done = true; closeSheet(); res(options[+el.dataset.i].value ?? options[+el.dataset.i]); } },
    });
    const obs = new MutationObserver(() => { if (!$('#sheet').classList.contains('open')) { obs.disconnect(); if (!done) res(null); } });
    obs.observe($('#sheet'), { attributes: true });
  });
}

export function emptyState(text, iconName = 'hanger', extra = '') {
  return `<div class="empty-state">${icon(iconName)}<p>${text}</p>${extra}</div>`;
}

export function cartelaSelect(field, value, emptyLabel = '—') {
  return `<select data-f="${field}" id="sel-${field}"><option value="">${emptyLabel}</option>${SEASONS.map(s => `<optgroup label="${s.name}">${CARTELAS.filter(c => c.season === s.id).map(c => `<option value="${c.id}" ${c.id === value ? 'selected' : ''}>${c.name}</option>`).join('')}</optgroup>`).join('')}</select>`;
}

export const profilesOptions =(sel) => S.profiles.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

// Mostra um texto grande com botões de copiar e salvar como arquivo .txt
export function textSheet(title, text, filename = 'texto.txt') {
  openSheet(`<p class="small muted">${text.length.toLocaleString('pt-BR')} caracteres. Copie e cole na IA, ou salve o arquivo.</p>
    <textarea class="bigtext" id="bigtext" readonly>${esc(text)}</textarea>
    <div class="row-btns wide"><button class="btn" data-act="copy">${icon('copy')} Copiar</button><button class="btn ghost" data-act="save">${icon('download')} Salvar .txt</button></div>`, {
    title, cls: 'tall',
    onAct: async act => {
      if (act === 'copy') {
        try { await navigator.clipboard.writeText(text); toast('Copiado!'); }
        catch { const t = $('#bigtext'); t.focus(); t.select(); toast('Texto selecionado — toque em Copiar.'); }
      } else if (act === 'save') deliverFile(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
    },
  });
}
