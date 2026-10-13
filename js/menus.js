/* ═══════════════════════════════════════════════════════════════════
   Écrans : Options, Menu du jeu (Échap), Progrès, Mort.
   Basés sur <dialog> : focus piégé et touche Échap natifs.
═══════════════════════════════════════════════════════════════════ */
import { $, $$, prefs, emit, sfx, unlock, say, audio, renderAdvancements, applyMotion } from './core.js';
import { AMBIANCES, ambianceLabel, switchVideo, videoInfo } from './background.js';

let returnFocus = null;

export function openDialog(id) {
  const d = $('#dlg-' + id);
  if (!d || d.open) return;
  const active = document.activeElement;
  if (!active || !active.closest('dialog')) returnFocus = active;
  $$('dialog[open]').forEach((x) => x.close());
  if (id === 'progress') renderAdvancements($('#adv-list'), $('#prog-count'));
  if (id === 'options') { syncOptions(); unlock('options'); }
  d.showModal();
  sfx.click();
}
export const anyDialogOpen = () => !!document.querySelector('dialog[open]');

$$('dialog.screen').forEach((d) => {
  d.addEventListener('close', () => {
    if (anyDialogOpen()) return;
    const f = returnFocus;
    returnFocus = null;
    if (f && document.contains(f) && typeof f.focus === 'function') f.focus({ preventScroll: true });
  });
});
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) { sfx.click(); closeBtn.closest('dialog').close(); return; }
  const act = e.target.closest('[data-action]');
  if (!act) return;
  sfx.click();
  switch (act.dataset.action) {
    case 'progress': openDialog('progress'); break;
    case 'options': openDialog('options'); break;
    case 'stats':
      $$('dialog[open]').forEach((x) => x.close());
      $('#stats').scrollIntoView({ block: 'start' });
      $('#stats').focus({ preventScroll: true });
      break;
    case 'title':
      $$('dialog[open]').forEach((x) => x.close());
      emit('show-title');
      break;
    case 'reset':
      if (confirm('Réinitialiser tous les réglages et les progrès ?')) { prefs.reset(); location.reload(); }
      break;
    default: break;
  }
});

/* ═══ Options ═══ */
const onOff = (b) => (b ? 'ON' : 'OFF');
const MOTION = { auto: 'Auto', full: 'Complètes', reduced: 'Réduites' };
const LABELS = {
  ambiance: () => `Ambiance : ${ambianceLabel(prefs.get('ambiance'))}`,
  particles: () => `Particules : ${onOff(prefs.get('particles'))}`,
  videoOn: () => `Vidéo de fond : ${onOff(prefs.get('videoOn'))}`,
  video: () => `Vidéo : ${videoInfo().index}`,
  autoRotate: () => `Rotation des vidéos : ${onOff(prefs.get('autoRotate'))}`,
  sfx: () => `Sons de l'interface : ${onOff(prefs.get('sfx'))}`,
  motion: () => `Animations : ${MOTION[prefs.get('motion')] || 'Auto'}`,
  readable: () => `Police : ${prefs.get('readable') ? 'Lisible' : 'Pixel'}`,
  cursor: () => `Curseur pixel : ${onOff(prefs.get('cursor'))}`,
  coords: () => `Coordonnées : ${onOff(prefs.get('coords'))}`,
  titleAlways: () => `Écran titre : ${prefs.get('titleAlways') ? 'Toujours' : '1re visite'}`,
};
const BOOL = ['particles', 'videoOn', 'autoRotate', 'sfx', 'readable', 'cursor', 'coords', 'titleAlways'];

const sliders = {
  volume: { el: $('#opt-volume'), get: () => Math.round(prefs.get('volume') * 100), set: (v) => prefs.set('volume', v / 100), label: (v) => `Volume : ${v} %` },
  brightness: { el: $('#opt-brightness'), get: () => prefs.get('brightness'), set: (v) => prefs.set('brightness', v), label: (v) => `Luminosité : ${v} %` },
  speed: { el: $('#opt-speed'), get: () => prefs.get('speed'), set: (v) => prefs.set('speed', v), label: (v) => `Vitesse : ${(v / 100).toFixed(2).replace('.', ',')}×` },
};

export function syncOptions() {
  $$('[data-opt]').forEach((b) => {
    const k = b.dataset.opt;
    if (LABELS[k]) b.textContent = LABELS[k]();
    if (BOOL.includes(k)) b.setAttribute('aria-pressed', String(!!prefs.get(k)));
  });
  const vi = videoInfo();
  const vb = $('[data-opt="video"]');
  if (vb) vb.disabled = vi.count < 2;
  for (const s of Object.values(sliders)) {
    if (!s.el) continue;
    const v = s.get();
    s.el.value = v;
    s.el.setAttribute('aria-valuetext', s.label(v));
    s.el.nextElementSibling.textContent = s.label(v);
  }
}

$$('[data-opt]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.opt;
  sfx.click();
  if (BOOL.includes(k)) {
    prefs.set(k, !prefs.get(k));
    if (k === 'sfx' && prefs.get('sfx') && !audio.activated) say('Active aussi le son (touche M) pour entendre les effets.', 'c-gray');
  } else if (k === 'ambiance') {
    const i = AMBIANCES.indexOf(prefs.get('ambiance'));
    prefs.set('ambiance', AMBIANCES[(i + 1) % AMBIANCES.length]);
    unlock('ambiance');
  } else if (k === 'video') {
    switchVideo();
    unlock('video');
  } else if (k === 'motion') {
    const order = ['auto', 'full', 'reduced'];
    prefs.set('motion', order[(order.indexOf(prefs.get('motion')) + 1) % order.length]);
    applyMotion();
  }
  syncOptions();
}));

for (const s of Object.values(sliders)) {
  if (!s.el) continue;
  s.el.addEventListener('input', () => {
    const v = +s.el.value;
    s.set(v);
    s.el.setAttribute('aria-valuetext', s.label(v));
    s.el.nextElementSibling.textContent = s.label(v);
  });
}

/* ═══ Mort ═══ */
export function showDeath(cause, score) {
  $('#death-cause').textContent = cause;
  $('#death-score').textContent = String(score);
  openDialog('death');
  const d = $('#dlg-death');
  d.addEventListener('close', () => unlock('death'), { once: true });
}

