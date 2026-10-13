/* ═══════════════════════════════════════════════════════════════════
   Décor : paysage pixel de secours, vidéos de fond (fondu enchaîné),
   ambiances façon « shaders » et particules sur un seul canvas.
   Aucun filtre CSS en temps réel : l'assombrissement est un simple
   calque noir dont on règle l'opacité (coût quasi nul pour le GPU).
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, prefs, on, emit, reducedMotion, soundOn, say } from './core.js';

const scene = $('#bg-scene');
const shade = $('#bg-shade');
const tint = $('#bg-tint');
const depth = $('#bg-depth');
const vids = [$('#v1'), $('#v2')].filter(Boolean).slice(0, CONFIG.videos.length);

/* ═══ Ambiances ═══ */
const AMB = {
  jour:    { label: 'Jour', a: 'rgba(255,236,190,.05)', b: 'rgba(40,20,0,.16)', fx: 'motes' },
  coucher: { label: 'Coucher de soleil', a: 'rgba(110,40,150,.30)', b: 'rgba(255,120,40,.22)', fx: 'motes', col: [255, 190, 140] },
  nuit:    { label: 'Nuit', a: 'rgba(10,20,70,.45)', b: 'rgba(0,0,20,.32)', fx: 'fireflies' },
  pluie:   { label: 'Pluie', a: 'rgba(40,50,70,.42)', b: 'rgba(20,25,35,.35)', fx: 'rain' },
  neige:   { label: 'Neige', a: 'rgba(170,200,255,.20)', b: 'rgba(60,80,120,.25)', fx: 'snow' },
  nether:  { label: 'Nether', a: 'rgba(120,20,0,.42)', b: 'rgba(255,90,20,.24)', fx: 'ash' },
  end:     { label: 'End', a: 'rgba(40,0,70,.48)', b: 'rgba(120,60,180,.24)', fx: 'portal' },
  eau:     { label: 'Sous l\'eau', a: 'rgba(0,60,110,.48)', b: 'rgba(0,120,140,.30)', fx: 'bubbles' },
};
export const AMBIANCES = ['auto', ...Object.keys(AMB)];
export const ambianceLabel = (k) => (k === 'auto' ? 'Auto (heure)' : (AMB[k] ? AMB[k].label : k));

function resolveAmbiance() {
  const a = prefs.get('ambiance');
  if (AMB[a]) return a;
  const h = new Date().getHours();
  if (h >= 7 && h < 18) return 'jour';
  if (h >= 18 && h < 21) return 'coucher';
  return 'nuit';
}
let current = null;
export const currentAmbiance = () => current;

export function applyAmbiance() {
  const k = resolveAmbiance();
  if (k === current) return;
  current = k;
  const d = AMB[k];
  const url = `assets/img/scenes/${k}.png`;
  const img = new Image();
  img.onload = img.onerror = () => { scene.style.backgroundImage = `url("${url}")`; };
  img.src = url;
  tint.style.setProperty('--tint-a', d.a);
  tint.style.setProperty('--tint-b', d.b);
  fx.set(d.fx, d.col);
  emit('ambiance', k);
}
setInterval(() => { if (prefs.get('ambiance') === 'auto') applyAmbiance(); }, 5 * 60 * 1000);

/* ═══ Vidéos ═══ */
const conn = navigator.connection;
const saveData = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
let cur = Math.min(Math.max(prefs.get('video') - 1, 0), Math.max(vids.length - 1, 0));
let ducked = false;
const failed = vids.map(() => false);
let warned = false;

export const videoEnabled = () => vids.length > 0 && prefs.get('videoOn') && !saveData && !reducedMotion();
export const videoInfo = () => ({
  index: cur + 1,
  count: vids.length,
  enabled: videoEnabled(),
  playing: !!(vids[cur] && !vids[cur].paused),
  failed: !!failed[cur],
  saveData,
});

function load(i) {
  const v = vids[i];
  if (v && !v.getAttribute('src') && CONFIG.videos[i]) {
    v.preload = 'auto';
    v.src = CONFIG.videos[i].src;
  }
}

export function applyAudio() {
  const vol = Math.max(0, Math.min(1, prefs.get('volume')));
  vids.forEach((v, i) => {
    const audible = i === cur && soundOn() && !ducked;
    v.volume = vol;
    v.muted = !audible || vol === 0;
  });
  emit('audio', soundOn());
}

function updateShade() {
  const visible = vids.some((v) => v.classList.contains('on'));
  shade.style.opacity = visible ? (1 - prefs.get('brightness') / 100).toFixed(2) : '0.3';
}

