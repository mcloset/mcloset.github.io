import { S, curProfile, profile, save, remove, saveSettings, profileItems, itemUsage, itemBand, costPerUse, deleteProfile, savePhoto, isActive } from '../store.js';
import { CATEGORIES, catName, STATUS, statusName, CARTELAS, SEASONS, cartelaName, seasonOf, AVATAR_COLORS, BANDS, GONE, CLIMAS, ESTAMPAS, OCASIOES, ESTILOS, DETAIL_FIELDS } from '../catalog.js';
import { FAMILIES, NAMED, hexLab, deltaE, scoreAgainst, cartelaOfColors, familyOfColors } from '../color.js';
import { processImage } from '../images.js';
import { header, icon, chips, itemCard, itemRow, hydrate, openSheet, closeSheet, nav, avatar, emptyState, swatch, cartelaSelect } from '../ui.js';
import { $, esc, uid, brl, parseMoney, todayStr, fmtDate, toast, pickFiles, daysBetween } from '../util.js';
import { pending } from './peca.js';
import { exportSheet } from './armario.js';
import { CONFIG } from '../config.js';
import { happyCard, funSettingsSheet } from '../fun.js';

// ================= HUB =================
export function render(main) {
  const p = curProfile();
  const its = profileItems(p.id);
  const total = its.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const away = S.items.filter(i => i.status && !['armario', 'doada', 'vendida'].includes(i.status)).length;
  const last = S.settings.lastBackup;
  main.innerHTML = `
    ${header('Hub pessoal')}
    <div class="pad">
      <div class="pcard">${avatar(p, 'lg')}<div><h2 class="serif">${esc(p.name)}</h2><div class="muted small">${its.length} peças · ${brl(total)} no closet${p.cartela ? ' · cartela ' + cartelaName(p.cartela) : ''}</div></div>
        <button class="icon-btn" data-act="edit-p" aria-label="Editar perfil">${icon('edit')}</button></div>
      ${happyCard(S.profiles.filter(x => !x.sharedFrom).map(x => x.id), { compact: true })}
      <div class="menu">
        ${mi('#/perfis', 'users', 'Pessoas', 'crie o closet da sua filha e de quem quiser')}
        ${mi('#/hoje', 'dice', 'Look do dia', 'sugestão automática pelo clima')}
        ${mi('#/juntas', 'users', 'Sair juntos (look em grupo)', 'looks combinando para várias pessoas, com paleta')}
        ${mi('#/compartilhar', 'share', 'Compartilhar closets', 'envie o seu ou receba o de uma amiga')}
        ${mi('#/comprar', 'bag', 'Antes de comprar', 'veja se você já tem algo parecido')}
        ${mi('#/desejos', 'heart', 'Lista de desejos', 'o que falta no closet')}
        ${mi('#/painel', 'chart', 'Painel', 'gráficos: uso, peças paradas, estilos, compras, cores, desejos')}
        <button class="menu-item" data-act="fun-settings">${icon('heart')}<span>Metas e diversão<small>meta de aproveitamento, orçamento e o medidor de felicidade</small></span>${icon('chev')}</button>
        <button class="menu-item" data-act="export-desc">${icon('file')}<span>Exportar descrição do closet<small>prompt com todas as peças detalhadas, para usar numa IA</small></span>${icon('chev')}</button>
        ${mi('#/onde', 'box', 'Onde estão minhas peças', away ? `${away} fora do armário (emprestadas, lavanderia…)` : 'emprestadas, lavanderia, doações')}
        ${mi('#/backup', 'download', 'Backup e dados', last ? 'último em ' + fmtDate(last.slice(0, 10)) : 'nenhum backup ainda')}
        ${mi('#/guia', 'camera', 'Como preparar as fotos', 'tamanho ideal e prompt para a IA')}
      </div>
      <button class="menu-item" data-act="about">${icon('info')}<span>Sobre e privacidade<small>versão ${CONFIG.appVersion}${CONFIG.goatcounter ? ' · estatística anônima ' + (S.settings.noStats ? 'desligada' : 'ligada') : ''}</small></span>${icon('chev')}</button>
      <p class="foot">MCLOSET · seus dados ficam só neste aparelho. Faça backup com frequência.</p>
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = e => { if (e.target.closest('[data-act="edit-p"]')) profileForm(p); if (e.target.closest('[data-act="export-desc"]')) exportSheet(); if (e.target.closest('[data-act="about"]')) aboutSheet(); if (e.target.closest('[data-act="fun-settings"]')) funSettingsSheet(); };
}
const mi = (href, ic, t, d) => `<a class="menu-item" href="${href}">${icon(ic)}<span>${t}<small>${d}</small></span>${icon('chev')}</a>`;

// ================= PERFIS =================
export function renderPerfis(main) {
  main.innerHTML = `
    ${header('Pessoas', { back: '#/hub' })}
    <div class="pad">
      <p class="hint">Cada pessoa tem seu próprio closet. Toque no avatar no topo de qualquer tela para trocar de closet.</p>
      <div class="menu">${S.profiles.map(p => `<button class="menu-item" data-act="edit" data-id="${p.id}">${avatar(p)}<span>${esc(p.name)}<small>${profileItems(p.id).length} peças · ${p.kind === 'crianca' ? 'criança' : 'adulto'}${p.id === curProfile().id ? ' · closet aberto' : ''}</small></span>${icon('edit')}</button>`).join('')}</div>
      <button class="btn block" data-act="new">${icon('plus')} Adicionar pessoa</button>
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'new') profileForm(null);
    if (a.dataset.act === 'edit') profileForm(profile(a.dataset.id));
  };
}

