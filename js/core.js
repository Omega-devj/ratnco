/* ═══════════════════════════════════════════════════════════════════
   Noyau : sélecteurs, bus d'événements, préférences, sons, messages
   façon chat du jeu, presse-papiers et progrès (succès).
═══════════════════════════════════════════════════════════════════ */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const root = document.documentElement;

/* ═══ Bus d'événements ═══ */
const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));

/* ═══ Préférences (localStorage protégé + repli en mémoire) ═══ */
const PREFIX = 'ratnco.';
const DEFAULTS = {
  introSeen: false, titleAlways: false,
  muted: false, volume: 0.4, video: 1, videoOn: true, autoRotate: false,
  brightness: 40, speed: 100,
  ambiance: 'auto', particles: true, sfx: false,
  motion: 'auto', readable: false, cursor: true, coords: true,
  ach: {},
};
const mem = {};

export const prefs = {
  get(key) {
    let v;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) v = JSON.parse(raw);
    } catch { /* stockage indisponible */ }
    if (v === undefined) v = mem[key];
    return v === undefined ? DEFAULTS[key] : v;
  },
  set(key, value) {
    mem[key] = value;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* mémoire seule */ }
    emit('pref', { key, value });
  },
  reset() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX) || k.startsWith('ratnco_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* rien */ }
    Object.keys(mem).forEach((k) => delete mem[k]);
  },
};

/* Reprise des réglages et succès de l'ancienne version du site */
(function migrate() {
  try {
    if (localStorage.getItem(PREFIX + 'migrated')) return;
    const old = (k) => {
      const v = localStorage.getItem(k);
      if (v === null) return undefined;
      try { return JSON.parse(v); } catch { return v; }
    };
    if (old('ratnco_intro_seen') === true) prefs.set('introSeen', true);
    const vol = old('ratnco_vol');
    if (typeof vol === 'number') prefs.set('volume', Math.max(0, Math.min(1, vol)));
    const vid = old('ratnco_vid');
    if (vid === 1 || vid === 2) prefs.set('video', vid);
    const br = old('ratnco_bright');
    if (typeof br === 'number') prefs.set('brightness', br);
    const sp = old('ratnco_speed');
    if (typeof sp === 'number') prefs.set('speed', sp);
    if (old('ratnco_anim') === true) prefs.set('motion', 'reduced');
    if (old('ratnco_cursor') === false) prefs.set('cursor', false);
    if (old('ratnco_particles') === false) prefs.set('particles', false);
    if (old('ratnco_autorot') === true) prefs.set('autoRotate', true);
    const map = { welcome: 'welcome', twitch: 'twitch', copy_tw: 'copy_tw', copy_dc: 'copy_dc',
      bottom: 'bedrock', switch: 'video', mute: 'mute', partner: 'partner', settings: 'options',
      time5: 'time5', tap10: 'fan' };
    const ach = {};
    for (const [o, n] of Object.entries(map)) if (localStorage.getItem('ratnco_ach_' + o)) ach[n] = Date.now();
    if (Object.keys(ach).length) prefs.set('ach', ach);
    localStorage.setItem(PREFIX + 'migrated', '1');
  } catch { /* stockage indisponible */ }
})();

/* ═══ Animations réduites ═══ */
const mq = matchMedia('(prefers-reduced-motion: reduce)');
export function reducedMotion() {
  const m = prefs.get('motion');
  return m === 'reduced' || (m !== 'full' && mq.matches);
}
export function applyMotion() {
  const r = reducedMotion();
  root.classList.toggle('reduce-motion', r);
  root.classList.toggle('motion', !r);
  emit('motion', r);
}
if (mq.addEventListener) mq.addEventListener('change', applyMotion);

/* ═══ Son ═══
   `activated` passe à true uniquement après un geste explicite (bouton
   « Entrer » ou bouton son) : pas de son surprise au premier clic. */
export const audio = { activated: false };
export const soundOn = () => audio.activated && !prefs.get('muted');

let ctx = null;
let noiseBuf = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const canPlay = () => prefs.get('sfx') && soundOn();

