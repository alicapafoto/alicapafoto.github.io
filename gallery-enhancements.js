(() => {
  const SWIPE_THRESHOLD = 44;
  const SWIPE_RATIO = 1.15;

  function addSwipeProtection(track) {
    if (!track || track.dataset.swipeProtection === 'true') return;
    track.dataset.swipeProtection = 'true';
    let startX = 0;
    let startY = 0;
    let suppressUntil = 0;

    track.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true, capture: true });

    track.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_RATIO) {
        suppressUntil = Date.now() + 500;
      }
    }, { passive: true, capture: true });

    track.addEventListener('click', (event) => {
      if (Date.now() >= suppressUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function bindCarouselKeyboard(carousel, previousSelector, nextSelector) {
    if (!carousel || carousel.dataset.keyboardBound === 'true') return;
    carousel.dataset.keyboardBound = 'true';
    carousel.tabIndex = carousel.hasAttribute('tabindex') ? carousel.tabIndex : 0;
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        carousel.querySelector(previousSelector)?.click();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        carousel.querySelector(nextSelector)?.click();
      }
    });
  }

  function createNavButton(direction, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gallery-lightbox-nav gallery-lightbox-nav--${direction}`;
    button.setAttribute('aria-label', label);
    button.textContent = direction === 'prev' ? '←' : '→';
    return button;
  }

  function bindSwipeSurface(surface, goPrevious, goNext) {
    if (!surface || surface.dataset.gallerySwipeBound === 'true') return;
    surface.dataset.gallerySwipeBound = 'true';
    let startX = 0;
    let startY = 0;

    surface.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    }, { passive: true });

    surface.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      if (Math.abs(deltaX) <= SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY) * SWIPE_RATIO) return;
      if (deltaX < 0) goNext();
      else goPrevious();
    }, { passive: true });
  }

  function enhancePrintViewer() {
    const lightbox = document.getElementById('printLightbox');
    const image = document.getElementById('lightboxImage');
    const title = document.getElementById('lightboxTitle');
    if (!lightbox || !image || !title) return;

    const state = { slides: [], index: 0 };

    function apply() {
      const slide = state.slides[state.index];
      if (!slide) return;
      image.src = slide.dataset.full || '';
      image.alt = `${slide.dataset.title || ''}, full screen view`;
      const border = Number(slide.dataset.border || 0);
      image.classList.toggle('border-25', border >= 25);
      image.classList.toggle('border-20', border >= 20 && border < 25);
      title.textContent = slide.dataset.title || '';
    }

    function move(amount) {
      if (!state.slides.length) return;
      state.index = (state.index + amount + state.slides.length) % state.slides.length;
      apply();
    }

    document.querySelectorAll('.artwork-carousel').forEach((carousel) => {
      addSwipeProtection(carousel.querySelector('.carousel-track'));
      bindCarouselKeyboard(carousel, '.carousel-prev', '.carousel-next');
    });

    document.addEventListener('click', (event) => {
      const slide = event.target.closest('.artwork-expand');
      if (!slide) return;
      const carousel = slide.closest('.artwork-carousel');
      state.slides = carousel ? [...carousel.querySelectorAll('.artwork-expand')] : [slide];
      state.index = Math.max(0, state.slides.indexOf(slide));
    }, true);

    const previous = createNavButton('prev', 'Show previous photograph view');
    const next = createNavButton('next', 'Show next photograph view');
    previous.addEventListener('click', (event) => { event.stopPropagation(); move(-1); });
    next.addEventListener('click', (event) => { event.stopPropagation(); move(1); });
    lightbox.append(previous, next);

    bindSwipeSurface(lightbox.querySelector('.lightbox-stage'), () => move(-1), () => move(1));

    document.addEventListener('keydown', (event) => {
      if (!lightbox.open) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    });
  }

  function enhanceOriginalArtworkViewer() {
    const lightbox = document.getElementById('lightbox');
    const image = document.getElementById('lightboxImage');
    if (!lightbox || !image || !document.querySelector('[data-artwork-carousel]')) return;

    const state = { slides: [], index: 0 };

    function apply() {
      const slide = state.slides[state.index];
      if (!slide) return;
      image.src = slide.dataset.lightbox || '';
      image.alt = slide.dataset.alt || '';
    }

    function move(amount) {
      if (!state.slides.length) return;
      state.index = (state.index + amount + state.slides.length) % state.slides.length;
      apply();
    }

    document.querySelectorAll('[data-artwork-carousel]').forEach((carousel) => {
      addSwipeProtection(carousel.querySelector('.artwork-carousel-track'));
      bindCarouselKeyboard(carousel, '.artwork-carousel-prev', '.artwork-carousel-next');
    });

    document.addEventListener('click', (event) => {
      const slide = event.target.closest('[data-lightbox]');
      if (!slide) return;
      const carousel = slide.closest('[data-artwork-carousel]');
      state.slides = carousel ? [...carousel.querySelectorAll('[data-lightbox]')] : [slide];
      state.index = Math.max(0, state.slides.indexOf(slide));
    }, true);

    const previous = createNavButton('prev', 'Show previous artwork view');
    const next = createNavButton('next', 'Show next artwork view');
    previous.addEventListener('click', (event) => { event.stopPropagation(); move(-1); });
    next.addEventListener('click', (event) => { event.stopPropagation(); move(1); });
    lightbox.append(previous, next);

    bindSwipeSurface(lightbox, () => move(-1), () => move(1));

    document.addEventListener('keydown', (event) => {
      if (!lightbox.classList.contains('open')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    });
  }

  function init() {
    enhancePrintViewer();
    enhanceOriginalArtworkViewer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
