// script.js — una elección por dispositivo por día (localStorage)
// + capa decorativa de árboles 🎄 aleatorios en el fondo
// Modificación: los bonos ahora son 100%, 150% y 200% con probabilidades ponderadas
// (100% y 150% son más probables que 200%).

document.addEventListener('DOMContentLoaded', () => {
  try {
    const STORAGE_KEY = 'guirnalda.choice.v1';

    // BONOS y probabilidades (suman 1)
    const BONUSES = [
      { label: "100% de bono", weight: 0.50 }, // 50% prob
      { label: "150% de bono", weight: 0.35 }, // 35% prob
      { label: "200% de bono", weight: 0.15 }  // 15% prob
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
    const treesLayer = document.getElementById('trees');

    if(!svg || !path || !lights) {
      console.error('Elemento SVG/path/lights no encontrado en el DOM.');
      return;
    }

    // ---------- helpers de fecha/storage ----------
    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    function getStoredChoice(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return null;
        return JSON.parse(raw);
      } catch(e){ return null; }
    }
    function setStoredChoice(bonus){
      try {
        const item = { bonus, date: todayStr(), ts: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
      } catch(e){ /* ignore */ }
    }
    function hasChosenToday(){
      const st = getStoredChoice();
      return st && st.date === todayStr();
    }

    // ---------- visual helpers ----------
    function shuffle(arr){
      const a = arr.slice();
      for(let i=a.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    function hexToRgba(hex, a=0.28){
      const c = hex.replace('#','');
      const r = parseInt(c.substring(0,2),16);
      const g = parseInt(c.substring(2,4),16);
      const b = parseInt(c.substring(4,6),16);
      return `rgba(${r},${g},${b},${a})`;
    }
    function bulbSVG(color){
      return `
        <svg class="inner" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <rect x="20" y="4" rx="6" ry="6" width="24" height="12" fill="#fff" stroke="#111" stroke-width="2"/>
          <path d="M32 10 C34 10 36 12 36 14" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="38" r="18" fill="${color}" stroke="#111" stroke-width="3" />
          <path d="M45 29 C42 24 36 22 32 25" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }

    // Weighted random chooser returns label string
    function weightedPick(bonuses) {
      // build cumulative array
      let sum = 0;
      const cumulative = bonuses.map(b => {
        sum += b.weight;
        return { label: b.label, cum: sum };
      });
      const r = Math.random() * sum;
      for (let i = 0; i < cumulative.length; i++) {
        if (r <= cumulative[i].cum) return cumulative[i].label;
      }
      return cumulative[cumulative.length - 1].label;
    }

    // ---------- crear y posicionar bombillas ----------
    function createBulbs(n){
      lights.innerHTML = '';
      for(let i=0;i<n;i++){
        const btn = document.createElement('button');
        btn.className = 'bulb';
        btn.type = 'button';
        btn.setAttribute('role','listitem');
        btn.tabIndex = 0;

        const glow = document.createElement('div'); glow.className = 'glow'; btn.appendChild(glow);
        const art = document.createElement('div'); art.className = 'art'; art.innerHTML = bulbSVG(RAINBOW[i % RAINBOW.length]); btn.appendChild(art);
        const cap = document.createElement('div'); cap.className = 'cap'; btn.appendChild(cap);

        btn.addEventListener('click', onBulbClick);
        btn.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBulbClick({ currentTarget: btn }); } });

        lights.appendChild(btn);
      }
      positionBulbs();
      window.removeEventListener('resize', positionBulbs);
      window.addEventListener('resize', positionBulbs);
    }

    // Assign bonuses using weighted random per bulb
    function assignBonuses(){
      const bulbs = document.querySelectorAll('.bulb');
      bulbs.forEach((b, i) => {
        const pick = weightedPick(BONUSES);
        const color = RAINBOW[i % RAINBOW.length];
        b.dataset.bonus = pick;
        const glow = b.querySelector('.glow');
        if(glow) glow.style.background = hexToRgba(color, 0.36);
        const art = b.querySelector('.art');
        if(art) art.innerHTML = bulbSVG(color);
        b.classList.remove('revealed');
        b.disabled = false;
      });
      console.log('Bonos asignados (ponderados):', Array.from(bulbs).map(b=>b.dataset.bonus));
    }

    function positionBulbs(){
      const nodes = Array.from(document.querySelectorAll('.bulb'));
      if(!path || !svg || nodes.length === 0) return;

      const L = path.getTotalLength();
      const svgRect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const scaleX = svgRect.width / (vb.width || svgRect.width);
      const scaleY = svgRect.height / (vb.height || svgRect.height);

      nodes.forEach((el, idx) => {
        const t = (idx + 1) / (nodes.length + 1);
        const point = path.getPointAtLength(t * L);

        const delta = Math.max(1, L * 0.002);
        const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
        const p2 = path.getPointAtLength(Math.min(L, t*L + delta));
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;

        const cssBulb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bulb-size')) || 96;
        const offset = Math.max(cssBulb * 0.22, 20);

        const screenX = svgRect.left + point.x * scaleX + nx * offset;
        const screenY = svgRect.top  + point.y * scaleY + ny * offset;

        const containerRect = lights.getBoundingClientRect();
        el.style.left = (screenX - containerRect.left) + 'px';
        el.style.top  = (screenY - containerRect.top) + 'px';

        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const art = el.querySelector('.art');
        if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;
      });
    }

    // ---------- selección con bloqueo diario ----------
    function onBulbClick(e){
      if(hasChosenToday()){
        const stored = getStoredChoice();
        if(stored) showStoredModal(stored.bonus);
        return;
      }

      const btn = e.currentTarget;
      if(!btn || btn.classList.contains('revealed')) return;

      btn.classList.add('revealed');
      btn.disabled = true;
      document.querySelectorAll('.bulb').forEach(b => { if(b !== btn) b.disabled = true; });

      const bonus = btn.dataset.bonus || '¡Sorpresa!';
      setStoredChoice(bonus);
      showModalWith(bonus);
      createConfettiAtElement(btn);
      console.log('Bombilla elegida y almacenada:', bonus);
    }
    function showModalWith(bonus){
      modalBonus.textContent = bonus;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
    }
    function showStoredModal(bonus){
      const title = modal.querySelector('.modal-title');
      const sub = modal.querySelector('.modal-sub');
      if(title) title.textContent = 'Ya elegiste hoy';
      if(sub) sub.textContent = 'No puedes elegir otra hasta mañana. Tu bono fue:';
      modalBonus.textContent = bonus;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden','false');
    }

    // ---------- confetti ----------
    function createConfettiAtElement(el){
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
      for(let i=0;i<28;i++){
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = (cx + (Math.random()-0.5)*140) + 'px';
        p.style.top = (cy + (Math.random()-0.5)*100) + 'px';
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.width = (6 + Math.random()*10) + 'px';
        p.style.height = (8 + Math.random()*12) + 'px';
        p.style.borderRadius = (Math.random()>0.5 ? '2px' : '50%');
        p.style.animationDelay = (Math.random()*200) + 'ms';
        confettiLayer.appendChild(p);
        setTimeout(()=> p.remove(), 1600 + Math.random()*800);
      }
    }

    // ---------- árboles decorativos (🎄) ----------
    function createTrees(count = 24){
      if(!treesLayer) return;
      treesLayer.innerHTML = '';
      for(let i=0;i<count;i++){
        const el = document.createElement('div');
        el.className = 'tree animate';
        el.textContent = '🎄';
        const size = Math.floor(14 + Math.random()*36);
        el.style.fontSize = size + 'px';
        const left = Math.random()*100;
        const top = Math.random()*100;
        el.style.left = left + '%';
        el.style.top = top + '%';
        const rot = (Math.random()*40 - 20).toFixed(1) + 'deg';
        el.style.setProperty('--rot', rot);
        el.style.opacity = (0.45 + Math.random()*0.5).toFixed(2);
        if(size > 36) el.style.filter = 'drop-shadow(0 10px 12px rgba(0,0,0,0.45))';
        treesLayer.appendChild(el);
      }
    }
    let treesResizeTimer = null;
    function refreshTrees(){
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const base = vw > 1200 ? 30 : vw > 900 ? 22 : vw > 600 ? 16 : 10;
      createTrees(base);
    }
    window.addEventListener('resize', () => {
      clearTimeout(treesResizeTimer);
      treesResizeTimer = setTimeout(refreshTrees, 220);
    });

    // ---------- modal handler ----------
    modalOk.addEventListener('click', () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      const title = modal.querySelector('.modal-title');
      const sub = modal.querySelector('.modal-sub');
      if(title) title.textContent = '¡Felicidades!';
      if(sub) sub.textContent = 'Te ganaste un bono de';
    });

    // ---------- init ----------
    createBulbs(BULB_COUNT);
    assignBonuses();

    // inicializa árboles decorativos
    refreshTrees();

    const stored = getStoredChoice();
    if(stored && stored.date === todayStr()){
      document.querySelectorAll('.bulb').forEach(b => b.disabled = true);
      showStoredModal(stored.bonus);
    } else {
      positionBulbs();
    }

    console.log('Guirnalda inicializada con bloqueo diario y bonos ponderados.');
  } catch (err) {
    console.error('Error inicializando guirnalda:', err);
  }
});
