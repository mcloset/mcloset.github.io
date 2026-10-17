import { S, curProfile, profile, item, look, save, deleteLook, lookItems, lookProfiles, lookUsage, lookPrice, costPerUse, profileItems, itemBand, savePhoto, getPhoto } from '../store.js';
import { CATEGORIES, catName, OCASIOES, CLIMAS } from '../catalog.js';
import { scoreAgainst, analyzeLook, paletteFit, GROUP_PALETTES, NAMED, isNeutralFamily } from '../color.js';
import { SLOTS, suggestLook, pickSlot } from '../suggest.js';

const TOM_COLORS = NAMED.filter(n => !isNeutralFamily(n[2]));
import { header, icon, chips, itemCard, collage, hydrate, openSheet, closeSheet, choose, nav, avatar, emptyState, sortByCat, swatch } from '../ui.js';
import { $, esc, uid, brl, todayStr, fmtDate, toast, norm, pickFiles, climaDoMes, shuffle, deliverFile } from '../util.js';
import { processImage } from '../images.js';
import { shareLook as shareLookFile } from '../share.js';
import { scheduleSheet } from './planejar.js';

// ================= LISTA =================
const L = { q: '', group: 'tudo', mine: true };

export function renderList(main) {
  const p = curProfile();
  let looks = S.looks.filter(l => !L.mine || lookItems(l).some(i => i.profileId === p.id) || !(l.itemIds || []).length);
  const groups = [...new Set(looks.map(l => l.group).filter(Boolean))];
  const q = norm(L.q);
  const list = looks
    .filter(l => L.group === 'tudo' || (L.group === 'dupla' ? lookProfiles(l).length > 1 : l.group === L.group))
    .filter(l => !q || norm(l.name + ' ' + (l.group || '') + ' ' + (l.ocasiao || '')).includes(q))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  main.innerHTML = `
    ${header('Meus Looks')}
    <div class="toolbar"><label class="search">${icon('search')}<input id="q" type="search" placeholder="Buscar looks…" value="${esc(L.q)}"></label></div>
    <div class="quick">
      <a class="qcard" href="#/hoje">${icon('dice')}<span>Look do dia</span></a>
      <a class="qcard" href="#/juntas">${icon('users')}<span>Look em grupo</span></a>
      <a class="qcard" href="#/planejar?tab=viagens">${icon('suitcase')}<span>Mala de viagem</span></a>
    </div>
    ${chips([{ id: 'tudo', name: 'Tudo' }, { id: 'dupla', name: 'Em grupo' }, ...groups.map(g => ({ id: g, name: g }))], L.group, 'group')}
    <div id="list">${list.length ? `<div class="lgrid">${list.map(lookCard).join('')}</div>` : emptyState(looks.length ? 'Nenhum look encontrado.' : 'Você ainda não montou nenhum look.<br>Toque no + para combinar suas peças.', 'book')}</div>
    <button class="fab" data-act="fab" aria-label="Novo look">${icon('plus')}</button>`;
  hydrate(main);
  main.oninput = e => { if (e.target.id === 'q') { L.q = e.target.value; const pos = e.target.selectionStart; nav.refresh(); const i = $('#q'); i.focus(); i.setSelectionRange(pos, pos); } };
  main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'group') { L.group = a.dataset.v; nav.refresh(); }
    else if (a.dataset.act === 'open-look') nav.go('#/look/' + a.dataset.id);
    else if (a.dataset.act === 'fab') {
      const r = await choose('Novo look', [
        { name: 'Montar look', desc: 'escolha as peças do seu closet', icon: 'book', value: '#/novo-look' },
        { name: 'Look em grupo', desc: 'sair juntos: looks combinando para várias pessoas', icon: 'users', value: '#/juntas' },
        { name: 'Sugestão do dia', desc: 'o app monta um look para você', icon: 'dice', value: '#/hoje' },
      ]);
      if (r) nav.go(r);
    }
  };
}

