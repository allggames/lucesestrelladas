// script.js - Juego interactivo de bombillas con bonos
// Configuración
const BONUS_OPTIONS = [
  {label: "150% de bono", value: 150},
  {label: "100% de bono", value: 100},
  {label: "200% de bono", value: 200},
  {label: "50% de bono", value: 50},
  {label: "250% de bono", value: 250},
  {label: "75% de bono", value: 75},
  {label: "300% de bono", value: 300}
];
const BULB_COUNT = 7;        // cuantas bombillas se muestran
const PICKS_PER_ROUND = 3;   // intentos por ronda

// Elementos DOM
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

let game = {
  active: false,
  score: 0,
  attemptsLeft: PICKS_PER_ROUND,
  round: 0,
  assignments: [], // bonos asignados a bombillas en la ronda
};

// Utilidades
function shuffle(a){
  const arr = a.slice();
  for(let i = arr.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Crea bombillas (DOM)
function createBulbs(n){
  lightsContainer.innerHTML = '';
  for(let i=0;i<n;i++){
    const b = document.createElement('button');
    b.className = 'bulb';
    b.type = 'button';
    b.setAttribute('role','listitem');
    b.tabIndex = 0;

    // glow and svg placeholder
    const glow = document.createElement('div');
    glow.className = 'glow';
    b.appendChild(glow);

    const svgWrap = document.createElement('div');
    svgWrap.className = 'svg-wrap';
    svgWrap.innerHTML = bulbSVGPath('#ffd54f'); // color se puede cambiar por assignment
    b.appendChild(svgWrap);

    const cap = document.createElement('div');
    cap.className = 'cap';
    b.appendChild(cap);

    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') onBulbClick(e) });

    lightsContainer.appendChild(b);
  }
  layoutBulbs();
  window.addEventListener('resize', layoutBulbs);
}

// Asigna bonos a bombillas sin repetición
function assignBonuses(){
  const shuffled = shuffle(BONUS_OPTIONS);
  // toma tantos como bombillas (si hay menos bonos que bombillas, se repetirán)
  const assignments = [];
  for(let i=0;i<BULB_COUNT;i++){
    assignments.push(shuffled[i % shuffled.length]);
  }
  game.assignments = shuffle(assignments); // mezcla la colocación
  // asignar color/glow por índice
  const bulbs = document.querySelectorAll('.bulb');
  const colors = ['#ffd54f','#ff6b6b','#4cd964','#5ac8fa','#ffcc80','#c7a3ff','#9be7ff'];
  bulbs.forEach((b, idx) => {
    b.dataset.bonus = game.assignments[idx].label;
    b.dataset.value = game.assignments[idx].value;
    // color visual
    b.style.setProperty('--glow-color', hexToRgba(colors[idx%colors.length], 0.18));
    b.querySelector('.svg-wrap').innerHTML = bulbSVGPath(colors[idx%colors.length]);
  });
}

// Posiciona bombillas a lo largo de la onda (seno)
function layoutBulbs(){
  const containerRect = lightsContainer.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;
  const bulbs = Array.from(document.querySelectorAll('.bulb'));
  const amplitude = Math.min(70, height * 0.18);
  const frequency = 2 * Math.PI / (Math.max(width,300) / 2);

  bulbs.forEach((st, idx) => {
    const t = idx / Math.max(1, (bulbs.length - 1)); // 0..1
    const x = 24 + t * (width - 48); // padding lateral
    const baseline = height * 0.35;
    const phase = idx * 0.4;
    const y = baseline + amplitude * Math.sin(frequency * x + phase);
    st.style.left = `${x}px`;
    st.style.top = `${y}px`;
  });
}

// Manejo click en bombilla
function onBulbClick(e){
  if(!game.active) return;
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;
  if(game.attemptsLeft <= 0) return;

  btn.classList.add('revealed');
  // mostrar bono
  const label = btn.dataset.bonus || '¡Sorpresa!';
  const value = Number(btn.dataset.value || 0);

  // actualizar puntuación y estados
  game.score += value;
  game.attemptsLeft -= 1;
  updateHUD();

  showTooltipOver(btn, `${label} (+${value} pts)`);
  createConfettiAtElement(btn);

  // deshabilitar botón (pero mantener visual)
  btn.disabled = true;

  // si se acabaron los intentos terminar ronda
  if(game.attemptsLeft <= 0){
    endRound();
  }
}

// Mostrar tooltip posicionado sobre la bombilla
function showTooltipOver(el, text){
  tooltipText.textContent = text;
  tooltip.hidden = false;

  const stageRect = document.getElementById('stage').getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  const left = (elRect.left + elRect.width/2) - stageRect.left;
  const top = (elRect.top - stageRect.top) - 12;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.transform = 'translate(-50%,-120%)';

  // auto ocultar tooltip en 2s
  clearTimeout(tooltip._timeout);
  tooltip._timeout = setTimeout(()=> tooltip.hidden = true, 1800);
}

tooltipClose.addEventListener('click', ()=> tooltip.hidden = true);
tooltip.addEventListener('pointerdown', (e)=> { if(e.target === tooltip) tooltip.hidden = true; });

// Finalizar ronda: mostrar modal con resumen
function endRound(){
  game.active = false;
  nextBtn.hidden = false;
  startBtn.hidden = false;
  resultTitle.textContent = 'Ronda finalizada';
  resultBody.textContent = `Has sumado puntos esta ronda. Puntuación total: ${game.score} pts.`;
  resultModal.hidden = false;
}

// Confetti simple alrededor de un elemento
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
function updateHUD(){
  scoreEl.textContent = game.score;
  attemptsEl.textContent = game.attemptsLeft;
  roundEl.textContent = game.round;
}

// Empezar juego / nueva ronda
function startGame(){
  game.round += 1;
  game.attemptsLeft = PICKS_PER_ROUND;
  game.active = true;
  startBtn.hidden = true;
  nextBtn.hidden = true;
  resultModal.hidden = true;
  // reset visualmente y asignar
  document.querySelectorAll('.bulb').forEach(b=>{
    b.classList.remove('revealed');
    b.disabled = false;
  });
  assignBonuses();
  updateHUD();
}

// Reiniciar todo
function resetGame(){
  game = {active:false, score:0, attemptsLeft:PICKS_PER_ROUND, round:0, assignments:[]};
  createBulbs(BULB_COUNT);
  updateHUD();
  tooltip.hidden = true;
  resultModal.hidden = true;
  startBtn.hidden = false;
  nextBtn.hidden = true;
}

// Siguiente ronda (mantiene puntuación)
function nextRound(){
  game.attemptsLeft = PICKS_PER_ROUND;
  game.active = true;
  resultModal.hidden = true;
  nextBtn.hidden = true;
  startBtn.hidden = true;
  // habilitar bombillas no reveladas si quieres mantener reveladas puedes eliminarlas
  document.querySelectorAll('.bulb').forEach(b=>{
    if(!b.classList.contains('revealed')) b.disabled = false;
    // Si quieres volver a ocultar todo cada ronda descomenta:
    // b.classList.remove('revealed'); b.disabled = false;
  });
  // reasignar nuevos bonos para esta ronda (sin perder puntuación acumulada)
  assignBonuses();
  updateHUD();
}

// SVG de bombilla (se llama con color)
function bulbSVGPath(fillColor){
  return `
    <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path d="M32 2c10 0 18 8 18 18 0 7-3 11-6 15-3 3-5 7-5 12v4H25v-4c0-5-2-9-5-12-3-4-6-8-6-15C14 10 22 2 32 2z" fill="${fillColor}" stroke="#111" stroke-width="2" />
      <path d="M24 28c3 4 7 4 12 0" stroke="#222" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="26" cy="30" r="1.6" fill="#222"/>
      <circle cx="38" cy="30" r="1.6" fill="#222"/>
    </svg>
  `;
}

// helper: convierte hex + alpha
function hexToRgba(hex, alpha){
  const c = hex.replace('#','');
  const r = parseInt(c.substring(0,2),16);
  const g = parseInt(c.substring(2,4),16);
  const b = parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Eventos UI
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
nextBtn.addEventListener('click', nextRound);
modalNext.addEventListener('click', () => { resultModal.hidden = true; nextRound(); });
modalReset.addEventListener('click', () => { resultModal.hidden = true; resetGame(); });

// inicializar
createBulbs(BULB_COUNT);
resetGame();
