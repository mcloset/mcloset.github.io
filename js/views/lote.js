// Importação em lote: escolha uma pasta (ou vários arquivos) com fotos e fichas de texto.
// O app junta foto + ficha pelo CÓDIGO (ex.: CAMISA-1A_FRENTE.jpg + "FICHA CAMISA-1A"),
// importa tudo de uma vez e deixa as peças marcadas para você conferir depois.
import { S, curProfile, save, savePhoto, nextCode } from '../store.js';
import { CATEGORIES, PHOTO_LABELS, LAST_USE_HINTS } from '../catalog.js';
import { cartelaOfColors, familyOfColors } from '../color.js';
import { processImage } from '../images.js';
import { parseFicha, splitFichas } from '../ficha.js';
import { header, icon, nav, profilesOptions, openSheet, closeSheet } from '../ui.js';
import { esc, uid, todayStr, addDays, toast, norm } from '../util.js';

let G = null;     // { groups, profileId, seedHint, defCat, together }
let FILES = [];   // { kind: 'img'|'txt', key, file?, name, text? }

const LABEL_WORDS = { frente: 'Frente', front: 'Frente', costas: 'Costas', back: 'Costas', detalhe: 'Detalhe', detail: 'Detalhe', vestida: 'Vestida', vestido_modelo: 'Vestida', lado: 'Lado' };
function baseKey(name) {
  let k = name.replace(/\.[^.]+$/, '').toLowerCase().trim();
  let prev;
  do { prev = k; k = k.replace(/[\s_\-.]*(\(\d+\)|frente|front|costas|back|detalhe|detail|vestida|lado|ficha)$/i, '').replace(/[\s_\-.]+\d{1,2}$/, '').trim(); } while (k !== prev && k);
  return k || name.toLowerCase();
}
const ck = s => norm(s).replace(/[^a-z0-9]/g, '');        // compara códigos ignorando traços e espaços
const labelOf = name => { const n = name.toLowerCase(); for (const [w, l] of Object.entries(LABEL_WORDS)) if (n.includes(w)) return l; return ''; };
const pretty = k => { const s = k.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const isImg = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name);
const isTxt = f => /^text\//.test(f.type) || /\.(txt|md)$/i.test(f.name);
const order = l => { const i = PHOTO_LABELS.indexOf(l); return i < 0 ? 0.5 : i; };