export function profileForm(p) {
  const isNew = !p;
  const d = p ? { ...p } : { id: uid(), name: '', kind: 'adulto', color: AVATAR_COLORS[S.profiles.length % AVATAR_COLORS.length], cartela: '', sizes: '', sizeNow: '', createdAt: todayStr() };
  let newPhoto = null;
  const keep = () => { d.name = $('#pn').value; d.sizes = $('#psz').value; d.sizeNow = $('#pnow')?.value || ''; d.cartela = $('#sel-cartela').value; };
  const draw = () => `
    <div class="center"><button class="avatar-edit" data-act="photo">${newPhoto ? `<span class="avatar lg"><img src="${newPhoto.url}" alt=""></span>` : avatar({ ...d, name: d.name || '?' }, 'lg')}<small>Foto</small></button></div>
    <div class="field"><label>Nome</label><input id="pn" value="${esc(d.name)}" placeholder="Ex.: Laura"></div>
    <div class="field"><label>Tipo</label>${chips([{ id: 'adulto', name: 'Adulto' }, { id: 'crianca', name: 'Criança' }], d.kind, 'kind')}</div>
    <div class="field"><label>Cor</label><div class="chips">${AVATAR_COLORS.map(c => `<button class="colordot ${c === d.color ? 'on' : ''}" style="background:${c}" data-act="color" data-v="${c}" aria-label="Cor"></button>`).join('')}</div></div>
    <div class="field"><label>Cartela de coloração pessoal (se souber)</label>${cartelaSelect('cartela', d.cartela, 'Não sei')}</div>
    <div class="field"><label>Tamanhos (anotação)</label><input id="psz" value="${esc(d.sizes || '')}" placeholder="Blusa M, calça 38, calçado 36"></div>
    ${d.kind === 'crianca' ? `<div class="field"><label>Tamanho atual de roupa (número)</label><input id="pnow" value="${esc(d.sizeNow || '')}" inputmode="numeric" placeholder="Ex.: 8"><p class="hint">Peças com tamanho menor que este aparecem como “pode estar pequena”.</p></div>` : ''}
    <button class="btn block" data-act="ok">${isNew ? 'Criar' : 'Salvar'}</button>
    ${!isNew ? `<button class="btn block ghost" data-act="open">Abrir o closet de ${esc(d.name)}</button>` : ''}
    ${!isNew && S.profiles.length > 1 ? `<button class="btn block danger" data-act="del">Excluir pessoa e as peças dela</button>` : ''}`;
  const body = openSheet(draw(), {
    title: isNew ? 'Nova pessoa' : 'Editar pessoa',
    onAct: async (act, el) => {
      keep();
      if (act === 'kind') { d.kind = el.dataset.v; body.innerHTML = draw(); }
      else if (act === 'color') { d.color = el.dataset.v; body.innerHTML = draw(); }
      else if (act === 'cart') { d.cartela = el.dataset.v; body.innerHTML = draw(); }
      else if (act === 'photo') {
        const [f] = await pickFiles({ multiple: false }); if (!f) return;
        const r = await processImage(f, { colors: false });
        newPhoto = { ...r, url: URL.createObjectURL(r.thumb) }; body.innerHTML = draw();
      }
      else if (act === 'ok') {
        if (!d.name.trim()) return toast('Digite o nome.');
        if (newPhoto) d.photo = await savePhoto(newPhoto);
        d.name = d.name.trim();
        await save('profiles', d);
        if (isNew) { S.settings.currentProfile = d.id; await saveSettings(); toast(`Closet de ${d.name} criado e aberto.`); }
        closeSheet(); nav.refresh();
      }
      else if (act === 'open') { S.settings.currentProfile = d.id; await saveSettings(); closeSheet(); nav.go('#/armario'); }
      else if (act === 'del') {
        if (confirm(`Excluir ${d.name} e TODAS as peças e fotos dela? Isso não tem volta (a não ser por um backup).`)) {
          await deleteProfile(d.id); closeSheet(); toast('Pessoa excluída.'); nav.refresh();
        }
      }
    },
  });
}

