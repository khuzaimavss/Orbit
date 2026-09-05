/* ============================================================
   ORBIT — shared motion layer
   Custom cursor, scroll-triggered reveals, and soft page
   transitions between internal links. Loaded on every page.
   Skips itself gracefully on touch devices.
   ============================================================ */

(function(){
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- page transition overlay ---------- */
  const overlay = document.createElement('div');
  overlay.id = 'pageTransition';
  document.body.appendChild(overlay);

  const hasSplash = !!document.getElementById('splash');
  if(!hasSplash){
    // fade the page IN from void on load (index.html's own splash handles this role there)
    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
  } else {
    overlay.style.opacity = '0';
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if(!link) return;
    const href = link.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if(link.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    let url;
    try{ url = new URL(href, location.href); }catch(err){ return; }
    if(url.origin !== location.origin) return;

    e.preventDefault();
    overlay.style.opacity = '1';
    setTimeout(() => { location.href = url.href; }, 320);
  });

  /* ---------- scroll-triggered reveals ---------- */
  // exposed globally so pages can call it again after injecting async content
  // (product grids, reviews, cart lines, admin tables all render after this script runs)
  let revealIO = null;
  function applyReveal(){
    const revealSelectors = '.product-card, .quick-card, .review-card, .cart-line, .step-card, .stat-card';
    const els = document.querySelectorAll(revealSelectors);
    if(!els.length || !('IntersectionObserver' in window)) return;
    if(!revealIO){
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add('in-view');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }
    els.forEach((el, i) => {
      if(el.dataset.revealBound) return;
      el.dataset.revealBound = '1';
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i % 8, 8) * 0.06) + 's';
      revealIO.observe(el);
    });
  }
  window.ORBIT = window.ORBIT || {};
  window.ORBIT.applyReveal = applyReveal;
  applyReveal();

  /* ---------- custom cursor (fine pointers only) ---------- */
  if(!isFinePointer) return;

  document.documentElement.classList.add('has-cursor');
  const dot = document.createElement('div');
  dot.id = 'cursorDot';
  const ring = document.createElement('div');
  ring.id = 'cursorRing';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
  let started = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
    if(!started){ ringX = mouseX; ringY = mouseY; started = true; }

    const hoverTarget = e.target.closest('a, button, .filter-chip, input, textarea, select, .quick-card, .product-card');
    document.body.classList.toggle('cursor-hover', !!hoverTarget);
  });

  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0'; ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1'; ring.style.opacity = '1';
  });

  function tick(){
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(tick);
  }
  tick();
})();
