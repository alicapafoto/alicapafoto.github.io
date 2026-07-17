const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeButton = document.getElementById('lightboxClose');

    document.querySelectorAll('[data-lightbox]').forEach(button => {
      button.addEventListener('click', () => {
        lightboxImage.src = button.dataset.lightbox;
        lightboxImage.alt = button.dataset.alt || '';
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        closeButton.focus();
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImage.src = '';
      document.body.classList.remove('lightbox-open');
    }

    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
