// script.js - Posiciona las bombillas sobre el path, colores arcoíris y modal con bono

const BONUS = [
  "150% de bono","100% de bono","200% de bono","50% de bono","250% de bono",
  "75% de bono","300% de bono","30% de bono","10% de bono"
];
const RAINBOW = ['#8e24aa','#1e88e5','#43a047','#fdd835','#fb8c00','#e53935','#ff4081','#ffd54f','#81d4fa'];
const BULB_COUNT = 9;

const svg = document.getElementById('garlandSVG');
const path = document.getElementById('garlandPath');
const lights = document.getElementById('lights');
const modal = document.getElementById('modal');
const modalBonus = document.getElementById('modal-bonus');
const modalOk = document.getElementById('modal-ok');
const confettiLayer = document.getElementById('confetti');

let chosen = false;

// simple shuffle
function shuffle(a){ const arr = a.slice(); for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }
function hexToRgba(hex,a=0.22){ const c=hex.replace('#',''); return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`; }

// crea botones / bombillas
function createBulbs(n){
  lights.innerHTML = '';
  for(let i=0;i<n;i++){
    const b = document.createElement('button');
    b.className = 'bulb';
    b.type = 'button';
    b.setAttribute('role','listitem');
    b.tabIndex = 0;

    const glow = document.createElement('div'); glow.className = 'glow';
    b.appendChild(glow);

    const art = document.createElement('div'); art.className = 'art';
    art.innerHTML = bulbSVG(RAINBOW[i % RAINBOW.length]);
    b.appendChild(art);

    const cap = document.createElement('div'); cap.className = 'cap';
    b.appendChild(cap);

    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') onBulbClick(e) });

    lights.appendChild(b);
  }
  positionBulbs();
  window.addEventListener('resize', positionBulbs);
}

// asigna bonos únicos (no repetidos en la tanda)
function assignBonuses(){
  const picks = shuffle(BONUS).slice(0,BULB_COUNT);
  document.querySelectorAll('.bulb').forEach((b,i)=>{
    b.dataset.bonus = picks[i] || BONUS[i % BONUS.length];
    b.dataset.color = RAINBOW[i % RAINBOW.length];
    b.querySelector('.glow').style.background = hexToRgba(RAINBOW[i % RAINBOW.length],0.22);
    b.querySelector('.art').innerHTML = bulbSVG(RAINBOW[i % RAINBOW.length]);
    b.classList.remove('revealed'); b.disabled = false;
  });
  chosen = false;
}

// coloca cada bombilla en el punto del path (y un offset normal debajo)
function positionBulbs(){
  const nodes = Array.from(document.querySelectorAll('.bulb'));
  if(!path || !svg || nodes.length===0) return;

  const L = path.getTotalLength();
  const svgRect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scaleX = svgRect.width / (vb.width || svgRect.width);
  const scaleY = svgRect.height / (vb.height || svgRect.height);

  nodes.forEach((el, idx) => {
    const t = (idx+1)/(nodes.length+1);
    const pos = path.getPointAtLength(t*L);

    // approximate tangent for normal
    const delta = Math.max(1, L*0.002);
    const p1 = path.getPointAtLength(Math.max(0,t*L - delta));
    const p2 = path.getPointAtLength(Math.min(L,t*L + delta));
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx,dy)||1;
    const nx = -dy/len, ny = dx/len;

    const offset = 20; // px below string
    const screenX = svgRect.left + pos.x * scaleX + nx * offset;
    const screenY = svgRect.top  + pos.y * scaleY + ny * offset;

    const containerRect = lights.getBoundingClientRect();
    el.style.left = (screenX - containerRect.left) + 'px';
    el.style.top  = (screenY - containerRect.top) + 'px';

    const angle = Math.atan2(dy,dx) * 180 / Math.PI;
    const art = el.querySelector('.art');
    if(art) art.style.transform = `translateY(4px) rotate(${-angle}deg)`;
  });
}

// click: revelar SOLO UNA bombilla por tanda
function onBulbClick(e){
  if(chosen) return;
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;

  btn.classList.add('revealed');
  btn.disabled = true;

  // deshabilitar resto (opcional: puedes dejarlas activas)
  document.querySelectorAll('.bulb').forEach(b => { if(b!==btn) b.disabled = true; });

  const bonus = btn.dataset.bonus || '¡Sorpresa!';
  chosen = true;
  showModal(bonus);
  createConfettiAtElement(btn);
}

// modal
function showModal(text){
  modalBonus.textContent = text;
  modal.hidden = false;
}
document.getElementById('modal-ok').addEventListener('click', ()=> { modal.hidden = true; });

// confetti
function createConfettiAtElement(el){
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
  for(let i=0;i<18;i++){
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = (cx + (Math.random()-0.5)*80) + 'px';
    p.style.top = (cy + (Math.random()-0.5)*40) + 'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.width = (6 + Math.random()*8) + 'px';
    p.style.height = (8 + Math.random()*10) + 'px';
    p.style.borderRadius = (Math.random()>0.5 ? '2px' : '50%');
    p.style.animationDelay = (Math.random()*200) + 'ms';
    confettiLayer.appendChild(p);
    setTimeout(()=> p.remove(), 1400 + Math.random()*600);
  }
}

// SVG for bulb art: cap + circle + highlight
function bulbSVG(color){
  return `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="22" y="4" rx="6" ry="6" width="20" height="10" fill="#fff" stroke="#111" stroke-width="2"/>
      <path d="M32 8 C34 8 36 10 36 12" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="36" r="16" fill="${color}" stroke="#111" stroke-width="3" />
      <path d="M42 28 C40 24 34 22 30 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

// init
createBulbs(BULB_COUNT);
assignBonuses();
positionBulbs();
window.addEventListener('resize', positionBulbs);
