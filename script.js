// script.js - Guirnalda: bombillas coloreadas sobre path, revelar UN bono y deshabilitar el resto

// CONFIG
const BONUS_OPTIONS = [
  {label: "150% de bono", value: 150},
  {label: "100% de bono", value: 100},
  {label: "200% de bono", value: 200},
  {label: "50% de bono", value: 50},
  {label: "250% de bono", value: 250},
  {label: "75% de bono", value: 75},
  {label: "300% de bono", value: 300}
];
const COLORS = ['#ffd54f','#ff6b6b','#4cd964','#5ac8fa','#ffcc80','#c7a3ff','#9be7ff','#ffd1dc','#b2f7ef'];
const BULB_COUNT = 9;

// DOM
const stage = document.getElementById('stage');
const garlandSVG = document.getElementById('garlandSVG');
const garlandPath = document.getElementById('garlandPath');
const lightsContainer = document.getElementById('lights');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltip-text');
const tooltipClose = document.getElementById('tooltip-close');
const confettiLayer = document.getElementById('confetti');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreEl = document.getElementById('score');
const roundEl = document.getElementById('round');

let game = {
  score: 0,
  round: 0,
  chosen: false
};

// helpers
function shuffle(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
function hexToRgba(hex, a=0.18){ const c = hex.replace('#',''); const r = parseInt(c.substring(0,2),16); const g = parseInt(c.substring(2,4),16); const b = parseInt(c.substring(4,6),16); return `rgba(${r},${g},${b},${a})`; }

// crear bulbs
function createBulbs(n){
  lightsContainer.innerHTML = '';
  for(let i=0;i<n;i++){
    const b = document.createElement('button');
    b.className = 'bulb';
    b.type = 'button';
    b.setAttribute('role','listitem');
    b.tabIndex = 0;

    const glow = document.createElement('div'); glow.className = 'glow'; b.appendChild(glow);

    const svgWrap = document.createElement('div'); svgWrap.className = 'svg-wrap';
    svgWrap.innerHTML = bulbSVG(COLORS[i % COLORS.length]);
    b.appendChild(svgWrap);

    const cap = document.createElement('div'); cap.className = 'cap'; b.appendChild(cap);

    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') onBulbClick(e) });

    lightsContainer.appendChild(b);
  }

  positionBulbsOnPath();
  window.addEventListener('resize', positionBulbsOnPath);
}

// asignar bonos (sin repetición por ronda)
function assignBonuses(){
  const shuffled = shuffle(BONUS_OPTIONS);
  const assignments = [];
  for(let i=0;i<BULB_COUNT;i++){
    assignments.push(shuffled[i % shuffled.length]);
  }
  const bulbs = document.querySelectorAll('.bulb');
  bulbs.forEach((b, idx) => {
    const pick = assignments[idx];
    const color = COLORS[idx % COLORS.length];
    b.dataset.bonus = pick.label;
    b.dataset.value = pick.value;
    b.style.setProperty('--glow', hexToRgba(color, 0.22));
    b.querySelector('.svg-wrap').innerHTML = bulbSVG(color);
    b.classList.remove('revealed');
    b.disabled = false;
  });
  game.chosen = false;
}

// posicionar sobre el path (sin rotar el botón — rotamos solo el svg interno)
function positionBulbsOnPath(){
  const path = garlandPath;
  const svg = garlandSVG;
  const bulbs = Array.from(document.querySelectorAll('.bulb'));
  if(!path || !svg || bulbs.length === 0) return;

  const pathLength = path.getTotalLength();
  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const vbW = viewBox.width || svgRect.width;
  const vbH = viewBox.height || svgRect.height;
  const scaleX = svgRect.width / vbW;
  const scaleY = svgRect.height / vbH;

  bulbs.forEach((b, i) => {
    const t = (i + 1) / (bulbs.length + 1);
    const L = t * pathLength;
    const pt = path.getPointAtLength(L);

    const delta = Math.max(1, pathLength * 0.002);
    const p1 = path.getPointAtLength(Math.max(0, L - delta));
    const p2 = path.getPointAtLength(Math.min(pathLength, L + delta));
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // normal

    const sign = (i % 2 === 0) ? -1 : 1;
    const offsetPx = 18;
    const offsetX = nx * offsetPx * sign;
    const offsetY = ny * offsetPx * sign;

    const screenX = svgRect.left + (pt.x * scaleX) + offsetX;
    const screenY = svgRect.top + (pt.y * scaleY) + offsetY;

    const containerRect = lightsContainer.getBoundingClientRect();
    const left = screenX - containerRect.left;
    const top = screenY - containerRect.top;

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
    // mantener el botón sin rotación; rotar sólo el svg interno para que parezca alineada
    b.style.transform = `translate(-50%,-50%)`;
    const svgWrap = b.querySelector('.svg-wrap');
    if(svgWrap) svgWrap.style.transform = `translateY(4px) rotate(${-angle}deg)`;
  });
}

// click: revelar UN bono y deshabilitar todos los demás
function onBulbClick(e){
  if(game.chosen) return; // ya escogió una
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;

  btn.classList.add('revealed');
  btn.disabled = true;

  // deshabilitar todas las otras bombillas
  document.querySelectorAll('.bulb').forEach(b => { if(b !== btn) b.disabled = true; });

  const label = btn.dataset.bonus || '¡Sorpresa!';
  const value = Number(btn.dataset.value || 0);

  game.score += value;
  game.chosen = true;
  updateHUD();

  showTooltipOver(btn, `${label} (+${value})`);
  createConfettiAtElement(btn);
}

// tooltip posicionado encima
function showTooltipOver(el, text){
  tooltipText.textContent = text;
  tooltip.hidden = false;
  const stageRect = stage.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const left = (elRect.left + elRect.width/2) - stageRect.left;
  const top = (elRect.top - stageRect.top) - 12;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.transform = 'translate(-50%,-120%)';
  clearTimeout(tooltip._timeout);
  tooltip._timeout = setTimeout(()=> tooltip.hidden = true, 2200);
}
tooltipClose?.addEventListener('click', ()=> tooltip.hidden = true);
tooltip?.addEventListener('pointerdown', (e) => { if(e.target === tooltip) tooltip.hidden = true; });

// confetti simple
function createConfettiAtElement(el){
  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width/2;
  const centerY = rect.top + rect.height/2;
  const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
  const count = 18;
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = (centerX + (Math.random()-0.5)*80) + 'px';
    p.style.top = (centerY + (Math.random()-0.5)*40) + 'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.width = (6 + Math.random()*8) + 'px';
    p.style.height = (8 + Math.random()*10) + 'px';
    p.style.borderRadius = (Math.random()>0.5? '2px' : '50%');
    p.style.animationDelay = (Math.random()*200) + 'ms';
    confettiLayer.appendChild(p);
    setTimeout(()=> p.remove(), 1400 + Math.random()*600);
  }
}

// HUD
function updateHUD(){ scoreEl.textContent = game.score; roundEl.textContent = game.round; }

// start / reset
function startGame(){
  game.round += 1;
  assignBonuses();
  updateHUD();
}
function resetGame(){
  game = {score:0, round:0, chosen:false};
  createBulbs(BULB_COUNT);
  assignBonuses();
  updateHUD();
}

// svg bombilla
function bulbSVG(color){
  return `
    <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path d="M32 2c10 0 18 8 18 18 0 7-3 11-6 15-3 3-5 7-5 12v4H25v-4c0-5-2-9-5-12-3-4-6-8-6-15C14 10 22 2 32 2z" fill="${color}" stroke="#111" stroke-width="2" />
      <path d="M24 28c3 4 7 4 12 0" stroke="#222" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="26" cy="30" r="1.6" fill="#222"/>
      <circle cx="38" cy="30" r="1.6" fill="#222"/>
    </svg>
  `;
}

// EVENTOS UI
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// init
createBulbs(BULB_COUNT);
assignBonuses();
updateHUD();