// ================= DESEJOS =================
export function renderDesejos(main) {
  const p = curProfile();
  const list = S.wishes.filter(w => w.profileId === p.id).sort((a, b) => (a.done - b.done) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  main.innerHTML = `
    ${header('Lista de desejos', { back: '#/hub' })}
    <div class="pad">
      <p class="hint">Anote o que falta no closet. Antes de comprar, use “Antes de comprar” para ver se combina com o que você já tem.</p>
      <div class="rows">${list.map(w => `<div class="irow ${w.done ? 'done' : ''}">
        <button class="ckbtn ${w.done ? 'on' : ''}" data-act="tg" data-id="${w.id}" aria-label="Comprado">${icon('check')}</button>
        <div class="irow-main" data-act="edit" data-id="${w.id}"><div class="nm">${esc(w.name)}</div><div class="sub">${[w.category ? catName(w.category) : '', w.price ? brl(w.price) : '', w.notes].filter(Boolean).map(esc).join(' · ')}</div></div>
        ${w.link ? `<a class="icon-btn" href="${esc(w.link)}" target="_blank" rel="noopener" aria-label="Abrir link">${icon('share')}</a>` : ''}
      </div>`).join('') || emptyState('Nenhum desejo anotado.', 'heart')}</div>
      <button class="btn block" data-act="new">${icon('plus')} Adicionar desejo</button>
    </div>`;
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const w = S.wishes.find(x => x.id === a.dataset.id);
    if (a.dataset.act === 'tg') { w.done = !w.done; await save('wishes', w); nav.refresh(); }
    else if (a.dataset.act === 'new') wishForm();
    else if (a.dataset.act === 'edit') wishForm(w);
  };
}
export function wishForm(w, prefill = {}) {
  const isNew = !w;
  const d = w ? { ...w } : { id: uid(), profileId: curProfile().id, name: '', category: '', price: '', link: '', notes: '', done: false, createdAt: new Date().toISOString(), ...prefill };
  openSheet(`
    <div class="field"><label>O que é</label><input id="wn" value="${esc(d.name)}" placeholder="Ex.: Sandália nude de salto baixo"></div>
    <div class="field"><label>Categoria</label><select id="wc"><option value="">—</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === d.category ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
    <div class="grid2"><div class="field"><label>Preço (R$)</label><input id="wp" inputmode="decimal" value="${esc(d.price ?? '')}"></div><div class="field"><label>Link</label><input id="wl" value="${esc(d.link)}" placeholder="https://"></div></div>
    <div class="field"><label>Observação</label><input id="wo" value="${esc(d.notes)}" placeholder="Para combinar com…"></div>
    <button class="btn block" data-act="ok">Salvar</button>
    ${!isNew ? '<button class="btn block danger" data-act="del">Excluir</button>' : ''}`, {
    title: isNew ? 'Novo desejo' : 'Editar desejo',
    onAct: async act => {
      if (act === 'ok') {
        d.name = $('#wn').value.trim(); if (!d.name) return toast('Descreva o desejo.');
        d.category = $('#wc').value; d.price = parseMoney($('#wp').value); d.link = $('#wl').value.trim(); d.notes = $('#wo').value;
        if (d.link && !/^https?:\/\//i.test(d.link)) d.link = 'https://' + d.link;
        await save('wishes', d); closeSheet(); toast('Desejo salvo!'); nav.refresh();
      } else if (act === 'del') { await remove('wishes', d.id); closeSheet(); nav.refresh(); }
    },
  });
}

// ================= RELATÓRIOS =================
export function renderRelatorios(main) {
  const p = curProfile();
  const all = S.items.filter(i => i.profileId === p.id);
  const its = all.filter(isActive);
  const sum = arr => arr.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const total = sum(its);
  const uses = its.reduce((s, i) => s + itemUsage(i).uses, 0);
  const bars = (rows, fmt = v => v) => {
    const max = Math.max(1, ...rows.map(r => r.v));
    return `<div class="bars">${rows.map(r => `<div class="bar"><span class="bl">${r.sw || ''}${esc(r.k)}</span><span class="bt"><span style="width:${r.v / max * 100}%;${r.c ? 'background:' + r.c : ''}"></span></span><span class="bv">${fmt(r.v)}</span></div>`).join('')}</div>`;
  };
  const group = (keyFn, valFn) => { const m = new Map(); for (const i of its) { const k = keyFn(i); if (!k) continue; m.set(k, (m.get(k) || 0) + valFn(i)); } return [...m].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v); };
  const byCatN = group(i => catName(i.category), () => 1);
  const byCatR = group(i => catName(i.category), i => Number(i.price) || 0).filter(r => r.v);
  const byBrand = group(i => i.brand, i => Number(i.price) || 0).filter(r => r.v).slice(0, 10);
  const famColor = { neutros: '#B9AE9E', terrosos: '#A4502A', pasteis: '#F3C6CF', vibrantes: '#E0287F', profundos: '#6A1B2E', metalicos: '#C8A54B', estampado: '#7FC4A0' };
  const byFam = group(i => i.family, () => 1).map(r => ({ ...r, c: famColor[r.k], k: FAMILIES[r.k] || 'Colorido / estampado' }));
  const byCart = group(i => cartelaName(i.cartela), () => 1);
  const byClima = CLIMAS.map(c => ({ k: c.icon + ' ' + c.name, v: its.filter(i => (i.climas || []).includes(c.id)).length }));
  const byBand = BANDS.map(b => ({ k: b.name, v: its.filter(i => itemBand(i) === b.id).length, c: b.color })).filter(r => r.v);
  const byYear = group(i => (i.purchaseDate || '').slice(0, 4), i => Number(i.price) || 0).sort((a, b) => b.k.localeCompare(a.k));
  const gone = all.filter(i => GONE.includes(i.status));
  main.innerHTML = `
    ${header('Relatórios', { back: '#/hub', sub: 'Closet de ' + esc(p.name) })}
    <div class="pad">
      <div class="stats four">
        <div><small>Peças</small><b>${its.length}</b></div>
        <div><small>Valor</small><b>${brl(total)}</b></div>
        <div><small>Usos</small><b>${uses}</b></div>
        <div><small>Custo/uso médio</small><b>${uses ? brl(total / uses) : '—'}</b></div>
      </div>
      <h3 class="sec">Termômetro</h3>${bars(byBand)}
      <h3 class="sec">Peças por categoria</h3>${bars(byCatN)}
      ${byCatR.length ? `<h3 class="sec">Valor por categoria</h3>${bars(byCatR, brl)}` : ''}
      ${byBrand.length ? `<h3 class="sec">Marcas / lojas (valor)</h3>${bars(byBrand, brl)}` : ''}
      ${byFam.length ? `<h3 class="sec">Paleta de cores</h3>${bars(byFam)}` : ''}
      ${byCart.length ? `<h3 class="sec">Cartela de coloração</h3>${bars(byCart)}${p.cartela ? `<p class="hint">Sua cartela: ${cartelaName(p.cartela)}. ${Math.round(its.filter(i => i.cartela === p.cartela).length / Math.max(1, its.length) * 100)}% do closet está nela e ${Math.round(its.filter(i => seasonOf(i.cartela) === seasonOf(p.cartela)).length / Math.max(1, its.length) * 100)}% na mesma estação.</p>` : ''}` : ''}
      <h3 class="sec">Peças por clima</h3>${bars(byClima)}
      ${byYear.length ? `<h3 class="sec">Gastos por ano de compra</h3>${bars(byYear, brl)}` : ''}
      ${gone.length ? `<h3 class="sec">Já saíram do closet</h3><p>${gone.filter(i => i.status === 'doada').length} doadas · ${gone.filter(i => i.status === 'vendida').length} vendidas</p>` : ''}
    </div>`;
  main.oninput = main.onchange = main.onclick = null;
}