function show() {
  vids.forEach((v, i) => v.classList.toggle('on', i === cur && !failed[i] && v.readyState >= 2 && videoEnabled()));
  updateShade();
}

function play(i) {
  const v = vids[i];
  if (!v || failed[i]) return;
  load(i);
  v.playbackRate = prefs.get('speed') / 100;
  applyAudio();
  const p = v.play();
  if (p && p.catch) {
    p.catch((err) => {
      if (err && err.name === 'NotAllowedError') {
        v.muted = true;
        v.play().catch(() => {});
      }
    });
  }
}

vids.forEach((v, i) => {
  v.addEventListener('canplay', () => { if (i === cur) show(); });
  v.addEventListener('playing', () => { if (i === cur) show(); });
  v.addEventListener('error', () => {
    failed[i] = true;
    show();
    if (i === cur && !warned) {
      warned = true;
      say('Vidéo de fond indisponible : le paysage pixel prend le relais.', 'c-gray');
    }
  });
});

export function startVideo() {
  if (!videoEnabled()) {
    vids.forEach((v) => { v.pause(); v.classList.remove('on'); });
    updateShade();
    return;
  }
  play(cur);
  show();
}

export function switchVideo(to) {
  if (vids.length < 2) return;
  const next = typeof to === 'number' ? to : (cur + 1) % vids.length;
  if (next === cur || next < 0 || next >= vids.length) return;
  const prev = cur;
  cur = next;
  prefs.set('video', cur + 1);
  emit('video', cur + 1);
  if (!videoEnabled()) return;
  play(cur);
  const v = vids[cur];
  const done = () => {
    show();
    setTimeout(() => { if (prev !== cur) vids[prev].pause(); }, 1300);
  };
  if (v.readyState >= 2) done();
  else v.addEventListener('canplay', done, { once: true });
}

/* Le lecteur Twitch intégré coupe le son du fond */
export function setDucked(b) { ducked = b; applyAudio(); }

/* Profondeur : plus on descend dans la page, plus il fait sombre */
export function setDepth(p) { depth.style.opacity = (p * 0.8).toFixed(3); }

document.addEventListener('visibilitychange', () => {
  const v = vids[cur];
  if (!v) return;
  if (document.hidden) v.pause();
  else if (videoEnabled()) play(cur);
  fx.refresh();
});

let rotateTimer = 0;
function autoRotate() {
  clearInterval(rotateTimer);
  if (prefs.get('autoRotate')) rotateTimer = setInterval(() => switchVideo(), 120000);
}

