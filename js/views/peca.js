import { nextCode, S, curProfile, item, save, savePhoto, deletePhotos, deleteItem, itemUsage, itemBand, daysUnused, costPerUse, profileItems, isActive, maybeSmall } from '../store.js';
import { CATEGORIES, catName, STATUS, statusName, CLIMAS, OCASIOES, ESTILOS, PIRAMIDE, ESTAMPAS, PHOTO_LABELS, CARTELAS, cartelaName, LAST_USE_HINTS, band, DETAIL_FIELDS } from '../catalog.js';
import { NAMED, FAMILIES, nearestName, namedHex, cartelaOfColors, familyOfColors, scoreAgainst } from '../color.js';
import { processImage, colorsFromBlob } from '../images.js';
import { parseFicha } from '../ficha.js';
import { header, icon, chips, swatch, itemCard, collage, hydrate, openSheet, closeSheet, choose, nav, profilesOptions, cartelaSelect, textSheet } from '../ui.js';
import { $, esc, uid, brl, parseMoney, todayStr, addDays, fmtDate, toast, pickFiles } from '../util.js';
import { scheduleSheet } from './planejar.js';
import { itemText } from '../describe.js';

// prefill vindo de outras telas (ex.: "Antes de comprar" → "Comprei")
export const pending = { newItem: null };

let D = null;        // rascunho do formulário
let PH = [];         // fotos do rascunho: { id?, full?, thumb?, url?, label }

function blankDraft() {
  return {
    profileId: curProfile().id, name: '', category: '', sub: '', brand: '', price: '', purchaseDate: '', size: '',
    colors: [], family: '', cartela: '', estampa: 'Lisa', climas: [], ocasioes: [], estilo: '', piramide: '',
    status: 'armario', statusNote: '', location: '', tags: [], notes: '', seedHint: '',
    code: '', descricao: '', promptImg: '', detalhes: {},
  };
}

export async function renderForm(main, params) {
  const key = params.id ? 'edit:' + params.id : 'new';
  if (!D || D._key !== key) {
    PH.forEach(p => p.url && !p.id && URL.revokeObjectURL(p.url));
    if (params.id) {
      const it = item(params.id);
      if (!it) return nav.go('#/armario');
      D = { ...blankDraft(), ...structuredClone(it), price: it.price ?? '', _key: key };
      D.detalhes ||= {};
      PH = (it.photos || []).map(id => ({ id, label: it.photoLabels?.[id] || '' }));
    } else {
      D = { ...blankDraft(), _key: key };
      PH = [];
      if (pending.newItem) {
        const n = pending.newItem; pending.newItem = null;
        Object.assign(D, n.fields || {});
        PH = (n.photos || []).map((p, i) => ({ ...p, url: URL.createObjectURL(p.thumb), label: PHOTO_LABELS[i] || '' }));
      }
    }
  }
  draw(main);
}

