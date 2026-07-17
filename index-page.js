let cur = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const total = slides.length;
    function goTo(n) {
      slides[cur].classList.remove('active'); dots[cur].classList.remove('active'); dots[cur].setAttribute('aria-current','false');
      cur = n; slides[cur].classList.add('active'); dots[cur].classList.add('active'); dots[cur].setAttribute('aria-current','true');
    }
    let timer = setInterval(() => goTo((cur+1)%total), 15000);
    dots.forEach((d,i) => d.addEventListener('click', () => { clearInterval(timer); goTo(i); timer = setInterval(() => goTo((cur+1)%total), 15000); }));

    const imgs = Array.from(document.querySelectorAll('.gal-item img'));
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lbImg');
    let lbCur = 0;
    function setLbImage(i) { lbCur = i; lbImg.src = imgs[i].src; lbImg.alt = imgs[i].alt; }
    function openLb(i) { setLbImage(i); lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); document.body.classList.add('lightbox-open'); document.getElementById('lbClose').focus(); }
    function closeLb() { lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); document.body.classList.remove('lightbox-open'); }
    imgs.forEach((img, i) => {
      const item = img.parentElement;
      item.addEventListener('click', () => openLb(i));
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } });
    });
    document.getElementById('lbClose').addEventListener('click', closeLb);
    document.getElementById('lbPrev').addEventListener('click', () => setLbImage((lbCur-1+imgs.length)%imgs.length));
    document.getElementById('lbNext').addEventListener('click', () => setLbImage((lbCur+1)%imgs.length));
    lb.addEventListener('click', e => { if(e.target===lb) closeLb(); });
    document.addEventListener('keydown', e => {
      if(!lb.classList.contains('open')) return;
      if(e.key==='Escape') closeLb();
      if(e.key==='ArrowLeft') setLbImage((lbCur-1+imgs.length)%imgs.length);
      if(e.key==='ArrowRight') setLbImage((lbCur+1)%imgs.length);
    });

const homeNavs = document.querySelectorAll('.site-nav--home, .mobile-nav--home');
    const homeHero = document.querySelector('.hero');
    function updateHomeNav() {
      if (!homeHero || !homeNavs.length) return;
      const revealAt = Math.max(160, homeHero.offsetHeight - 120);
      const shouldShow = window.scrollY >= revealAt;
      homeNavs.forEach(nav => nav.classList.toggle('is-visible', shouldShow));
    }
    window.addEventListener('scroll', updateHomeNav, { passive: true });
    window.addEventListener('resize', updateHomeNav);
    window.addEventListener('load', updateHomeNav);
    updateHomeNav();