function lookCard(l) {
  const its = lookItems(l);
  const profs = lookProfiles(l);
  return `<div class="lcard" data-act="open-look" data-id="${l.id}">
    ${collage(its)}
    <div class="lc-name">${esc(l.name)}</div>
    <div class="lc-sub">${l.group ? esc(l.group) + ' · ' : ''}${its.length} peça${its.length === 1 ? '' : 's'} ${profs.length > 1 ? profs.map(p => avatar(p, 'xs')).join('') : ''}</div>
  </div>`;
}

// ================= DETALHE =================
export function renderDetail(main, params) {
  const l = look(params.id);
  if (!l) return nav.go('#/looks');
  const its = lookItems(l);
  const u = lookUsage(l);
  const price = lookPrice(l);
  const an = analyzeLook(its);
  const hist = S.events.filter(e => e.lookId === l.id).sort((a, b) => b.date.localeCompare(a.date));
  const unavailable = its.filter(i => i.status && i.status !== 'armario');
  main.innerHTML = `
    ${header('', { back: '#/looks', right: `
      <button class="icon-btn" data-act="share" aria-label="Compartilhar">${icon('share')}</button>
      <button class="icon-btn" data-act="edit" aria-label="Editar">${icon('edit')}</button>
      <button class="icon-btn" data-act="del" aria-label="Excluir">${icon('trash')}</button>` })}
    <div class="pad">
      ${collage(its, 'big')}
      <h2 class="serif big">${esc(l.name)}</h2>
      <div class="muted">${[l.group, l.ocasiao].filter(Boolean).map(esc).join(' · ')}</div>
      ${l.shared ? `<div class="pill">${icon('users')} Look compartilhado por ${esc(l.sharedBy || '')}</div>` : ''}
      ${unavailable.length ? `<div class="pill warn">Atenção: ${unavailable.map(i => esc(i.name)).join(', ')} não está no armário agora.</div>` : ''}

      <div class="row-btns wide">
        <button class="btn" data-act="use">${icon('camera')} Registrar uso</button>
        <button class="btn ghost" data-act="schedule">${icon('calendar')} Programar</button>
      </div>

      <div class="consult">
        <div class="ct">${icon('wand')} <b>Parecer de estilo</b>${an.score != null ? `<span class="score-big">${an.score}%</span>` : ''}</div>
        <ul>${an.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
      </div>

      <div class="stats">
        <div><small>Valor do look</small><b>${brl(price || null)}</b></div>
        <div><small>Usos</small><b>${u.uses}</b></div>
        <div><small>Preço por uso</small><b>${brl(costPerUse(price || null, u.uses))}</b></div>
      </div>

      <h3 class="sec">Peças</h3>
      <div class="igrid">${sortByCat(its).map(i => itemCard(i)).join('')}</div>

      <h3 class="sec">Histórico de uso</h3>
      ${hist.length ? `<div class="uses">${hist.map(e => `<div class="use ${e.status}">
          ${e.photoId ? `<img data-ph="${e.photoId}" alt="">` : `<div class="noph">${icon(e.status === 'registrado' ? 'checkCircle' : 'clock')}</div>`}
          <div><b>${fmtDate(e.date)}</b><div class="muted small">${e.status === 'registrado' ? 'Usado' : 'Programado'}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
        </div>`).join('')}</div>` : `<div class="empty-mini">${icon('camera')}<p>Nenhum uso registrado ainda. Registre quando usar e adicione uma foto para criar seu diário de looks.</p></div>`}
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'edit') nav.go('#/editar-look/' + l.id);
    else if (act === 'del') { if (confirm(`Excluir o look “${l.name}”? As peças continuam no closet.`)) { await deleteLook(l.id); toast('Look excluído.'); nav.go('#/looks', true); } }
    else if (act === 'use') registerUseSheet(l);
    else if (act === 'schedule') scheduleSheet({ lookId: l.id, title: 'Programar “' + l.name + '”' });
    else if (act === 'share') {
      const how = await choose('Compartilhar look', [
        { name: 'Imagem do look', desc: 'foto montada para mandar no WhatsApp/Instagram', icon: 'image', value: 'img' },
        { name: 'Arquivo do look', desc: 'para outra pessoa abrir no MCLOSET dela', icon: 'file', value: 'file' },
      ]);
      if (how === 'img') shareLook(l);
      else if (how === 'file') { toast('Preparando o arquivo…'); shareLookFile(l.id); }
    }
  };
}

export function registerUseSheet(l, date = todayStr()) {
  let photo = null;
  const draw = () => `
    <div class="field"><label>Data</label><input type="date" id="ud" value="${date}"></div>
    <div class="field"><label>Foto do dia (opcional)</label>
      <button class="ph-add wide" data-act="ph">${photo ? `<img src="${photo.url}" alt="">` : icon('camera') + '<span>Adicionar foto</span>'}</button></div>
    <div class="field"><label>Observação</label><input id="un" placeholder="Onde foi, como se sentiu…"></div>
    <button class="btn block" data-act="ok">Registrar uso</button>`;
  const body = openSheet(draw(), {
    title: 'Registrar uso',
    onAct: async act => {
      if (act === 'ph') {
        const [f] = await pickFiles({ multiple: false }); if (!f) return;
        const r = await processImage(f, { colors: false });
        photo = { ...r, url: URL.createObjectURL(r.thumb) };
        date = $('#ud').value; body.innerHTML = draw();
      } else if (act === 'ok') {
        const d = $('#ud').value || todayStr();
        const its = lookItems(l);
        const ev = S.events.find(e => e.lookId === l.id && e.date === d && e.status === 'programado');
        const e = ev || { id: uid(), lookId: l.id, date: d };
        Object.assign(e, { status: 'registrado', itemIds: its.map(i => i.id), profileIds: [...new Set(its.map(i => i.profileId))], note: $('#un').value });
        if (photo) e.photoId = await savePhoto(photo);
        await save('events', e);
        closeSheet(); toast('Uso registrado!'); nav.refresh();
      }
    },
  });
}

async function shareLook(l) {
  const its = sortByCat(lookItems(l));
  const W = 1080, pad = 60, top = 150;
  const n = its.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const cell = (W - pad * 2) / cols;
  const H = top + rows * cell + pad + 40;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2b2b2b'; ctx.font = 'italic 64px Georgia, serif'; ctx.fillText(l.name, pad, 100);
  for (let i = 0; i < n; i++) {
    const ph = its[i].photos?.[0] && await getPhoto(its[i].photos[0]);
    if (!ph) continue;
    const bmp = await createImageBitmap(ph.full || ph.thumb);
    const x = pad + (i % cols) * cell, y = top + Math.floor(i / cols) * cell;
    const r = Math.min((cell - 20) / bmp.width, (cell - 20) / bmp.height);
    ctx.drawImage(bmp, x + (cell - bmp.width * r) / 2, y + (cell - bmp.height * r) / 2, bmp.width * r, bmp.height * r);
  }
  ctx.fillStyle = '#9a9a9a'; ctx.font = '28px Georgia, serif'; ctx.fillText('MCLOSET', pad, H - 40);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  await deliverFile(blob, l.name.replace(/[^\w\- ]+/g, '').trim() + '.jpg');
}

// ================= MONTAR LOOK =================
let C = null;   // { key, id?, name, group, ocasiao, itemIds, profiles: [], tab, cat, sortMatch, q }

export function renderComposer(main, params) {
  const key = params.id ? 'edit:' + params.id : 'new:' + (params.perfis || '') + (params.with || '') + (params.items || '');
  if (!C || C.key !== key || nav.fresh) {
    if (params.id) {
      const l = look(params.id); if (!l) return nav.go('#/looks');
      const profs = [...new Set(lookItems(l).map(i => i.profileId))];
      C = { key, id: l.id, name: l.name, group: l.group || '', ocasiao: l.ocasiao || '', notes: l.notes || '', itemIds: [...(l.itemIds || [])], profiles: profs.length ? profs : [curProfile().id], palette: l.paleta || '', base: l.base || '' };
    } else {
      const profs = params.perfis ? params.perfis.split(',').filter(profile) : [curProfile().id];
      const ids = params.items ? params.items.split(',') : params.with ? [params.with] : [];
      C = { key, name: params.name || '', group: params.group || '', ocasiao: params.ocasiao || '', notes: '', itemIds: ids.filter(item), profiles: profs, trip: params.trip, day: params.day, palette: params.paleta || '', base: params.base ? '#' + params.base.replace('#', '') : '' };
    }
    Object.assign(C, { tab: C.profiles[0], cat: 'tudo', sortMatch: true, q: '', onlyPal: !!C.palette });
  }
  drawComposer(main);
}

function drawComposer(main) {
  const sel = C.itemIds.map(item).filter(Boolean);
  const tabItems = profileItems(C.tab).filter(i => i.status !== 'pequena');
  const q = norm(C.q);
  const fit = i => C.palette ? paletteFit(i, C.palette, C.base) : 1;
  let cand = tabItems.filter(i => (C.cat === 'tudo' || i.category === C.cat) && (!q || norm(i.name + ' ' + (i.sub || '') + ' ' + (i.colors || []).map(c => c.name).join(' ')).includes(q))
    && (!C.onlyPal || C.itemIds.includes(i.id) || fit(i) >= 0.6));
  // nota = harmonia com o que já foi escolhido (e, se houver paleta do grupo, o quanto a peça está dentro dela)
  const scored = cand.map(i => {
    if (C.itemIds.includes(i.id)) return { i, s: null };
    const h = sel.length ? scoreAgainst(i, sel)?.score : null;
    const s = C.palette ? Math.round((h ?? 80) * 0.6 + fit(i) * 40) : h;
    return { i, s };
  });
  if (C.sortMatch && (sel.length || C.palette)) scored.sort((a, b) => (b.s ?? -1) - (a.s ?? -1));
  const multi = C.profiles.length > 1;
  const otherSel = sel.filter(i => i.profileId !== C.tab);
  main.innerHTML = `
    ${header(C.id ? 'Editar look' : multi ? 'Look em grupo' : 'Montar look', { back: C.id ? '#/look/' + C.id : '#/looks' })}
    <div class="composer">
      <div class="comp-preview">
        ${sel.length ? `<div class="sel-strip">${sortByCat(sel).map(i => `<button class="sel-it" data-act="unsel" data-id="${i.id}">${i.photos?.[0] ? `<img data-ph="${i.photos[0]}" alt="">` : icon('hanger')}<span class="x">${icon('x')}</span>${multi ? avatar(profile(i.profileId), 'xs') : ''}</button>`).join('')}</div>` : `<p class="muted center small">Toque nas peças abaixo para montar o look.</p>`}
        ${sel.length >= 2 ? `<div class="harm">${harmLine(sel)}</div>` : ''}
      </div>
      ${multi ? `<div class="ptabs">${C.profiles.map(pid => { const p = profile(pid); return `<button class="${pid === C.tab ? 'on' : ''}" data-act="tab" data-v="${pid}">${avatar(p, 'xs')} ${esc(p.name)} <small>${sel.filter(i => i.profileId === pid).length}</small></button>`; }).join('')}</div>` : ''}
      ${multi && otherSel.length ? `<p class="hint">${icon('wand')} Peças ordenadas pelo que mais combina com o que os outros já escolheram.</p>` : ''}
      ${multi || C.palette ? `<div class="field"><label>${icon('palette')} Paleta do grupo</label>${chips(GROUP_PALETTES.map(p => ({ id: p.id, name: p.name })), C.palette, 'pal')}
        ${C.palette === 'tom' ? `<div class="chips">${TOM_COLORS.map(n => `<button class="chip ${C.base === n[1] ? 'on' : ''}" data-act="base" data-v="${n[1]}">${swatch(n[1])}${esc(n[0])}</button>`).join('')}</div>` : ''}
        ${C.palette ? `<label class="ck"><input type="checkbox" id="onlypal" ${C.onlyPal ? 'checked' : ''}><span>Mostrar só peças dentro da paleta <small>${esc(GROUP_PALETTES.find(p => p.id === C.palette)?.desc || '')}</small></span></label>` : ''}</div>` : ''}
      <div class="toolbar"><label class="search">${icon('search')}<input id="cq" type="search" placeholder="Buscar…" value="${esc(C.q)}"></label>
        <button class="chip ${C.sortMatch ? 'on' : ''}" data-act="sortm">${icon('wand')} Combina</button></div>
      ${chips([{ id: 'tudo', name: 'Tudo' }, ...CATEGORIES.filter(c => tabItems.some(i => i.category === c.id))], C.cat, 'ccat')}
      <div class="igrid">${scored.map(({ i, s }) => itemCard(i, { score: s, selected: C.itemIds.includes(i.id), act: 'toggle' })).join('') || emptyState('Nenhuma peça aqui.')}</div>
      <div class="comp-form">
        <div class="field"><label>Nome do look</label><input id="ln" value="${esc(C.name)}" placeholder="Ex.: Dia 2 - noite"></div>
        <div class="grid2">
          <div class="field"><label>Grupo / coleção</label><input id="lg" value="${esc(C.group)}" list="lgroups" placeholder="Ex.: Viagem Pernambuco"></div>
          <div class="field"><label>Ocasião</label><select id="lo"><option value="">—</option>${OCASIOES.map(o => `<option ${o === C.ocasiao ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <datalist id="lgroups">${[...new Set(S.looks.map(l => l.group).filter(Boolean))].map(g => `<option value="${esc(g)}">`).join('')}</datalist>
        <button class="btn block" data-act="save">${C.id ? 'Salvar look' : 'Criar look'} (${sel.length} peça${sel.length === 1 ? '' : 's'})</button>
        <button class="btn block ghost" data-act="add-person">${icon('users')} ${multi ? 'Adicionar mais uma pessoa' : 'Adicionar outra pessoa neste look'}</button>
      </div>
    </div>`;
  hydrate(main);
  main.onchange = e => { if (e.target.id === 'onlypal') { C.onlyPal = e.target.checked; drawKeep(main); } };
  main.oninput = e => {
    const t = e.target;
    if (t.id === 'cq') { C.q = t.value; const pos = t.selectionStart; drawComposer(main); const i = $('#cq'); i.focus(); i.setSelectionRange(pos, pos); }
    else if (t.id === 'ln') C.name = t.value;
    else if (t.id === 'lg') C.group = t.value;
    else if (t.id === 'lo') C.ocasiao = t.value;
  };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'toggle') { const id = a.dataset.id; C.itemIds = C.itemIds.includes(id) ? C.itemIds.filter(x => x !== id) : [...C.itemIds, id]; drawKeep(main); }
    else if (act === 'unsel') { C.itemIds = C.itemIds.filter(x => x !== a.dataset.id); drawKeep(main); }
    else if (act === 'tab') { C.tab = a.dataset.v; C.cat = 'tudo'; drawComposer(main); }
    else if (act === 'ccat') { C.cat = a.dataset.v; drawKeep(main); }
    else if (act === 'sortm') { C.sortMatch = !C.sortMatch; drawKeep(main); }
    else if (act === 'pal') { C.palette = a.dataset.v; C.onlyPal = !!C.palette; if (C.palette === 'tom' && !C.base) C.base = TOM_COLORS[0][1]; drawKeep(main); }
    else if (act === 'base') { C.base = a.dataset.v; drawKeep(main); }
    else if (act === 'add-person') {
      const others = S.profiles.filter(p => !C.profiles.includes(p.id));
      if (!others.length) { if (confirm('Você ainda não tem outra pessoa cadastrada. Criar agora?')) nav.go('#/perfis'); return; }
      const pid = await choose('Adicionar quem?', others.map(p => ({ name: p.name, value: p.id, icon: 'user' })));
      if (pid) { C.profiles.push(pid); C.tab = pid; C.cat = 'tudo'; drawComposer(main); }
    }
    else if (act === 'save') saveLook();
  };
}
function drawKeep(main) { const y = scrollY; drawComposer(main); scrollTo(0, y); }

