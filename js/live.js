/* ═══════════════════════════════════════════════════════════════════
   Live : statut en temps réel (API publique decapi.me, sans clé),
   lecteur Twitch chargé au clic, et chat de la commu au style du jeu
   via le WebSocket public de Twitch en lecture seule (aucun script
   Twitch chargé tant qu'on ne demande pas le chat officiel).
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, emit, say, unlock } from './core.js';
import { setDucked } from './background.js';

const CH = CONFIG.channel;
const API = 'https://decapi.me/twitch/';
export const live = { known: false, live: false, viewers: null, game: '', title: '', uptime: '', followers: null };

async function txt(path, ms = 7000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(API + path, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.text()).trim();
  } finally {
    clearTimeout(timer);
  }
}
const looksWrong = (s) => !s || s.length > 300 || /error|not found|invalid|rate limit|<html|no user/i.test(s);

let wasLive = false;
async function checkLive() {
  try {
    const up = await txt(`uptime/${CH}`);
    if (looksWrong(up)) throw new Error(up);
    const isLive = !/offline/i.test(up);
    Object.assign(live, { known: true, live: isLive, uptime: isLive ? up : '', viewers: null, game: '', title: '' });
    if (isLive) {
      const [v, g, t] = await Promise.allSettled([txt(`viewercount/${CH}`), txt(`game/${CH}`), txt(`title/${CH}`)]);
      const n = v.status === 'fulfilled' ? parseInt(v.value, 10) : NaN;
      live.viewers = Number.isFinite(n) ? n : null;
      live.game = g.status === 'fulfilled' && !looksWrong(g.value) ? g.value : '';
      live.title = t.status === 'fulfilled' && !looksWrong(t.value) ? t.value : '';
    }
  } catch {
    live.known = false;
  }
  if (live.live && !wasLive) say([{ t: '[Serveur] ', c: 'c-yellow' }, { t: `${CH} est en live ! ` }, { t: 'Touche 2 pour regarder.', c: 'c-gray' }]);
  wasLive = live.live;
  emit('live', { ...live });
  renderLive();
}

async function checkFollowers() {
  try {
    const f = await txt(`followcount/${CH}`);
    const n = parseInt(f.replace(/[\s.,  ]/g, ''), 10);
    live.followers = /^[\d\s.,  ]+$/.test(f) && Number.isFinite(n) ? n : null;
  } catch {
    live.followers = null;
  }
  emit('followers', live.followers);
}

/* ═══ Affichage du statut ═══ */
const badge = $('#live-badge');
const player = $('#player');
const pTitle = $('#player-title');
const pDesc = $('#player-desc');
const pThumb = $('#player-thumb');
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);

function renderLive() {
  const txtEl = badge.querySelector('.txt');
  if (!live.known) {
    badge.dataset.state = 'unknown';
    txtEl.textContent = 'Statut du live indisponible';
  } else if (live.live) {
    badge.dataset.state = 'live';
    txtEl.textContent = `EN LIVE${live.viewers !== null ? ` · ${fmt(live.viewers)} spectateur${live.viewers > 1 ? 's' : ''}` : ''}`;
  } else {
    badge.dataset.state = 'offline';
    txtEl.textContent = 'Hors ligne · reviens vite !';
  }
  if (!player.querySelector('iframe')) {
    player.dataset.state = live.live ? 'live' : 'off';
    if (live.live) {
      pTitle.textContent = 'En direct maintenant';
      pDesc.textContent = [live.game, live.title].filter(Boolean).join(' — ') || `${CH} est en live sur Twitch.`;
      pThumb.src = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${encodeURIComponent(CH)}-640x360.jpg?t=${Math.floor(Date.now() / 60000)}`;
      pThumb.hidden = false;
    } else {
      pTitle.textContent = live.known ? 'Hors ligne' : 'Statut inconnu';
      pDesc.textContent = live.known
        ? `${CH} n'est pas en live pour le moment. Suis la chaîne pour être notifié du prochain live !`
        : 'Impossible de vérifier le live. Le lecteur peut quand même être lancé.';
      pThumb.hidden = true;
    }
  }
}
pThumb.addEventListener('error', () => { pThumb.hidden = true; });

