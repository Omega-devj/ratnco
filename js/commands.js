/* ═══════════════════════════════════════════════════════════════════
   Barre de commande (T ou /) avec autocomplétion et historique,
   modes de jeu, et écran de debug F3.
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, prefs, say, clearChat, unlock, sfx, soundOn, unlockedCount, ADV, copy, emit } from './core.js';
import { AMBIANCES, ambianceLabel, switchVideo, videoInfo, currentAmbiance } from './background.js';
import { hudState, select } from './hud.js';
import { openDialog, showDeath } from './menus.js';
import { live } from './live.js';
import { spawnTNT } from './fun.js';

const form = $('#cmd');
const input = $('#cmd-input');
const list = $('#cmd-suggest');

const SECTIONS = { spawn: 0, accueil: 0, live: 1, monde: 2, planning: 3, rejoindre: 4, stats: 5, skin: 6, partenaire: 7, bedrock: 8, credits: 8 };
const TIME = { day: 'jour', jour: 'jour', noon: 'jour', sunset: 'coucher', coucher: 'coucher', night: 'nuit', nuit: 'nuit', midnight: 'nuit', auto: 'auto' };
const WEATHER = { clear: 'auto', rain: 'pluie', pluie: 'pluie', thunder: 'pluie', snow: 'neige', neige: 'neige' };
const GIFTS = { diamond: 'Diamant', diamant: 'Diamant', emerald: 'Émeraude', emeraude: 'Émeraude', cookie: 'Cookie', gold: 'Lingot d\'or', tnt: 'TNT' };

/* ═══ Modes de jeu ═══ */
let mode = 'survival';
export function setGamemode(m) {
  const names = { survival: 'Survie', creative: 'Créatif', spectator: 'Spectateur', adventure: 'Aventure' };
  if (!names[m]) return false;
  mode = m;
  document.body.classList.toggle('creative', m === 'creative');
  document.body.classList.toggle('spectator', m === 'spectator');
  $('#app').querySelectorAll('main, footer, .hud-top, .hotbar-wrap').forEach((el) => { el.style.visibility = m === 'spectator' ? 'hidden' : ''; });
  say(`Ton mode de jeu a été changé en ${names[m]}.`, 'c-gray');
  if (m === 'spectator') say('Mode spectateur : profite du décor. Échap pour revenir.', 'c-yellow');
  if (m === 'creative') unlock('creative');
  return true;
}
export const gamemode = () => mode;