function harmLine(sel) {
  const an = analyzeLook(sel);
  const cls = an.score >= 80 ? 'hi' : an.score >= 65 ? 'mid' : 'lo';
  return `<span class="score ${cls}">${an.score}%</span> <span class="small">${esc(an.notes[0])}</span>`;
}

async function saveLook() {
  if (!C.itemIds.length) return toast('Escolha pelo menos uma peça.');
  const sel = C.itemIds.map(item).filter(Boolean);
  let name = C.name.trim();
  if (!name) name = C.ocasiao || ('Look ' + (S.looks.length + 1));
  const l = C.id ? look(C.id) : { id: uid(), createdAt: new Date().toISOString() };
  Object.assign(l, { name, group: C.group.trim(), ocasiao: C.ocasiao, itemIds: C.itemIds, climas: [...new Set(sel.flatMap(i => i.climas || []))], paleta: C.palette || '', base: C.base || '' });
  await save('looks', l);
  if (C.trip) {
    const t = S.trips.find(t => t.id === C.trip);
    const d = t?.days?.find(d => d.date === C.day);
    if (d && !d.lookIds.includes(l.id)) { d.lookIds.push(l.id); await save('trips', t); }
    const trip = C.trip; C = null; toast('Look criado na viagem!'); return nav.go('#/viagem/' + trip, true);
  }
  C = null;
  toast('Look salvo!');
  nav.go('#/look/' + l.id, true);
}