function tone({ type = 'square', f0, f1 = f0, dur = 0.1, vol = 0.04, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise({ dur = 0.1, vol = 0.1, type = 'lowpass', f0 = 1000, f1 = f0, delay = 0 }) {
  const c = ac(); if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t); s.stop(t + dur + 0.02);
}

export const sfx = {
  click() { if (!canPlay()) return; noise({ dur: 0.03, vol: 0.12, type: 'bandpass', f0: 2400 }); tone({ type: 'square', f0: 900, f1: 500, dur: 0.035, vol: 0.02 }); },
  xp() { if (!canPlay()) return; const f = 1100 + Math.random() * 500; tone({ type: 'sine', f0: f, f1: f * 1.35, dur: 0.12, vol: 0.05 }); },
  levelup() { if (!canPlay()) return; [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.06, delay: i * 0.09 })); },
  toast() { if (!canPlay()) return; tone({ type: 'triangle', f0: 660, dur: 0.12, vol: 0.06 }); tone({ type: 'triangle', f0: 990, dur: 0.22, vol: 0.06, delay: 0.12 }); },
  hit() { if (!canPlay()) return; noise({ dur: 0.06, vol: 0.16, f0: 900 }); },
  brk() { if (!canPlay()) return; noise({ dur: 0.28, vol: 0.25, f0: 1600, f1: 250 }); },
  pop() { if (!canPlay()) return; tone({ type: 'sine', f0: 300, f1: 950, dur: 0.08, vol: 0.06 }); },
  fuse() { if (!canPlay()) return; noise({ dur: 1.6, vol: 0.05, type: 'highpass', f0: 3200 }); },
  boom() { if (!canPlay()) return; noise({ dur: 1.3, vol: 0.5, f0: 900, f1: 80 }); tone({ type: 'sine', f0: 90, f1: 30, dur: 0.7, vol: 0.35 }); },
};

/* ═══ Messages façon chat du jeu (en bas à gauche) ═══ */
export function say(parts, cls) {
  const log = $('#chatlog');
  if (!log) return null;
  const p = document.createElement('p');
  p.className = 'chat-line';
  if (typeof parts === 'string') {
    p.textContent = parts;
    if (cls) p.classList.add(cls);
  } else {
    for (const part of parts) {
      const s = document.createElement('span');
      s.textContent = part.t;
      if (part.c) s.className = part.c;
      p.append(s);
    }
  }
  log.append(p);
  while (log.children.length > 14) log.firstElementChild.remove();
  setTimeout(() => p.classList.add('fade'), 9000);
  return p;
}
export function clearChat() { const log = $('#chatlog'); if (log) log.textContent = ''; }

/* ═══ Presse-papiers (avec repli) ═══ */
export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/* ═══ Icône ═══ */
export function icon(name, extra = '') {
  const i = document.createElement('i');
  i.className = `ico ico-${name}${extra ? ' ' + extra : ''}`;
  i.setAttribute('aria-hidden', 'true');
  return i;
}

