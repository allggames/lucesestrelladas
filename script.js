// script.js - Guirnalda: bombillas arcoíris sobre el path, bono por bombilla y modal

const BONUS_OPTIONS = [
  "150% de bono",
  "100% de bono",
  "200% de bono",
  "50% de bono",
  "250% de bono",
  "75% de bono",
  "300% de bono",
  "30% de bono",
  "10% de bono"
];
const RAINBOW = ['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#8e24aa','#ff4081','#ffd54f','#81d4fa'];
const BULB_COUNT = 9;

const stage = document.getElementById('stage');
const garlandSVG = document.getElementById('garlandSVG');
const garlandPath = document.getElementById('garlandPath');
const lightsContainer = document.getElementById('lights');
const modal = document.getElementById('modal');
const modalBonus = document.getElementById('modal-bonus');
const modalOk = document.getElementById('modal-ok');
const confettiLayer = document.getElementById('confetti');

function shuffle(a){ const arr = a.slice(); for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }
function hexToRgba(hex, a=0.22){ const c = hex.replace('#',''); const r=parseInt(c.substring(0,2),16); const g=parseInt(c.substring(2,4),16); const b=parseInt(c.substring(4,6),16); return `rgba(${r},${g},${b},${a})`; }

// Crear bombillas y colocarlas sobre el SVG path
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
    svgWrap.innerHTML = bulbSVG(RAINBOW[i % RAINBOW.length]);
    b.appendChild(svgWrap);

    const cap = document.createElement('div'); cap.className = 'cap'; b.appendChild(cap);

    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') onBulbClick(e) });

    lightsContainer.appendChild(b);
  }
  positionBulbsOnPath();
  window.addEventListener('resize', positionBulbsOnPath);
}

// Asignar bonos únicos (sin repetición hasta que se acaben)
function assignBonuses(){
  const picks = shuffle(BONUS_OPTIONS).slice(0, BULB_COUNT);
  const bulbs = document.querySelectorAll('.bulb');
  bulbs.forEach((b, i) => {
    const label = picks[i] || BONUS_OPTIONS[i % BONUS_OPTIONS.length];
    const color = RAINBOW[i % RAINBOW.length];
    b.dataset.bonus = label;
    b.dataset.color = color;
    b.querySelector('.glow').style.background = hexToRgba(color, 0.22);
    b.querySelector('.svg-wrap').innerHTML = bulbSVG(color);
    b.classList.remove('revealed');
    b.disabled = false;
  });
}

// Posicionar sobre el path; las bombillas "cuelgan" por debajo (offset normal)
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

    const offsetPx = 20; // distancia bajo la cuerda
    const offsetX = nx * offsetPx;
    const offsetY = ny * offsetPx;

    const screenX = svgRect.left + (pt.x * scaleX) + offsetX;
    const screenY = svgRect.top + (pt.y * scaleY) + offsetY;

    const containerRect = lightsContainer.getBoundingClientRect();
    const left = screenX - containerRect.left;
    const top = screenY - containerRect.top;

    b.style.left = `${left}px`;
    b.style.top = `${top}px`;

    // orientar el SVG interno según tangente (mantener botón sin rotación)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const svgWrap = b.querySelector('.svg-wrap');
    if(svgWrap) svgWrap.style.transform = `translateY(4px) rotate(${-angle}deg)`;
  });
}

// click: mostrar modal con bono; la bombilla se revela y se deshabilita
function onBulbClick(e){
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;
  btn.classList.add('revealed');
  btn.disabled = true;

  // mostrar modal con el bono
  const bonus = btn.dataset.bonus || '¡Sorpresa!';
  modalBonus.textContent = bonus;
  modal.hidden = false;

  // confetti centrado en la bombilla
  createConfettiAtElement(btn);
}

// confetti
function createConfettiAtElement(el){
  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width/2;
  const centerY = rect.top + rect.height/2;
  const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
  for(let i=0;i<18;i++){
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

// modal OK
modalOk.addEventListener('click', ()=> { modal.hidden = true; });

// helpers: SVG lamp
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

// init
createBulbs(BULB_COUNT);
assignBonuses();
positionBulbsOnPath();
window.addEventListener('resize', positionBulbsOnPath);
