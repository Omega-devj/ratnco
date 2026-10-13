/* ═══════════════════════════════════════════════════════════════════
   HUD : barre rapide (touches 1–9), barre d'XP liée au scroll,
   coordonnées « Y » (on creuse en descendant) et section active.
   Un seul écouteur de scroll, regroupé par requestAnimationFrame.
═══════════════════════════════════════════════════════════════════ */
import { $, $$, sfx, unlock, reducedMotion } from './core.js';
import { setDepth } from './background.js';

const slots = $$('.hb-slot');
const itemName = $('#item-name');
const xpFill = $('#xp-fill');
const xpLevel = $('#xp-level');
const coordsY = $('#coords-y');
const coordsLayer = $('#coords-layer');

export const hudState = { y: 64, p: 0, level: 0, layer: 'Bloc d\'herbe', section: 'Accueil' };

const layerOf = (y) => {
  if (y >= 58) return 'Bloc d\'herbe';
  if (y >= 44) return 'Terre';
  if (y >= 0) return 'Roche';
  if (y > -56) return 'Ardoise des abîmes';
  return 'Bedrock';
};

let selected = -1;
let nameTimer = 0;
function showName(n) {
  itemName.textContent = n;
  itemName.classList.add('show');
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => itemName.classList.remove('show'), 1500);
}

export function select(i, { scroll = false, quiet = false } = {}) {
  if (i < 0 || i >= slots.length) return;
  if (i !== selected) {
    slots.forEach((s, j) => {
      if (j === i) s.setAttribute('aria-current', 'true');
      else s.removeAttribute('aria-current');
    });
    selected = i;
    hudState.section = slots[i].dataset.name;
    if (!quiet) showName(slots[i].dataset.name);
  }
  if (scroll) {
    const target = document.querySelector(slots[i].getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
    sfx.click();
  }
}

slots.forEach((s, i) => s.addEventListener('click', () => { sfx.click(); select(i); }));

/* Section active (scrollspy sans calcul de layout au scroll) */
const targets = new Map();
slots.forEach((s, i) => {
  const el = document.querySelector(s.getAttribute('href'));
  if (el) targets.set(el, i);
});
let firstSpy = true;
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { select(targets.get(e.target), { quiet: firstSpy }); firstSpy = false; }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach((_, el) => io.observe(el));
}
select(0, { quiet: true });

/* Scroll → XP, profondeur, coordonnées */
let ticking = false;
let lastLevel = 0;
let maxLevel = 0;
let lastY = null;
function update() {
  ticking = false;
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  hudState.p = p;
  xpFill.style.transform = `scaleX(${p.toFixed(4)})`;
  const level = Math.round(p * 30);
  if (level !== lastLevel) {
    xpLevel.textContent = level;
    if (level > maxLevel) {
      maxLevel = level;
      if (level % 10 === 0) sfx.levelup(); else sfx.xp();
    }
    lastLevel = level;
    hudState.level = level;
  }
  const y = Math.round(64 - p * 128);
  if (y !== lastY) {
    lastY = y;
    hudState.y = y;
    hudState.layer = layerOf(y);
    coordsY.textContent = `Y : ${y}`;
    coordsLayer.textContent = hudState.layer;
  }
  setDepth(p);
  if (p > 0.985) unlock('bedrock');
}
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });
update();