/* ═══ Progrès ═══ */
export const ADV = [
  { id: 'welcome',  icon: 'grass',      title: 'Bienvenue dans le monde', desc: 'Entrer sur le site de ratnco' },
  { id: 'twitch',   icon: 'eye',        title: 'Premier pas sur Twitch', desc: 'Ouvrir la chaîne Twitch' },
  { id: 'copy_tw',  icon: 'map',        title: 'Partageur', desc: 'Copier le lien de la chaîne' },
  { id: 'copy_dc',  icon: 'chest',      title: 'Rejoins la guilde', desc: 'Copier le pseudo Discord' },
  { id: 'mine',     icon: 'pickaxe',    title: 'Ça creuse !', desc: 'Miner le bloc d\'herbe' },
  { id: 'bedrock',  icon: 'bedrock',    title: 'Jusqu\'à la bedrock', desc: 'Descendre tout en bas de la page' },
  { id: 'chat',     icon: 'feather',    title: 'Oreille attentive', desc: 'Afficher le chat de la commu' },
  { id: 'live',     icon: 'star',       title: 'Spectateur', desc: 'Lancer le lecteur du live' },
  { id: 'video',    icon: 'painting',   title: 'Changement de décor', desc: 'Changer de vidéo de fond' },
  { id: 'ambiance', icon: 'obsidian',   title: 'Voyageur des dimensions', desc: 'Changer d\'ambiance' },
  { id: 'mute',     icon: 'disc',       title: 'Silence, ça tourne', desc: 'Couper ou remettre le son' },
  { id: 'options',  icon: 'gear',       title: 'Bricoleur', desc: 'Ouvrir les options' },
  { id: 'skin',     icon: 'chestplate', title: 'Défilé de mode', desc: 'Faire faire un tour complet au skin 3D' },
  { id: 'partner',  icon: 'emerald',    title: 'Allié découvert', desc: 'Rendre visite à Odzigon' },
  { id: 'command',  icon: 'command',    title: 'Commandant', desc: 'Exécuter une commande (touche T)' },
  { id: 'f3',       icon: 'compass',    title: 'Débogueur', desc: 'Ouvrir l\'écran de debug (F3)' },
  { id: 'time5',    icon: 'clock',      title: 'Habitué', desc: 'Rester 5 minutes sur le site' },
  { id: 'fan',      icon: 'heart',      title: 'Fan acharné', desc: 'Cliquer 10 fois sur le logo', secret: true },
  { id: 'tnt',      icon: 'tnt',        title: 'Artificier', desc: 'Faire exploser une TNT', secret: true },
  { id: 'creative', icon: 'gold',       title: 'Esprit créatif', desc: 'Passer en mode créatif', secret: true },
  { id: 'death',    icon: 'sword',      title: 'Ce n\'était qu\'un jeu', desc: 'Mourir (et réapparaître)', secret: true },
  { id: 'all',      icon: 'diamond',    title: 'Complétionniste', desc: 'Débloquer tous les autres progrès', challenge: true },
];

export const isUnlocked = (id) => !!prefs.get('ach')[id];
export const unlockedCount = () => ADV.filter((a) => isUnlocked(a.id)).length;

export function unlock(id) {
  const a = ADV.find((x) => x.id === id);
  if (!a) return;
  const ach = { ...prefs.get('ach') };
  if (ach[id]) return;
  ach[id] = Date.now();
  prefs.set('ach', ach);
  queueToast(a);
  emit('advancement', a);
  if (id !== 'all' && ADV.every((x) => x.id === 'all' || ach[x.id])) setTimeout(() => unlock('all'), 1500);
}

const toastQueue = [];
let toastBusy = false;
function queueToast(a) {
  toastQueue.push(a);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const a = toastQueue.shift();
  if (!a) { toastBusy = false; return; }
  toastBusy = true;
  const el = document.createElement('div');
  el.className = 'toast' + (a.challenge ? ' challenge' : '');
  const slot = document.createElement('span');
  slot.className = 'slot';
  slot.append(icon(a.icon));
  const txt = document.createElement('div');
  const t1 = document.createElement('p');
  t1.className = 't1';
  t1.textContent = a.challenge ? 'Défi relevé !' : 'Progrès réalisé !';
  const t2 = document.createElement('p');
  t2.className = 't2';
  t2.textContent = a.title;
  txt.append(t1, t2);
  el.append(slot, txt);
  $('#toasts').append(el);
  sfx.toast();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => { el.remove(); nextToast(); }, reducedMotion() ? 0 : 450);
  }, 4300);
}

export function renderAdvancements(list, counter) {
  const ach = prefs.get('ach');
  list.textContent = '';
  let n = 0;
  for (const a of ADV) {
    const done = !!ach[a.id];
    if (done) n++;
    const hidden = a.secret && !done;
    const li = document.createElement('li');
    li.className = 'adv' + (done ? ' done' : '') + (a.challenge ? ' challenge' : '');
    const frame = document.createElement('span');
    frame.className = 'adv-frame';
    frame.append(icon(hidden ? 'command' : a.icon));
    const box = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'adv-name';
    name.textContent = hidden ? '???' : a.title;
    const state = document.createElement('span');
    state.className = 'sr-only';
    state.textContent = done ? ' (débloqué)' : ' (verrouillé)';
    name.append(state);
    const desc = document.createElement('p');
    desc.className = 'adv-desc';
    desc.textContent = hidden ? 'Progrès secret' : a.desc;
    box.append(name, desc);
    li.append(frame, box);
    list.append(li);
  }
  if (counter) counter.textContent = `${n}/${ADV.length}`;
}
