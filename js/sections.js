/* ═══════════════════════════════════════════════════════════════════
   Sections pilotées par la config : phrases animées, planning,
   réseaux, serveur, clips, statistiques, copies et apparitions.
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, $$, on, say, copy, unlock, icon, reducedMotion } from './core.js';

/* ═══ Apparition au scroll ═══ */
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.08 });
  $$('.reveal').forEach((el) => io.observe(el));
}

/* ═══ Photo de profil : tête pixel si l'image distante ne charge pas ═══ */
(function avatar() {
  const img = $('#avatar');
  if (!img) return;
  const fallback = () => { if (img.dataset.fallback && !img.src.endsWith(img.dataset.fallback)) { img.src = img.dataset.fallback; img.classList.add('px'); } };
  if (img.complete && img.naturalWidth === 0) fallback();
  img.addEventListener('error', fallback);
})();

/* ═══ Phrases sous le logo ═══ */
(function typer() {
  const el = $('#typer');
  const lines = CONFIG.typer;
  if (!el || !lines.length) return;
  el.textContent = lines[0];
  if (reducedMotion()) return;
  let li = 0, ci = lines[0].length, del = true;
  const tick = () => {
    if (reducedMotion()) { el.textContent = lines[0]; return; }
    const cur = lines[li];
    if (del) {
      el.textContent = cur.slice(0, --ci);
      if (ci <= 0) { del = false; li = (li + 1) % lines.length; }
      setTimeout(tick, 34);
    } else {
      el.textContent = lines[li].slice(0, ++ci);
      if (ci >= lines[li].length) { del = true; setTimeout(tick, 2600); return; }
      setTimeout(tick, 70);
    }
  };
  setTimeout(tick, 3200);
})();

/* ═══ Copier / suivre les liens ═══ */
const twitchUrl = `https://www.twitch.tv/${CONFIG.channel}`;
document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-copy]');
  if (c) {
    const what = c.dataset.copy;
    if (what === 'discord') {
      if (CONFIG.discord.invite) { window.open(CONFIG.discord.invite, '_blank', 'noopener'); unlock('copy_dc'); return; }
      const ok = await copy(CONFIG.discord.username);
      say(ok ? [{ t: 'Pseudo Discord ' }, { t: `« ${CONFIG.discord.username} »`, c: 'c-aqua' }, { t: ' copié !' }] : 'Copie impossible : le pseudo est « ' + CONFIG.discord.username + ' ».', ok ? 'c-green' : 'c-red');
      if (ok) unlock('copy_dc');
    } else if (what === 'twitch') {
      const ok = await copy(twitchUrl);
      say(ok ? [{ t: 'Lien Twitch copié : ' }, { t: twitchUrl, c: 'c-aqua' }] : 'Copie impossible.', ok ? '' : 'c-red');
      if (ok) unlock('copy_tw');
    } else if (what === 'server') {
      const ok = await copy(CONFIG.server.ip);
      say(ok ? [{ t: 'IP du serveur copiée : ' }, { t: CONFIG.server.ip, c: 'c-aqua' }] : 'Copie impossible.', ok ? '' : 'c-red');
    }
    return;
  }
  const t = e.target.closest('[data-track]');
  if (t) unlock(t.dataset.track === 'partner' ? 'partner' : 'twitch');
});

/* ═══ Réseaux supplémentaires ═══ */
(function socials() {
  const grid = $('#inv-grid');
  const items = CONFIG.socials.filter((s) => s.url);
  if (CONFIG.discord.invite) items.unshift({ name: 'Serveur Discord', icon: 'discord', url: CONFIG.discord.invite });
  for (const s of items) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'inv-item';
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const slot = document.createElement('span');
    slot.className = 'slot';
    slot.append(icon(s.icon || 'map'));
    const txt = document.createElement('span');
    txt.className = 'inv-txt';
    const n = document.createElement('span');
    n.className = 'inv-name';
    n.textContent = s.name;
    const sub = document.createElement('span');
    sub.className = 'inv-sub';
    try { const u = new URL(s.url); sub.textContent = (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, ''); } catch { sub.textContent = s.url; }
    txt.append(n, sub);
    const act = document.createElement('span');
    act.className = 'inv-act';
    act.setAttribute('aria-hidden', 'true');
    act.textContent = '↗';
    a.append(slot, txt, act);
    li.append(a);
    grid.append(li);
  }
})();

