const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeButton = document.getElementById('lightboxClose');

document.querySelectorAll('[data-lightbox]').forEach((button) => {
  button.addEventListener('click', () => {
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.dataset.alt || '';
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  });
});

document.querySelectorAll('[data-artwork-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.artwork-carousel-track');
  const slides = [...carousel.querySelectorAll('.artwork-slide')];
  const dots = [...carousel.querySelectorAll('.artwork-carousel-dot')];
  let index = 0;

  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, position) => slide.classList.toggle('is-active', position === index));
    dots.forEach((dot, position) => dot.classList.toggle('is-active', position === index));
  };

  carousel.querySelector('.artwork-carousel-prev')?.addEventListener('click', () => show(index - 1));
  carousel.querySelector('.artwork-carousel-next')?.addEventListener('click', () => show(index + 1));
  dots.forEach((dot, position) => dot.addEventListener('click', () => show(position)));

  let startX = 0;
  track?.addEventListener('touchstart', (event) => {
    startX = event.touches[0].clientX;
  }, { passive: true });
  track?.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1));
  }, { passive: true });
});

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  document.body.classList.remove('lightbox-open');
}

closeButton.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
});
