import * as db from '../db.js';
import { S, LIST_STORES, load, saveSettings, clearPhotoCache, itemUsage, itemBand, profile, costPerUse } from '../store.js';
import { catName, statusName, band, CLIMAS } from '../catalog.js';
import { makeZip, readZip } from '../zip.js';
import { importShare, shareCloset } from '../share.js';
import { header, icon, nav, openSheet, closeSheet, avatar, hydrate } from '../ui.js';
import { $, esc, todayStr, fmtDate, toast, pickFiles, deliverFile, daysBetween } from '../util.js';

export async function render(main) {
  const last = S.settings.lastBackup;
  const photos = (await db.getAllKeys('photos')).length;
  let est = null, persisted = null;
  try { est = await navigator.storage?.estimate?.(); persisted = await navigator.storage?.persisted?.(); } catch { }
  const mb = b => (b / 1048576).toFixed(b > 1048576 * 100 ? 0 : 1) + ' MB';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  main.innerHTML = `
    ${header('Backup e dados', { back: '#/hub' })}
    <div class="pad">
      <div class="infobox">
        <div><small>Último backup</small><b>${last ? fmtDate(last.slice(0, 10)) + ` (${daysBetween(last.slice(0, 10), todayStr())} dias)` : 'nunca'}</b></div>
        <div><small>Conteúdo</small><b>${S.items.length} peças · ${S.looks.length} looks · ${photos} fotos</b></div>
        ${est ? `<div><small>Espaço usado</small><b>${mb(est.usage || 0)}</b></div>` : ''}
        <div><small>Armazenamento protegido</small><b>${persisted ? '✅ sim' : persisted === false ? '⚠️ não garantido' : '—'}</b></div>
      </div>
      ${!standalone ? `<div class="pill warn">Você está usando pelo navegador. No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) e use sempre pelo ícone: os dados do ícone e do Safari ficam separados.</div>` : ''}

      <h3 class="sec">Salvar uma cópia</h3>
      <p class="small">Gera um arquivo <b>.zip</b> com todas as fotos e informações. No iPhone, escolha <b>Salvar em Arquivos</b> (iCloud Drive) ou mande para você mesma no WhatsApp/e-mail.</p>
      <button class="btn block" data-act="export">${icon('download')} Fazer backup agora</button>
      <button class="btn block ghost" data-act="csv">${icon('file')} Exportar planilha (Excel / CSV)</button>

      <h3 class="sec">Abrir um backup</h3>
      <p class="small">Use para passar tudo para o iPad, o computador ou um celular novo: abra o app lá e importe o arquivo .zip.</p>
      <button class="btn block ghost" data-act="import">${icon('upload')} Importar backup</button>

      <h3 class="sec">Lembrete</h3>
      <div class="field"><label>Me lembrar de fazer backup a cada</label>
        <select id="bdays">${[3, 7, 15, 30].map(n => `<option value="${n}" ${S.settings.backupDays == n ? 'selected' : ''}>${n} dias</option>`).join('')}</select></div>
      ${persisted === false ? `<button class="btn small ghost" data-act="persist">Pedir para proteger o armazenamento</button>` : ''}
    </div>`;
  main.oninput = null;
  main.onchange = async e => { if (e.target.id === 'bdays') { S.settings.backupDays = +e.target.value; await saveSettings(); toast('Lembrete atualizado.'); } };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'export') exportBackup();
    else if (act === 'csv') exportCSV();
    else if (act === 'import') importBackup(null);
    else if (act === 'persist') { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Armazenamento protegido!' : 'O navegador não liberou. Instale o app na Tela de Início.'); nav.refresh(); }
  };
}

function progressSheet(title) {
  const body = openSheet(`<div class="center"><div class="spinner"></div><p id="prog">Preparando…</p></div>`, { title });
  return t => { const el = body.querySelector('#prog'); if (el) el.textContent = t; };
}

