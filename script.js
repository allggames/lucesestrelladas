// script.js — añade hangers (palitos blancos) que sujetan cada bombilla sobre la línea.
// Coloca hangers como elementos <line> en SVG y calcula el extremo superior justo encima de la bombilla.
// Mantiene bloqueo diario, bonos ponderados, árboles decorativos y comportamiento responsive.

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
    const lights = document.getElementById('lights'); // fallback overlay
    const modal = document.getElementById('modal');
    const modalBonus = document.getElementById('modal-bonus');
    const modalOk = document.getElementById('modal-ok');
    const confettiLayer = document.getElementById('confetti');
    const treesLayer = document.getElementById('trees');
    const stageEl = document.querySelector('.stage');

    if(!svg || !path) {
      console.error('Elemento SVG/path no encontrado en el DOM.');
      return;
    }

    // ---------- helpers ----------
    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    function getStoredChoice(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return null; return JSON.parse(raw); } catch(e){ return null; } }
    function setStoredChoice(bonus){ try { const item = { bonus, date: todayStr(), ts: Date.now() }; localStorage.setItem(STORAGE_KEY, JSON.stringify(item)); } catch(e){ } }
    function hasChosenToday(){ const st = getStoredChoice(); return st && st.date === todayStr(); }
    function shuffle(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function hexToRgba(hex, a=0.28){ const c = hex.replace('#',''); const r = parseInt(c.substring(0,2),16); const g = parseInt(c.substring(2,4),16); const b = parseInt(c.substring(4,6),16); return `rgba(${r},${g},${b},${a})`; }
    function bulbSVG(color){ return `
        <svg class="inner" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <rect x="20" y="4" rx="6" ry="6" width="24" height="12" fill="#fff" stroke="#111" stroke-width="2"/>
          <path d="M32 10 C34 10 36 12 36 14" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="38" r="18" fill="${color}" stroke="#111" stroke-width="3" />
          <path d="M45 29 C42 24 36 22 32 25" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `; }
    function weightedPick(bonuses) { let sum = 0; const cumulative = bonuses.map(b => { sum += b.weight; return { label: b.label, cum: sum }; }); const r = Math.random() * sum; for (let i = 0; i < cumulative.length; i++) if (r <= cumulative[i].cum) return cumulative[i].label; return cumulative[cumulative.length - 1].label; }

    // ---------- supports foreignObject? ----------
    const supportsForeignObject = typeof document.createElementNS === 'function' && !!document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject').toString;

    // keep arrays to reference hangers/groups
    let hangerEls = []; // array of <line>
    let groupEls = [];  // array of <g> for bulbs (when using foreignObject) or null for fallback

    // ---------- create bulbs (and hangers) ----------
    function createBulbs(n){
      // cleanup previous
      hangerEls.forEach(l => l.remove());
      hangerEls = [];
      groupEls.forEach(g => g && g.remove());
      groupEls = [];
      // also clear lights overlay if fallback
      if(!supportsForeignObject) lights.innerHTML = '';

      for(let i=0;i<n;i++){
        // create hanger line first so it's under group visually (append before group)
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('class','hanger');
        line.setAttribute('stroke','#ffffff');
        line.setAttribute('stroke-linecap','round');
        line.setAttribute('opacity','0.98');
        // default stroke-width in SVG user units will be set later
        svg.appendChild(line);
        hangerEls.push(line);

        if(supportsForeignObject){
          const g = document.createElementNS('http://www.w3.org/2000/svg','g');
          g.setAttribute('class','bulb-svg');
          g.setAttribute('data-index', i);

          const f = document.createElementNS('http://www.w3.org/2000/svg','foreignObject');
          // temporary values; we'll update width/height/x/y on positioning
          f.setAttribute('width', 64);
          f.setAttribute('height', 64);

          const div = document.createElement('div');
          div.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
          div.style.width = '100%';
          div.style.height = '100%';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.innerHTML = `
            <button class="bulb" type="button" aria-label="bombilla ${i+1}" data-index="${i}">
              <div class="glow"></div>
              <div class="art">${bulbSVG(RAINBOW[i % RAINBOW.length])}</div>
              <div class="cap"></div>
            </button>
          `;
          f.appendChild(div);
          g.appendChild(f);
          svg.appendChild(g); // appended after line => line under group
          groupEls.push(g);

          // attach listeners
          const btn = div.querySelector('button.bulb');
          btn.addEventListener('click', onBulbClick);
          btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onBulbClick({ currentTarget: btn }); } });
        } else {
          // fallback: create HTML button in overlay
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
          groupEls.push(null);
        }
      }

      assignBonuses();
      positionBulbsDeferred();
    }

    function assignBonuses(){
      if(supportsForeignObject){
        const groups = svg.querySelectorAll('g.bulb-svg');
        groups.forEach((g,i) => {
          const btn = g.querySelector('button.bulb');
          const pick = weightedPick(BONUSES);
          btn.dataset.bonus = pick;
          const color = RAINBOW[i % RAINBOW.length];
          const glow = btn.querySelector('.glow');
          if(glow) glow.style.background = hexToRgba(color, 0.36);
          const art = btn.querySelector('.art');
          if(art) art.innerHTML = bulbSVG(color);
          btn.classList.remove('revealed');
          btn.disabled = false;
        });
      } else {
        const bulbs = document.querySelectorAll('.bulb');
        bulbs.forEach((b,i) => {
          const pick = weightedPick(BONUSES);
          b.dataset.bonus = pick;
          const color = RAINBOW[i % RAINBOW.length];
          const glow = b.querySelector('.glow');
          if(glow) glow.style.background = hexToRgba(color, 0.36);
          const art = b.querySelector('.art');
          if(art) art.innerHTML = bulbSVG(color);
          b.classList.remove('revealed');
          b.disabled = false;
        });
      }
    }

    // position bulbs + hangers
    function positionBulbs(){
      // fallback HTML bulbs
      if(!supportsForeignObject){
        const nodes = Array.from(document.querySelectorAll('.bulb'));
        if(!path || !svg || nodes.length === 0) return;
        const L = path.getTotalLength();
        const svgRect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const scaleX = svgRect.width / (vb.width || svgRect.width);
        const scaleY = svgRect.height / (vb.height || svgRect.height);
        const containerRect = lights.getBoundingClientRect();
        const cssBulb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bulb-size')) || 96;
        const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 520;
        const offsetPx = Math.max(cssBulb * (isMobile ? 0.16 : 0.22), isMobile ? 12 : 20);

        nodes.forEach((el, idx) => {
          const t = (idx + 1) / (nodes.length + 1);
          const point = path.getPointAtLength(t * L);
          const delta = Math.max(1, L * 0.002);
          const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
          const p2 = path.getPointAtLength(Math.min(L, t*L + delta));
          const dx = (p2.x - p1.x) * scaleX;
          const dy = (p2.y - p1.y) * scaleY;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const screenX = svgRect.left + point.x * scaleX + nx * offsetPx;
          const screenY = svgRect.top  + point.y * scaleY + ny * offsetPx;
          el.style.left = (screenX - containerRect.left) + 'px';
          el.style.top  = (screenY - containerRect.top) + 'px';
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
          const art = el.querySelector('.art');
          if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;

          // position hanger as line between path point and point slightly above bulb
          const hanger = hangerEls[idx];
          if(hanger){
            const screenStartX = svgRect.left + point.x * scaleX;
            const screenStartY = svgRect.top  + point.y * scaleY;
            const adjustPx = cssBulb * 0.42;
            const screenEndX = screenStartX + nx * (offsetPx - adjustPx);
            const screenEndY = screenStartY + ny * (offsetPx - adjustPx);
            // convert back to svg user coords
            const userX1 = (screenStartX - svgRect.left) / scaleX;
            const userY1 = (screenStartY - svgRect.top)  / scaleY;
            const userX2 = (screenEndX   - svgRect.left) / scaleX;
            const userY2 = (screenEndY   - svgRect.top)  / scaleY;
            hanger.setAttribute('x1', userX1);
            hanger.setAttribute('y1', userY1);
            hanger.setAttribute('x2', userX2);
            hanger.setAttribute('y2', userY2);
            hanger.setAttribute('stroke-width', Math.max(3, cssBulb*0.06));
          }
        });
        return;
      }

      // Preferred SVG foreignObject path
      const groups = Array.from(svg.querySelectorAll('g.bulb-svg'));
      if(groups.length === 0) return;
      const L = path.getTotalLength();
      let ctm = null;
      try { ctm = svg.getScreenCTM(); } catch(e) { ctm = null; }
      const hasCTM = !!ctm && typeof svg.createSVGPoint === 'function';
      const containerRect = svg.getBoundingClientRect();
      const isMobile = (window.innerWidth || document.documentElement.clientWidth) < 520;
      const cssBulbPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bulb-size')) || 96;
      const offsetPx = Math.max(cssBulbPx * (isMobile ? 0.16 : 0.22), isMobile ? 12 : 20);

      for(let idx=0; idx<groups.length; idx++){
        const g = groups[idx];
        const t = (idx + 1) / (groups.length + 1);
        const svgPt = path.getPointAtLength(t * L);

        // compute screen point
        if(hasCTM){
          const pt = svg.createSVGPoint();
          pt.x = svgPt.x; pt.y = svgPt.y;
          const screenP = pt.matrixTransform(ctm);

          // nearby points for tangent -> normal in screen space
          const delta = Math.max(1, L * 0.002);
          const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
          const p2 = path.getPointAtLength(Math.min(L, t*L + delta));
          pt.x = p1.x; pt.y = p1.y; const s1 = pt.matrixTransform(ctm);
          pt.x = p2.x; pt.y = p2.y; const s2 = pt.matrixTransform(ctm);
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          // screen coordinate of bulb center (pushed by offsetPx along normal)
          const screenTargetX = screenP.x + nx * offsetPx;
          const screenTargetY = screenP.y + ny * offsetPx;

          // compute a slightly shorter end so hanger ends near top of bulb (adjust by adjustPx)
          const adjustPx = cssBulbPx * 0.42;
          const screenHangerEndX = screenP.x + nx * (offsetPx - adjustPx);
          const screenHangerEndY = screenP.y + ny * (offsetPx - adjustPx);

          // convert screenTarget back to SVG user coords using inverse CTM
          let inv;
          try { inv = ctm.inverse(); } catch(e){ inv = null; }

          if(inv){
            const pt2 = svg.createSVGPoint();
            // bulb center in svg coords
            pt2.x = screenTargetX; pt2.y = screenTargetY;
            const svgTarget = pt2.matrixTransform(inv);
            // hanger end in svg coords
            pt2.x = screenHangerEndX; pt2.y = screenHangerEndY;
            const svgHangerEnd = pt2.matrixTransform(inv);

            // set group transform to svgTarget (group origin at bulb center)
            g.setAttribute('transform', `translate(${svgTarget.x}, ${svgTarget.y})`);
            // set foreignObject size centered
            const f = g.querySelector('foreignObject');
            if(f){
              const widthSvg = cssBulbPx / (ctm.a || (containerRect.width / (svg.viewBox.baseVal.width || containerRect.width)));
              const heightSvg = cssBulbPx / (ctm.a || (containerRect.width / (svg.viewBox.baseVal.width || containerRect.width)));
              f.setAttribute('width', widthSvg);
              f.setAttribute('height', heightSvg);
              f.setAttribute('x', -(widthSvg/2));
              f.setAttribute('y', -(heightSvg/2));
            }

            // set hanger line coordinates (in svg user coords) between svgPt and svgHangerEnd
            const hanger = hangerEls[idx];
            if(hanger){
              hanger.setAttribute('x1', svgPt.x);
              hanger.setAttribute('y1', svgPt.y);
              hanger.setAttribute('x2', svgHangerEnd.x);
              hanger.setAttribute('y2', svgHangerEnd.y);
              hanger.setAttribute('stroke-width', Math.max(3, cssBulbPx*0.06));
            }

            // rotate inner art according to SVG tangent
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
            const art = g.querySelector('.art');
            if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;
            continue;
          }
        }

        // fallback path: compute using bounding rect scale
        const svgRect = svg.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        const scaleX = svgRect.width / (vb.width || svgRect.width);
        const scaleY = svgRect.height / (vb.height || svgRect.height);

        const screenStartX = svgRect.left + svgPt.x * scaleX;
        const screenStartY = svgRect.top  + svgPt.y * scaleY;
        const delta = Math.max(1, L * 0.002);
        const p1 = path.getPointAtLength(Math.max(0, t*L - delta));
        const p2 = path.getPointAtLength(Math.min(L, t*L + delta));
        const dx = (p2.x - p1.x) * scaleX;
        const dy = (p2.y - p1.y) * scaleY;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const screenTargetX = screenStartX + nx * offsetPx;
        const screenTargetY = screenStartY + ny * offsetPx;
        const adjustPx = cssBulbPx * 0.42;
        const screenHangerEndX = screenStartX + nx * (offsetPx - adjustPx);
        const screenHangerEndY = screenStartY + ny * (offsetPx - adjustPx);

        // convert back to svg user units
        const userTargetX = (screenTargetX - svgRect.left) / scaleX;
        const userTargetY = (screenTargetY - svgRect.top) / scaleY;
        const userHangerX = (screenHangerEndX - svgRect.left) / scaleX;
        const userHangerY = (screenHangerEndY - svgRect.top) / scaleY;

        g.setAttribute('transform', `translate(${userTargetX}, ${userTargetY})`);
        const f = g.querySelector('foreignObject');
        if(f){
          const widthSvg = cssBulbPx / (scaleX || 1);
          const heightSvg = cssBulbPx / (scaleY || 1);
          f.setAttribute('width', widthSvg);
          f.setAttribute('height', heightSvg);
          f.setAttribute('x', -(widthSvg/2));
          f.setAttribute('y', -(heightSvg/2));
        }
        const hanger = hangerEls[idx];
        if(hanger){
          hanger.setAttribute('x1', svgPt.x);
          hanger.setAttribute('y1', svgPt.y);
          hanger.setAttribute('x2', userHangerX);
          hanger.setAttribute('y2', userHangerY);
          hanger.setAttribute('stroke-width', Math.max(3, cssBulbPx*0.06));
        }
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        const art = g.querySelector('.art');
        if(art) art.style.transform = `translateY(6px) rotate(${-angle}deg)`;
      } // end groups loop
    } // end positionBulbs

    function positionBulbsDeferred(){
      window.requestAnimationFrame(() => { setTimeout(() => positionBulbs(), 50); });
    }

    // ---------- selection ----------
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
      document.querySelectorAll('button.bulb').forEach(b => { if(b !== btn) b.disabled = true; });
      const bonus = btn.dataset.bonus || '¡Sorpresa!';
      setStoredChoice(bonus);
      showModalWith(bonus);
      createConfettiAtElement(btn);
    }
    function showModalWith(bonus){ modalBonus.textContent = bonus; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }
    function showStoredModal(bonus){ const title = modal.querySelector('.modal-title'); const sub = modal.querySelector('.modal-sub'); if(title) title.textContent = 'Ya elegiste hoy'; if(sub) sub.textContent = 'No puedes elegir otra hasta mañana. Tu bono fue:'; modalBonus.textContent = bonus; modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); }

    // ---------- confetti ----------
    function createConfettiAtElement(btn){
      const rect = btn.getBoundingClientRect();
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

    // ---------- modal handler ----------
    modalOk.addEventListener('click', ()=>{ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); const title = modal.querySelector('.modal-title'); const sub = modal.querySelector('.modal-sub'); if(title) title.textContent='¡Felicidades!'; if(sub) sub.textContent='Te ganaste un bono de'; });

    // ---------- init ----------
    createBulbs(BULB_COUNT);
    assignBonuses();
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(()=>{ positionBulbsDeferred(); refreshTrees(); }).catch(()=>{ positionBulbsDeferred(); refreshTrees(); });
    } else {
      positionBulbsDeferred(); refreshTrees();
    }
    const stored = getStoredChoice();
    if(stored && stored.date === todayStr()){
      document.querySelectorAll('button.bulb').forEach(b => b.disabled = true);
      showStoredModal(stored.bonus);
    }
    console.log('Guirnalda inicializada (hangers añadidos).');

  } catch (err) {
    console.error('Error inicializando guirnalda:', err);
  }
});