// ================= ONDE ESTÃO =================
export function renderOnde(main) {
  const groups = STATUS.filter(s => s.id !== 'armario').map(s => ({ s, list: S.items.filter(i => i.status === s.id) })).filter(g => g.list.length);
  main.innerHTML = `
    ${header('Onde estão minhas peças', { back: '#/hub' })}
    <div class="pad">
      ${groups.map(g => `<h3 class="sec">${g.s.name} <span class="muted small">${g.list.length}</span></h3>
        <div class="rows">${g.list.map(i => itemRow(i, `${i.statusSince ? `<span class="muted small">desde ${fmtDate(i.statusSince)}</span><br>` : ''}${!GONE.includes(i.status) ? `<button class="chip" data-act="back" data-id="${i.id}">Voltou</button>` : ''}`).replace('<div class="sub"></div>', `<div class="sub">${esc(profile(i.profileId)?.name || '')}${i.statusNote ? ' · ' + esc(i.statusNote) : ''}</div>`)).join('')}</div>`).join('')
      || emptyState('Todas as peças estão no armário. 🙌', 'box')}
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'back') { e.stopPropagation(); const it = S.items.find(i => i.id === a.dataset.id); it.status = 'armario'; it.statusNote = ''; it.statusSince = todayStr(); await save('items', it); toast('De volta ao armário!'); nav.refresh(); }
    else if (a.dataset.act === 'open-item') nav.go('#/peca/' + a.dataset.id);
  };
}

// ================= ANTES DE COMPRAR =================
let B = null;   // { photo, colors, category }
export function renderComprar(main) {
  const p = curProfile();
  let result = '';
  if (B?.colors?.length && B.category) {
    const fake = { id: 'novo', colors: B.colors, category: B.category, family: familyOfColors(B.colors) };
    const lab = hexLab(B.colors[0].hex);
    const its = profileItems(p.id);
    const similar = its.filter(i => i.category === B.category && i.colors?.[0] && deltaE(hexLab(i.colors[0].hex), lab) < 18);
    const others = its.filter(i => i.category !== B.category && ['cima', 'baixo', 'unicas', 'casacos', 'calcados', 'bolsas'].includes(i.category));
    const matches = others.map(i => ({ i, s: scoreAgainst(i, [fake]).score })).filter(x => x.s >= 75).sort((a, b) => b.s - a.s);
    const cart = cartelaOfColors(B.colors);
    result = `
      <div class="verdict ${similar.length >= 2 ? 'warn' : matches.length >= 5 ? 'ok' : ''}">
        ${similar.length ? `<b>Você já tem ${similar.length} ${similar.length === 1 ? 'peça parecida' : 'peças parecidas'}</b> (mesma categoria e cor).` : '<b>Você não tem nada parecido</b> nessa categoria e cor.'}
        <br>Ela combina bem com <b>${matches.length}</b> peça${matches.length === 1 ? '' : 's'} do seu closet.
        ${p.cartela ? `<br>${cart === p.cartela ? '✅ Está na sua cartela (' + cartelaName(cart) + ').' : seasonOf(cart) === seasonOf(p.cartela) ? '👍 Mesma estação da sua cartela (' + cartelaName(cart) + ').' : 'Cartela da peça: ' + cartelaName(cart) + ' (a sua é ' + cartelaName(p.cartela) + ').'}` : ''}
        <div class="small muted">${similar.length >= 2 ? 'Talvez não precise comprar.' : matches.length >= 5 ? 'Boa compra: tem muitas combinações possíveis.' : matches.length <= 1 ? 'Atenção: pode ser difícil de combinar.' : ''}</div>
      </div>
      ${similar.length ? `<h3 class="sec">Parecidas que você já tem</h3><div class="igrid">${similar.map(i => itemCard(i)).join('')}</div>` : ''}
      ${matches.length ? `<h3 class="sec">Combinaria com</h3><div class="hscroll">${matches.slice(0, 12).map(x => itemCard(x.i, { score: x.s, showBand: false })).join('')}</div>` : ''}
      <div class="row-btns wide"><button class="btn" data-act="bought">Comprei! Cadastrar</button><button class="btn ghost" data-act="wish">Pôr na lista de desejos</button></div>`;
  }
  main.innerHTML = `
    ${header('Antes de comprar', { back: '#/hub' })}
    <div class="pad">
      <p class="hint">Tire uma foto da peça na loja (ou um print do site). O app compara com o seu closet.</p>
      <button class="ph-add wide" data-act="photo">${B?.photo ? `<img src="${B.photo.url}" alt="">` : icon('camera') + '<span>Foto da peça</span>'}</button>
      ${B?.colors?.length ? `<div class="color-list">${B.colors.map(c => `<span class="cpill">${swatch(c.hex)}${esc(c.name)}</span>`).join('')}</div>` : ''}
      ${B?.photo ? `<div class="field"><label>O que é?</label>${chips(CATEGORIES.map(c => ({ id: c.id, name: c.name })), B.category, 'cat')}</div>` : ''}
      ${result}
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'photo') {
      const [f] = await pickFiles({ multiple: false }); if (!f) return;
      const r = await processImage(f);
      if (B?.photo) URL.revokeObjectURL(B.photo.url);
      B = { photo: { ...r, url: URL.createObjectURL(r.thumb) }, colors: r.colors, category: B?.category || '' };
      nav.refresh();
    } else if (act === 'cat') { B.category = a.dataset.v; nav.refresh(); }
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'bought') {
      pending.newItem = { photos: [{ full: B.photo.full, thumb: B.photo.thumb }], fields: { category: B.category, colors: B.colors, family: familyOfColors(B.colors), cartela: cartelaOfColors(B.colors) } };
      B = null; nav.go('#/nova-peca');
    } else if (act === 'wish') wishForm(null, { category: B.category, notes: B.colors.map(c => c.name).join(', ') });
  };
}

