/* ═══════════════════════════════════════════════════════════════════
   Petits plaisirs : bloc d'herbe à miner, TNT (Konami code ou
   /summon tnt), clics sur le logo.
═══════════════════════════════════════════════════════════════════ */
import { $, sfx, unlock, reducedMotion, say } from './core.js';

const layer = $('#fx-layer');

/* Éclats de pixels */
export function burst(x, y, colors, n = 14, { size = 8, spread = 120, t = 0.8, cls = 'bit' } = {}) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span');
    b.className = cls;
    const a = Math.random() * Math.PI * 2;
    const r = spread * (0.35 + Math.random() * 0.65);
    b.style.left = `${x - size / 2}px`;
    b.style.top = `${y - size / 2}px`;
    b.style.width = b.style.height = `${size}px`;
    b.style.setProperty('--c', colors[i % colors.length]);
    b.style.setProperty('--dx', `${Math.cos(a) * r}px`);
    b.style.setProperty('--dy', `${Math.sin(a) * r + spread * 0.5}px`);
    b.style.setProperty('--t', `${t * (0.7 + Math.random() * 0.6)}s`);
    b.addEventListener('animationend', () => b.remove(), { once: true });
    layer.append(b);
  }
}

/* ═══ Bloc à miner (maintenir = miner, comme en jeu) ═══ */
(function mining() {
  const btn = $('#mine-block');
  const img = $('#mine-img');
  if (!btn) return;
  let stage = 0;
  let hold = 0;
  let broken = false;
  const setStage = (s) => {
    stage = s;
    img.style.backgroundPositionX = `${-96 * stage}px`;
    btn.setAttribute('aria-label', broken
      ? 'Bloc d\'herbe miné, il réapparaît bientôt'
      : `Bloc d'herbe : clique ou maintiens pour le miner (${stage * 10} %)`);
  };
  const hit = (n = 1) => {
    if (broken) return;
    setStage(Math.min(10, stage + n));
    sfx.hit();
    if (stage >= 10) breakIt();
  };
  const stop = () => { clearInterval(hold); hold = 0; };
  function breakIt() {
    stop();
    broken = true;
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    burst(cx, cy, ['#5d9b3c', '#866043', '#79553a', '#4f8833', '#5d412d'], 18);
    sfx.brk();
    btn.classList.add('broken');
    setStage(10);
    drop(cx, cy);
    unlock('mine');
    setTimeout(() => {
      broken = false;
      setStage(0);
      btn.classList.remove('broken');
      btn.classList.add('respawn');
      setTimeout(() => btn.classList.remove('respawn'), 400);
    }, 2600);
  }
  /* L'objet tombe puis file vers la case 1 de la barre rapide */
  function drop(x, y) {
    if (reducedMotion()) return;
    const d = document.createElement('span');
    d.className = 'drop';
    d.style.left = `${x - 16}px`;
    d.style.top = `${y - 16}px`;
    layer.append(d);
    const slot = document.querySelector('.hb-slot');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (slot) {
        const s = slot.getBoundingClientRect();
        d.style.transform = `translate(${s.left + s.width / 2 - x}px, ${s.top + s.height / 2 - y}px) scale(.6)`;
      }
      d.style.opacity = '0.2';
    }));
    d.addEventListener('transitionend', () => { d.remove(); sfx.pop(); }, { once: true });
  }
  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    hit();
    stop();
    hold = setInterval(hit, 110);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => btn.addEventListener(t, stop));
  btn.addEventListener('click', (e) => { if (e.detail === 0) hit(2); });  // clavier
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  setStage(0);
})();

/* ═══ TNT ═══ */
let tntBusy = false;
export function spawnTNT() {
  if (tntBusy) return;
  tntBusy = true;
  const t = document.createElement('div');
  t.className = 'tnt lit';
  layer.append(t);
  sfx.fuse();
  setTimeout(() => t.classList.add('swell'), 1300);
  setTimeout(() => {
    const r = t.getBoundingClientRect();
    t.remove();
    explode(r.left + r.width / 2, r.top + r.height / 2);
    tntBusy = false;
  }, 1650);
}
function explode(x, y) {
  sfx.boom();
  unlock('tnt');
  if (reducedMotion()) { say('BOUM !', 'c-red'); return; }
  const f = document.createElement('div');
  f.className = 'flash';
  f.addEventListener('animationend', () => f.remove(), { once: true });
  layer.append(f);
  burst(x, y, ['#e8e8e8', '#bdbdbd', '#8a8a8a', '#ffd84a', '#ff7a12'], 26, { size: 20, spread: 260, t: 1.1, cls: 'smoke' });
  const app = $('#app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
  setTimeout(() => app.classList.remove('shake'), 600);
}

/* Konami code : ↑ ↑ ↓ ↓ ← → ← → B A */
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let k = 0;
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  const key = e.key.toLowerCase();
  k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
  if (k === KONAMI.length) { k = 0; spawnTNT(); }
});

/* Dix clics sur le logo */
(function logoClicks() {
  const h = $('.hero-name');
  if (!h) return;
  let n = 0;
  h.addEventListener('click', () => {
    n++;
    sfx.pop();
    if (n === 10) unlock('fan');
  });
})();
