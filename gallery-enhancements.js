(() => {
  'use strict';

  const SWIPE_THRESHOLD = 38;
  const SWIPE_RATIO = 1.08;
  const boundCarousels = new WeakSet();
  let activeCarousel = null;

  const printLightbox = document.getElementById('printLightbox');
  const printImage = document.getElementById('lightboxImage');
  const printTitle = document.getElementById('lightboxTitle');
  const artworkLightbox = document.getElementById('lightbox');
  const artworkImage = artworkLightbox?.querySelector('#lightboxImage');

  const printViewer = { slides: [], index: 0 };
  const artworkViewer = { slides: [], index: 0 };

  function isTypingTarget(target) {
    return Boolean(target?.closest?.('input, select, textarea, [contenteditable="true"]'));
  }

  function isStoreDialogOpen() {
    return Boolean(document.getElementById('storeDialog')?.open);
  }

  function printViewerOpen() {
    return Boolean(printLightbox?.open);
  }

  function artworkViewerOpen() {
    return Boolean(artworkLightbox?.classList.contains('open'));
  }

  function carouselSelectors(carousel) {
    if (carousel?.hasAttribute('data-artwork-carousel')) {
      return { previous: '.artwork-carousel-prev', next: '.artwork-carousel-next' };
    }
    return { previous: '.carousel-prev', next: '.carousel-next' };
  }

  function moveCarousel(carousel, amount) {
    if (!carousel) return false;
    const selectors = carouselSelectors(carousel);
    const button = carousel.querySelector(amount < 0 ? selectors.previous : selectors.next);
    if (!button) return false;
    button.click();
    return true;
  }

  function nearestVisibleCarousel() {
    const carousels = [...document.querySelectorAll('.artwork-carousel, [data-artwork-carousel]')];
    const viewportCentre = window.innerHeight / 2;
    return carousels
      .map((carousel) => ({ carousel, rect: carousel.getBoundingClientRect() }))
      .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight)
      .sort((a, b) => Math.abs((a.rect.top + a.rect.bottom) / 2 - viewportCentre)
        - Math.abs((b.rect.top + b.rect.bottom) / 2 - viewportCentre))[0]?.carousel || null;
  }

  function addSwipeClickSuppression(track) {
    if (!track || track.dataset.swipeProtection === 'true') return;
    track.dataset.swipeProtection = 'true';

    let startX = 0;
    let startY = 0;
    let pointerId = null;
    let suppressUntil = 0;

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
    }, { passive: true, capture: true });

    track.addEventListener('pointerup', (event) => {
      if (pointerId !== null && event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      pointerId = null;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_RATIO) {
        suppressUntil = Date.now() + 650;
      }
    }, { passive: true, capture: true });

    track.addEventListener('pointercancel', () => { pointerId = null; }, { passive: true, capture: true });
    track.addEventListener('dragstart', (event) => event.preventDefault());
    track.addEventListener('click', (event) => {
      if (Date.now() >= suppressUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function bindCarousel(carousel) {
    if (!carousel || boundCarousels.has(carousel)) return;
    boundCarousels.add(carousel);
    carousel.tabIndex = carousel.hasAttribute('tabindex') ? carousel.tabIndex : 0;

    const activate = () => { activeCarousel = carousel; };
    carousel.addEventListener('mouseenter', activate, { passive: true });
    carousel.addEventListener('pointerdown', activate, { passive: true, capture: true });
    carousel.addEventListener('touchstart', activate, { passive: true, capture: true });
    carousel.addEventListener('focusin', activate);

    const track = carousel.querySelector('.carousel-track, .artwork-carousel-track');
    addSwipeClickSuppression(track);
  }

  function scanCarousels() {
    document.querySelectorAll('.artwork-carousel, [data-artwork-carousel]').forEach(bindCarousel);
  }

  function createNavButton(direction, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gallery-lightbox-nav gallery-lightbox-nav--${direction}`;
    button.setAttribute('aria-label', label);
    button.textContent = direction === 'prev' ? '←' : '→';
    return button;
  }

  function applyPrintView() {
    const slide = printViewer.slides[printViewer.index];
    if (!slide || !printImage || !printTitle) return;
    printImage.src = slide.dataset.full || '';
    printImage.alt = `${slide.dataset.title || ''}, full screen view`;
    const border = Number(slide.dataset.border || 0);
    printImage.classList.toggle('border-25', border >= 25);
    printImage.classList.toggle('border-20', border >= 20 && border < 25);
    printTitle.textContent = slide.dataset.title || '';
  }

  function movePrintView(amount) {
    if (!printViewer.slides.length) return false;
    printViewer.index = (printViewer.index + amount + printViewer.slides.length) % printViewer.slides.length;
    applyPrintView();
    return true;
  }

  function rememberPrintSlide(slide) {
    if (!slide) return;
    const carousel = slide.closest('.artwork-carousel');
    printViewer.slides = carousel ? [...carousel.querySelectorAll('.artwork-expand')] : [slide];
    printViewer.index = Math.max(0, printViewer.slides.indexOf(slide));
    activeCarousel = carousel || activeCarousel;
  }

  function applyArtworkView() {
    const slide = artworkViewer.slides[artworkViewer.index];
    if (!slide || !artworkImage) return;
    artworkImage.src = slide.dataset.lightbox || '';
    artworkImage.alt = slide.dataset.alt || '';
  }

  function moveArtworkView(amount) {
    if (!artworkViewer.slides.length) return false;
    artworkViewer.index = (artworkViewer.index + amount + artworkViewer.slides.length) % artworkViewer.slides.length;
    applyArtworkView();
    return true;
  }

  function rememberArtworkSlide(slide) {
    if (!slide) return;
    const carousel = slide.closest('[data-artwork-carousel]');
    artworkViewer.slides = carousel ? [...carousel.querySelectorAll('[data-lightbox]')] : [slide];
    artworkViewer.index = Math.max(0, artworkViewer.slides.indexOf(slide));
    activeCarousel = carousel || activeCarousel;
  }

  function bindSwipeSurface(surface, goPrevious, goNext) {
    if (!surface || surface.dataset.gallerySwipeBound === 'true') return;
    surface.dataset.gallerySwipeBound = 'true';

    let startX = 0;
    let startY = 0;
    let pointerId = null;
    let suppressUntil = 0;

    function completeSwipe(clientX, clientY) {
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      if (Math.abs(deltaX) <= SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY) * SWIPE_RATIO) return false;
      suppressUntil = Date.now() + 700;
      if (deltaX < 0) goNext();
      else goPrevious();
      return true;
    }

    if ('PointerEvent' in window) {
      surface.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        try { surface.setPointerCapture(event.pointerId); } catch {}
      }, { passive: true });

      surface.addEventListener('pointerup', (event) => {
        if (pointerId !== null && event.pointerId !== pointerId) return;
        const swiped = completeSwipe(event.clientX, event.clientY);
        pointerId = null;
        if (swiped) event.preventDefault();
      });

      surface.addEventListener('pointercancel', () => { pointerId = null; }, { passive: true });
    } else {
      surface.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      }, { passive: true });

      surface.addEventListener('touchend', (event) => {
        const touch = event.changedTouches[0];
        completeSwipe(touch.clientX, touch.clientY);
      }, { passive: true });
    }

    surface.addEventListener('dragstart', (event) => event.preventDefault());
    surface.addEventListener('click', (event) => {
      if (Date.now() >= suppressUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function installPrintViewerControls() {
    if (!printLightbox || !printImage || !printTitle) return;

    if (!printLightbox.querySelector('.gallery-lightbox-nav--prev')) {
      const previous = createNavButton('prev', 'Show previous photograph view');
      const next = createNavButton('next', 'Show next photograph view');
      previous.addEventListener('click', (event) => { event.stopPropagation(); movePrintView(-1); });
      next.addEventListener('click', (event) => { event.stopPropagation(); movePrintView(1); });
      printLightbox.append(previous, next);
    }

    bindSwipeSurface(printLightbox, () => movePrintView(-1), () => movePrintView(1));
  }

  function installArtworkViewerControls() {
    if (!artworkLightbox || !artworkImage) return;

    if (!artworkLightbox.querySelector('.gallery-lightbox-nav--prev')) {
      const previous = createNavButton('prev', 'Show previous artwork view');
      const next = createNavButton('next', 'Show next artwork view');
      previous.addEventListener('click', (event) => { event.stopPropagation(); moveArtworkView(-1); });
      next.addEventListener('click', (event) => { event.stopPropagation(); moveArtworkView(1); });
      artworkLightbox.append(previous, next);
    }

    bindSwipeSurface(artworkLightbox, () => moveArtworkView(-1), () => moveArtworkView(1));
  }

  document.addEventListener('pointerdown', (event) => {
    const printSlide = event.target.closest?.('.artwork-expand');
    if (printSlide) rememberPrintSlide(printSlide);
    const artworkSlide = event.target.closest?.('[data-artwork-carousel] [data-lightbox]');
    if (artworkSlide) rememberArtworkSlide(artworkSlide);
  }, true);

  document.addEventListener('click', (event) => {
    const printSlide = event.target.closest?.('.artwork-expand');
    if (printSlide) rememberPrintSlide(printSlide);
    const artworkSlide = event.target.closest?.('[data-artwork-carousel] [data-lightbox]');
    if (artworkSlide) rememberArtworkSlide(artworkSlide);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const amount = event.key === 'ArrowLeft' ? -1 : 1;

    if (printViewerOpen()) {
      event.preventDefault();
      movePrintView(amount);
      return;
    }

    if (artworkViewerOpen()) {
      event.preventDefault();
      moveArtworkView(amount);
      return;
    }

    if (isTypingTarget(event.target) || isStoreDialogOpen()) return;
    const carousel = activeCarousel?.isConnected ? activeCarousel : nearestVisibleCarousel();
    if (moveCarousel(carousel, amount)) event.preventDefault();
  });

  scanCarousels();
  installPrintViewerControls();
  installArtworkViewerControls();

  const observer = new MutationObserver(() => scanCarousels());
  observer.observe(document.body, { childList: true, subtree: true });
})();