// ================= GUIA DE FOTOS =================
// O prompt é montado a partir das listas do app, então os nomes que a IA devolve sempre batem com os do app.
export function buildPrompt() {
  const cores = Object.entries(FAMILIES).map(([id, nome]) => `  • ${nome}: ${NAMED.filter(n => n[2] === id).map(n => `${n[0]} ${n[1]}`).join(', ')}`).join('\n');
  const cartelas = SEASONS.map(s => `  • ${s.name} (${s.desc}): ${CARTELAS.filter(c => c.season === s.id).map(c => c.name).join(', ')}`).join('\n');
  const detalhes = DETAIL_FIELDS.map(d => `${d.name}: (${d.hint})`).join('\n');
  return `Você é editor(a) de fotos de moda para catálogo de e-commerce, especialista em descrição técnica de roupas (como uma ficha de modelista) e consultor(a) de coloração pessoal.

CÓDIGO DESTA PEÇA: [ESCREVA AQUI UM CÓDIGO, ex.: CAMISA-1A]
Se aparecer mais de uma peça na foto, trabalhe somente nesta: [ESCREVA AQUI QUAL PEÇA, ex.: "a saia floral"]

Vou enviar UMA OU MAIS FOTOS que eu já tenho (podem ser antigas, com fundo bagunçado, com a peça pendurada, dobrada ou vestida em alguém). Todas são da MESMA peça. Antes de tudo, observe todas as fotos com atenção: cada costura, botão, recorte, textura e cor.

PARTE 1 — IMAGENS DE CATÁLOGO
Recorte a peça e gere fotos de catálogo dela SEM mudar cor, tom, estampa, tecido, textura, botões, costuras, comprimento ou proporções. Fidelidade é mais importante que beleza.
1. FRENTE (obrigatória): peça inteira vista de frente, estilo "ghost mannequin" (manequim invisível, sem pessoa); se for acessório, bolsa, calçado ou bijuteria, estilo still/flat lay.
2. COSTAS: só se alguma foto mostrar as costas. Se nenhuma mostrar, NÃO invente — pule esta.
3. DETALHE: close do tecido, estampa ou acabamento, tirado da própria foto.
4. VESTIDA (opcional): a peça vestida num modelo neutro de corpo inteiro, rosto cortado ou desfocado.
Se a peça estava sendo usada por alguém, remova totalmente a pessoa e reconstrua só o pedaço escondido, com cuidado e sem criar detalhes novos.

Regras de TODAS as imagens:
- Fundo branco puro (#FFFFFF), sem chão, sem sombra forte, sem objetos, sem texto e sem marca d'água.
- Quadrada 1:1, 1080 × 1080 px (mínimo 800 × 800), JPG ou PNG.
- Peça centralizada ocupando cerca de 80% da altura, com margem branca em volta.
- Luz de estúdio suave e uniforme; cores fiéis à peça real (não saturar, não clarear, não mudar o tom).
- Uma imagem por arquivo, com o nome CÓDIGO_VISTA, por exemplo: CAMISA-1A_FRENTE, CAMISA-1A_COSTAS, CAMISA-1A_DETALHE, CAMISA-1A_VESTIDA.

PARTE 2 — FICHA COMPLETA EM TEXTO
Depois das imagens, escreva a ficha em TEXTO (nunca dentro da imagem), dentro de UM bloco de código, com o título "FICHA [CÓDIGO]" e exatamente estes campos, nesta ordem.
O objetivo da ficha é que, lendo SÓ o texto, qualquer pessoa ou IA consiga desenhar ou gerar uma imagem desta peça quase idêntica, sem nunca ter visto a foto. Por isso seja específico(a), concreto(a) e completo(a): diga posição, quantidade, tamanho, formato, cor e material de cada detalhe. Nada de frases vagas como "peça bonita" ou "detalhes delicados".
Nos campos com lista, use SOMENTE as opções das listas abaixo, escritas exatamente igual (mesmas letras e acentos). Não invente nomes de cor.
Se um campo não se aplica à peça (ex.: "Mangas" num brinco), escreva "-". Se não der para ver na foto, escreva "não visível". Não chute.

\`\`\`
FICHA [CÓDIGO]
Código: [CÓDIGO]
Nome: (nome curto e claro, ex.: Camisa de linho listrada azul)
Categoria: (uma da lista CATEGORIAS)
Tipo: (um da lista TIPOS daquela categoria)
Cores: (de 1 a 3 cores da LISTA DE CORES, da mais presente para a menos presente, cada uma com o código e a porcentagem; ex.: Azul marinho #1F2A48 70%, Branco #FFFFFF 30%)
Paleta: (uma da lista PALETAS)
Cartela: (uma da lista CARTELAS — a cartela de coloração pessoal com que a cor principal da peça mais combina)
Estampa: (uma da lista ESTAMPAS)
Clima: (Calor, Meia-estação, Frio ou Ano todo — pode juntar dois, ex.: Calor, Meia-estação)
Ocasiões: (de 1 a 3 da lista OCASIÕES)
Estilo: (um da lista ESTILOS)
Marca: (só se aparecer na etiqueta; senão "-")
${detalhes}
Descrição: (um parágrafo de 6 a 10 frases descrevendo a peça inteira de cima para baixo, como se você estivesse ditando para alguém desenhar: silhueta, comprimento, gola/decote, mangas, corpo, cintura, barra, fechamentos, bolsos, recortes, costuras, estampa — motivo, tamanho, cores e distribuição —, tecido, textura, brilho, caimento e como ela veste no corpo. Cite as cores pelos nomes da LISTA DE CORES.)
Prompt de imagem: (um parágrafo em INGLÊS, pronto para colar num gerador de imagens, que recrie esta mesma peça em foto de catálogo: "e-commerce product photo of ..., ghost mannequin, pure white background, soft studio light, front view, 1:1", incluindo TODOS os detalhes da descrição e as cores com o código hex)
\`\`\`

CATEGORIAS e TIPOS:
${CATEGORIES.map(c => `  • ${c.name}: ${c.subs.join(', ')}`).join('\n')}

LISTA DE CORES (nome + código; escolha o nome cujo código for MAIS PARECIDO com a cor real):
${cores}

PALETAS: ${Object.values(FAMILIES).join(', ')}, Colorido / estampado
  (use "Colorido / estampado" quando houver 2 ou mais cores não neutras com bastante presença)

CARTELAS (método sazonal expandido de 12 estações):
${cartelas}

ESTAMPAS: ${ESTAMPAS.join(', ')}
OCASIÕES: ${OCASIOES.join(', ')}
ESTILOS: ${ESTILOS.join(', ')}

Se eu mandar fotos de outra peça depois, repita as PARTES 1 e 2 para ela com o novo código, sempre uma ficha por peça.`;
}

