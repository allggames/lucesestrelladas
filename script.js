// script.js - Guirnalda: bombillas coloreadas sobre path, revelar bono y juego básico

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
const PICKS_PER_ROUND = 3;

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
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreEl = document.getElementById('score');
const attemptsEl = document.getElementById('attempts');
const roundEl = document.getElementById('round');
const resultModal = document.getElementById('resultModal');
const modalNext = document.getElementById('modal-next');
const modalReset = document.getElementById('modal-reset');
const resultTitle = document.getElementById('result-title');
const resultBody = document.getElementById('result-body');

// Estado del juego
let game = {
  active: false,
  score: 0,
  attemptsLeft: PICKS_PER_ROUND,
  round: 0,
  assignments: []
};

// util: barajar array
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// crear bulbs
function createBulbs(n){
  lightsContainer.innerHTML = '';
  for(let i=0;i<n;i++){
    const b = document.createElement('button');
    b.className = 'bulb';
    b.type = 'button';
    b.setAttribute('role','listitem');
    b.tabIndex = 0;

    const glow = document.createElement('div');
    glow.className = 'glow';
    b.appendChild(glow);

    const svgWrap = document.createElement('div');
    svgWrap.className = 'svg-wrap';
    svgWrap.innerHTML = bulbSVG(COLORS[i % COLORS.length]);
    b.appendChild(svgWrap);

    const cap = document.createElement('div');
    cap.className = 'cap';
    b.appendChild(cap);

    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') onBulbClick(e) });

    lightsContainer.appendChild(b);
  }

  // posicionar en la guirnalda
  positionBulbsOnPath();
  window.addEventListener('resize', positionBulbsOnPath);
}

// asignar bonos únicos por ronda (si hay menos bonos que bombillas, se reutilizan)
function assignBonuses(){
  const shuffledBonuses = shuffle(BONUS_OPTIONS);
  const assignments = [];
  for(let i=0;i<BULB_COUNT;i++){
    assignments.push(shuffledBonuses[i % shuffledBonuses.length]);
  }
  game.assignments = shuffle(assignments);
  const bulbs = document.querySelectorAll('.bulb');
  bulbs.forEach((b, idx) => {
    const a = game.assignments[idx];
    const color = COLORS[idx % COLORS.length];
    b.dataset.bonus = a.label;
    b.dataset.value = a.value;
    b.style.setProperty('--glow', hexToRgba(color, 0.18));
    b.querySelector('.svg-wrap').innerHTML = bulbSVG(color);
    b.classList.remove('revealed');
    b.disabled = false;
  });
}

// posiciona cada bombilla sobre el path y aplica offset perpendicular para alternar arriba/abajo
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
    // distribuir a lo largo del path (evitar extremos exactos)
    const t = (i + 1) / (bulbs.length + 1);
    const L = t * pathLength;
    const pt = path.getPointAtLength(L);

    // aproximar tangente para normal (derivada)
    const delta = Math.max(1, pathLength * 0.002);
    const p1 = path.getPointAtLength(Math.max(0, L - delta));
    const p2 = path.getPointAtLength(Math.min(pathLength, L + delta));
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    // normal vector (perpendicular)
    const nx = -dy / len;
    const ny = dx / len;

    // offset: alternar signo para arriba/abajo y escalar a pixels en pantalla
    const sign = (i % 2 === 0) ? -1 : 1;
    const offsetPx = 18; // cuánto separa de la cuerda
    const offsetX = nx * offsetPx;
    const offsetY = ny * offsetPx;

    // transformar a coordenadas de pantalla
    const screenX = svgRect.left + (pt.x * scaleX) + offsetX;
    const screenY = svgRect.top + (pt.y * scaleY) + offsetY;

    const containerRect = lightsContainer.getBoundingClientRect();
    const left = screenX - containerRect.left;
    const top = screenY - containerRect.top;

    // colocar y rotar ligeramente según la tangente
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    b.style.left = `${left}px`;
    b.style.top = `${top}px`;
    b.style.transform = `translate(-50%,-50%) rotate(${angle}deg)`;
    const svgWrap = b.querySelector('.svg-wrap');
    if(svgWrap) svgWrap.style.transform = `translateY(4px) rotate(${-angle}deg)`;
  });
}

// click en bombilla (revelar bono)
function onBulbClick(e){
  if(!game.active) return;
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;
  if(game.attemptsLeft <= 0) return;

  btn.classList.add('revealed');
  btn.disabled = true;

  const label = btn.dataset.bonus || '¡Sorpresa!';
  const value = Number(btn.dataset.value || 0);

  game.score += value;
  game.attemptsLeft -= 1;
  updateHUD();

  showTooltipOver(btn, `${label} (+${value} pts)`);
  createConfettiAtElement(btn);

  if(game.attemptsLeft <= 0){
    endRound();
  }
}

// tooltip posicionado encima de la bombilla
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
  tooltip._timeout = setTimeout(()=> tooltip.hidden = true, 1800);
}

tooltipClose?.addEventListener('click', ()=> tooltip.hidden = true);
tooltip?.addEventListener('pointerdown', (e) => { if(e.target === tooltip) tooltip.hidden = true; });

// confetti simple alrededor del elemento
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

// finalizar ronda: mostrar modal
function endRound(){
  game.active = false;
  nextBtn.hidden = false;
  startBtn.hidden = false;
  resultTitle.textContent = 'Ronda finalizada';
  resultBody.textContent = `Has sumado puntos esta ronda. Puntuación total: ${game.score} pts.`;
  resultModal.hidden = false;
}

// HUD
function updateHUD(){
  scoreEl.textContent = game.score;
  attemptsEl.textContent = game.attemptsLeft;
  roundEl.textContent = game.round;
}

// iniciar rondas / reiniciar
function startGame(){
  game.round += 1;
  game.attemptsLeft = PICKS_PER_ROUND;
  game.active = true;
  startBtn.hidden = true;
  nextBtn.hidden = true;
  resultModal.hidden = true;
  assignBonuses();
  updateHUD();
}

function resetGame(){
  game = {active:false, score:0, attemptsLeft:PICKS_PER_ROUND, round:0, assignments:[]};
  createBulbs(BULB_COUNT);
  updateHUD();
  tooltip.hidden = true;
  resultModal.hidden = true;
  startBtn.hidden = false;
  nextBtn.hidden = true;
}

function nextRound(){
  game.attemptsLeft = PICKS_PER_ROUND;
  game.active = true;
  resultModal.hidden = true;
  nextBtn.hidden = true;
  startBtn.hidden = true;
  // volver a asignar bonos nuevos
  assignBonuses();
  updateHUD();
}

// helper: svg bombilla
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

// helper hex->rgba
function hexToRgba(hex, alpha=0.18){
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// eventos UI
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
nextBtn.addEventListener('click', nextRound);
modalNext.addEventListener('click', () => { resultModal.hidden = true; nextRound(); });
modalReset.addEventListener('click', () => { resultModal.hidden = true; resetGame(); });

// init
createBulbs(BULB_COUNT);
resetGame();