/* ═══ Commandes ═══ */
const COMMANDS = {
  help: { desc: 'Liste des commandes', run() {
    say('--- Commandes disponibles ---', 'c-yellow');
    for (const [name, c] of Object.entries(COMMANDS)) if (!c.alias) say([{ t: `/${name}${c.args ? ' ' + c.args : ''}`, c: 'c-aqua' }, { t: ` : ${c.desc}`, c: 'c-gray' }]);
  } },
  twitch: { desc: 'Ouvrir la chaîne Twitch', run() { window.open(`https://www.twitch.tv/${CONFIG.channel}`, '_blank', 'noopener'); unlock('twitch'); } },
  discord: { desc: 'Copier le pseudo Discord', async run() {
    if (CONFIG.discord.invite) { window.open(CONFIG.discord.invite, '_blank', 'noopener'); return; }
    const ok = await copy(CONFIG.discord.username);
    say(ok ? `Pseudo Discord « ${CONFIG.discord.username} » copié !` : `Pseudo Discord : ${CONFIG.discord.username}`, 'c-green');
    if (ok) unlock('copy_dc');
  } },
  tp: { args: '<section>', opts: Object.keys(SECTIONS), desc: 'Se téléporter (spawn, live, monde, planning, skin, bedrock…)', run([where]) {
    const i = SECTIONS[(where || '').toLowerCase()];
    if (i === undefined) return say('Destination inconnue. Exemple : /tp live', 'c-red');
    select(i, { scroll: true });
    say(`Téléporté vers ${where}.`, 'c-gray');
  } },
  time: { args: 'set <day|sunset|night|auto>', opts: ['set day', 'set sunset', 'set night', 'set auto'], desc: 'Changer l\'heure du décor', run([s, v]) {
    const k = TIME[(v || s || '').toLowerCase()];
    if (!k) return say('Usage : /time set day|sunset|night|auto', 'c-red');
    prefs.set('ambiance', k);
    unlock('ambiance');
    say(`Heure réglée : ${ambianceLabel(k)}.`, 'c-gray');
  } },
  weather: { args: '<clear|rain|snow>', opts: ['clear', 'rain', 'snow'], desc: 'Changer la météo', run([w]) {
    const k = WEATHER[(w || '').toLowerCase()];
    if (!k) return say('Usage : /weather clear|rain|snow', 'c-red');
    prefs.set('ambiance', k);
    unlock('ambiance');
    say(k === 'auto' ? 'Le ciel se dégage.' : `Météo : ${ambianceLabel(k)}.`, 'c-gray');
  } },
  ambiance: { args: '<nom>', opts: AMBIANCES, desc: 'Choisir une ambiance (nether, end, eau…)', run([a]) {
    const k = (a || '').toLowerCase();
    if (!AMBIANCES.includes(k)) return say(`Ambiances : ${AMBIANCES.join(', ')}`, 'c-red');
    prefs.set('ambiance', k);
    unlock('ambiance');
    say(`Ambiance : ${ambianceLabel(k)}.`, 'c-gray');
  } },
  gamemode: { args: '<survival|creative|spectator>', opts: ['survival', 'creative', 'spectator', 'adventure'], desc: 'Changer de mode de jeu', run([m]) {
    if (!setGamemode((m || '').toLowerCase())) say('Usage : /gamemode survival|creative|spectator', 'c-red');
  } },
  gm: { alias: 'gamemode' },
  video: { args: '[numéro]', desc: 'Changer la vidéo de fond', run([n]) {
    const i = parseInt(n, 10);
    switchVideo(Number.isInteger(i) ? i - 1 : undefined);
    unlock('video');
    say(`Vidéo de fond : ${videoInfo().index}.`, 'c-gray');
  } },
  volume: { args: '<0-100>', desc: 'Régler le volume de la vidéo', run([v]) {
    const n = Math.max(0, Math.min(100, parseInt(v, 10)));
    if (!Number.isFinite(n)) return say('Usage : /volume 40', 'c-red');
    prefs.set('volume', n / 100);
    say(`Volume : ${n} %.`, 'c-gray');
  } },
  mute: { desc: 'Couper / remettre le son', run() { emit('toggle-mute'); } },
  f3: { desc: 'Écran de debug', run() { toggleF3(); } },
  advancements: { desc: 'Voir les progrès', run() { openDialog('progress'); } },
  options: { desc: 'Ouvrir les options', run() { openDialog('options'); } },
  summon: { args: 'tnt', opts: ['tnt'], desc: 'Faire apparaître quelque chose…', run([what]) {
    if ((what || '').toLowerCase() === 'tnt') spawnTNT();
    else say('Seule la TNT est disponible. Prudence.', 'c-red');
  } },
  give: { args: '<objet>', opts: Object.keys(GIFTS), desc: 'Se donner un objet', run([what]) {
    const g = GIFTS[(what || '').toLowerCase()];
    if (!g) return say('Objet inconnu. Essaie /give diamond', 'c-red');
    say(`Tu as reçu 64 × [${g}]… dans tes rêves.`, 'c-gray');
    sfx.pop();
  } },
  kill: { desc: 'Mourir (spoiler : on réapparaît)', run() { showDeath('Tu es tombé hors du monde', hudState.level); } },
  seed: { desc: 'Graine du monde', run() {
    let h = 0;
    for (const ch of CONFIG.channel) h = (h * 131 + ch.charCodeAt(0)) | 0;
    say([{ t: 'Graine : ' }, { t: `[${h}]`, c: 'c-green' }]);
  } },
  say: { args: '<message>', desc: 'Dire quelque chose', run(args) { if (args.length) say(`[Toi] ${args.join(' ')}`, 'c-pink'); } },
  clear: { desc: 'Effacer les messages', run() { clearChat(); } },
  title: { desc: 'Retour à l\'écran titre', run() { emit('show-title'); } },
};

function resolve(name) {
  const c = COMMANDS[name];
  return c && c.alias ? COMMANDS[c.alias] : c;
}

function execute(raw) {
  const text = raw.trim();
  if (!text) return;
  if (!text.startsWith('/')) { say(`<Toi> ${text}`); return; }
  const [name, ...args] = text.slice(1).split(/\s+/);
  const c = resolve(name.toLowerCase());
  if (!c) { say(`Commande inconnue : /${name}. Tape /help pour la liste.`, 'c-red'); return; }
  unlock('command');
  c.run(args);
}

/* ═══ Interface ═══ */
const history = [];
let hIndex = -1;
let sugg = [];
let sIndex = 0;

export function openCmd(prefix = '') {
  form.hidden = false;
  document.body.classList.add('cmd-open');
  input.value = prefix;
  hIndex = -1;
  suggest();
  input.focus();
}
function closeCmd() {
  form.hidden = true;
  document.body.classList.remove('cmd-open');
  list.textContent = '';
  input.blur();
}

