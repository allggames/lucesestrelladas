// script.js - bombillas estilo luces colgantes, revelar bono
const BONUS_OPTIONS = ["150% de bono", "100% de bono", "200% de bono"]; // modifica aquí
const BULB_COLORS = [
  {color:'#ffd54f', glow:'rgba(255,213,79,0.22)'}, // amarillo
  {color:'#ff6b6b', glow:'rgba(255,107,107,0.18)'}, // rojo
  {color:'#4cd964', glow:'rgba(76,217,100,0.18)'}, // verde
  {color:'#5ac8fa', glow:'rgba(90,200,250,0.18)'}, // azul claro
  {color:'#ffcc80', glow:'rgba(255,204,128,0.16)'} // naranja suave
];

const BULB_COUNT = 7; // cuantas bombillas mostrar
const lightsContainer = document.getElementById('lights');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltip-text');
const tooltipClose = document.getElementById('tooltip-close');
const confettiLayer = document.getElementById('confetti');

function createBulbs(n){
  for(let i=0;i<n;i++){
    const b = document.createElement('button');
    b.className = 'bulb';
    b.type = 'button';
    b.setAttribute('role','listitem');
    b.tabIndex = 0;

    // asignar color (cíclico)
    const colorObj = BULB_COLORS[i % BULB_COLORS.length];
    b.style.setProperty('--color', colorObj.color);
    b.style.setProperty('--glow-color', colorObj.glow);

    // asignar bono (aleatorio de las opciones)
    b.dataset.bonus = BONUS_OPTIONS[Math.floor(Math.random()*BONUS_OPTIONS.length)];

    // glow y svg
    const glow = document.createElement('div');
    glow.className = 'glow';
    b.appendChild(glow);

    const svgWrap = document.createElement('div');
    svgWrap.className = 'svg-wrap';
    svgWrap.innerHTML = bulbSVGPath(colorObj.color);
    b.appendChild(svgWrap);

    const cap = document.createElement('div');
    cap.className = 'cap';
    b.appendChild(cap);

    // eventos
    b.addEventListener('pointerdown', onBulbClick);
    b.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') onBulbClick(e) });

    lightsContainer.appendChild(b);
  }

  layoutBulbs();
  window.addEventListener('resize', layoutBulbs);
}

// genera HTML SVG de la bombilla (simple)
function bulbSVGPath(fillColor){
  return `
    <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path d="M32 2c10 0 18 8 18 18 0 7-3 11-6 15-3 3-5 7-5 12v4H25v-4c0-5-2-9-5-12-3-4-6-8-6-15C14 10 22 2 32 2z" fill="${fillColor}" stroke="#111" stroke-width="2" />
      <!-- filamento simple -->
      <path d="M24 28c3 4 7 4 12 0" stroke="#222" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="26" cy="30" r="1.6" fill="#222"/>
      <circle cx="38" cy="30" r="1.6" fill="#222"/>
    </svg>
  `;
}

// posiciona a lo largo de la onda (seno)
function layoutBulbs(){
  const rect = lightsContainer.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const bulbs = Array.from(document.querySelectorAll('.bulb'));
  const amplitude = Math.min(70, height * 0.18);
  const frequency = 2 * Math.PI / (width / 2);

  bulbs.forEach((el, idx) => {
    const t = idx / (bulbs.length - 1);
    const x = t * width;
    const baseline = 110; // centro de la onda en px desde top (ajusta si necesitas)
    const y = baseline + amplitude * Math.sin(frequency * x);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

// click/tap en bombilla
function onBulbClick(e){
  const btn = e.currentTarget;
  if(btn.classList.contains('revealed')) return;

  // marcar revelada y deshabilitar las demás (si prefieres permitir multiples, quita la deshabilitación)
  btn.classList.add('revealed');
  Array.from(document.querySelectorAll('.bulb')).forEach(b=>{
    if(b !== btn) b.disabled = true;
  });

  const bonus = btn.dataset.bonus || '¡Sorpresa!';
  showTooltipOver(btn, bonus);
  createConfettiAtElement(btn);
  // aquí podrías enviar el resultado al servidor con fetch()
}

// mostrar tooltip posicionado sobre la bombilla
function showTooltipOver(el, text){
  tooltipText.textContent = text;
  tooltip.hidden = false;

  // calcular posicion
  const stageRect = document.getElementById('stage').getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  const tooltipEl = tooltip;
  // ajusta para que quede centrado por encima
  const left = (elRect.left + elRect.width/2) - stageRect.left;
  const top = (elRect.top - stageRect.top) - 12; // 12px arriba de la bombilla

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.transform = 'translate(-50%, -100%)'; // centrado horizontal, arriba vertical

  // focus para accesibilidad
  tooltip.querySelector('.tooltip-inner').focus?.();
}

tooltipClose.addEventListener('click', ()=> tooltip.hidden = true);
tooltip.addEventListener('pointerdown', (e)=>{
  if(e.target === tooltip) tooltip.hidden = true;
});

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

// init
createBulbs(BULB_COUNT);