export function renderGuia(main) {
  const prompt = buildPrompt();
  main.innerHTML = `
    ${header('Como preparar as fotos', { back: '#/hub' })}
    <div class="pad prose">
      <h3 class="sec">Passo a passo</h3>
      <ol>
        <li>Copie o prompt abaixo e cole na IA junto com as fotos que você já tem de <b>uma peça</b>.</li>
        <li>Troque <b>[ESCREVA AQUI UM CÓDIGO]</b> por um código seu (ex.: <code>CAMISA-1A</code>). Se a foto tiver várias peças, troque também <b>[ESCREVA AQUI QUAL PEÇA]</b>.</li>
        <li>A IA devolve as imagens (<code>CAMISA-1A_FRENTE</code>, <code>CAMISA-1A_COSTAS</code>…) e a <b>FICHA CAMISA-1A</b> em texto, com todos os detalhes da peça.</li>
        <li>No app: <b>+ → Nova peça</b>, escolha as imagens e cole a ficha em <b>Colar a ficha da IA</b>. Se a IA não conseguir dar nome aos arquivos, tudo bem: nesse caminho o nome não importa.</li>
        <li>Confira: todos os campos continuam editáveis. A ficha só serve para não deixar nada em branco.</li>
      </ol>
      <h3 class="sec">Prompt para a IA</h3>
      <pre class="prompt" id="prompt">${esc(prompt)}</pre>
      <button class="btn block" data-act="copy">${icon('copy')} Copiar prompt</button>
      <h3 class="sec">Tamanho ideal das imagens</h3>
      <ul>
        <li><b>Quadrada 1:1, 1080 × 1080 px</b> (mínimo 800 × 800). O app reduz e comprime sozinho para economizar espaço.</li>
        <li><b>Fundo branco puro</b>, peça centralizada ocupando ~80% da altura.</li>
        <li>JPG ou PNG. Fotos do iPhone (HEIC) também funcionam.</li>
      </ul>
      <h3 class="sec">Cores e cartelas padronizadas</h3>
      <p>O app usa uma lista fixa de ${NAMED.length} cores de moda e as 12 cartelas do método sazonal expandido. O prompt manda a IA escolher só dessas listas. Se mesmo assim ela escrever outro nome, o app troca pela cor da lista mais parecida, usando o código da cor.</p>
      <h3 class="sec">Importar tudo de uma vez (em lote)</h3>
      <p>Salve numa pasta todas as imagens com o código no nome (<code>CAMISA-1A_FRENTE.jpg</code>, <code>CAMISA-1A_COSTAS.jpg</code>…) e as fichas em arquivos .txt. Pode ser um .txt por peça ou a conversa inteira com a IA num .txt só. Em <b>+ → Importar em lote</b>, escolha a pasta (no iPhone, selecione todos os arquivos). O app junta foto e ficha pelo código, importa tudo e depois você confere uma a uma ou confirma todas de uma vez.</p>
      <h3 class="sec">Atenção</h3>
      <p>A IA pode mudar um pouco a peça (cor, detalhes). Confira antes de salvar. A foto <b>Frente</b> precisa ser bem fiel, porque é dela que o app confere as cores.</p>
    </div>`;
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    if (!e.target.closest('[data-act="copy"]')) return;
    try { await navigator.clipboard.writeText(prompt); toast('Prompt copiado!'); }
    catch { const r = document.createRange(); r.selectNodeContents($('#prompt')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selecionei o texto — toque em Copiar.'); }
  };
}

function aboutSheet() {
  const draw = () => `
    <p><b>MCLOSET</b> — versão ${CONFIG.appVersion}</p>
    <p class="small">Suas fotos, peças, looks e calendário ficam <b>só neste aparelho</b>. Nada disso é enviado para a internet. Para levar para outro aparelho, use o backup.</p>
    ${CONFIG.goatcounter ? `<p class="small">Para saber quantas pessoas usam o app, ele envia um sinal <b>anônimo</b> quando é aberto (sem nome, sem e-mail, sem cookies e sem nada do seu closet).</p>
    <label class="ck"><input type="checkbox" id="stats" ${S.settings.noStats ? '' : 'checked'}><span>Permitir estatística anônima de uso</span></label>` : '<p class="small muted">Este app não envia nenhuma estatística.</p>'}
    <p class="small">O app também confere, quando há internet, se existe algum recado ou versão nova publicada.</p>`;
  openSheet(draw(), {
    title: 'Sobre e privacidade',
    onInput: async e => { if (e.target.id === 'stats') { S.settings.noStats = !e.target.checked; await saveSettings(); toast(e.target.checked ? 'Estatística ligada.' : 'Estatística desligada.'); nav.refresh(); } },
  });
}
