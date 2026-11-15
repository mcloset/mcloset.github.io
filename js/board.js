// Quadro do look: as peças soltas num fundo branco, para arrastar (blusa em cima da calça,
// sapato embaixo, bolsa do lado…). A posição de cada peça fica salva no look (look.layout).
// layout = { idDaPeca: { x, y, w, z } } — x, y e w em % do quadro; z = qual fica na frente.
import { item, getPhoto } from './store.js';
import { loadImage } from './images.js';
import { icon } from './ui.js';

// onde cada tipo de peça começa, se a pessoa ainda não arrastou
const SPOT = {
  casacos: { x: 4, y: 4, w: 42 }, cima: { x: 29, y: 3, w: 42 }, unicas: { x: 27, y: 3, w: 46 },
  baixo: { x: 30, y: 36, w: 40 }, praia: { x: 30, y: 20, w: 40 }, fitness: { x: 30, y: 20, w: 40 }, intimas: { x: 30, y: 20, w: 40 },
  calcados: { x: 35, y: 74, w: 30 }, bolsas: { x: 70, y: 42, w: 27 },
  joias: { x: 3, y: 50, w: 20 }, acessorios: { x: 77, y: 6, w: 20 },
};
// quem fica na frente quando ainda não foi mexido: calça atrás da blusa, casaco por cima, bolsa e acessórios na frente
const ZORDER = ['baixo', 'calcados', 'unicas', 'praia', 'fitness', 'intimas', 'cima', 'casacos', 'bolsas', 'joias', 'acessorios'];
export function autoLayout(items, old = {}) {
  const out = {}, used = {};
  for (const it of items) {
    if (old[it.id]) { out[it.id] = { ...old[it.id] }; continue; }
    const base = SPOT[it.category] || { x: 6, y: 6, w: 30 };
    used[it.category] ??= Object.keys(old).filter(id => item(id)?.category === it.category).length;
    const shift = (used[it.category]++) * 7;   // segunda peça da mesma categoria fica um pouco para o lado
    const rank = ZORDER.indexOf(it.category);
    out[it.id] = { x: Math.min(100 - base.w, base.x + shift), y: Math.min(90, base.y + shift), w: base.w, z: (rank < 0 ? 6 : rank) * 10 + 10 + used[it.category] };
  }
  return out;
}

// ---------- recorte: tira o fundo branco da foto para uma peça poder ficar por cima da outra ----------
// Só apaga o branco que encosta na borda da foto (flood fill): peça branca no meio da foto continua inteira.
const cutCache = new Map();
export async function cutBitmap(photoId, size = 'thumb') {
  const k = photoId + ':' + size;
  if (!cutCache.has(k)) cutCache.set(k, (async () => {
    const ph = await getPhoto(photoId);
    if (!ph) return null;
    const img = await loadImage(size === 'full' ? (ph.full || ph.thumb) : (ph.thumb || ph.full));
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h), px = d.data;
    const light = i => Math.min(px[i], px[i + 1], px[i + 2]);
    const seen = new Uint8Array(w * h), stack = [];
    const push = (x, y) => { const j = y * w + x; if (!seen[j] && light(j * 4) >= 228) { seen[j] = 1; stack.push(j); } };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const j = stack.pop(), x = j % w, y = (j - x) / w;
      const l = light(j * 4);
      px[j * 4 + 3] = l >= 244 ? 0 : Math.round((244 - l) / 16 * 255);   // borda suave
      if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
    }
    ctx.putImageData(d, 0, 0);
    return c;
  })());
  return cutCache.get(k);
}
const urlCut = new Map();
async function cutURL(photoId) {
  if (!urlCut.has(photoId)) urlCut.set(photoId, cutBitmap(photoId).then(c => c ? new Promise(r => c.toBlob(b => r(URL.createObjectURL(b)), 'image/png')) : ''));
  return urlCut.get(photoId);
}
export function hydrateBoard(root = document) {
  root.querySelectorAll('img[data-cut]:not([src])').forEach(async img => { const u = await cutURL(img.dataset.cut); if (u) img.src = u; });
}

// HTML do quadro. edit = pode arrastar.
export function boardHTML(items, layout, { edit = false, cls = '', sel = null } = {}) {
  const lay = autoLayout(items, layout || {});
  return `<div class="board ${edit ? 'edit' : ''} ${cls}">${items.map(it => {
    const p = lay[it.id];
    return `<div class="bd-it ${sel === it.id ? 'on' : ''}" data-bid="${it.id}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;z-index:${p.z}">
      ${it.photos?.[0] ? `<img data-cut="${it.photos[0]}" alt="" draggable="false">` : `<div class="noph">${icon('hanger')}</div>`}
      ${edit && sel === it.id ? `<span class="bd-size" data-size="1"></span>` : ''}
    </div>`;
  }).join('')}${!items.length ? `<div class="bd-empty">${icon('hanger')}</div>` : ''}</div>`;
}

// Liga o arrastar. onChange(layout) é chamado ao soltar; onSelect(id|null) ao tocar sem arrastar.
export function bindBoard(root, getLayout, { onChange, onSelect }) {
  const board = root.querySelector('.board.edit');
  if (!board) return;
  board.onpointerdown = e => {
    const el = e.target.closest('.bd-it');
    if (!el) { onSelect(null); return; }
    e.preventDefault();
    const id = el.dataset.bid;
    const resize = !!e.target.closest('[data-size]');
    const R = board.getBoundingClientRect();
    const lay = getLayout();
    const p = { ...lay[id] };
    const start = { x: e.clientX, y: e.clientY, px: p.x, py: p.y, pw: p.w };
    let moved = false;
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    const move = ev => {
      const dx = (ev.clientX - start.x) / R.width * 100, dy = (ev.clientY - start.y) / R.height * 100;
      if (Math.abs(dx) + Math.abs(dy) > 1.2) moved = true;
      if (resize) p.w = Math.max(8, Math.min(100, start.pw + dx));
      else { p.x = Math.max(-p.w * 0.5, Math.min(100 - p.w * 0.5, start.px + dx)); p.y = Math.max(-10, Math.min(95, start.py + dy)); }
      el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.width = p.w + '%';
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('drag');
      if (moved) {
        const round = n => Math.round(n * 10) / 10;
        lay[id] = { ...p, x: round(p.x), y: round(p.y), w: round(p.w) };
        onChange(lay, id);
      } else onSelect(id);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
}

// Desenha o quadro numa imagem (para compartilhar ou mandar para a IA vestir)
export async function boardImage(items, layout, { W = 1080, title = '' } = {}) {
  const lay = autoLayout(items, layout || {});
  const top = title ? 130 : 0;
  const c = document.createElement('canvas'); c.width = W; c.height = W + top + (title ? 70 : 0);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  if (title) { ctx.fillStyle = '#2b2b2b'; ctx.font = 'italic 60px Georgia, serif'; ctx.fillText(title, 60, 90); }
  for (const it of items.slice().sort((a, b) => lay[a.id].z - lay[b.id].z)) {
    const bmp = it.photos?.[0] && await cutBitmap(it.photos[0], 'full');
    if (!bmp) continue;
    const p = lay[it.id], w = p.w / 100 * W, h = w * bmp.height / bmp.width;
    ctx.drawImage(bmp, p.x / 100 * W, top + p.y / 100 * W, w, h);
  }
  if (title) { ctx.fillStyle = '#9a9a9a'; ctx.font = '28px Georgia, serif'; ctx.fillText('MCLOSET', 60, c.height - 30); }
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
}