function loadPlayer() {
  const host = location.hostname;
  if (!host) { window.open(`https://www.twitch.tv/${CH}`, '_blank', 'noopener'); return; }
  const f = document.createElement('iframe');
  f.src = `https://player.twitch.tv/?channel=${encodeURIComponent(CH)}&parent=${encodeURIComponent(host)}&autoplay=true`;
  f.title = `Lecteur du live Twitch de ${CH}`;
  f.allow = 'autoplay; fullscreen; picture-in-picture';
  player.replaceChildren(f);
  setDucked(true);
  unlock('live');
}
$('#player-load').addEventListener('click', loadPlayer);

/* ═══ Chat de la commu (lecture seule, style du jeu) ═══ */
const log = $('#chat-log');
const status = $('#chat-status');
const MAX = 100;
const PALETTE = ['#55ffff', '#55ff55', '#ffaa00', '#ff55ff', '#ffff55', '#ff7777', '#8fa8ff', '#5fd7af'];

function setStatus(text, state) {
  status.textContent = text;
  status.dataset.state = state;
}
function sys(text, err = false) {
  const li = document.createElement('li');
  li.className = 'sys' + (err ? ' err' : '');
  li.textContent = text;
  push(li);
}
function push(li) {
  const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.append(li);
  while (log.children.length > MAX) log.firstElementChild.remove();
  if (stick) log.scrollTop = log.scrollHeight;
}
function nameColor(hex, name) {
  if (/^#[0-9a-f]{6}$/i.test(hex || '')) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (l < 120) { const k = 0.55; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function unescapeTag(v) {
  return v.replace(/\\(s|:|\\|r|n)/g, (_, c) => ({ s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' }[c]));
}
function parse(line) {
  let rest = line;
  const tags = {};
  if (rest[0] === '@') {
    const i = rest.indexOf(' ');
    for (const kv of rest.slice(1, i).split(';')) {
      const j = kv.indexOf('=');
      tags[kv.slice(0, j)] = unescapeTag(kv.slice(j + 1));
    }
    rest = rest.slice(i + 1);
  }
  let prefix = '';
  if (rest[0] === ':') {
    const i = rest.indexOf(' ');
    prefix = rest.slice(1, i);
    rest = rest.slice(i + 1);
  }
  let trailing = '';
  const ti = rest.indexOf(' :');
  if (ti >= 0) { trailing = rest.slice(ti + 2); rest = rest.slice(0, ti); }
  const [command, ...params] = rest.split(' ');
  return { tags, prefix, command, params, trailing };
}
function renderText(el, text, emotes) {
  const chars = Array.from(text);
  const ranges = [];
  if (emotes) {
    for (const part of emotes.split('/')) {
      const [id, pos] = part.split(':');
      if (!pos) continue;
      for (const r of pos.split(',')) {
        const [a, b] = r.split('-').map(Number);
        if (Number.isInteger(a) && Number.isInteger(b)) ranges.push({ a, b, id });
      }
    }
  }
  ranges.sort((x, y) => x.a - y.a);
  let i = 0;
  for (const r of ranges) {
    if (r.a < i || r.b >= chars.length) continue;
    if (r.a > i) el.append(chars.slice(i, r.a).join(''));
    const img = document.createElement('img');
    img.className = 'emote';
    img.alt = chars.slice(r.a, r.b + 1).join('');
    img.width = 28; img.height = 28;
    img.loading = 'lazy';
    img.src = `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(r.id)}/default/dark/1.0`;
    el.append(img);
    i = r.b + 1;
  }
  if (i < chars.length) el.append(chars.slice(i).join(''));
}
const RANKS = [
  ['broadcaster', 'STREAMER', '#ff5555'],
  ['moderator', 'MODO', '#55ff55'],
  ['vip', 'VIP', '#ff55ff'],
  ['subscriber', 'SUB', '#55ffff'],
];
function message(m) {
  const user = m.prefix.split('!')[0];
  const display = m.tags['display-name'] || user;
  let text = m.trailing;
  let action = false;
  if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) { text = text.slice(8, -1); action = true; }
  const li = document.createElement('li');
  li.dataset.user = user;
  if (m.tags.id) li.dataset.id = m.tags.id;
  const badges = m.tags.badges || '';
  const rank = RANKS.find(([k]) => badges.includes(k + '/'));
  if (rank) {
    const r = document.createElement('span');
    r.className = 'rank';
    r.style.color = rank[2];
    r.textContent = `[${rank[1]}]`;
    li.append(r);
  }
  const name = document.createElement('span');
  name.style.color = nameColor(m.tags.color, display);
  name.textContent = action ? `* ${display} ` : `<${display}> `;
  const body = document.createElement('span');
  if (action) { body.className = 'me'; body.style.color = name.style.color; }
  renderText(body, text, m.tags.emotes);
  li.append(name, body);
  push(li);
}

let ws = null;
let retry = 0;
let started = false;
let joined = false;
function connect() {
  setStatus('connexion…', 'idle');
  try {
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  } catch {
    fail();
    return;
  }
  const guard = setTimeout(() => { if (!joined) { try { ws.close(); } catch { /* rien */ } } }, 9000);
  ws.addEventListener('open', () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    ws.send('PASS SCHMOOPIIE');
    ws.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
    ws.send(`JOIN #${CH.toLowerCase()}`);
  });
  ws.addEventListener('message', (ev) => {
    for (const line of String(ev.data).split('\r\n')) {
      if (!line) continue;
      if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
      const m = parse(line);
      switch (m.command) {
        case 'ROOMSTATE':
          if (!joined) {
            joined = true;
            retry = 0;
            clearTimeout(guard);
            setStatus('connecté', 'ok');
            sys(`[Serveur] Connecté au chat de ${CH}. Les messages arrivent ici en direct.`);
          }
          break;
        case 'PRIVMSG': message(m); break;
        case 'CLEARCHAT':
          if (m.trailing) log.querySelectorAll(`li[data-user="${CSS.escape(m.trailing)}"]`).forEach((li) => li.remove());
          else log.textContent = '';
          break;
        case 'CLEARMSG':
          if (m.tags['target-msg-id']) log.querySelectorAll(`li[data-id="${CSS.escape(m.tags['target-msg-id'])}"]`).forEach((li) => li.remove());
          break;
        case 'USERNOTICE':
          if (m.tags['system-msg']) sys(m.tags['system-msg'] + (m.trailing ? ` — ${m.trailing}` : ''));
          break;
        case 'RECONNECT':
          ws.close();
          break;
        default: break;
      }
    }
  });
  ws.addEventListener('close', () => {
    clearTimeout(guard);
    const had = joined;
    joined = false;
    if (had) sys('[Serveur] Connexion perdue, reconnexion…', true);
    fail();
  });
}
function fail() {
  retry++;
  if (retry > 5) {
    setStatus('indisponible', 'error');
    sys('[Serveur] Impossible de joindre le chat. Utilise « Chat officiel » ou ouvre Twitch.', true);
    return;
  }
  setStatus('reconnexion…', 'error');
  setTimeout(connect, Math.min(30000, 2000 * 2 ** (retry - 1)));
}

/* Démarre le chat seulement quand il devient visible */
const chatBox = $('#mcchat');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && !started) {
      started = true;
      io.disconnect();
      connect();
      unlock('chat');
    }
  }, { rootMargin: '200px' });
  io.observe(chatBox);
} else {
  started = true;
  connect();
}

/* Chat officiel Twitch (pour écrire) — chargé seulement à la demande */
const toggle = $('#chat-toggle');
const official = $('#chat-official');
toggle.addEventListener('click', () => {
  const show = official.hidden;
  if (show && !official.firstChild) {
    const host = location.hostname;
    if (!host) { window.open(`https://www.twitch.tv/popout/${CH}/chat`, '_blank', 'noopener'); return; }
    const f = document.createElement('iframe');
    f.src = `https://www.twitch.tv/embed/${encodeURIComponent(CH)}/chat?darkpopout&parent=${encodeURIComponent(host)}`;
    f.title = `Chat Twitch officiel de ${CH}`;
    official.append(f);
  }
  official.hidden = !show;
  log.hidden = show;
  toggle.setAttribute('aria-pressed', String(show));
  toggle.textContent = show ? 'Chat Minecraft' : 'Chat officiel';
});

/* ═══ Démarrage ═══ */
export function initLive() {
  checkLive();
  checkFollowers();
  setInterval(() => { if (!document.hidden) checkLive(); }, 120000);
  setInterval(() => { if (!document.hidden) checkFollowers(); }, 600000);
}
