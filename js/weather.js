// Previsão do tempo grátis e sem cadastro (Open-Meteo).
// Até 16 dias à frente usa a previsão de verdade; mais longe que isso, usa o clima
// das mesmas datas no ano passado como estimativa.
import { todayStr, addDays, daysBetween } from './util.js';

export async function searchCity(name) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=pt&format=json`);
  if (!r.ok) throw new Error('Não consegui buscar a cidade.');
  const j = await r.json();
  return (j.results || []).map(c => ({
    name: c.name, admin: c.admin1 || '', country: c.country || '', lat: c.latitude, lon: c.longitude, tz: c.timezone || 'auto',
    label: [c.name, c.admin1, c.country].filter(Boolean).join(', '),
  }));
}

const DAILY = 'temperature_2m_max,temperature_2m_min,weather_code';
async function getDaily(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Previsão indisponível.');
  const d = (await r.json()).daily || {};
  return (d.time || []).map((t, i) => ({
    date: t, max: d.temperature_2m_max?.[i], min: d.temperature_2m_min?.[i], code: d.weather_code?.[i],
    rain: d.precipitation_probability_max?.[i], rainMm: d.precipitation_sum?.[i],
  }));
}

// devolve { 'AAAA-MM-DD': { max, min, code, rain, rainMm, source: 'previsao' | 'estimativa' } }
export async function tripWeather(place, start, end) {
  const today = todayStr();
  const lastForecast = addDays(today, 15);
  const out = {};
  const base = `latitude=${place.lat}&longitude=${place.lon}&timezone=${encodeURIComponent(place.tz || 'auto')}`;
  // parte coberta pela previsão
  const fs = start < today ? today : start, fe = end > lastForecast ? lastForecast : end;
  if (fs <= fe) {
    for (const d of await getDaily(`https://api.open-meteo.com/v1/forecast?${base}&daily=${DAILY},precipitation_probability_max&start_date=${fs}&end_date=${fe}`)) out[d.date] = { ...d, source: 'previsao' };
  }
  // o resto: estimativa pelo ano passado
  const missing = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (!out[d]) missing.push(d);
  if (missing.length) {
    const shift = s => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;
    let a = shift(missing[0]), b = shift(missing[missing.length - 1]);
    if (b >= today) { a = `${Number(a.slice(0, 4)) - 1}${a.slice(4)}`; b = `${Number(b.slice(0, 4)) - 1}${b.slice(4)}`; }
    const years = Number(missing[0].slice(0, 4)) - Number(a.slice(0, 4));
    const hist = await getDaily(`https://archive-api.open-meteo.com/v1/archive?${base}&daily=${DAILY},precipitation_sum&start_date=${a}&end_date=${b}`);
    const byMd = new Map(hist.map(h => [h.date.slice(5), h]));
    for (const d of missing) {
      const h = byMd.get(d.slice(5));
      if (h) out[d] = { ...h, date: d, rain: h.rainMm >= 5 ? 70 : h.rainMm >= 1 ? 40 : 10, source: 'estimativa', yearsBack: years };
    }
  }
  return out;
}

export function weatherIcon(code) {
  if (code == null) return ['🌡️', ''];
  if (code === 0) return ['☀️', 'Céu limpo'];
  if (code <= 2) return ['🌤️', 'Poucas nuvens'];
  if (code === 3) return ['☁️', 'Nublado'];
  if (code <= 48) return ['🌫️', 'Neblina'];
  if (code <= 57) return ['🌦️', 'Garoa'];
  if (code <= 67) return ['🌧️', 'Chuva'];
  if (code <= 77) return ['❄️', 'Neve'];
  if (code <= 82) return ['🌧️', 'Pancadas de chuva'];
  if (code <= 86) return ['🌨️', 'Neve'];
  return ['⛈️', 'Tempestade'];
}

// clima do app (calor / meia / frio) a partir das temperaturas do dia
export function climaFromTemp(w) {
  if (!w || w.max == null) return '';
  const avg = (w.max + w.min) / 2;
  if (w.max >= 27 || avg >= 23) return 'calor';
  if (w.max <= 17 || avg <= 13) return 'frio';
  return 'meia';
}

export function dayTips(w) {
  if (!w) return [];
  const t = [];
  const snow = w.code >= 71 && w.code <= 86 && !(w.code >= 80 && w.code <= 82);
  if (snow) t.push('Neve: bota fechada, meia grossa, gorro e luvas.');
  else if ((w.rain ?? 0) >= 50) t.push('Chance de chuva: leve guarda-chuva ou jaqueta impermeável e evite calçado de camurça.');
  if (w.min != null && w.min <= 8) t.push('Muito frio de manhã/noite: casaco pesado e camadas por baixo.');
  else if (w.min != null && w.min <= 15) t.push('Esfria à noite: leve um casaco ou cardigã.');
  if (w.max != null && w.min != null && w.max - w.min >= 10) t.push('Grande diferença de temperatura no dia: vá de camadas fáceis de tirar.');
  if (w.max != null && w.max >= 30) t.push('Calor forte: tecidos leves (linho, algodão), cores claras, óculos e protetor.');
  return t;
}

// tempo de agora + hoje (para o cartão "Hoje")
export async function todayWeather(place) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&timezone=${encodeURIComponent(place.tz || 'auto')}`
    + '&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,uv_index_max&forecast_days=1';
  const r = await fetch(url);
  if (!r.ok) throw new Error('Tempo indisponível.');
  const j = await r.json();
  const d = j.daily || {};
  return {
    temp: j.current?.temperature_2m, feels: j.current?.apparent_temperature, code: j.current?.weather_code ?? d.weather_code?.[0],
    max: d.temperature_2m_max?.[0], min: d.temperature_2m_min?.[0], rain: d.precipitation_probability_max?.[0], uv: d.uv_index_max?.[0],
  };
}

// o que levar/usar hoje
export function wearRecs(w) {
  if (!w) return [];
  const r = [];
  const rain = w.rain ?? 0;
  if (rain >= 50) r.push({ e: '🧥', n: 'Capa de chuva', why: `${rain}% de chance de chuva` });
  if (rain >= 35) r.push({ e: '☂️', n: 'Guarda-chuva', why: 'pode chover' });
  if (rain >= 70) r.push({ e: '👢', n: 'Bota de chuva', why: 'chuva forte prevista' });
  if (w.min != null && w.min <= 14) r.push({ e: '🧥', n: 'Casaco', why: `mínima de ${Math.round(w.min)}°` });
  if (w.min != null && w.min <= 8) r.push({ e: '🧣', n: 'Cachecol', why: 'bem frio' });
  if (rain < 70 && ((w.uv ?? 0) >= 6 || (w.max ?? 0) >= 29)) r.push({ e: '🕶️', n: 'Óculos de sol', why: 'sol forte' }, { e: '🧴', n: 'Protetor solar', why: w.uv ? `UV ${Math.round(w.uv)}` : 'calor' });
  return r;
}