/* ═══ Particules (canvas demi-résolution : gros pixels, 4× moins de calcul) ═══ */
const fx = (() => {
  const c = $('#bg-fx');
  const g = c.getContext('2d');
  let W = 0, H = 0, parts = [], type = 'none', col = null, raf = 0, last = 0, t0 = 0;
  const BASE = { rain: 150, snow: 90, motes: 26, fireflies: 28, ash: 70, portal: 60, bubbles: 34 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function size() {
    W = c.width = Math.ceil(innerWidth / 2);
    H = c.height = Math.ceil(innerHeight / 2);
  }
  function spawn(p, init) {
    p.x = rnd(0, W);
    p.y = init ? rnd(0, H) : 0;
    p.a = rnd(0.4, 1);
    p.ph = rnd(0, Math.PI * 2);
    switch (type) {
      case 'rain': p.y = init ? rnd(-H, H) : rnd(-40, -5); p.vy = rnd(5, 8); p.len = rnd(4, 8) | 0; break;
      case 'snow': p.y = init ? rnd(0, H) : -3; p.vy = rnd(0.25, 0.7); p.s = Math.random() < 0.3 ? 2 : 1; break;
      case 'ash': p.y = init ? rnd(0, H) : H + 2; p.vy = -rnd(0.15, 0.5); p.hot = Math.random() < 0.4; break;
      case 'portal': p.y = init ? rnd(0, H) : H + 2; p.vy = -rnd(0.2, 0.6); p.life = rnd(0.5, 1); break;
      case 'bubbles': p.y = init ? rnd(0, H) : H + 4; p.vy = -rnd(0.3, 0.8); p.s = Math.random() < 0.5 ? 2 : 3; break;
      case 'fireflies': p.vx = rnd(-0.2, 0.2); p.vy = rnd(-0.2, 0.2); p.y = rnd(H * 0.35, H); break;
      default: p.vx = rnd(-0.08, 0.08); p.vy = -rnd(0.02, 0.12); break;
    }
  }
  function make() {
    const scale = Math.min(1.2, Math.max(0.35, (innerWidth * innerHeight) / 2e6));
    const n = Math.round((BASE[type] || 0) * scale);
    parts = Array.from({ length: n }, () => { const p = {}; spawn(p, true); return p; });
  }
  function step(t) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(3, (t - last) / 16.67 || 1);
    last = t;
    const time = (t - t0) / 1000;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      switch (type) {
        case 'rain':
          p.y += p.vy * dt;
          if (p.y > H) spawn(p, false);
          g.fillStyle = 'rgba(165,185,255,.5)';
          g.fillRect(p.x | 0, p.y | 0, 1, p.len);
          break;
        case 'snow':
          p.y += p.vy * dt;
          p.x += Math.sin(time + p.ph) * 0.25 * dt;
          if (p.y > H) spawn(p, false);
          g.fillStyle = `rgba(255,255,255,${0.75 * p.a})`;
          g.fillRect(p.x | 0, p.y | 0, p.s, p.s);
          break;
        case 'ash':
          p.y += p.vy * dt;
          p.x += Math.sin(time * 1.3 + p.ph) * 0.2 * dt;
          if (p.y < -2) spawn(p, false);
          g.fillStyle = p.hot ? `rgba(255,${120 + (p.a * 80) | 0},40,${p.a})` : `rgba(90,80,80,${p.a})`;
          g.fillRect(p.x | 0, p.y | 0, 1, 1);
          break;
        case 'portal':
          p.y += p.vy * dt;
          p.x += Math.cos(time * 2 + p.ph) * 0.3 * dt;
          if (p.y < -2) spawn(p, false);
          g.fillStyle = `rgba(${170 + (p.a * 60) | 0},70,255,${0.5 + Math.sin(time * 3 + p.ph) * 0.4})`;
          g.fillRect(p.x | 0, p.y | 0, 1, 1);
          break;
        case 'bubbles':
          p.y += p.vy * dt;
          p.x += Math.sin(time * 2 + p.ph) * 0.3 * dt;
          if (p.y < -4) spawn(p, false);
          g.strokeStyle = 'rgba(210,240,255,.7)';
          g.lineWidth = 1;
          g.strokeRect((p.x | 0) + 0.5, (p.y | 0) + 0.5, p.s, p.s);
          break;
        case 'fireflies': {
          p.vx = Math.max(-0.3, Math.min(0.3, p.vx + rnd(-0.03, 0.03)));
          p.vy = Math.max(-0.3, Math.min(0.3, p.vy + rnd(-0.03, 0.03)));
          p.x = (p.x + p.vx * dt + W) % W;
          p.y = Math.min(H, Math.max(H * 0.3, p.y + p.vy * dt));
          const a = 0.35 + 0.65 * Math.max(0, Math.sin(time * 1.6 + p.ph));
          g.fillStyle = `rgba(200,255,110,${a * 0.25})`;
          g.fillRect((p.x | 0) - 1, (p.y | 0) - 1, 3, 3);
          g.fillStyle = `rgba(230,255,150,${a})`;
          g.fillRect(p.x | 0, p.y | 0, 1, 1);
          break;
        }
        default: {
          p.x = (p.x + p.vx * dt + W) % W;
          p.y += p.vy * dt;
          if (p.y < -2) { spawn(p, false); p.y = H; }
          const k = col || [255, 240, 180];
          g.fillStyle = `rgba(${k[0]},${k[1]},${k[2]},${0.3 + 0.5 * Math.abs(Math.sin(time + p.ph))})`;
          g.fillRect(p.x | 0, p.y | 0, 1, 1);
        }
      }
    }
  }
  function running() {
    return type !== 'none' && prefs.get('particles') && !reducedMotion() && !document.hidden;
  }
  function refresh() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!running()) { if (W) g.clearRect(0, 0, W, H); return; }
    size();
    make();
    last = t0 = performance.now();
    raf = requestAnimationFrame(step);
  }
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(refresh, 200); }, { passive: true });
  return {
    set(t, color) { type = t; col = color || null; refresh(); },
    refresh,
  };
})();

/* ═══ Réactions aux réglages ═══ */
on('pref', ({ key }) => {
  if (key === 'volume' || key === 'muted') applyAudio();
  else if (key === 'brightness') updateShade();
  else if (key === 'speed') vids.forEach((v) => { v.playbackRate = prefs.get('speed') / 100; });
  else if (key === 'videoOn') startVideo();
  else if (key === 'ambiance') applyAmbiance();
  else if (key === 'particles') fx.refresh();
  else if (key === 'autoRotate') autoRotate();
});
on('motion', () => { fx.refresh(); startVideo(); });

export function initBackground() {
  applyAmbiance();
  autoRotate();
  startVideo();
  if (saveData && prefs.get('videoOn')) say('Mode économie de données : vidéo de fond désactivée.', 'c-gray');
}