function draw(main) {
  const cat = CATEGORIES.find(c => c.id === D.category);
  const isEdit = D._key !== 'new';
  const nameOpts = NAMED.map(n => n[0]);
  main.innerHTML = `
    ${header(isEdit ? 'Editar peça' : 'Nova peça', { back: isEdit ? '#/peca/' + D.id : '#/armario', right: isEdit ? '' : `<button class="link small" data-act="discard">Limpar</button>` })}
    <div class="form">
      <div class="photos-edit">
        ${PH.map((p, i) => `<button class="ph-edit" data-act="ph" data-i="${i}">
            ${p.id ? `<img data-ph="${p.id}" alt="">` : `<img src="${p.url}" alt="">`}
            ${i === 0 ? '<span class="cap">Capa</span>' : ''}${p.label ? `<span class="lbl">${esc(p.label)}</span>` : ''}
          </button>`).join('')}
        <button class="ph-add" data-act="add-photos">${icon('camera')}<span>${PH.length ? 'Mais fotos' : 'Adicionar fotos'}</span></button>
      </div>
      <p class="hint">Pode colocar várias fotos da mesma peça: frente, costas, detalhe, vestida… A primeira é a capa.</p>

      <details class="ficha" ${D._fichaOpen ? 'open' : ''}>
        <summary>${icon('file')} Colar a ficha da IA</summary>
        <textarea id="ficha" rows="6" placeholder="Cole aqui o texto que a IA devolveu (Categoria:, Tipo:, Cores:…)"></textarea>
        <button class="btn small" data-act="apply-ficha">Preencher com a ficha</button>
      </details>

      <div class="grid2 name-code">
        <div class="field"><label>Nome da peça *</label><input data-f="name" value="${esc(D.name)}" placeholder="Ex.: Bolsa miçanga"></div>
        <div class="field"><label>Código</label><input data-f="code" value="${esc(D.code)}" placeholder="automático" autocapitalize="characters"></div>
      </div>
      ${S.profiles.length > 1 ? `<div class="field"><label>De quem é</label><select data-f="profileId">${profilesOptions(D.profileId)}</select></div>` : ''}
      <div class="grid2">
        <div class="field"><label>Categoria *</label><select data-f="category" data-redraw><option value="">Escolher…</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === D.category ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div class="field"><label>Tipo</label><select data-f="sub"><option value="">—</option>${(cat?.subs || []).concat(D.sub && !(cat?.subs || []).includes(D.sub) ? [D.sub] : []).map(s => `<option ${s === D.sub ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Marca / loja</label><input data-f="brand" value="${esc(D.brand)}" list="brands" placeholder="Opcional"></div>
        <div class="field"><label>Preço pago (R$)</label><input data-f="price" value="${esc(D.price)}" inputmode="decimal" placeholder="0,00"></div>
      </div>
      <datalist id="brands">${[...new Set(S.items.map(i => i.brand).filter(Boolean))].map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      <div class="grid2">
        <div class="field"><label>Tamanho</label><input data-f="size" value="${esc(D.size)}" placeholder="P, M, 38, 8 anos…"></div>
        <div class="field"><label>Data da compra</label><input type="date" data-f="purchaseDate" value="${esc(D.purchaseDate)}"></div>
      </div>

      <div class="field">
        <label>Cores ${D.colors.length ? '' : '<span class="muted">— adicione uma foto para detectar</span>'}</label>
        <div class="colors">
          ${D.colors.map((c, i) => `<div class="cchip">
              <label class="sw-in" style="background:${c.hex}"><input type="color" value="${c.hex}" data-ci="${i}" data-cf="hex" aria-label="Ajustar cor"></label>
              <select data-ci="${i}" data-cf="name">${(nameOpts.includes(c.name) ? nameOpts : [c.name, ...nameOpts]).map(n => `<option ${n === c.name ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
              <span class="pct">${c.pct || ''}${c.pct ? '%' : ''}</span>
              <button class="x" data-act="c-del" data-i="${i}" aria-label="Remover cor">${icon('x')}</button>
            </div>`).join('')}
          <div class="row-chips">
            <button class="chip" data-act="c-add">+ cor</button>
            ${PH.length ? `<button class="chip" data-act="c-detect">${icon('refresh')} Detectar da capa</button>` : ''}
          </div>
        </div>
      </div>
      <div class="field"><label>Paleta (família de cor)</label>${chips([...Object.entries(FAMILIES).map(([id, name]) => ({ id, name })), { id: 'estampado', name: 'Colorido / estampado' }], D.family, 'family')}</div>
      <div class="field"><label>Cartela de coloração (12 estações)</label>${cartelaSelect('cartela', D.cartela)}<p class="hint">${CARTELAS.find(c => c.id === D.cartela) ? 'Cores ' + CARTELAS.find(c => c.id === D.cartela).desc + '. ' : ''}Sugerida automaticamente pela cor principal — mude se quiser.</p></div>
      <div class="field"><label>Estampa</label><select data-f="estampa">${ESTAMPAS.map(e => `<option ${e === D.estampa ? 'selected' : ''}>${e}</option>`).join('')}</select></div>

      <div class="field"><label>Clima</label>
        ${chips([...CLIMAS.map(c => ({ id: c.id, name: c.icon + ' ' + c.name })), { id: 'todos', name: 'Ano todo' }], D.climas.length === 3 ? ['calor', 'meia', 'frio', 'todos'] : D.climas, 'clima')}</div>
      <div class="field"><label>Ocasiões</label>${chips(OCASIOES, D.ocasioes, 'ocasiao')}</div>
      <div class="field"><label>Estilo</label>${chips(ESTILOS, D.estilo, 'estilo')}</div>
      <div class="field"><label>Pirâmide do closet</label>${chips(PIRAMIDE, D.piramide, 'piramide')}</div>

      <div class="grid2">
        <div class="field"><label>Situação</label><select data-f="status" data-redraw>${STATUS.map(s => `<option value="${s.id}" ${s.id === D.status ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
        <div class="field"><label>Onde fica guardada</label><input data-f="location" value="${esc(D.location)}" list="locs" placeholder="Gaveta 2, mala de inverno…"></div>
      </div>
      <datalist id="locs">${[...new Set(S.items.map(i => i.location).filter(Boolean))].map(b => `<option value="${esc(b)}">`).join('')}</datalist>
      ${D.status !== 'armario' ? `<div class="field"><label>${D.status === 'emprestada' ? 'Emprestada para quem? Desde quando?' : 'Observação da situação'}</label><input data-f="statusNote" value="${esc(D.statusNote)}"></div>` : ''}
      ${isEdit ? '' : `<div class="field"><label>Quando usou pela última vez? (para o termômetro)</label><select data-f="seedHint">${LAST_USE_HINTS.map(h => `<option value="${h.id}" ${h.id === D.seedHint ? 'selected' : ''}>${h.name}</option>`).join('')}</select></div>`}

      <div class="field"><label>Tags</label>
        <div class="tag-in"><span>#</span><input id="tagIn" placeholder="ex.: riachuelo, presente, viagem" enterkeyhint="done"><button class="icon-btn" data-act="tag-add">${icon('plus')}</button></div>
        <div class="tags">${D.tags.map((t, i) => `<span class="tagc">#${esc(t)}<button data-act="tag-del" data-i="${i}">${icon('x')}</button></span>`).join('')}</div>
      </div>
      <div class="field"><label>Descrição detalhada</label><textarea data-f="descricao" rows="5" placeholder="Como é a peça, de cima para baixo: modelagem, gola, mangas, botões, bolsos, tecido, caimento…">${esc(D.descricao)}</textarea></div>
      <details class="ficha tecnica" ${Object.values(D.detalhes || {}).some(Boolean) ? 'open' : ''}>
        <summary>${icon('tag')} Ficha técnica (detalhes da peça)</summary>
        ${DETAIL_FIELDS.map(d => `<div class="field"><label>${d.name}</label><input data-d="${d.id}" value="${esc(D.detalhes?.[d.id] || '')}" placeholder="${esc(d.hint)}"></div>`).join('')}
        <div class="field"><label>Prompt de imagem (para recriar a peça numa IA)</label><textarea data-f="promptImg" rows="4" placeholder="Vem preenchido pela ficha da IA">${esc(D.promptImg)}</textarea></div>
      </details>
      <div class="field"><label>Observações</label><textarea data-f="notes" rows="3" placeholder="Cuidados de lavagem, ajustes, ideias…">${esc(D.notes)}</textarea></div>

      <div class="form-actions">
        <button class="btn block" data-act="save">${isEdit ? 'Salvar alterações' : 'Salvar peça'}</button>
      </div>
    </div>`;
  hydrate(main);
  bindForm(main);
}

function recalcColors() {
  D.family = familyOfColors(D.colors);
  D.cartela = cartelaOfColors(D.colors);
}

function bindForm(main) {
  main.oninput = e => {
    const t = e.target;
    if (t.dataset.f) { D[t.dataset.f] = t.value; if (t.dataset.redraw !== undefined && e.type === 'change') draw(main); }
    if (t.dataset.d) { D.detalhes ||= {}; D.detalhes[t.dataset.d] = t.value; }
    if (t.dataset.ci != null && e.type === 'change') {
      const c = D.colors[+t.dataset.ci];
      if (t.dataset.cf === 'hex') { c.hex = t.value.toUpperCase(); const n = nearestName(c.hex); c.name = n.name; c.family = n.family; }
      else { c.name = t.value; const h = namedHex(t.value); if (h) c.hex = h; c.family = NAMED.find(n => n[0] === t.value)?.[2] || nearestName(c.hex).family; }
      recalcColors(); draw(main);
    }
  };
  main.onchange = e => {
    const t = e.target;
    if (t.dataset.f && t.dataset.redraw !== undefined) { D[t.dataset.f] = t.value; if (t.dataset.f === 'category') D.sub = ''; draw(main); }
    else if (t.dataset.ci != null) main.oninput(e);
  };
  main.onkeydown = e => {
    if (e.target.id === 'tagIn' && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); addTag(main); }
  };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'add-photos') return addPhotos(main);
    if (act === 'ph') return photoMenu(main, +a.dataset.i);
    if (act === 'apply-ficha') {
      const txt = $('#ficha').value;
      const f = parseFicha(txt);
      if (!Object.keys(f).length) return toast('Não reconheci a ficha. Confira se tem “Categoria:”, “Tipo:”, “Cores:”.');
      const det = { ...(D.detalhes || {}), ...(f.detalhes || {}) };
      Object.assign(D, f); D.detalhes = det; D._fichaOpen = false;
      toast('Ficha aplicada — confira os campos.');
      return draw(main);
    }
    if (act === 'family') { D.family = v; return draw(main); }
    if (act === 'cartela') { D.cartela = D.cartela === v ? '' : v; return draw(main); }
    if (act === 'clima') {
      if (v === 'todos') D.climas = D.climas.length === 3 ? [] : ['calor', 'meia', 'frio'];
      else D.climas = D.climas.includes(v) ? D.climas.filter(x => x !== v) : [...D.climas, v];
      return draw(main);
    }
    if (act === 'ocasiao') { D.ocasioes = D.ocasioes.includes(v) ? D.ocasioes.filter(x => x !== v) : [...D.ocasioes, v]; return draw(main); }
    if (act === 'estilo') { D.estilo = D.estilo === v ? '' : v; return draw(main); }
    if (act === 'piramide') { D.piramide = D.piramide === v ? '' : v; return draw(main); }
    if (act === 'c-del') { D.colors.splice(+a.dataset.i, 1); recalcColors(); return draw(main); }
    if (act === 'c-add') { D.colors.push({ hex: '#141414', name: 'Preto', family: 'neutros', pct: 0 }); recalcColors(); return draw(main); }
    if (act === 'c-detect') return detectFromCover(main);
    if (act === 'tag-add') return addTag(main);
    if (act === 'tag-del') { D.tags.splice(+a.dataset.i, 1); return draw(main); }
    if (act === 'discard') { if (confirm('Limpar o formulário?')) { D = null; PH = []; nav.refresh(); } return; }
    if (act === 'save') return saveDraft();
  };
}

function addTag(main) {
  const inp = $('#tagIn');
  const t = inp.value.replace(/[#,]/g, '').trim().toLowerCase();
  if (t && !D.tags.includes(t)) D.tags.push(t);
  draw(main);
  setTimeout(() => $('#tagIn')?.focus(), 0);
}

async function addPhotos(main) {
  const files = await pickFiles({ accept: 'image/*', multiple: true });
  if (!files.length) return;
  toast(files.length > 1 ? `Preparando ${files.length} fotos…` : 'Preparando foto…');
  const first = PH.length === 0;
  for (const f of files) {
    try {
      const r = await processImage(f, { colors: first && PH.length === 0 });
      PH.push({ full: r.full, thumb: r.thumb, url: URL.createObjectURL(r.thumb), label: PHOTO_LABELS[PH.length] || 'Outra' });
      if (r.colors.length && !D.colors.length) { D.colors = r.colors; recalcColors(); }
    } catch (err) { toast(err.message); }
  }
  if (first && D.colors.length) toast('Cores detectadas! Confira e ajuste se precisar.');
  draw(main);
}

async function detectFromCover(main) {
  const p = PH[0]; if (!p) return;
  let blob = p.full || p.thumb;
  if (!blob && p.id) blob = (await import('../store.js').then(m => m.getPhoto(p.id)))?.full;
  if (!blob) return;
  D.colors = await colorsFromBlob(blob);
  recalcColors();
  toast('Cores detectadas novamente.');
  draw(main);
}

function photoMenu(main, i) {
  const p = PH[i];
  openSheet(`
    <div class="menu">
      ${i > 0 ? `<button class="menu-item" data-act="cover">${icon('image')}<span>Usar como capa</span></button>` : ''}
      <div class="field"><label>Que foto é essa?</label>${chips(PHOTO_LABELS, p.label, 'label')}</div>
      <button class="menu-item danger" data-act="rm">${icon('trash')}<span>Remover foto</span></button>
    </div>`, {
    title: 'Foto ' + (i + 1),
    onAct: (act, el) => {
      if (act === 'cover') { PH.unshift(PH.splice(i, 1)[0]); }
      else if (act === 'label') { p.label = el.dataset.v; }
      else if (act === 'rm') { if (p.url && !p.id) URL.revokeObjectURL(p.url); PH.splice(i, 1); }
      closeSheet(); draw(main);
    },
  });
}

async function saveDraft() {
  if (!D.name.trim()) {
    const c = D.colors[0]?.name;
    if (D.sub) D.name = D.sub + (c ? ' ' + c.toLowerCase() : '');
    else return toast('Dê um nome para a peça.');
  }
  if (!D.category) return toast('Escolha a categoria.');
  const isEdit = D._key !== 'new';
  const old = isEdit ? item(D.id) : null;
  const ids = [], labels = {};
  for (const p of PH) {
    const id = p.id || await savePhoto({ full: p.full, thumb: p.thumb });
    ids.push(id);
    if (p.label) labels[id] = p.label;
  }
  if (old) await deletePhotos((old.photos || []).filter(id => !ids.includes(id)));
  const it = { ...D };
  delete it._key; delete it._fichaOpen;
  it.id = it.id || uid();
  it.name = it.name.trim();
  it.price = parseMoney(D.price);
  it.photos = ids;
  it.photoLabels = labels;
  it.createdAt = it.createdAt || new Date().toISOString();
  it.code = (it.code || '').trim().toUpperCase() || nextCode(it);
  for (const k of Object.keys(it.detalhes || {})) if (!String(it.detalhes[k]).trim()) delete it.detalhes[k];
  if (!isEdit && D.seedHint) it.seedLastUsed = addDays(todayStr(), -Number(D.seedHint));
  if (it.status !== 'armario' && (!old || old.status !== it.status)) it.statusSince = todayStr();
  const wasPending = !!old?.pendente;
  it.pendente = false;   // editar e salvar = peça conferida
  await save('items', it);
  PH.forEach(p => p.url && URL.revokeObjectURL(p.url));
  D = null; PH = [];
  toast('Peça salva!');
  nav.go(wasPending && S.items.some(i => i.pendente) ? '#/conferir' : '#/peca/' + it.id, true);
}

// ================= DETALHE =================
export function renderDetail(main, params) {
  const it = item(params.id);
  if (!it) return nav.go('#/armario');
  const u = itemUsage(it);
  const b = band(itemBand(it));
  const days = daysUnused(it);
  const cpu = costPerUse(it.price, u.uses);
  const looks = S.looks.filter(l => (l.itemIds || []).includes(it.id));
  const hist = S.events.filter(e => e.status === 'registrado' && (e.itemIds || []).includes(it.id)).sort((a, z) => z.date.localeCompare(a.date));
  const others = profileItems(it.profileId).filter(o => o.id !== it.id && o.category !== it.category && isActive(o) && o.status !== 'pequena');
  const matches = others.map(o => ({ o, s: scoreAgainst(o, [it]).score })).filter(x => x.s >= 70).sort((a, z) => z.s - a.s).slice(0, 9);
  const cold = ['esquecida', 'alerta', 'esfriando'].includes(b.id);
  const small = maybeSmall(it);

  main.innerHTML = `
    ${header('Detalhes da peça', { back: '#/armario', right: `<button class="icon-btn" data-act="edit" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-act="del" aria-label="Excluir">${icon('trash')}</button>` })}
    <div class="carousel" id="car">
      ${(it.photos || []).length ? it.photos.map(id => `<div class="slide"><img data-ph="${id}" data-size="full" alt="">${it.photoLabels?.[id] ? `<span class="lbl">${esc(it.photoLabels[id])}</span>` : ''}</div>`).join('') : `<div class="slide noph">${icon('hanger')}</div>`}
    </div>
    ${(it.photos || []).length > 1 ? `<div class="dots">${it.photos.map((_, i) => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div>` : ''}
    <div class="pad">
      <h2 class="serif big">${esc(it.name)}</h2>
      ${it.code ? `<div class="code-tag">${esc(it.code)}</div>` : ''}
      <div class="muted">${esc(catName(it.category))}${it.sub ? ' · ' + esc(it.sub) : ''}${it.brand ? ' · ' + esc(it.brand) : ''}</div>
      ${it.status !== 'armario' ? `<div class="pill warn">${esc(statusName(it.status))}${it.statusNote ? ' — ' + esc(it.statusNote) : ''}</div>` : ''}
      ${small && it.status !== 'pequena' ? `<div class="pill warn">Pode estar pequena (tam. ${esc(it.size)})</div>` : ''}

      <div class="stats">
        <div><small>Preço pago</small><b>${brl(it.price)}</b></div>
        <div><small>Usos</small><b>${u.uses}</b></div>
        <div><small>Preço por uso</small><b>${brl(cpu)}</b></div>
      </div>
      ${it.price && !u.uses ? `<p class="hint">${icon('trend')} 0 usos — registre o uso para ver o custo por uso cair.</p>` : ''}

      <div class="thermo-card" style="--b:${b.color}">
        <div class="tc-top"><span class="dot" style="background:${b.color}"></span><b>${b.name}</b></div>
        <div class="muted small">${u.last ? `Usada pela última vez em ${fmtDate(u.last)} (${days} dias)` : 'Ainda sem uso registrado'} · ${b.hint}</div>
        ${cold ? `<p class="small">Que tal dar uma nova chance? Se não fizer mais sentido, ela pode ir para doação ou revenda.</p>
          <div class="row-btns"><button class="btn small" data-act="schedule">Usar esta semana</button><button class="btn small ghost" data-act="st" data-v="doada">Doar</button><button class="btn small ghost" data-act="st" data-v="vendida">Vender</button></div>` : ''}
      </div>

      <div class="row-btns wide">
        <button class="btn" data-act="use-today">${icon('check')} Usei hoje</button>
        <button class="btn ghost" data-act="new-look">${icon('book')} Criar look</button>
        <button class="btn ghost" data-act="status">${icon('box')} Situação</button>
      </div>

      <h3 class="sec">Cores</h3>
      <div class="color-list">${(it.colors || []).map(c => `<span class="cpill">${swatch(c.hex)}${esc(c.name)}${c.pct ? ` <small>${c.pct}%</small>` : ''}</span>`).join('') || '<span class="muted">Sem cores cadastradas</span>'}</div>
      <div class="muted small">${it.family ? 'Paleta: ' + (FAMILIES[it.family] || 'Colorido / estampado') : ''}${it.cartela ? ' · Cartela ' + cartelaName(it.cartela) : ''}${it.estampa ? ' · ' + esc(it.estampa) : ''}</div>

      ${matches.length ? `<h3 class="sec">Combina com</h3><div class="hscroll">${matches.map(m => itemCard(m.o, { score: m.s, showBand: false })).join('')}</div>` : ''}

      ${it.descricao ? `<h3 class="sec">Descrição</h3><p class="desc">${esc(it.descricao)}</p>` : ''}
      ${Object.keys(it.detalhes || {}).length ? `<h3 class="sec">Ficha técnica</h3><dl class="dl">${DETAIL_FIELDS.map(d => row(d.name, it.detalhes[d.id])).join('')}</dl>` : ''}
      ${it.promptImg ? `<details class="ficha"><summary>${icon('wand')} Prompt de imagem</summary><p class="small desc">${esc(it.promptImg)}</p><button class="btn small ghost" data-act="copy-prompt">${icon('copy')} Copiar prompt</button></details>` : ''}
      <button class="btn block ghost" data-act="copy-desc">${icon('copy')} Copiar ficha completa da peça</button>

      <h3 class="sec">Detalhes</h3>
      <dl class="dl">
        ${row('Clima', (it.climas || []).length === 3 ? 'Ano todo' : (it.climas || []).map(c => CLIMAS.find(x => x.id === c)?.name).join(', '))}
        ${row('Ocasiões', (it.ocasioes || []).join(', '))}
        ${row('Estilo', it.estilo)}
        ${row('Pirâmide', PIRAMIDE.find(p => p.id === it.piramide)?.name)}
        ${row('Tamanho', it.size)}
        ${row('Compra', fmtDate(it.purchaseDate))}
        ${row('Guardada em', it.location)}
        ${row('Tags', (it.tags || []).map(t => '#' + t).join(' '))}
        ${row('Observações', it.notes)}
      </dl>

      <h3 class="sec">Incluída nos looks</h3>
      ${looks.length ? `<div class="hscroll">${looks.map(l => `<a class="mini-look" href="#/look/${l.id}">${collage((l.itemIds || []).map(item).filter(Boolean), 'sm')}<span>${esc(l.name)}</span></a>`).join('')}</div>` : '<p class="muted small">Ainda não está em nenhum look.</p>'}

      <h3 class="sec">Histórico de uso</h3>
      ${hist.length ? `<ul class="hist">${hist.slice(0, 30).map(e => `<li>${icon('checkCircle')} ${fmtDate(e.date)}${e.lookId ? ' · ' + esc(S.looks.find(l => l.id === e.lookId)?.name || '') : ''}</li>`).join('')}</ul>` : '<p class="muted small">Nenhum uso registrado ainda.</p>'}
    </div>`;
  hydrate(main);
  const car = $('#car');
  car.onscroll = () => { const i = Math.round(car.scrollLeft / car.clientWidth); main.querySelectorAll('.dots span').forEach((d, k) => d.classList.toggle('on', k === i)); };

  main.oninput = main.onchange = main.onkeydown = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'edit') nav.go('#/editar-peca/' + it.id);
    else if (act === 'del') {
      if (confirm(`Excluir “${it.name}” do closet? As fotos também serão apagadas.\n\nDica: se você doou ou vendeu, prefira mudar a situação — assim o histórico fica guardado.`)) {
        await deleteItem(it.id); toast('Peça excluída.'); nav.go('#/armario', true);
      }
    }
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'use-today') {
      await save('events', { id: uid(), date: todayStr(), status: 'registrado', itemIds: [it.id], profileIds: [it.profileId], lookId: null });
      toast('Uso registrado hoje!'); nav.refresh();
    }
    else if (act === 'new-look') nav.go('#/novo-look?with=' + it.id);
    else if (act === 'copy-desc') copyText(itemText(it, { usage: true }), 'Ficha copiada!');
    else if (act === 'copy-prompt') copyText(it.promptImg, 'Prompt copiado!');
    else if (act === 'schedule') scheduleSheet({ itemIds: [it.id], title: 'Programar uso de ' + it.name });
    else if (act === 'st') { await setStatus(it, a.dataset.v); }
    else if (act === 'status') {
      const s = await choose('Situação da peça', STATUS.map(s => ({ name: s.name, value: s.id, icon: s.id === it.status ? 'check' : '' })));
      if (s) await setStatus(it, s);
    }
  };
}

async function setStatus(it, s) {
  it.status = s;
  it.statusSince = todayStr();
  if (s === 'armario') it.statusNote = '';
  else if (['emprestada', 'costureira', 'lavanderia', 'doada', 'vendida'].includes(s)) {
    const note = prompt(s === 'emprestada' ? 'Emprestada para quem?' : s === 'vendida' ? 'Vendida por quanto / para quem? (opcional)' : 'Alguma observação? (opcional)', it.statusNote || '');
    if (note !== null) it.statusNote = note;
  }
  await save('items', it);
  toast('Situação: ' + statusName(s));
  nav.refresh();
}

const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';

export async function copyText(txt, ok = 'Copiado!') {
  try { await navigator.clipboard.writeText(txt); toast(ok); }
  catch { textSheet('Copiar', txt, 'ficha.txt'); }
}