export async function exportBackup() {
  const set = progressSheet('Gerando backup');
  try {
    const data = { app: 'meu-closet', version: 1, exportedAt: new Date().toISOString(), settings: S.settings };
    for (const s of LIST_STORES) data[s] = S[s];
    const entries = [
      { name: 'data.json', data: JSON.stringify(data) },
      { name: 'LEIA-ME.txt', data: 'Backup do app MCLOSET.\r\nPara restaurar: abra o app > Hub pessoal > Backup e dados > Importar backup, e escolha este arquivo .zip.\r\nA pasta photos tem todas as fotos em JPG. O arquivo pecas.csv abre no Excel.\r\n' },
      { name: 'pecas.csv', data: csv() },
    ];
    const keys = await db.getAllKeys('photos');
    let i = 0;
    for (const id of keys) {
      const p = await db.get('photos', id);
      if (p?.full) entries.push({ name: `photos/${id}.jpg`, data: p.full });
      if (p?.thumb) entries.push({ name: `photos/${id}.thumb.jpg`, data: p.thumb });
      if (++i % 20 === 0) set(`Lendo fotos ${i}/${keys.length}…`);
    }
    const zip = await makeZip(entries, (n, t) => { if (n % 25 === 0) set(`Montando arquivo ${n}/${t}…`); });
    set(`Pronto: ${(zip.size / 1048576).toFixed(1)} MB`);
    closeSheet();
    const r = await deliverFile(zip, `mcloset-backup-${todayStr()}.zip`);
    if (r !== 'cancel') {
      S.settings.lastBackup = new Date().toISOString();
      await saveSettings();
      toast(r === 'shared' ? 'Backup pronto! Guarde o arquivo num lugar seguro.' : 'Backup baixado!');
      nav.refresh();
    }
  } catch (err) {
    closeSheet();
    alert('Não consegui gerar o backup: ' + err.message);
  }
}

function csv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['Pessoa', 'Nome', 'Categoria', 'Tipo', 'Marca', 'Preço', 'Data compra', 'Tamanho', 'Cores', 'Paleta', 'Cartela', 'Estampa', 'Clima', 'Ocasiões', 'Estilo', 'Situação', 'Guardada em', 'Usos', 'Último uso', 'Custo por uso', 'Termômetro', 'Tags', 'Observações'];
  const rows = S.items.map(i => {
    const u = itemUsage(i);
    const cpu = costPerUse(i.price, u.uses);
    return [profile(i.profileId)?.name, i.name, catName(i.category), i.sub, i.brand, i.price != null ? String(i.price).replace('.', ',') : '', i.purchaseDate,
      i.size, (i.colors || []).map(c => `${c.name} ${c.hex}`).join(' / '), i.family, i.cartela, i.estampa,
      (i.climas || []).map(c => CLIMAS.find(x => x.id === c)?.name).join(' / '), (i.ocasioes || []).join(' / '), i.estilo, statusName(i.status),
      i.location, u.uses, u.last || '', cpu != null ? cpu.toFixed(2).replace('.', ',') : '', band(itemBand(i)).name, (i.tags || []).join(' '), i.notes].map(q).join(';');
  });
  return '﻿' + [head.map(q).join(';'), ...rows].join('\r\n');
}

async function exportCSV() {
  await deliverFile(new Blob([csv()], { type: 'text/csv;charset=utf-8' }), `mcloset-pecas-${todayStr()}.csv`);
}

// Recebe um closet/look que outra pessoa compartilhou (arquivo com share.json)
export async function receiveShare(zipOrFile) {
  let zip = zipOrFile;
  try {
    if (!zip?.has) zip = await readZip(zipOrFile || (await pickFiles({ accept: '.zip,application/zip', multiple: false }))[0]);
  } catch (err) { return alert('Não consegui ler o arquivo: ' + err.message); }
  if (!zip) return;
  if (!zip.has('share.json')) {
    if (zip.has('data.json') && confirm('Este arquivo é um BACKUP completo, não um compartilhamento. Quer abrir a tela de importar backup?')) nav.go('#/backup');
    return;
  }
  const data = JSON.parse(await zip.text('share.json'));
  const who = (data.profiles || []).map(p => p.name).join(', ');
  if (!confirm(`${data.scope === 'look' ? 'Look' : 'Closet'} compartilhado por ${who} com ${(data.items || []).length} peças. Adicionar ao seu app?`)) return;
  const set = progressSheet('Recebendo');
  try {
    const r = await importShare(zip, data);
    closeSheet();
    toast(`Pronto! ${r.nItems} peças e ${r.nLooks} looks de ${r.names.join(', ')}.`);
    nav.go(r.scope === 'look' && r.nLooks ? '#/looks' : '#/compartilhar', true);
  } catch (err) { closeSheet(); alert('Erro ao receber: ' + err.message); }
}

