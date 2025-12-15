// script.js — overlay buttons (HTML en #lights) SIN palitos ni barritas blancas (.cap).
// Mantiene: posicionamiento robusto, glow, bonos ponderados y bloqueo diario.

document.addEventListener('DOMContentLoaded', () => {
  try {
    const STORAGE_KEY = 'guirnalda.choice.v1';

    const BONUSES = [
      { label: "100% de bono", weight: 0.50 },
      { label: "150% de bono", weight: 0.35 },
      { label: "200% de bono", weight: 0.15 }
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
    const stageEl = document.querySelector('.stage');

    if(!svg || !path || !lights) {
      console.error('Elemento necesario no encontrado en el DOM.');
      return;
    }

    // BORRAR restos por si quedaron de versiones previas:
    svg.querySelectorAll('line.hanger').forEach(n => n.remove());
    document.querySelectorAll('.cap').forEach(n => n.remove());
    // también eliminar foreignObject/groups si existieran
    svg.querySelectorAll('foreignObject, g.bulb-svg').forEach(n => n.remove());

    // ---------- helpers ----------
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
      } catch(e){}
    }
    function hasChosenToday(){
      const st = getStoredChoice();
      return st && st.date === todayStr();
    }
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

    // Bulb SVG content: NO incluye rect blanco ni elementos laterales.
function bulbSVG(color){
      return `
        <svg class="inner" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <path d="M32 10 C34 10 36 12 36 14" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="38" r="18" fill="${color}" stroke="#111" stroke-width="3" />
          <path d="M45 29 C42 24 36 22 32 25" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
}

    function weightedPick(bonuses) {
      let sum = 0;
      const cumulative = bonuses.map(b => { sum += b.weight; return { label: b.label, cum: sum }; });
      const r = Math.random() * sum;
      for (let i = 0; i < cumulative.length; i++) {
        if (r <= cumulative[i].cum) return cumulative[i].label;
      }
      return cumulative[cumulative.length - 1].label;
    }

    // ---------- create / assign bulbs (HTML overlay) ----------
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
        // NO crear .cap ni otras piezas blancas

        btn.addEventListener('click', onBulbClick);
        btn.addEventListener('keydown', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBulbClick({ currentTarget: btn }); } });

        lights.appendChild(btn);
      }
      assignBonuses();
      positionBulbsDeferred();

      window.removeEventListener('resize', positionBulbsDeferred);
      window.addEventListener('resize', positionBulbsDeferred);
      window.removeEventListener('orientationchange', positionBulbsDeferred);
      window.addEventListener('orientationchange', positionBulbsDeferred);
    }

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
    }

    // ---------- position bulbs robustly (SVG -> screen) ----------
    function positionBulbs(){
      const nodes = Array.from(document.querySelectorAll('.bulb'));
      if(!path || !svg || nodes.length === 0) return;

      const L = path.getTotalLength();
      const svgRect = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      const containerRect = lights.getBoundingClientRect();
      let ctm = null;
      try { ctm = svg.getScreenCTM(); } catch(e){ ctm = null; }
      const hasCTM = !!ctm && typeof svg.createSVGPoint === 'function';
      const cssBulb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bulb-size')) || 96;
      const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 520;
      const offsetPx = Math.max(cssBulb * (isMobile ? 0.16 : 0.22), isMobile ? 12 : 20);

      nodes.forEach((el, idx) => {
        const t = (idx + 1) / (nodes.length + 1);
        const svgPoint = path.getPointAtLength(t * L);

        if(hasCTM){
          const pt = svg.createSVGPoint();
          pt.x = svgPoint.x; pt.y = svgPoint.y;
          let screenPoint;
          try { screenPoint = pt.matrixTransform(ctm); } catch(e){ screenPoint = null; }

          if(screenPoint){
            const delta = Math.max(1, L * 0.002);
            const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
            const p2 = path.getPointAtLength(Math.min(L, t*L + delta));
            pt.x = p1.x; pt.y = p1.y; const s1 = pt.matrixTransform(ctm);
            pt.x = p2.x; pt.y = p2.y; const s2 = pt.matrixTransform(ctm);
            const dx = s2.x - s1.x, dy = s2.y - s1.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;

            const screenX = screenPoint.x + nx * offsetPx;
            const screenY = screenPoint.y + ny * offsetPx;

            el.style.left = (screenX - containerRect.left) + 'px';
            el.style.top  = (screenY - containerRect.top) + 'px';

            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
            const art = el.querySelector('.art');
            if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;
            return;
          }
        }

        // fallback
        const scaleX = svgRect.width / (vb.width || svgRect.width);
        const scaleY = svgRect.height / (vb.height || svgRect.height);

        const delta = Math.max(1, L * 0.002);
        const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
        const p2 = path.getPointAtLength(Math.min(L, t*L + delta));

        const dx = (p2.x - p1.x) * scaleX;
        const dy = (p2.y - p1.y) * scaleY;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;

        const screenX = svgRect.left + svgPoint.x * scaleX + nx * offsetPx;
        const screenY = svgRect.top  + svgPoint.y * scaleY + ny * offsetPx;
        el.style.left = (screenX - containerRect.left) + 'px';
        el.style.top  = (screenY - containerRect.top) + 'px';

        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        const art = el.querySelector('.art');
        if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;
      });
    }

    function positionBulbsDeferred(){
      window.requestAnimationFrame(()=>{ setTimeout(()=> positionBulbs(), 60); });
    }

    // ---------- click handler ----------
    function onBulbClick(e){
      const btn = e.currentTarget;
      if(!btn) return;
      if(hasChosenToday()){
        const stored = getStoredChoice();
        if(stored) showStoredModal(stored.bonus);
        return;
      }
      if(btn.classList.contains('revealed')) return;

      btn.classList.add('revealed');
      btn.disabled = true;
      document.querySelectorAll('.bulb').forEach(b => { if(b !== btn) b.disabled = true; });

      const bonus = btn.dataset.bonus || '¡Sorpresa!';
      setStoredChoice(bonus);
      showModalWith(bonus);
      createConfettiAtElement(btn);
    }
    function showModalWith(bonus){ modalBonus.textContent = bonus; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
    function showStoredModal(bonus){ const title = modal.querySelector('.modal-title'); const sub = modal.querySelector('.modal-sub'); if(title) title.textContent='Ya elegiste hoy'; if(sub) sub.textContent='No puedes elegir otra hasta mañana. Tu bono fue:'; modalBonus.textContent = bonus; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }

    // ---------- confetti ----------
    function createConfettiAtElement(el){
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const colors = ['#ff3b30','#ff9500','#ffcc00','#34c759','#5ac8fa','#5856d6','#ff2d55'];
      const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 520;
      const count = isMobile ? 10 : 28;
      for(let i=0;i<count;i++){
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = (cx + (Math.random()-0.5)*(isMobile?80:140)) + 'px';
        p.style.top = (cy + (Math.random()-0.5)*(isMobile?40:100)) + 'px';
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.width = (4 + Math.random()*8) + 'px';
        p.style.height = (6 + Math.random()*10) + 'px';
        p.style.borderRadius = (Math.random()>0.6 ? '2px' : '50%');
        p.style.animationDelay = (Math.random()*200) + 'ms';
        confettiLayer.appendChild(p);
        setTimeout(()=> p.remove(), 1100 + Math.random()*600);
      }
    }

    // ---------- trees (unchanged) ----------
    function createTrees(count = 40){
      if(!treesLayer || !stageEl) return;
      treesLayer.innerHTML = '';
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const isVerySmall = vw <= 420;
      const stageRect = stageEl.getBoundingClientRect();
      const marginPx = Math.max(12, Math.min(vw * 0.06, 48));
      const excl = { left: Math.max(0, stageRect.left - marginPx), top: Math.max(0, stageRect.top - marginPx), right: Math.min(vw, stageRect.right + marginPx), bottom: Math.min(vh, stageRect.bottom + marginPx) };
      const maxAttempts = 80;
      for(let i=0;i<count;i++){
        let attempts = 0, placed=false;
        while(!placed && attempts<maxAttempts){
          attempts++;
          const x = Math.random()*vw;
          const y = Math.random()*vh;
          if(isVerySmall){ const topZone = y < vh*0.25; const bottomZone = y>vh*0.75; const sideZone = x<vw*0.12||x>vw*0.88; if(!(topZone||bottomZone||sideZone)) continue; }
          if(x>=excl.left && x<=excl.right && y>=excl.top && y<=excl.bottom) continue;
          const el = document.createElement('div'); el.className='tree'; el.textContent='🎄';
          const size = Math.floor((isVerySmall?10:14)+Math.random()*(isVerySmall?28:50));
          el.style.fontSize = size+'px';
          el.style.left = (x/vw*100)+'%'; el.style.top=(y/vh*100)+'%';
          const rot=(Math.random()*40-20).toFixed(1)+'deg'; el.style.setProperty('--rot', rot);
          el.style.opacity = (isVerySmall ? (0.25+Math.random()*0.5) : (0.35+Math.random()*0.6)).toFixed(2);
          if(size>36) el.style.filter='drop-shadow(0 10px 12px rgba(0,0,0,0.45))';
          if(!isVerySmall) el.classList.add('animate');
          treesLayer.appendChild(el);
          placed=true;
        }
      }
    }
    let treesResizeTimer = null;
    function refreshTrees(){ const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0); const base = vw>1400?90:vw>1200?70:vw>900?50:vw>600?32:12; createTrees(base); }
    window.addEventListener('resize', ()=>{ clearTimeout(treesResizeTimer); treesResizeTimer = setTimeout(()=>{ refreshTrees(); positionBulbsDeferred(); }, 220); });
    window.addEventListener('orientationchange', ()=>{ setTimeout(()=>{ refreshTrees(); positionBulbsDeferred(); }, 240); });

    // modal
    modalOk.addEventListener('click', () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
      const title = modal.querySelector('.modal-title');
      const sub = modal.querySelector('.modal-sub');
      if(title) title.textContent = '¡Felicidades!';
      if(sub) sub.textContent = 'Te ganaste un bono de';
    });

    // init
    createBulbs(BULB_COUNT);
    assignBonuses();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { positionBulbsDeferred(); refreshTrees(); }).catch(()=> { positionBulbsDeferred(); refreshTrees(); });
    } else {
      positionBulbsDeferred(); refreshTrees();
    }

    const stored = getStoredChoice();
    if(stored && stored.date === todayStr()){
      document.querySelectorAll('button.bulb').forEach(b => b.disabled = true);
      showStoredModal(stored.bonus);
    }

    console.log('Guirnalda inicializada (sin palitos ni barritas).');

  } catch (err) {
    console.error('Error inicializando guirnalda:', err);
  }
});
