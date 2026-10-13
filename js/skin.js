/* ═══════════════════════════════════════════════════════════════════
   Skin 3D en CSS pur (aucune bibliothèque 3D) : 6 pavés + calques,
   chaque face découpe la texture 64×64 du skin. Rotation à la souris,
   au doigt ou au clavier, petite inertie, pause hors écran.
═══════════════════════════════════════════════════════════════════ */
import { CONFIG } from './config.js';
import { $, unlock, reducedMotion, sfx } from './core.js';

const stage = $('#skin-stage');
const S = (n) => `calc(${n} * var(--S))`;

function parts(slim) {
  const aw = slim ? 3 : 4;
  return [
    { cls: 'mc-head',  x: 4,      y: 0,  w: 8,  h: 8,  d: 8, uv: [0, 0],   ov: [32, 0],  os: 1.125 },
    { cls: 'mc-body',  x: 4,      y: 8,  w: 8,  h: 12, d: 4, uv: [16, 16], ov: [16, 32], os: 1.06 },
    { cls: 'mc-arm-r', x: 4 - aw, y: 8,  w: aw, h: 12, d: 4, uv: [40, 16], ov: [40, 32], os: 1.06 },
    { cls: 'mc-arm-l', x: 12,     y: 8,  w: aw, h: 12, d: 4, uv: [32, 48], ov: [48, 48], os: 1.06 },
    { cls: 'mc-leg-r', x: 4,      y: 20, w: 4,  h: 12, d: 4, uv: [0, 16],  ov: [0, 32],  os: 1.06 },
    { cls: 'mc-leg-l', x: 8,      y: 20, w: 4,  h: 12, d: 4, uv: [16, 48], ov: [0, 48],  os: 1.06 },
  ];
}

function face(u, v, fw, fh, left, top, transform) {
  const f = document.createElement('div');
  f.className = 'mc-face';
  const st = f.style;
  st.width = S(fw);
  st.height = S(fh);
  st.left = S(left);
  st.top = S(top);
  st.backgroundPosition = `${S(-u)} ${S(-v)}`;
  st.transform = transform;
  return f;
}

function box({ w, h, d }, [u, v], scale) {
  const b = document.createElement('div');
  b.className = 'mc-box';
  b.style.width = S(w);
  b.style.height = S(h);
  if (scale !== 1) b.style.transform = `scale3d(${scale}, ${scale}, ${scale})`;
  b.append(
    face(u + d, v + d, w, h, 0, 0, `translateZ(${S(d / 2)})`),
    face(u + 2 * d + w, v + d, w, h, 0, 0, `rotateY(180deg) translateZ(${S(d / 2)})`),
    face(u, v + d, d, h, (w - d) / 2, 0, `rotateY(-90deg) translateZ(${S(w / 2)})`),
    face(u + d + w, v + d, d, h, (w - d) / 2, 0, `rotateY(90deg) translateZ(${S(w / 2)})`),
    face(u + d, v, w, d, 0, (h - d) / 2, `rotateX(90deg) translateZ(${S(h / 2)})`),
    face(u + d + w, v, w, d, 0, (h - d) / 2, `rotateX(-90deg) translateZ(${S(h / 2)})`),
  );
  return b;
}

function build(src) {
  const player = document.createElement('div');
  player.className = 'mc-player';
  player.style.setProperty('--skin', `url("${new URL(src, location.href).href}")`);
  for (const p of parts(CONFIG.skinSlim)) {
    const el = document.createElement('div');
    el.className = `mc-part ${p.cls}`;
    el.style.left = S(p.x);
    el.style.top = S(p.y);
    el.style.width = S(p.w);
    el.style.height = S(p.h);
    el.append(box(p, p.uv, 1), box(p, p.ov, p.os));
    player.append(el);
  }
  return player;
}

function skinUrl() {
  return new Promise((resolve) => {
    const local = 'assets/img/skin.png';
    const name = (CONFIG.minecraftUsername || '').trim();
    if (!name) { resolve(local); return; }
    const url = `https://mc-heads.net/skin/${encodeURIComponent(name)}`;
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth === 64 && img.naturalHeight === 64 ? url : local);
    img.onerror = () => resolve(local);
    img.src = url;
  });
}

async function init() {
  const player = build(await skinUrl());
  stage.prepend(player);
  let ry = 30;
  let vel = 0;
  let dragging = false;
  let lastX = 0;
  let turned = 0;
  let visible = true;
  let raf = 0;
  let idle = 0;
  const apply = () => { player.style.transform = `rotateX(-10deg) rotateY(${ry}deg)`; };
  const track = (delta) => {
    turned += Math.abs(delta);
    if (turned >= 360) unlock('skin');
  };
  const tick = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    if (!dragging) {
      if (Math.abs(vel) > 0.05) { ry += vel; track(vel); vel *= 0.94; }
      else if (!reducedMotion() && performance.now() - idle > 2500) ry += 0.3;
    }
    apply();
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(tick); };

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    vel = 0;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) * 0.6;
    lastX = e.clientX;
    ry += dx;
    vel = dx;
    track(dx);
    idle = performance.now();
    apply();
  });
  const end = () => { dragging = false; idle = performance.now(); start(); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = e.key === 'ArrowLeft' ? -20 : 20;
      ry += d;
      track(d);
      idle = performance.now();
      apply();
    }
  });

  const walk = $('#skin-walk');
  walk.addEventListener('click', () => {
    const on = !player.classList.contains('walking');
    player.classList.toggle('walking', on);
    walk.setAttribute('aria-pressed', String(on));
    walk.textContent = on ? 'S\'arrêter' : 'Marcher';
    sfx.click();
  });
  $('#skin-wave').addEventListener('click', () => {
    player.classList.remove('waving');
    void player.offsetWidth;
    player.classList.add('waving');
    setTimeout(() => player.classList.remove('waving'), 2200);
    sfx.click();
  });
  $('#skin-reset').addEventListener('click', () => { ry = 30; vel = 0; idle = performance.now(); apply(); sfx.click(); });

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  apply();
  start();
}

/* Construction différée : seulement quand la section approche */
if (stage) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); init(); }
    }, { rootMargin: '400px' });
    io.observe(stage);
  } else {
    init();
  }
}
