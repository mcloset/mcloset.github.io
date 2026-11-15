// "Ver vestida com IA": o MCLOSET não tem IA própria (é grátis e sem servidor).
// Aqui ele prepara tudo para a IA que você já usa (ChatGPT, Gemini…): a imagem com as peças
// montadas + um texto pronto descrevendo cada peça. Você cola o texto, anexa a imagem e a IA gera a foto vestida.
import { profile } from './store.js';
import { catName, DETAIL_FIELDS } from './catalog.js';
import { boardImage } from './board.js';
import { openSheet, chips, icon, sortByCat } from './ui.js';
import { esc, toast, deliverFile, copyToClipboard } from './util.js';

const WHO = [
  { id: 'mulher', name: 'Modelo mulher', txt: 'uma modelo mulher adulta' },
  { id: 'menina', name: 'Menina', txt: 'uma menina (criança)' },
  { id: 'bebe', name: 'Bebê', txt: 'um bebê' },
  { id: 'eu', name: 'Eu (vou mandar minha foto)', txt: 'a pessoa da foto que estou enviando junto (mantenha o rosto, o corpo, o cabelo e o tom de pele dela exatamente iguais)' },
];
const SCENE = [
  { id: 'estudio', name: 'Fundo branco', txt: 'foto de catálogo de moda, corpo inteiro, de frente, fundo branco liso, luz de estúdio suave' },
  { id: 'rua', name: 'Na rua', txt: 'foto de corpo inteiro na rua, estilo street style, luz natural de dia' },
  { id: 'casa', name: 'Em casa', txt: 'foto de corpo inteiro em casa, ambiente aconchegante, luz natural' },
  { id: 'praia', name: 'Praia', txt: 'foto de corpo inteiro na praia, luz do sol' },
  { id: 'festa', name: 'Festa / noite', txt: 'foto de corpo inteiro num ambiente de festa à noite, luz bonita' },
];

function pieceText(it, n) {
  const cores = (it.colors || []).map(c => c.name.toLowerCase()).join(', ');
  const det = DETAIL_FIELDS.filter(d => it.detalhes?.[d.id] && !['estado', 'tamanhoEtiqueta', 'medidas'].includes(d.id)).map(d => `${d.name.toLowerCase()}: ${it.detalhes[d.id]}`).join('; ');
  const base = `${n}. ${it.sub || catName(it.category)} — "${it.name}"${cores ? `, cor ${cores}` : ''}${it.estampa && it.estampa !== 'Lisa' ? `, estampa ${it.estampa.toLowerCase()}` : ''}.`;
  const extra = it.promptImg || it.descricao || det;
  return extra ? `${base} ${extra}` : base;
}

export function buildPrompt(items, who, scene) {
  const its = sortByCat(items);
  return `Gere UMA imagem realista de ${WHO.find(w => w.id === who).txt} vestindo EXATAMENTE as peças abaixo, todas ao mesmo tempo, como um look completo.
A imagem que estou enviando mostra as peças de verdade, montadas na posição em que devem ser usadas: siga essa imagem para cores, estampas, tecidos, botões, alças e todos os detalhes. Não troque, não invente e não acrescente peças. Se tiver calçado, mostre os pés; se tiver bolsa ou acessório, mostre com a pessoa usando.
Estilo da foto: ${SCENE.find(s => s.id === scene).txt}.

PEÇAS:
${its.map((it, i) => pieceText(it, i + 1)).join('\n')}`;
}

export async function lookAI(items, layout, name = '') {
  if (!items.length) return toast('Escolha as peças primeiro.');
  const kid = items.every(i => profile(i.profileId)?.kind === 'crianca');
  const st = { who: kid ? 'menina' : 'mulher', scene: 'estudio', edited: false, blob: null };
  const draw = () => `
    <p class="small">O app monta a imagem com as peças e um texto pronto. Você cola numa IA que gera imagens (ChatGPT, Gemini…) e ela devolve a foto com a roupa vestida.</p>
    <div class="field"><label>Quem vai vestir</label>${chips(WHO, st.who, 'who')}</div>
    <div class="field"><label>Foto</label>${chips(SCENE, st.scene, 'scene')}</div>
    <div class="field"><label>Texto para a IA <span class="muted">(pode mudar)</span></label><textarea id="aip" rows="8">${esc(st.text)}</textarea></div>
    <button class="btn block" data-act="go">${icon('copy')} Copiar texto e enviar a imagem</button>
    <ol class="small steps">
      <li>Toque no botão acima: o texto é copiado e abre a tela de compartilhar com a imagem das peças.</li>
      <li>Escolha o app da IA (ChatGPT ou Gemini). Se ele não aparecer, salve a imagem e anexe dentro do app.</li>
      <li>Na conversa, segure no campo de texto e toque em <b>Colar</b>.${st.who === 'eu' ? ' Anexe também uma foto sua de corpo inteiro.' : ''} Envie.</li>
    </ol>
    <p class="hint">${icon('info')} A IA às vezes muda algum detalhe da roupa. Se acontecer, responda na conversa o que corrigir (ex.: “a blusa é sem manga”).</p>`;
  st.text = buildPrompt(items, st.who, st.scene);
  boardImage(items, layout).then(b => st.blob = b);   // prepara antes do toque (o iPhone só compartilha na hora do toque)
  const body = openSheet(draw(), {
    title: 'Ver vestida com IA',
    onInput: e => { if (e.target.id === 'aip') { st.text = e.target.value; st.edited = true; } },
    onAct: async (act, el) => {
      if (act === 'who' || act === 'scene') {
        if (st.edited && !confirm('Trocar isso refaz o texto e apaga o que você mudou. Continuar?')) return;
        st[act] = el.dataset.v; st.text = buildPrompt(items, st.who, st.scene); st.edited = false;
        body.innerHTML = draw();
      } else if (act === 'go') {
        if (!st.blob) return toast('Preparando a imagem… toque de novo em 1 segundo.');
        const ok = await copyToClipboard(st.text);
        toast(ok ? 'Texto copiado! Agora escolha o app da IA.' : 'Não consegui copiar — segure no texto e copie à mão.');
        deliverFile(st.blob, (name || 'look').replace(/[^\w\- ]+/g, '').trim() + '-pecas.jpg');
      }
    },
  });
}
