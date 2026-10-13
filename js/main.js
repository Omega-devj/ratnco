/* ═══════════════════════════════════════════════════════════════════
   ratnco — point d'entrée : écran titre, son, raccourcis clavier.
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, prefs, on, audio, soundOn, sfx, say, unlock, applyMotion, reducedMotion, wait } from './core.js';
import { initBackground, applyAudio, switchVideo } from './background.js';
import { select } from './hud.js';
import { openDialog, anyDialogOpen } from './menus.js';
import { initLive } from './live.js';
import './sections.js';
import './fun.js';
import { openCmd, toggleF3, setGamemode, gamemode } from './commands.js';
import './skin.js';

const root = document.documentElement;
const body = document.body;
const app = $('#app');
const title = $('#title');
const loading = $('#loading');

/* ═══ Classes de préférences ═══ */
function applyClasses() {
  root.classList.toggle('readable', !!prefs.get('readable'));
  root.classList.toggle('no-cursor', !prefs.get('cursor'));
  root.classList.toggle('no-coords', !prefs.get('coords'));
}
on('pref', ({ key }) => {
  if (key === 'readable' || key === 'cursor' || key === 'coords') applyClasses();
  if (key === 'motion') applyMotion();
  if (key === 'muted') updateSoundUI();
});
applyClasses();
applyMotion();

/* ═══ Son ═══ */
const hudSound = $('#hud-sound');
const titleSound = $('#title-sound');
function updateSoundUI() {
  const onNow = soundOn();
  const i = hudSound.querySelector('.ico');
  i.className = `ico ${onNow ? 'ico-sound_on' : 'ico-sound_off'}`;
  hudSound.setAttribute('aria-pressed', String(onNow));
  hudSound.setAttribute('aria-label', onNow ? 'Couper le son (M)' : 'Activer le son (M)');
  const intent = !prefs.get('muted');
  titleSound.textContent = `Son : ${intent ? 'ON' : 'OFF'}`;
  titleSound.setAttribute('aria-pressed', String(intent));
}
function toggleMute() {
  if (!audio.activated) {
    audio.activated = true;
    prefs.set('muted', false);
  } else {
    prefs.set('muted', !prefs.get('muted'));
  }
  applyAudio();
  updateSoundUI();
  unlock('mute');
  say(soundOn() ? 'Son activé.' : 'Son coupé.', 'c-gray');
}
on('toggle-mute', toggleMute);
hudSound.addEventListener('click', () => { toggleMute(); sfx.click(); });
titleSound.addEventListener('click', () => {
  prefs.set('muted', !prefs.get('muted'));
  updateSoundUI();
});

/* ═══ Boutons du HUD ═══ */
$('#hud-video').addEventListener('click', () => { switchVideo(); unlock('video'); sfx.click(); });
$('#hud-progress').addEventListener('click', () => openDialog('progress'));
$('#hud-options').addEventListener('click', () => openDialog('options'));
$('#title-options').addEventListener('click', () => openDialog('options'));

/* ═══ Écran titre ═══ */
let titleOpen = false;
function splash() {
  const d = new Date();
  const special = (d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26) ? 'Joyeux Noël !'
    : (d.getMonth() === 0 && d.getDate() === 1) ? 'Bonne année !'
      : (d.getMonth() === 9 && d.getDate() === 31) ? 'OooOoOoh !' : null;
  const list = CONFIG.splashes;
  $('#splash').textContent = special || list[Math.floor(Math.random() * list.length)];
}
function showTitle() {
  titleOpen = true;
  if (gamemode() !== 'survival') setGamemode('survival');
  root.classList.remove('no-title');
  root.classList.add('title-pending');
  title.classList.remove('gone');
  body.classList.add('title-open');
  app.inert = true;
  splash();
  updateSoundUI();
  setTimeout(() => $('#title-play').focus(), 50);
}
async function enter() {
  if (!titleOpen) return;
  titleOpen = false;
  audio.activated = true;
  prefs.set('introSeen', true);
  applyAudio();
  updateSoundUI();
  sfx.click();
  title.classList.add('gone');
  body.classList.remove('title-open');
  if (!reducedMotion()) {
    const sub = $('#loading-sub');
    const steps = ['Placement des blocs', 'Génération des grottes', 'Apparition des mobs', 'Connexion au chat'];
    loading.classList.add('on');
    for (const s of steps) { sub.textContent = s; await wait(230); }
    loading.classList.remove('on');
  }
  root.classList.remove('title-pending');
  root.classList.add('no-title');
  app.inert = false;
  $('#contenu').focus({ preventScroll: true });
  setTimeout(() => unlock('welcome'), 500);
}
$('#title-play').addEventListener('click', enter);
on('show-title', () => { scrollTo({ top: 0 }); showTitle(); });

/* ═══ Raccourcis clavier ═══ */
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || titleOpen || anyDialogOpen()) return;
  const t = e.target;
  if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (e.key === 'F3') { e.preventDefault(); toggleF3(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && gamemode() === 'spectator') { e.preventDefault(); setGamemode('survival'); return; }
  if (/^[1-9]$/.test(e.key)) { e.preventDefault(); select(+e.key - 1, { scroll: true }); return; }
  switch (e.key.toLowerCase()) {
    case 't': e.preventDefault(); openCmd(''); break;
    case '/': e.preventDefault(); openCmd('/'); break;
    case 'm': toggleMute(); break;
    case 'v': switchVideo(); unlock('video'); break;
    case 'o': openDialog('options'); break;
    case 'l': openDialog('progress'); break;
    case 'escape':
      /* empêche Chrome de traiter Échap comme « fermer » sur le menu qu'on ouvre */
      e.preventDefault();
      setTimeout(() => openDialog('pause'), 0);
      break;
    default: break;
  }
});

/* ═══ Démarrage ═══ */
initBackground();
initLive();
updateSoundUI();

const forceTitle = location.search.includes('titre') || prefs.get('titleAlways') || !prefs.get('introSeen');
if (forceTitle) {
  showTitle();
} else {
  root.classList.remove('title-pending');
  app.inert = false;
  setTimeout(() => {
    unlock('welcome');
    if (!prefs.get('muted')) say([{ t: 'Astuce : ', c: 'c-yellow' }, { t: 'appuie sur M pour activer le son de la vidéo.' }]);
  }, 1200);
}

setTimeout(() => unlock('time5'), 5 * 60 * 1000);

/* Hors ligne + visites suivantes instantanées (uniquement en HTTPS) */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

window.ratncoReady = true;