/* ═══ Planning ═══ */
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
function zonedNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CONFIG.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { day, min: +get('hour') * 60 + +get('minute') };
}
const toMin = (s) => { const [h, m] = String(s || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };

(function planning() {
  const sched = CONFIG.schedule.filter((s) => s.day >= 1 && s.day <= 7 && s.start);
  if (!sched.length) return;
  $('#planning-empty').hidden = true;
  const week = $('#week');
  const cd = $('#countdown');
  week.hidden = false;
  cd.hidden = false;
  const now = zonedNow();
  for (let d = 1; d <= 7; d++) {
    const items = sched.filter((s) => s.day === d);
    const li = document.createElement('li');
    li.className = 'day' + (items.length ? ' on' : '') + (d === now.day ? ' today' : '');
    const name = document.createElement('span');
    name.className = 'day-name';
    name.textContent = DAYS[d - 1].slice(0, 3);
    const slot = document.createElement('span');
    slot.className = 'slot';
    if (items.length) slot.append(icon('clock'));
    const time = document.createElement('span');
    time.className = 'day-time';
    time.textContent = items.length ? items.map((s) => `${s.start}${s.end ? '–' + s.end : ''}${s.title ? ' ' + s.title : ''}`).join(' · ') : 'Repos';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = DAYS[d - 1] + ' : ';
    li.append(sr, name, slot, time);
    week.append(li);
  }
  const update = () => {
    const n = zonedNow();
    let best = null;
    for (const s of sched) {
      const start = toMin(s.start);
      const end = s.end ? toMin(s.end) : start + 180;
      const dayDelta = (s.day - n.day + 7) % 7;
      if (dayDelta === 0 && n.min >= start && n.min < end) { best = { s, delta: 0 }; break; }
      let delta = dayDelta * 1440 + start - n.min;
      if (delta <= 0) delta += 7 * 1440;
      if (!best || delta < best.delta) best = { s, delta };
    }
    if (!best) return;
    if (best.delta === 0) { cd.textContent = `Live prévu en ce moment : ${best.s.title || DAYS[best.s.day - 1]} !`; return; }
    const d = Math.floor(best.delta / 1440), h = Math.floor((best.delta % 1440) / 60), m = best.delta % 60;
    const parts = [d && `${d} j`, (d || h) && `${h} h`, `${m} min`].filter(Boolean).join(' ');
    cd.textContent = `Prochain live : ${DAYS[best.s.day - 1]} ${best.s.start}${best.s.title ? ' — ' + best.s.title : ''} (dans ${parts})`;
  };
  update();
  setInterval(update, 30000);
})();

/* ═══ Serveur Minecraft ═══ */
(function server() {
  const ip = CONFIG.server.ip;
  if (!ip) return;
  const sec = $('#serveur');
  sec.hidden = false;
  $('#server-ip').textContent = ip;
  $('#server-name').textContent = CONFIG.server.name || ip;
  const card = $('#server-card');
  const players = $('#server-players');
  const motd = $('#server-motd');
  const refresh = async () => {
    try {
      const r = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`);
      const j = await r.json();
      if (j.online) {
        card.dataset.state = 'on';
        players.textContent = `${j.players ? j.players.online : '?'}/${j.players ? j.players.max : '?'} joueurs`;
        motd.textContent = (j.motd && j.motd.clean ? j.motd.clean.join(' ') : '') || (j.version ? `Version ${j.version}` : 'En ligne');
      } else {
        card.dataset.state = 'off';
        players.textContent = 'Hors ligne';
        motd.textContent = 'Le serveur ne répond pas pour le moment.';
      }
    } catch {
      players.textContent = '?';
      motd.textContent = 'Statut indisponible.';
    }
  };
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 120000);
})();

/* ═══ Best-of ═══ */
(function clips() {
  const list = CONFIG.clips.filter((c) => c.url);
  if (!list.length) return;
  $('#clips').hidden = false;
  const ul = $('#clips-list');
  for (const c of list) {
    const li = document.createElement('li');
    li.className = 'clip';
    const a = document.createElement('a');
    a.href = c.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const yt = c.url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
    const thumb = c.thumb || (yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : '');
    if (thumb) {
      const img = document.createElement('img');
      img.className = 'clip-img';
      img.src = thumb;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      a.append(img);
    } else {
      const ph = document.createElement('span');
      ph.className = 'clip-img';
      ph.style.display = 'grid';
      ph.style.placeItems = 'center';
      ph.append(icon('painting', 'ico-xl'));
      a.append(ph);
    }
    const t = document.createElement('span');
    t.className = 'clip-title';
    t.textContent = c.title || 'Clip';
    a.append(t);
    li.append(a);
    ul.append(li);
  }
})();

/* ═══ Statistiques en direct ═══ */
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
const uptimeFr = (s) => s
  .replace(/(\d+) days?/, '$1 j').replace(/(\d+) hours?/, '$1 h').replace(/(\d+) minutes?/, '$1 min')
  .replace(/,?\s*\d+ seconds?/, '').replace(/,/g, '').trim();
on('followers', (n) => { $('#stat-followers').textContent = n === null ? 'indisponible' : fmt(n); });
on('live', (l) => {
  const st = $('#stat-status');
  st.textContent = !l.known ? 'inconnu' : l.live ? `EN LIVE${l.uptime && uptimeFr(l.uptime) ? ' depuis ' + uptimeFr(l.uptime) : ''}` : 'Hors ligne';
  st.className = l.live ? 'live' : '';
  $('#stat-game-row').hidden = !(l.live && l.game);
  $('#stat-game').textContent = l.game || '—';
  $('#stat-viewers-row').hidden = !(l.live && l.viewers !== null);
  $('#stat-viewers').textContent = l.viewers !== null ? fmt(l.viewers) : '—';
});
