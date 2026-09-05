/* ============================================================
   ORBIT — shared motion layer
   Custom cursor, scroll-triggered reveals, and eased page
   transitions. Loaded on every page after store.js.
   ============================================================ */
(function(){
  // ---------- custom cursor (mouse/trackpad only — skipped on touch) ----------
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.append(dot, ring);
    document.body.classList.add('custom-cursor');

    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    });
    (function loop(){
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();

    const interactiveSel = 'a, button, input, textarea, select, .filter-chip, .quick-card';
    document.addEventListener('mouseover', (e) => { if(e.target.closest(interactiveSel)) ring.classList.add('hover'); });
    document.addEventListener('mouseout', (e) => { if(e.target.closest(interactiveSel)) ring.classList.remove('hover'); });
  }

  // ---------- scroll-triggered reveals ----------
  const revealTargets = document.querySelectorAll('section:not(.hero), .review-card, .product-card, .quick-card, .stat-card, .chart-box');
  revealTargets.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = Math.min(i % 6, 5) * 0.05 + 's'; });
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => { if(en.isIntersecting){ en.target.classList.add('in-view'); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('in-view'));
  }

  // ---------- eased page transitions between internal pages ----------
  const overlay = document.createElement('div');
  overlay.id = 'page-transition';
  document.body.appendChild(overlay);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if(a.target === '_blank' || a.hasAttribute('download')) return;
    if(/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) return; // let external links (WhatsApp, etc.) behave normally
    e.preventDefault();
    overlay.classList.add('active');
    setTimeout(() => { location.href = href; }, 240);
  });

  window.addEventListener('pageshow', (e) => {
    if(e.persisted) overlay.classList.remove('active'); // back/forward cache
  });
})();