function suggest() {
  const v = input.value;
  sugg = [];
  if (v.startsWith('/')) {
    const parts = v.slice(1).split(' ');
    if (parts.length === 1) {
      sugg = Object.keys(COMMANDS).filter((n) => n.startsWith(parts[0].toLowerCase())).map((n) => ({ text: '/' + n, hint: COMMANDS[n].args || '' }));
    } else {
      const c = resolve(parts[0].toLowerCase());
      const base = '/' + parts[0] + ' ';
      const rest = parts.slice(1).join(' ').toLowerCase();
      if (c && c.opts) sugg = c.opts.filter((o) => o.startsWith(rest) && o !== rest).map((o) => ({ text: base + o, hint: '' }));
    }
  }
  sugg = sugg.slice(0, 8);
  sIndex = 0;
  render();
}
function render() {
  list.textContent = '';
  sugg.forEach((s, i) => {
    const li = document.createElement('li');
    li.id = `cmd-opt-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sIndex));
    li.textContent = s.text;
    if (s.hint) {
      const h = document.createElement('span');
      h.className = 'hint';
      h.textContent = ' ' + s.hint;
      li.append(h);
    }
    li.addEventListener('mousedown', (e) => { e.preventDefault(); input.value = s.text + ' '; suggest(); input.focus(); });
    list.append(li);
  });
  if (sugg.length) input.setAttribute('aria-activedescendant', `cmd-opt-${sIndex}`);
  else input.removeAttribute('aria-activedescendant');
}

input.addEventListener('input', suggest);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCmd(); return; }
  if (e.key === 'Tab') {
    if (sugg.length) { e.preventDefault(); input.value = sugg[sIndex].text + (sugg.length === 1 ? ' ' : ''); suggest(); }
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const dir = e.key === 'ArrowUp' ? -1 : 1;
    if (sugg.length > 1) { sIndex = (sIndex + dir + sugg.length) % sugg.length; render(); return; }
    if (!history.length) return;
    hIndex = Math.max(-1, Math.min(history.length - 1, hIndex + (dir === -1 ? 1 : -1)));
    input.value = hIndex === -1 ? '' : history[history.length - 1 - hIndex];
  }
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value;
  if (v.trim()) history.push(v.trim());
  closeCmd();
  execute(v);
});
input.addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== input && !form.hidden) closeCmd(); }, 120); });

/* ═══ F3 ═══ */
const f3 = $('#f3');
const f3L = $('#f3-left');
const f3R = $('#f3-right');
let f3on = false;
let raf = 0, timer = 0, frames = 0, lastT = 0, fps = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  frames++;
  if (t - lastT >= 500) { fps = Math.round((frames * 1000) / (t - lastT)); frames = 0; lastT = t; }
}
function lines(el, arr) {
  el.textContent = '';
  for (const l of arr) {
    const p = document.createElement('p');
    if (l === '') p.className = 'gap';
    else p.textContent = l;
    el.append(p);
  }
}
function browser() {
  const b = navigator.userAgentData && navigator.userAgentData.brands;
  if (b) { const x = b.find((v) => !/not.?a.?brand|chromium/i.test(v.brand)) || b[0]; if (x) return `${x.brand} ${x.version}`; }
  const m = navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/(\d+)/);
  return m ? `${m[1].replace('Edg', 'Edge')} ${m[2]}` : 'inconnu';
}
function renderF3() {
  const v = videoInfo();
  const y = hudState.y;
  lines(f3L, [
    `ratnco.netlify.app (Édition Twitch)`,
    `${fps} fps`,
    '',
    `XYZ : 0.500 / ${y.toFixed(3)} / 0.500`,
    `Bloc : 0 ${y} 0`,
    `Couche : ${hudState.layer}`,
    `Biome : twitch:${currentAmbiance() || 'auto'}`,
    `Section : ${hudState.section}`,
    `Mode de jeu : ${mode}`,
    '',
    `Vidéo : ${v.enabled ? (v.failed ? 'indisponible' : `${v.index}/${v.count} ${v.playing ? '(lecture)' : '(pause)'}`) : 'désactivée'}`,
    `Son : ${soundOn() ? `${Math.round(prefs.get('volume') * 100)} %` : 'coupé'}`,
    `Live : ${!live.known ? 'inconnu' : live.live ? `EN LIVE (${live.viewers ?? '?'} spect.)` : 'hors ligne'}`,
    `Progrès : ${unlockedCount()}/${ADV.length}`,
  ]);
  const mem = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} Mo` : 'n/a';
  lines(f3R, [
    `Navigateur : ${browser()}`,
    `Mémoire JS : ${mem}`,
    `Cœurs CPU : ${navigator.hardwareConcurrency || '?'}`,
    '',
    `Écran : ${screen.width}×${screen.height} @${devicePixelRatio}x`,
    `Fenêtre : ${innerWidth}×${innerHeight}`,
    `Connexion : ${navigator.connection ? navigator.connection.effectiveType : '?'}`,
    '',
    `Langue : ${navigator.language}`,
  ]);
}
export function toggleF3(force) {
  f3on = typeof force === 'boolean' ? force : !f3on;
  f3.hidden = !f3on;
  document.body.classList.toggle('f3-open', f3on);
  cancelAnimationFrame(raf);
  clearInterval(timer);
  if (f3on) {
    unlock('f3');
    lastT = performance.now();
    frames = 0;
    raf = requestAnimationFrame(loop);
    renderF3();
    timer = setInterval(renderF3, 250);
  }
}