export async function importBackup(picked) {
  const file = picked || (await pickFiles({ accept: '.zip,application/zip', multiple: false }))[0];
  if (!file) return;
  let zip, data;
  try {
    zip = await readZip(file);
    if (zip.has('share.json')) return receiveShare(zip);
    data = JSON.parse(await zip.text('data.json'));
    if (data.app !== 'meu-closet') throw new Error('Este arquivo não é um backup do MCLOSET.');
  } catch (err) { return alert('Não consegui ler o backup: ' + err.message); }
  const n = (data.items || []).length;
  const hasData = S.items.length > 0;
  let mode = 'replace';
  if (hasData) {
    const choice = await new Promise(res => {
      openSheet(`<p>Backup de <b>${fmtDate((data.exportedAt || '').slice(0, 10))}</b> com <b>${n} peças</b> e ${(data.looks || []).length} looks.</p>
        <div class="menu">
          <button class="menu-item" data-act="replace">${icon('refresh')}<span>Substituir tudo<small>apaga o que está neste aparelho e coloca o backup no lugar</small></span></button>
          <button class="menu-item" data-act="merge">${icon('plus')}<span>Juntar<small>mantém o que está aqui e adiciona/atualiza com o backup</small></span></button>
        </div>`, { title: 'Importar backup', onAct: act => { closeSheet(); res(act); } });
      const obs = new MutationObserver(() => { if (!$('#sheet').classList.contains('open')) { obs.disconnect(); res(null); } });
      obs.observe($('#sheet'), { attributes: true });
    });
    if (!choice) return;
    mode = choice;
    if (mode === 'replace' && !confirm('Tem certeza? Tudo o que está neste aparelho será substituído pelo backup.')) return;
  }
  const set = progressSheet('Importando');
  try {
    if (mode === 'replace') await db.clearAll();
    for (const s of LIST_STORES) await db.putMany(s, data[s] || []);
    const settings = mode === 'replace' ? { ...data.settings, id: 'settings' } : { ...S.settings };
    settings.lastBackup = settings.lastBackup || data.exportedAt;
    await db.put('meta', settings);
    const photoNames = zip.names.filter(nm => /^photos\/[^/]+\.jpg$/.test(nm) && !nm.endsWith('.thumb.jpg'));
    let i = 0, batch = [];
    for (const nm of photoNames) {
      const id = nm.slice(7, -4);
      const full = await zip.blob(nm, 'image/jpeg');
      const thumb = zip.has(`photos/${id}.thumb.jpg`) ? await zip.blob(`photos/${id}.thumb.jpg`, 'image/jpeg') : full;
      batch.push({ id, full, thumb });
      if (batch.length >= 20) { await db.putMany('photos', batch); batch = []; }
      if (++i % 20 === 0) set(`Fotos ${i}/${photoNames.length}…`);
    }
    await db.putMany('photos', batch);
    clearPhotoCache();
    await load();
    closeSheet();
    toast(`Backup importado: ${n} peças.`);
    nav.go('#/armario', true);
  } catch (err) {
    closeSheet();
    alert('Erro ao importar: ' + err.message);
  }
}

// ================= COMPARTILHAR CLOSETS =================
export function renderCompartilhar(main) {
  const own = S.profiles.filter(p => !p.sharedFrom);
  const recv = S.profiles.filter(p => p.sharedFrom);
  main.innerHTML = `
    ${header('Compartilhar closets', { back: '#/hub' })}
    <div class="pad">
      <p class="small">Se uma amiga, sua mãe ou sua esposa também usa o MCLOSET, vocês podem trocar closets e looks. Cada closet recebido aparece como uma pessoa no seu app, e dá para combinar looks em grupo com ela em <b>Sair juntos</b>.</p>

      <h3 class="sec">Enviar</h3>
      <div class="menu">${own.map(p => `<button class="menu-item" data-act="send" data-id="${p.id}">${avatar(p)}<span>Enviar o closet de ${esc(p.name)}<small>${S.items.filter(i => i.profileId === p.id).length} peças + looks (sem preços)</small></span>${icon('share')}</button>`).join('')}</div>
      <p class="hint">${icon('info')} Para enviar só um look, abra o look e toque em ${icon('share')} → “Arquivo do look”. Mande o arquivo pelo WhatsApp, AirDrop ou e-mail.</p>

      <h3 class="sec">Receber</h3>
      <button class="btn block" data-act="recv">${icon('upload')} Abrir arquivo recebido</button>
      <p class="hint">Recebeu de novo o closet da mesma pessoa? É só abrir o arquivo novo: o closet dela é atualizado, sem duplicar.</p>

      ${recv.length ? `<h3 class="sec">Closets recebidos</h3><div class="menu">${recv.map(p => `<div class="menu-item">${avatar(p)}<span>${esc(p.name)}<small>${S.items.filter(i => i.profileId === p.id).length} peças · recebido em ${fmtDate((p.sharedAt || '').slice(0, 10))}</small></span><button class="icon-btn" data-act="open" data-id="${p.id}" aria-label="Abrir">${icon('chev')}</button></div>`).join('')}</div>
        <p class="hint">Para apagar um closet recebido: Hub → Pessoas → toque na pessoa → Excluir.</p>` : ''}
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'send') {
      toast('Preparando o arquivo…');
      try { await shareCloset(a.dataset.id); } catch (err) { alert('Não consegui gerar: ' + err.message); }
    } else if (a.dataset.act === 'recv') receiveShare(null);
    else if (a.dataset.act === 'open') { S.settings.currentProfile = a.dataset.id; await saveSettings(); nav.go('#/armario'); }
  };
}