// ================= LOOK EM GRUPO (sair juntos) =================
let G = null;   // { pids: [], palette, base, clima, ocasiao }

export function renderJuntas(main) {
  if (!G) G = { pids: [curProfile().id], palette: '', base: '', clima: climaDoMes(), ocasiao: '' };
  G.pids = G.pids.filter(profile);
  const pal = GROUP_PALETTES.find(p => p.id === G.palette);
  main.innerHTML = `
    ${header('Sair juntos', { back: '#/looks' })}
    <div class="pad">
      <p>Escolha quem vai e uma paleta para o grupo. O app monta um look para cada pessoa com as cores conversando entre si, ou você monta do seu jeito.</p>
      <div class="field"><label>Quem vai</label>
        <div class="people">${S.profiles.map(p => `<button class="person ${G.pids.includes(p.id) ? 'on' : ''}" data-act="who" data-v="${p.id}">${avatar(p, 'lg')}<span>${esc(p.name)}</span>${p.sharedFrom ? '<small>compartilhado</small>' : ''}</button>`).join('')}
          <a class="person add" href="#/perfis"><span class="avatar lg addav">${icon('plus')}</span><span>Pessoa</span></a></div></div>
      <div class="field"><label>${icon('palette')} Paleta do grupo</label>
        <div class="palgrid">${GROUP_PALETTES.map(p => `<button class="palcard ${G.palette === p.id ? 'on' : ''}" data-act="pal" data-v="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small>${palDots(p)}</button>`).join('')}</div>
        ${G.palette === 'tom' ? `<div class="chips wrap">${TOM_COLORS.map(n => `<button class="chip ${G.base === n[1] ? 'on' : ''}" data-act="base" data-v="${n[1]}">${swatch(n[1])}${esc(n[0])}</button>`).join('')}</div>` : ''}
      </div>
      <div class="field"><label>Clima</label><div class="chips">${CLIMAS.map(c => `<button class="chip ${G.clima === c.id ? 'on' : ''}" data-act="clima" data-v="${c.id}">${c.icon} ${c.name}</button>`).join('')}</div></div>
      <div class="field"><label>Ocasião</label><select id="goc"><option value="">Qualquer ocasião</option>${OCASIOES.map(o => `<option ${o === G.ocasiao ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <button class="btn block" data-act="auto">${icon('wand')} Sugerir looks para ${G.pids.length > 1 ? 'todos' : 'mim'}</button>
      <button class="btn block ghost" data-act="manual">Montar do meu jeito</button>
      ${pal?.id ? '' : '<p class="hint">Sem paleta, o app só cuida para as cores de todos combinarem.</p>'}
    </div>`;
  hydrate(main);
  main.oninput = null;
  main.onchange = e => { if (e.target.id === 'goc') G.ocasiao = e.target.value; };
  main.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'who') { G.pids = G.pids.includes(v) ? G.pids.filter(x => x !== v) : [...G.pids, v]; keepY(); }
    else if (act === 'pal') { G.palette = v; if (v === 'tom' && !G.base) G.base = TOM_COLORS[0][1]; keepY(); }
    else if (act === 'base') { G.base = v; keepY(); }
    else if (act === 'clima') { G.clima = v; keepY(); }
    else if (act === 'manual' || act === 'auto') {
      if (!G.pids.length) return toast('Escolha pelo menos uma pessoa.');
      const qs = new URLSearchParams({ perfis: G.pids.join(','), name: G.pids.length > 1 ? 'Look em grupo' : '', ocasiao: G.ocasiao });
      if (G.palette) qs.set('paleta', G.palette);
      if (G.palette === 'tom') qs.set('base', G.base.replace('#', ''));
      if (act === 'auto') {
        const opts = { clima: G.clima, ocasiao: G.ocasiao, palette: G.palette, baseHex: G.base };
        const chosen = [], empty = [];
        for (const pid of G.pids) {
          let got = Object.values(suggestLook(pid, opts, chosen));
          if (!got.length && G.palette) got = Object.values(suggestLook(pid, { ...opts, palette: '' }, chosen));   // ninguém fica sem look
          if (!got.length) empty.push(profile(pid).name);
          chosen.push(...got);
        }
        if (!chosen.length) return toast('Não achei peças para esse clima/ocasião. Tente “Montar do meu jeito”.');
        if (empty.length) toast('Sem peças disponíveis para: ' + empty.join(', '));
        qs.set('items', chosen.join(','));
      }
      nav.go('#/novo-look?' + qs.toString());
    }
  };
}
const keepY = () => { const y = scrollY; nav.refresh(); scrollTo(0, y); };
function palDots(p) {
  let hexes;
  if (p.id === 'tom') hexes = ['#F6D3DA', '#E77C9C', '#8A1E3A'];
  else if (p.names && !p.families) hexes = p.names.slice(0, 5).map(n => NAMED.find(x => x[0] === n)?.[1]);
  else if (p.families) hexes = NAMED.filter(n => p.families[0] === n[2]).filter((_, i) => i % 2 === 0).slice(0, 5).map(n => n[1]);
  else hexes = ['#C8242F', '#F3C623', '#2D4FC1', '#1E8A3E'];
  return `<span class="paldots">${hexes.filter(Boolean).map(h => swatch(h, 'xs')).join('')}</span>`;
}

