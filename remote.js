// Comunicação do app com você (dona do app):
// - contador anônimo de uso (GoatCounter) — só conta aberturas, nunca envia dados do closet;
// - avisos, "app fora do ar" e "versão nova" lidos do arquivo avisos.json publicado no GitHub.
import { CONFIG } from './config.js';
import { S, saveSettings } from './store.js';
import { openSheet, closeSheet, icon } from './ui.js';
import { $, esc, todayStr } from './util.js';

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const statsOn = () => !!CONFIG.goatcounter && !S.settings.noStats;

// ---------- contador anônimo ----------
function count(path, title) {
  if (!statsOn() || location.protocol !== 'https:') return;
  const q = new URLSearchParams({
    p: path, t: title, e: 'true',
    s: `${screen.width},${screen.height},${window.devicePixelRatio || 1}`,
    rnd: Math.random().toString(36).slice(2),
  });
  const img = new Image();
  img.referrerPolicy = 'no-referrer';
  img.src = `https://${CONFIG.goatcounter}.goatcounter.com/count?${q}`;
}

export async function countOpen() {
  count(isStandalone() ? 'app-aberto-instalado' : 'app-aberto-navegador', 'App aberto');
  if (isStandalone() && !S.settings.installCounted) {
    count('app-instalado', 'App instalado na tela de início');
    S.settings.installCounted = true;
    await saveSettings();
  }
}

// ---------- avisos / desligar / atualizar ----------
export async function checkRemote() {
  // se da última vez o app estava desligado, continua desligado mesmo sem internet
  if (S.settings.remoteOff) showOff(S.settings.remoteOffMsg);
  let data;
  try {
    const r = await fetch(CONFIG.avisosUrl + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    data = await r.json();
  } catch { return; }   // sem internet: segue normal

  const off = data.ativo === false;
  if (off !== !!S.settings.remoteOff || data.mensagemDesligado !== S.settings.remoteOffMsg) {
    S.settings.remoteOff = off;
    S.settings.remoteOffMsg = data.mensagemDesligado || '';
    await saveSettings();
  }
  if (off) return showOff(data.mensagemDesligado);
  $('#offline-lock')?.remove();

  if (data.versaoMinima && CONFIG.appVersion < Number(data.versaoMinima)) showUpdate(data.mensagemAtualizacao);

  const seen = new Set(S.settings.seenAvisos || []);
  const today = todayStr();
  const pend = (data.avisos || []).filter(a => a && a.id && a.texto && !seen.has(a.id)
    && (!a.ate || a.ate >= today) && (!a.desde || a.desde <= today));
  if (pend.length) showAvisos(pend);
}

function showAvisos(list) {
  openSheet(list.map(a => `<div class="aviso">
      ${a.titulo ? `<h4>${esc(a.titulo)}</h4>` : ''}
      <p>${esc(a.texto).replace(/\n/g, '<br>')}</p>
      ${a.link ? `<a class="btn small ghost" href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.textoLink || 'Saiba mais')}</a>` : ''}
    </div>`).join('') + `<button class="btn block" data-act="ok">Entendi</button>`, {
    title: list.length > 1 ? 'Recados' : 'Recado',
    onAct: async act => {
      if (act !== 'ok') return;
      S.settings.seenAvisos = [...new Set([...(S.settings.seenAvisos || []), ...list.map(a => a.id)])].slice(-200);
      await saveSettings();
      closeSheet();
    },
  });
}

function showUpdate(msg) {
  if ($('#update-bar')) return;
  const el = document.createElement('div');
  el.id = 'update-bar';
  el.className = 'update-bar';
  el.innerHTML = `${icon('refresh')}<span>${esc(msg || 'Tem uma versão nova do app.')}</span><button class="btn small">Atualizar</button>`;
  el.querySelector('button').onclick = async () => {
    el.querySelector('button').textContent = 'Atualizando…';
    try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch { }
    setTimeout(() => location.reload(), 1500);
  };
  document.body.prepend(el);
}

function showOff(msg) {
  if ($('#offline-lock')) return;
  const el = document.createElement('div');
  el.id = 'offline-lock';
  el.className = 'off-lock';
  el.innerHTML = `<div class="off-box">
      ${icon('info')}
      <h2 class="serif">App fora do ar</h2>
      <p>${esc(msg || 'O MCLOSET está temporariamente indisponível.')}</p>
      <p class="small muted">Suas fotos e peças continuam guardadas neste aparelho. Faça uma cópia de segurança para não perder nada.</p>
      <button class="btn block" data-off="backup">${icon('download')} Fazer backup dos meus dados</button>
    </div>`;
  el.querySelector('[data-off="backup"]').onclick = async () => {
    const { exportBackup } = await import('./views/backup.js');
    el.style.display = 'none';
    await exportBackup();
    el.style.display = '';
  };
  document.body.appendChild(el);
}