export function render(main) {
  if (!G) G = { groups: [], profileId: curProfile().id, seedHint: '', defCat: '', together: true };
  const on = G.groups.filter(g => g.on);
  const semFicha = G.groups.filter(g => !g.ficha).length;
  const semFoto = G.groups.filter(g => !g.files.length).length;
  const pend = S.items.filter(i => i.pendente).length;
  main.innerHTML = `
    ${header('Importar em lote', { back: '#/armario' })}
    <div class="pad">
      ${pend ? `<a class="banner" href="#/conferir">${icon('check')}<span>${pend} peça${pend > 1 ? 's' : ''} importada${pend > 1 ? 's' : ''} esperando conferência. <b>Conferir</b></span></a>` : ''}
      <p class="small">Selecione a pasta com as fotos e as fichas (arquivos .txt) — pode ser tudo de uma vez. O app junta cada foto com a ficha do mesmo <b>código</b>:
        <code>CAMISA-1A_FRENTE.jpg</code> + <code>CAMISA-1A_COSTAS.jpg</code> + a <b>FICHA CAMISA-1A</b>. As fichas podem estar cada uma num .txt ou todas juntas num .txt só.</p>
      <div class="row-btns wide">
        <button class="btn ${G.groups.length ? 'ghost' : ''}" data-act="folder">${icon('box')} Escolher pasta</button>
        <button class="btn ghost" data-act="files">${icon('image')} Escolher arquivos</button>
      </div>
      <p class="hint">${icon('info')} No iPhone e no iPad não dá para escolher a pasta inteira: em “Escolher arquivos”, toque em <b>Selecionar</b> no canto da pasta e marque tudo.</p>
      ${G.groups.length ? `
        <div class="infobox">
          <div><small>Encontrado</small><b>${G.groups.length} peças · ${FILES.filter(f => f.kind === 'img').length} fotos · ${G.groups.filter(g => g.ficha).length} fichas</b></div>
          ${semFicha ? `<div class="warn small">⚠️ ${semFicha} peça${semFicha > 1 ? 's' : ''} sem ficha: entram com as cores detectadas da foto e você completa depois.</div>` : ''}
          ${semFoto ? `<div class="warn small">⚠️ ${semFoto} ficha${semFoto > 1 ? 's' : ''} sem foto com o mesmo código.</div>` : ''}
        </div>
        <label class="ck"><input type="checkbox" id="together" ${G.together ? 'checked' : ''}><span>Juntar fotos do mesmo código numa peça só</span></label>
        <div class="grid2">
          ${S.profiles.length > 1 ? `<div class="field"><label>Closet de</label><select id="lp">${profilesOptions(G.profileId)}</select></div>` : ''}
          <div class="field"><label>Categoria (se faltar)</label><select id="ldc"><option value="">—</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === G.defCat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Última vez que usou (para o termômetro)</label><select id="lsh">${LAST_USE_HINTS.map(h => `<option value="${h.id}" ${h.id === G.seedHint ? 'selected' : ''}>${h.name}</option>`).join('')}</select></div>
        <div class="count-row"><span class="count">${on.length} de ${G.groups.length} selecionadas</span>
          <button class="link small" data-act="all">${on.length === G.groups.length ? 'Desmarcar todas' : 'Marcar todas'}</button></div>
        <div class="lote">${G.groups.map((g, i) => `<div class="lrow ${g.on ? '' : 'off'}">
          <input type="checkbox" data-on="${i}" ${g.on ? 'checked' : ''} aria-label="Importar">
          <div class="lthumbs">${g.files.length ? g.files.slice(0, 3).map(f => `<img src="${f.url}" alt="">`).join('') : `<span class="nofoto">${icon('file')}</span>`}${g.files.length > 3 ? `<span>+${g.files.length - 3}</span>` : ''}</div>
          <div class="lmain">
            <div class="lcode">${esc(g.code || g.key.split('#')[0].toUpperCase())}</div>
            <input data-name="${i}" value="${esc(g.name)}">
            <select data-cat="${i}"><option value="">Categoria…</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === g.category ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
            <small>${g.files.length} foto${g.files.length === 1 ? '' : 's'} · ${g.ficha ? '✅ com ficha' : '⚠️ sem ficha'}</small>
          </div></div>`).join('')}</div>
        <div class="sticky-cta"><button class="btn block" data-act="go">Importar ${on.length} peça${on.length === 1 ? '' : 's'}</button></div>` : ''}
    </div>`;
  main.oninput = e => { const t = e.target; if (t.dataset.name != null) G.groups[+t.dataset.name].name = t.value; };
  main.onchange = e => {
    const t = e.target;
    if (t.dataset.on != null) { G.groups[+t.dataset.on].on = t.checked; keepScroll(); }
    else if (t.dataset.cat != null) G.groups[+t.dataset.cat].category = t.value;
    else if (t.id === 'lp') G.profileId = t.value;
    else if (t.id === 'lsh') G.seedHint = t.value;
    else if (t.id === 'ldc') { G.defCat = t.value; G.groups.forEach(g => { if (!g.ficha?.category) g.category = t.value; }); keepScroll(); }
    else if (t.id === 'together') { G.together = t.checked; regroup(); keepScroll(); }
  };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'folder') pick(true);
    else if (act === 'files') pick(false);
    else if (act === 'all') { const all = G.groups.some(g => !g.on); G.groups.forEach(g => g.on = all); keepScroll(); }
    else if (act === 'go') runImport();
  };
}
const keepScroll = () => { const y = scrollY; nav.refresh(); scrollTo(0, y); };

function chooseFiles(folder) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    if (folder) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
    else inp.accept = 'image/*,.txt,.md,text/plain';
    inp.style.display = 'none';
    inp.onchange = () => { res([...inp.files]); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  });
}

async function pick(folder) {
  if (folder && !('webkitdirectory' in document.createElement('input'))) { toast('Este aparelho não deixa escolher pasta. Use “Escolher arquivos”.'); return pick(false); }
  await addFiles(await chooseFiles(folder));
}

export async function addFiles(all) {
  if (!G) G = { groups: [], profileId: curProfile().id, seedHint: '', defCat: '', together: true };
  const files = all.filter(f => !f.name.startsWith('.') && (isImg(f) || isTxt(f)));
  if (!files.length) return toast('Nenhuma foto ou ficha encontrada.');
  const known = new Set(FILES.map(f => (f.path || f.name) + f.size));
  for (const f of files) {
    const path = f.webkitRelativePath || f.name;
    if (known.has(path + f.size)) continue;            // escolher de novo não duplica
    if (isTxt(f)) FILES.push({ kind: 'txt', key: baseKey(f.name), name: f.name, path, size: f.size, text: await f.text() });
    else FILES.push({ kind: 'img', key: baseKey(f.name), file: f, name: f.name, path, size: f.size });
  }
  regroup();
  nav.refresh();
}

