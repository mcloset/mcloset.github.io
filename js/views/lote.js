// Importação em lote.
// Regra principal: CADA PASTA É UMA ROUPA — tudo o que está dentro dela (fotos e fichas .txt)
// pertence à mesma peça, não importa o nome dos arquivos.
// Também aceita um arquivo .zip com as pastas dentro (o jeito mais fácil no iPhone) e,
// para arquivos soltos (sem pasta), junta foto e ficha pelo CÓDIGO (ex.: CAMISA-01_FRENTE.png).
import { S, curProfile, save, savePhoto, nextCode } from '../store.js';
import { CATEGORIES, PHOTO_LABELS, LAST_USE_HINTS } from '../catalog.js';
import { cartelaOfColors, familyOfColors } from '../color.js';
import { processImage } from '../images.js';
import { parseFicha, splitFichas } from '../ficha.js';
import { readZip } from '../zip.js';
import { header, icon, nav, profilesOptions, openSheet, closeSheet } from '../ui.js';
import { esc, uid, todayStr, addDays, toast, norm } from '../util.js';

let G = null;     // { groups, profileId, seedHint, defCat }
let FILES = [];   // { kind: 'img'|'txt', name, path, dir, size, file?, text? }

const LABEL_WORDS = { frente: 'Frente', front: 'Frente', costas: 'Costas', back: 'Costas', detalhe: 'Detalhe', detail: 'Detalhe', vestida: 'Vestida', lado: 'Lado' };
// "CAMISA-01_FRENTE (1).png" -> "camisa-01". O número do código (-01) NÃO é removido.
function baseKey(name) {
  let k = name.replace(/\.[^.]+$/, '').toLowerCase().trim();
  let prev;
  do {
    prev = k;
    k = k.replace(/\s*\(\d+\)$/, '')
      .replace(/[\s_\-.]*(frente|front|costas|back|detalhe|detail|vestida|lado|ficha)$/i, '')
      .replace(/[\s_]+\d{1,2}$/, '')       // "_2", " 3" (fotos numeradas); "-04" do código fica
      .trim();
  } while (k !== prev && k);
  return k || name.toLowerCase();
}
const ck = s => norm(s).replace(/[^a-z0-9]/g, '');        // compara códigos ignorando traços e espaços
const labelOf = name => { const n = name.toLowerCase(); for (const [w, l] of Object.entries(LABEL_WORDS)) if (n.includes(w)) return l; return ''; };
const pretty = k => { const s = k.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const IMG_RE = /\.(jpe?g|png|webp|heic|heif|gif)$/i;
const TXT_RE = /\.(txt|md)$/i;
const isImg = f => /^image\//.test(f.type) || IMG_RE.test(f.name);
const isTxt = f => (/^text\//.test(f.type) && !/html|css|javascript/.test(f.type)) || TXT_RE.test(f.name);
const isZip = f => /\.zip$/i.test(f.name) || /zip/.test(f.type);
const order = l => { const i = PHOTO_LABELS.indexOf(l); return i < 0 ? 0.5 : i; };
const mimeOf = n => /\.png$/i.test(n) ? 'image/png' : /\.webp$/i.test(n) ? 'image/webp' : /\.gif$/i.test(n) ? 'image/gif' : /\.hei[cf]$/i.test(n) ? 'image/heic' : 'image/jpeg';

export function render(main) {
  if (!G) G = { groups: [], profileId: curProfile().id, seedHint: '', defCat: '' };
  const on = G.groups.filter(g => g.on);
  const semFicha = G.groups.filter(g => !g.ficha).length;
  const semFoto = G.groups.filter(g => !g.files.length).length;
  const existem = G.groups.filter(g => g.exists).length;
  const pend = S.items.filter(i => i.pendente).length;
  main.innerHTML = `
    ${header('Importar em lote', { back: '#/armario' })}
    <div class="pad">
      ${pend ? `<a class="banner" href="#/conferir">${icon('check')}<span>${pend} peça${pend > 1 ? 's' : ''} importada${pend > 1 ? 's' : ''} esperando conferência. <b>Conferir</b></span></a>` : ''}
      <p class="small"><b>Cada pasta é uma roupa:</b> tudo o que está dentro dela (fotos e fichas .txt) vira uma peça só, como a IA entrega: <code>CAMISA-01/CAMISA-01_FRENTE.png</code>, <code>CAMISA-01_DETALHE.png</code>, <code>CAMISA-01.txt</code>.</p>
      <div class="row-btns wide">
        <button class="btn ${G.groups.length ? 'ghost' : ''}" data-act="folder">${icon('box')} Escolher pasta</button>
        <button class="btn ghost" data-act="files">${icon('image')} Arquivos ou .zip</button>
      </div>
      <details class="ficha" ${G.groups.length ? '' : 'open'}>
        <summary>${icon('file')} Colar fichas da IA (sem arquivo)</summary>
        <p class="small muted">Cole aqui o texto que a IA respondeu — pode ser uma ficha ou várias de uma vez (a conversa inteira). Depois toque em <b>Fotos</b> em cada peça para escolher as imagens dela.</p>
        <textarea id="pasteTxt" rows="6" placeholder="FICHA CAMISA-01&#10;Código: CAMISA-01&#10;Nome: …"></textarea>
        <button class="btn small" data-act="paste">Adicionar fichas</button>
      </details>
      <p class="hint">${icon('info')} <span><b>Computador:</b> “Escolher pasta” e selecione a pasta que tem as pastas das roupas dentro.<br><b>iPhone/iPad:</b> use o arquivo <b>.zip</b> que a IA gerou (ou compacte a pasta) em “Arquivos ou .zip”.</span></p>
      ${G.groups.length ? `
        <div class="infobox">
          <div><small>Encontrado</small><b>${G.groups.length} peça${G.groups.length > 1 ? 's' : ''} · ${FILES.filter(f => f.kind === 'img').length} fotos</b></div>
          ${semFicha ? `<div class="warn small">⚠️ ${semFicha} peça${semFicha > 1 ? 's' : ''} sem ficha: entram com as cores detectadas da foto e você completa depois.</div>` : ''}
          ${semFoto ? `<div class="warn small">⚠️ ${semFoto} ficha${semFoto > 1 ? 's' : ''} sem foto.</div>` : ''}
          ${existem ? `<div class="warn small">⚠️ ${existem} já existe${existem > 1 ? 'm' : ''} no closet (mesmo código) — vieram desmarcada${existem > 1 ? 's' : ''} para não repetir.</div>` : ''}
        </div>
        <div class="grid2">
          ${S.profiles.length > 1 ? `<div class="field"><label>Closet de</label><select id="lp">${profilesOptions(G.profileId)}</select></div>` : ''}
          <div class="field"><label>Categoria (se faltar)</label><select id="ldc"><option value="">—</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === G.defCat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Última vez que usou (para o termômetro)</label><select id="lsh">${LAST_USE_HINTS.map(h => `<option value="${h.id}" ${h.id === G.seedHint ? 'selected' : ''}>${h.name}</option>`).join('')}</select></div>
        <div class="count-row"><span class="count">${on.length} de ${G.groups.length} selecionadas</span>
          <span><button class="link small" data-act="all">${on.length === G.groups.length ? 'Desmarcar todas' : 'Marcar todas'}</button> · <button class="link small" data-act="clear">Limpar lista</button></span></div>
        <div class="lote">${G.groups.map((g, i) => `<div class="lrow ${g.on ? '' : 'off'}">
          <input type="checkbox" data-on="${i}" ${g.on ? 'checked' : ''} aria-label="Importar">
          <div class="lthumbs">${g.files.length ? g.files.slice(0, 3).map(f => `<img src="${f.url}" alt="">`).join('') : `<span class="nofoto">${icon('file')}</span>`}${g.files.length > 3 ? `<span>+${g.files.length - 3}</span>` : ''}</div>
          <div class="lmain">
            <div class="lcode">${esc(g.code)}${g.exists ? ' · já existe' : ''}</div>
            <input data-name="${i}" value="${esc(g.name)}">
            <select data-cat="${i}"><option value="">Categoria…</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === g.category ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
            <div class="lfoot"><small>${g.files.length} foto${g.files.length === 1 ? '' : 's'} · ${g.ficha ? '✅ com ficha' : '⚠️ sem ficha'}</small>
              <button class="chip" data-act="addph" data-i="${i}">${icon('camera')} Fotos</button></div>
          </div></div>`).join('')}</div>
        <div class="sticky-cta"><button class="btn block" data-act="go">Importar ${on.length} peça${on.length === 1 ? '' : 's'}</button></div>` : ''}
    </div>`;
  main.oninput = e => { const t = e.target; if (t.dataset.name != null) { const g = G.groups[+t.dataset.name]; g.name = t.value; g.nameEdited = true; } };
  main.onchange = e => {
    const t = e.target;
    if (t.dataset.on != null) { G.groups[+t.dataset.on].on = t.checked; keepScroll(); }
    else if (t.dataset.cat != null) { const g = G.groups[+t.dataset.cat]; g.category = t.value; g.catEdited = true; }
    else if (t.id === 'lp') G.profileId = t.value;
    else if (t.id === 'lsh') G.seedHint = t.value;
    else if (t.id === 'ldc') { G.defCat = t.value; G.groups.forEach(g => { if (!g.ficha?.category) g.category = t.value; }); keepScroll(); }
  };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'folder') pick(true);
    else if (act === 'files') pick(false);
    else if (act === 'all') { const all = G.groups.some(g => !g.on); G.groups.forEach(g => g.on = all); keepScroll(); }
    else if (act === 'clear') { G.groups.forEach(g => g.files.forEach(f => URL.revokeObjectURL(f.url))); G = null; FILES = []; nav.refresh(); }
    else if (act === 'go') runImport();
    else if (act === 'paste') {
      const txt = document.getElementById('pasteTxt').value;
      const n = splitFichas(txt).length;
      if (!n) return toast('Não encontrei nenhuma ficha. Confira se o texto tem “Categoria:” e “Cores:”.');
      FILES.push({ kind: 'txt', name: 'colado.txt', path: 'colado-' + Date.now() + '.txt', dir: '', size: txt.length, text: txt, pasted: true });
      regroup(); nav.refresh();
      toast(`${n} ficha${n > 1 ? 's' : ''} adicionada${n > 1 ? 's' : ''}! Agora escolha as fotos de cada peça.`);
    }
    else if (act === 'addph') {
      const g = G.groups[+a.dataset.i];
      const imgs = (await chooseImages()).filter(isImg);
      if (!imgs.length) return;
      for (const f of imgs) FILES.push({ kind: 'img', name: f.name, path: 'manual/' + g.key + '/' + Date.now() + '-' + f.name, dir: '', size: f.size, file: f, assignKey: g.key, assignCode: g.code });
      regroup(); keepScroll();
    }
  };
}