// ================= LOOK DO DIA =================
let H = null;   // { pid, clima, ocasiao, items: {slot: id}, temp }

export function renderHoje(main, params = {}) {
  const p = curProfile();
  if (!H || H.pid !== p.id) H = { pid: p.id, clima: climaDoMes(), ocasiao: '', items: {}, temp: null };
  if (params.clima && nav.fresh && params.clima !== H.clima) { H.clima = params.clima; H.items = {}; }
  if (params.clima && S.settings.homeWx?.data && nav.fresh) H.temp = Math.round(S.settings.homeWx.data.temp ?? S.settings.homeWx.data.max);
  if (!Object.keys(H.items).length) H.items = suggestLook(p.id, { clima: H.clima, ocasiao: H.ocasiao });
  const sel = Object.values(H.items).map(item).filter(Boolean);
  const an = analyzeLook(sel);
  main.innerHTML = `
    ${header('Look do dia', { back: '#/looks' })}
    <div class="pad">
      <div class="field"><label>Clima ${H.temp != null ? `<span class="muted">— agora ${H.temp}°C</span>` : ''}</label>
        <div class="chips">${CLIMAS.map(c => `<button class="chip ${H.clima === c.id ? 'on' : ''}" data-act="clima" data-v="${c.id}">${c.icon} ${c.name}</button>`).join('')}
        <button class="chip" data-act="weather">${icon('sun')} Ver clima de agora</button></div></div>
      <div class="field"><label>Ocasião</label><select id="hoc"><option value="">Qualquer ocasião</option>${OCASIOES.map(o => `<option ${o === H.ocasiao ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <p class="hint">${icon('thermo')} O app dá preferência às peças que você está usando pouco, para tirá-las do esquecimento.</p>
      ${sel.length ? collage(sel, 'big') : emptyState('Não encontrei peças suficientes para este clima/ocasião.', 'dice')}
      ${sel.length >= 2 ? `<div class="consult"><div class="ct">${icon('wand')} <b>Parecer</b><span class="score-big">${an.score}%</span></div><ul>${an.notes.slice(0, 3).map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
      <div class="rows">${Object.entries(H.items).map(([slot, id]) => { const it = item(id); return it ? `<div class="irow" data-act="open-item" data-id="${id}"><div class="thumb">${it.photos?.[0] ? `<img data-ph="${it.photos[0]}" alt="">` : icon('hanger')}</div><div class="irow-main"><div class="nm">${esc(it.name)}</div><div class="sub">${SLOTS.find(s => s.id === slot)?.name}</div></div><button class="icon-btn" data-act="reroll" data-v="${slot}" aria-label="Trocar">${icon('refresh')}</button></div>` : ''; }).join('')}</div>
      <div class="row-btns wide">
        <button class="btn ghost" data-act="again">${icon('dice')} Outra sugestão</button>
        <button class="btn ghost" data-act="savelook">Salvar como look</button>
        <button class="btn" data-act="wear">${icon('check')} Vou usar hoje</button>
      </div>
    </div>`;
  hydrate(main);
  main.oninput = null;
  main.onchange = e => { if (e.target.id === 'hoc') { H.ocasiao = e.target.value; H.items = {}; nav.refresh(); } };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'clima') { H.clima = v; H.items = {}; nav.refresh(); }
    else if (act === 'again') { H.items = {}; nav.refresh(); }
    else if (act === 'reroll') {
      const cur = H.items[v]; delete H.items[v];
      const id = pickSlot(p.id, SLOTS.find(s => s.id === v), { clima: H.clima, ocasiao: H.ocasiao }, Object.values(H.items), cur);
      H.items[v] = id || cur;
      nav.refresh();
    }
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'weather') getWeather();
    else if (act === 'savelook' || act === 'wear') {
      const ids = Object.values(H.items);
      if (!ids.length) return;
      if (act === 'wear') {
        await save('events', { id: uid(), date: todayStr(), status: 'registrado', itemIds: ids, profileIds: [p.id], lookId: null, note: 'Look do dia' });
        toast('Uso registrado! Bom dia 😊'); H.items = {}; nav.refresh();
      } else nav.go('#/novo-look?items=' + ids.join(',') + '&name=' + encodeURIComponent('Look ' + fmtDate(todayStr())));
    }
  };
}

async function getWeather() {
  if (!navigator.geolocation) return toast('Seu aparelho não informou a localização.');
  toast('Buscando o clima…');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude, longitude } = pos.coords;
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=temperature_2m&daily=temperature_2m_max&timezone=auto&forecast_days=1`);
      const j = await r.json();
      const t = Math.round(j.current?.temperature_2m ?? j.daily?.temperature_2m_max?.[0]);
      const max = Math.round(j.daily?.temperature_2m_max?.[0] ?? t);
      H.temp = t;
      H.clima = max >= 26 ? 'calor' : max <= 18 ? 'frio' : 'meia';
      H.items = {};
      nav.refresh();
    } catch { toast('Sem internet para ver o clima agora.'); }
  }, () => toast('Permita a localização para ver o clima.'), { timeout: 10000 });
}
