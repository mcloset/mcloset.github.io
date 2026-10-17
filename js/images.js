import { detectColors } from './color.js';

const FULL_MAX = 1280;
const THUMB_MAX = 380;

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não consegui abrir a imagem ' + (file.name || ''))); };
    img.src = url;
  });
}

function draw(img, max) {
  const r = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.max(1, Math.round((img.naturalWidth || img.width) * r));
  const h = Math.max(1, Math.round((img.naturalHeight || img.height) * r));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#FFFFFF';          // fundo branco caso a foto seja PNG transparente
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

const toBlob = (c, q) => new Promise(res => c.toBlob(res, 'image/jpeg', q));

// Reduz a foto (economiza espaço no celular), cria a miniatura e detecta as cores.
export async function processImage(file, { colors = true } = {}) {
  const img = await loadImage(file);
  const full = await toBlob(draw(img, FULL_MAX), 0.86);
  const thumb = await toBlob(draw(img, THUMB_MAX), 0.8);
  let detected = [];
  if (colors) {
    const small = draw(img, 110);
    const d = small.getContext('2d').getImageData(0, 0, small.width, small.height);
    detected = detectColors(d.data, small.width, small.height);
  }
  return { full, thumb, colors: detected };
}

export async function colorsFromBlob(blob) {
  const img = await loadImage(blob);
  const small = draw(img, 110);
  const d = small.getContext('2d').getImageData(0, 0, small.width, small.height);
  return detectColors(d.data, small.width, small.height);
}

export { loadImage };