function chooseImages() {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*'; inp.style.display = 'none';
    inp.onchange = () => { res([...inp.files]); inp.remove(); };
    document.body.appendChild(inp); inp.click();
  });
}
const keepScroll = () => { const y = scrollY; nav.refresh(); scrollTo(0, y); };

function chooseFiles(folder) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    if (folder) { inp.webkitdirectory = true; inp.setAttribute('webkitdirectory', ''); }
    else inp.accept = 'image/*,.txt,.md,text/plain,.zip,application/zip';
    inp.style.display = 'none';
    inp.onchange = () => { res([...inp.files]); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  });
}

async function pick(folder) {
  if (folder && !('webkitdirectory' in document.createElement('input'))) { toast('Este aparelho não deixa escolher pasta. Use o .zip em “Arquivos ou .zip”.'); return pick(false); }
  await addFiles(await chooseFiles(folder));
}

// Recebe File[] (de pasta, de arquivos soltos ou .zip) e monta a lista de peças
export async function addFiles(all) {
  if (!G) G = { groups: [], profileId: curProfile().id, seedHint: '', defCat: '' };
  const entries = [];   // { name, path, file?, text? }
  for (const f of all) {
    if (f.name.startsWith('.')) continue;
    if (isZip(f)) {
      try {
        const z = await readZip(f);
        const zipName = f.name.replace(/\.zip$/i, '');
        for (const n of z.names) {
          const base = n.split('/').pop();
          if (!base || n.endsWith('/') || /(^|\/)__MACOSX\//.test(n) || base.startsWith('.')) continue;
          if (!IMG_RE.test(base) && !TXT_RE.test(base)) continue;
          const blob = await z.blob(n, IMG_RE.test(base) ? mimeOf(base) : 'text/plain');
          entries.push({ name: base, path: `${zipName}.zip/${n}`, file: new File([blob], base, { type: blob.type }) });
        }
      } catch (err) { toast('Não consegui abrir ' + f.name + ': ' + err.message); }
    } else if (isImg(f) || isTxt(f)) entries.push({ name: f.name, path: f.webkitRelativePath || f.name, file: f });
  }
  if (!entries.length) return toast('Nenhuma foto ou ficha encontrada.');
  const known = new Set(FILES.map(f => f.path + '|' + f.size));
  for (const e of entries) {
    if (known.has(e.path + '|' + e.file.size)) continue;            // escolher de novo não duplica
    const dir = e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : '';
    if (IMG_RE.test(e.name) || /^image\//.test(e.file.type)) FILES.push({ kind: 'img', name: e.name, path: e.path, dir, size: e.file.size, file: e.file });
    else FILES.push({ kind: 'txt', name: e.name, path: e.path, dir, size: e.file.size, text: await e.file.text() });
  }
  regroup();
  nav.refresh();
}

function regroup() {
  const prev = new Map(G.groups.map(g => [g.key, g]));
  G.groups.forEach(g => g.files.forEach(f => f.url && URL.revokeObjectURL(f.url)));
  // "pasta de roupa" = pasta com arquivos e sem subpastas. Exceção: a pasta escolhida no topo com
  // fotos de várias roupas soltas (códigos diferentes) — aí junta pelo código do nome do arquivo.
  const dirs = new Set(FILES.map(f => f.dir));
  const hasSub = d => [...dirs].some(o => o !== d && o.startsWith(d + '/'));
  const multiCode = d => new Set(FILES.filter(f => f.dir === d && f.kind === 'img').map(f => ck(baseKey(f.name)))).size > 1;
  const isPieceDir = d => !!d && !hasSub(d) && !(!d.includes('/') && multiCode(d));
  const groups = new Map();
  const groupFor = (key, code) => {
    if (!groups.has(key)) groups.set(key, { key, code, files: [], fichas: [], on: true });
    return groups.get(key);
  };
  // 1) pastas de roupa: tudo dentro é uma peça
  for (const f of FILES) {
    if (f.assignKey || !isPieceDir(f.dir)) continue;
    const g = groupFor('dir:' + f.dir, f.dir.split('/').pop().toUpperCase());
    if (f.kind === 'img') g.files.push(f); else g.fichas.push(...splitFichas(f.text).map(parseFicha));
  }
  // 2) arquivos soltos: juntam pelo código no nome do arquivo
  for (const f of FILES.filter(f => !f.assignKey && !isPieceDir(f.dir) && f.kind === 'img')) {
    const k = baseKey(f.name);
    groupFor('code:' + ck(k), k.toUpperCase()).files.push(f);
  }
  for (const f of FILES.filter(f => f.kind === 'txt' && (f.pasted || !isPieceDir(f.dir)))) {
    const fichas = splitFichas(f.text).map(parseFicha);
    for (const fi of fichas) {
      const code = fi.code || (fichas.length === 1 ? baseKey(f.name) : '');
      const c = ck(code);
      // procura uma peça (pasta ou arquivos soltos) com o mesmo código
      let g = [...groups.values()].find(x => ck(x.code) === c || x.fichas.some(y => ck(y.code) === c));
      if (!g) g = groupFor('code:' + (c || 'ficha' + groups.size), (code || '').toUpperCase());
      g.fichas.push(fi);
    }
  }
  for (const f of FILES.filter(f => f.assignKey)) groupFor(f.assignKey, f.assignCode).files.push(f);
  const existing = new Set(S.items.map(i => ck(i.code || '')).filter(Boolean));
  G.groups = [...groups.values()].map(g => {
    // várias fichas iguais na mesma pasta (uma por foto) viram uma só: fica a mais completa
    const ficha = g.fichas.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] || null;
    const code = (ficha?.code || g.code || '').toUpperCase();
    g.files.sort((a, b) => order(labelOf(a.name)) - order(labelOf(b.name)));
    const files = g.files.map(f => ({ file: f.file, name: f.name, url: URL.createObjectURL(f.file), label: labelOf(f.name) }));
    const exists = code && existing.has(ck(code));
    const old = prev.get(g.key);
    return { key: g.key, code, files, ficha, exists, on: old ? old.on : !exists, name: old?.nameEdited ? old.name : ficha?.name || pretty(code || g.key.replace(/^\w+:/, '')), nameEdited: old?.nameEdited, category: old?.catEdited ? old.category : ficha?.category || G.defCat, catEdited: old?.catEdited };
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
      it.code = g.code && /^[A-Z0-9][\w.-]*$/i.test(g.code) ? g.code : nextCode(it);
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
    const doneFiles = new Set(G.groups.filter(g => g.done).flatMap(g => g.files.map(f => f.file)));
    FILES = FILES.filter(f => !doneFiles.has(f.file));
    G.groups = G.groups.filter(g => !g.done);
    alert(`${done} peças importadas. Não consegui importar ${failed.length}:\n\n${failed.join('\n')}\n\nElas continuam na lista para tentar de novo.`);
    nav.refresh();
  } else {
    G = null; FILES = [];
    toast(`${done} peças importadas! Agora é só conferir.`);
    nav.go('#/conferir', true);
  }
}