function regroup() {
  G.groups.forEach(g => g.files.forEach(f => f.url && URL.revokeObjectURL(f.url)));
  const map = new Map();
  let n = 0;
  for (const f of FILES.filter(f => f.kind === 'img')) {
    const key = G.together ? f.key : f.key + '#' + (n++);
    if (!map.has(key)) map.set(key, { key, files: [], ficha: null, on: true });
    map.get(key).files.push({ file: f.file, name: f.name, url: URL.createObjectURL(f.file), label: labelOf(f.name) });
  }
  const groups = [...map.values()];
  // cada ficha procura a peça com o mesmo código
  for (const t of FILES.filter(f => f.kind === 'txt')) {
    const fichas = splitFichas(t.text);
    for (const txt of fichas) {
      const f = parseFicha(txt);
      const code = f.code || (fichas.length === 1 ? t.key : '');
      const c = ck(code);
      let target = c && groups.filter(g => ck(g.key.split('#')[0]) === c);
      if (c && !target.length) {
        const loose = groups.filter(g => { const k = ck(g.key.split('#')[0]); return !g.ficha && (k.startsWith(c) || c.startsWith(k)) && k.length >= 3; });
        if (loose.length === 1) target = loose;
      }
      if (target && target.length) target.forEach(g => { g.ficha = f; g.code = f.code || g.code; });
      else groups.push({ key: (code || 'ficha-' + groups.length).toLowerCase(), files: [], ficha: f, code: f.code, on: true });
    }
  }
  G.groups = groups.map(g => {
    g.files.sort((a, b) => order(a.label) - order(b.label));
    return { ...g, name: g.ficha?.name || pretty(g.key.split('#')[0]), category: g.ficha?.category || G.defCat };
  }).sort((a, b) => (a.code || a.key).localeCompare(b.code || b.key));
}

async function runImport() {
  const list = G.groups.filter(g => g.on);
  if (!list.length) return toast('Nenhuma peça selecionada.');
  const body = openSheet(`<div class="center"><div class="spinner"></div><p id="prog">Importando…</p><p class="small muted">Pode deixar o app aberto até terminar.</p></div>`, { title: 'Importando peças' });
  const set = t => { const el = body.querySelector('#prog'); if (el) el.textContent = t; };
  let done = 0;
  const failed = [];
  for (const g of list) {
    try {
      const photos = [], labels = {};
      let colors = g.ficha?.colors?.length ? g.ficha.colors : null;
      for (const f of g.files) {
        const r = await processImage(f.file, { colors: !colors && photos.length === 0 });
        if (!colors && r.colors.length) colors = r.colors;
        const id = await savePhoto(r);
        photos.push(id);
        if (f.label) labels[id] = f.label;
      }
      const fic = g.ficha || {};
      const it = {
        id: uid(), profileId: G.profileId, name: g.name.trim() || 'Peça', category: g.category || fic.category || 'cima', sub: fic.sub || '',
        brand: fic.brand || '', price: null, purchaseDate: '', size: fic.size || '',
        colors: colors || [], family: fic.family || familyOfColors(colors || []), cartela: fic.cartela || cartelaOfColors(colors || []),
        estampa: fic.estampa || 'Lisa', climas: fic.climas || [], ocasioes: fic.ocasioes || [], estilo: fic.estilo || '', piramide: fic.piramide || '',
        status: 'armario', statusNote: '', location: '', tags: [], notes: fic.notes || '',
        descricao: fic.descricao || '', promptImg: fic.promptImg || '', detalhes: fic.detalhes || {},
        photos, photoLabels: labels, createdAt: new Date().toISOString(),
        pendente: true,   // aparece em "Conferir importadas"
        fromFicha: !!g.ficha,
      };
      const k = g.key.split('#')[0];
      it.code = fic.code || g.code || (/^[a-z]+-[a-z0-9]+$/i.test(k) && !/^img/i.test(k) ? k.toUpperCase() : nextCode(it));
      if (G.seedHint) it.seedLastUsed = addDays(todayStr(), -Number(G.seedHint));
      await save('items', it);
      g.done = true;
      done++;
      set(`${done} de ${list.length} peças…`);
    } catch (err) {
      failed.push(`${g.code || g.name}: ${err.message}`);
    }
  }
  closeSheet();
  G.groups.filter(g => g.done).forEach(g => g.files.forEach(f => URL.revokeObjectURL(f.url)));
  if (failed.length) {
    const doneKeys = new Set(G.groups.filter(g => g.done).map(g => g.key.split('#')[0]));
    FILES = FILES.filter(f => !doneKeys.has(f.key));
    G.groups = G.groups.filter(g => !g.done);
    alert(`${done} peças importadas. Não consegui importar ${failed.length}:\n\n${failed.join('\n')}\n\nElas continuam na lista para tentar de novo.`);
    nav.refresh();
  } else {
    G = null; FILES = [];
    toast(`${done} peças importadas! Agora é só conferir.`);
    nav.go('#/conferir', true);
  }
}
