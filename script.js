// script.js - interacción para estrellas con bonos sorpresa
const BONUS_OPTIONS = ["150% de bono", "100% de bono", "200% de bono", "50% de bono", "250% de bono"];
const STAR_COUNT = 8;

const starsContainer = document.getElementById('stars');
const popup = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupClose = document.getElementById('popup-close');
const confettiLayer = document.getElementById('confetti-layer');

// Crea N estrellas y las posiciona a lo largo de la onda (seno)
function createStars(n){
  for(let i=0;i<n;i++){
    const star = document.createElement('div');
    star.className='star';
    star.setAttribute('role','listitem');

    // inner flip wrapper
    const inner = document.createElement('div');
    inner.className='inner';

    const front = document.createElement('div');
    front.className='face front';
    front.innerHTML = '<span class="icon" aria-hidden="true">⭐</span>';

    const back = document.createElement('div');
    back.className='face back';

    // asignar bono aleatorio y guardarlo en data
    const bonus = BONUS_OPTIONS[Math.floor(Math.random()*BONUS_OPTIONS.length)];
    back.textContent = bonus;
    star.dataset.bonus = bonus;

    inner.appendChild(front);
    inner.appendChild(back);
    star.appendChild(inner);

    // eventos use pointer (soporta mouse & touch)
    star.addEventListener('pointerdown', onStarTap);
    star.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') onStarTap(e) });
    star.tabIndex = 0;
    starsContainer.appendChild(star);
  }

  layoutStars();
  // relayout on resize
  window.addEventListener('resize', layoutStars);
}

// posiciona las estrellas a lo largo de la anchura con una onda senoidal
function layoutStars(){
  const containerRect = starsContainer.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;
  const stars = Array.from(document.querySelectorAll('.star'));
  const amplitude = Math.min(70, height * 0.18);
  const frequency = 2 * Math.PI / (width / 2);

  stars.forEach((st, idx) => {
    const t = idx / (stars.length - 1); // 0..1
    const x = t * width;
    // y = baseline + amplitude * sin(frequency * x + phase)
    const baseline = 100; // px from top where the wave center is
    const phase = 0;
    const y = baseline + amplitude * Math.sin(frequency * x + phase);
    st.style.left = `${x}px`;
    st.style.top = `${y}px`;
  });
}

function onStarTap(e){
  const star = e.currentTarget;
  if(star.classList.contains('revealed')) return;

  // marcar como revelada para prevenir re-clicks
  star.classList.add('revealed');

  // obtener bono
  const bonus = star.dataset.bonus || "¡Sorpresa!";

  // voltear visualmente (usa la clase .revealed)
  // mostrar popup con el bono
  showPopup(bonus);

  // crear confetti alrededor de la estrella
  const rect = star.getBoundingClientRect();
  createConfettiAt(rect.left + rect.width/2, rect.top + rect.height/2);

  // Opcional: aquí podrías enviar el resultado al servidor con fetch()
}

function showPopup(bonus){
  popupContent.textContent = bonus;
  popup.hidden = false;
  popup.querySelector('.popup-card').focus?.();
}

popupClose.addEventListener('click', ()=> popup.hidden = true);
popup.addEventListener('pointerdown', (e)=>{
  if(e.target === popup) popup.hidden = true;
});

// confetti simple: crea piezas con colores aleatorios
function createConfettiAt(x, y){
  const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
  const count = 18;
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = (x + (Math.random()-0.5)*120) + 'px';
    p.style.top = (y + (Math.random()-0.5)*40) + 'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.transform = `rotate(${Math.random()*360}deg)`;
    p.style.width = (6 + Math.random()*10) + 'px';
    p.style.height = (8 + Math.random()*12) + 'px';
    p.style.borderRadius = (Math.random()>0.5? '2px' : '50%');
    p.style.animationDelay = (Math.random()*200) + 'ms';
    confettiLayer.appendChild(p);
    // cleanup
    setTimeout(()=> p.remove(), 1800 + Math.random()*600);
  }
}

// inicializar
createStars(STAR_COUNT);
