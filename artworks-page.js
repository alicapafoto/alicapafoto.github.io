const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeButton = document.getElementById('lightboxClose');

const storeDialog = document.getElementById('artworkStoreDialog');
const storeTitle = storeDialog?.querySelector('[data-artwork-dialog-title]');
const storeDetails = storeDialog?.querySelector('[data-artwork-dialog-details]');
const countrySelect = storeDialog?.querySelector('[data-artwork-country]');
const quoteBox = storeDialog?.querySelector('[data-artwork-quote]');
const checkoutButton = storeDialog?.querySelector('[data-artwork-checkout]');
const storeMessage = storeDialog?.querySelector('[data-artwork-message]');
const storeClose = storeDialog?.querySelector('[data-artwork-dialog-close]');

const state = {
  products: new Map(),
  countries: [],
  product: null,
  country: '',
  quote: null,
  checkout: null,
  reservationToken: '',
};

const trackEvent = (event, details = {}) => window.AliCapaAnalytics?.track?.(event, details);

const formatEuro = (cents) => new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format((Number(cents) || 0) / 100);

function newReservationToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `art-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

document.querySelectorAll('[data-lightbox]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!lightbox || !lightboxImage || !closeButton) return;
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
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  document.body.classList.remove('lightbox-open');
}

closeButton?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox?.classList.contains('open')) closeLightbox();
});

function statusPresentation(product) {
  if (!product) return { label: 'Temporarily unavailable', button: 'Temporarily unavailable', className: 'upcoming' };
  if (product.availability === 'sold') return { label: 'Sold', button: 'Sold', className: 'sold' };
  if (product.availability === 'reserved') return { label: 'Temporarily reserved', button: 'Temporarily reserved', className: 'reserved' };
  if (product.checkoutReady) return { label: 'Available', button: 'Acquire this artwork', className: 'available' };
  return { label: 'Temporarily unavailable', button: 'Temporarily unavailable', className: 'upcoming' };
}

function updateArtworkCards() {
  document.querySelectorAll('[data-artwork-product]').forEach((button) => {
    const product = state.products.get(button.dataset.artworkProduct);
    const card = button.closest('.work-card');
    const price = card?.querySelector('[data-artwork-price]');
    const status = card?.querySelector('[data-artwork-status]');
    const presentation = statusPresentation(product);

    if (price && product) price.textContent = formatEuro(product.priceCents);
    if (status) {
      status.textContent = presentation.label;
      status.className = presentation.className;
    }
    button.textContent = presentation.button;
    button.disabled = !product?.checkoutReady;
    button.setAttribute('aria-disabled', String(!product?.checkoutReady));
  });
}

async function loadArtworkCatalogue() {
  try {
    const response = await fetch('/api/artworks-catalog', { headers: { accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Artwork catalogue unavailable');
    state.products = new Map(payload.products.map((product) => [product.id, product]));
    state.countries = payload.countries || [];
    updateArtworkCards();
  } catch (error) {
    console.error(error);
    updateArtworkCards();
  }
}

function setStoreMessage(value) {
  if (storeMessage) storeMessage.textContent = value || '';
}

function setCheckoutBusy(busy, label = 'Continue to secure checkout') {
  if (!checkoutButton) return;
  checkoutButton.disabled = busy || !state.quote;
  checkoutButton.textContent = busy ? label : 'Continue to secure checkout';
}

function clearQuote() {
  state.country = '';
  state.quote = null;
  state.checkout = null;
  if (countrySelect) countrySelect.value = '';
  if (quoteBox) {
    quoteBox.hidden = true;
    quoteBox.innerHTML = '';
  }
  setStoreMessage('');
  setCheckoutBusy(false);
}

function populateCountries() {
  if (!countrySelect) return;
  countrySelect.replaceChildren(new Option('Choose a country', ''));
  state.countries.forEach(({ code, name }) => countrySelect.add(new Option(name, code)));
}

function openArtworkStore(productId) {
  const product = state.products.get(productId);
  if (!product?.checkoutReady || !storeDialog) return;
  state.product = product;
  state.reservationToken = newReservationToken();
  if (storeTitle) storeTitle.textContent = `Acquire ${product.title}`;
  if (storeDetails) storeDetails.textContent = `${product.label} · ${product.size} · ${formatEuro(product.priceCents)}`;
  populateCountries();
  clearQuote();
  trackEvent('acquire_original_artwork_clicked', { product: product.id, source: 'original-artworks' });
  storeDialog.showModal();
  countrySelect?.focus();
}

document.querySelectorAll('[data-artwork-product]').forEach((button) => {
  button.addEventListener('click', () => openArtworkStore(button.dataset.artworkProduct));
});

function renderQuote(payload) {
  if (!quoteBox || !payload) return;
  quoteBox.innerHTML = `
    <div class="artwork-store-quote__row"><span>Original artwork</span><strong>${formatEuro(payload.priceCents)}</strong></div>
    <div class="artwork-store-quote__row"><span>Tracked protective delivery</span><strong>${formatEuro(payload.shippingCents)}</strong></div>
    <div class="artwork-store-quote__row artwork-store-quote__row--total"><span>Total</span><strong>${formatEuro(payload.totalCents)}</strong></div>
    <p class="artwork-store-quote__note">${payload.estimateNote}</p>`;
  quoteBox.hidden = false;
}

async function requestArtworkQuote() {
  state.country = countrySelect?.value || '';
  state.quote = null;
  state.checkout = null;
  if (quoteBox) quoteBox.hidden = true;
  setStoreMessage('');

  if (!state.product || !state.country) {
    setCheckoutBusy(false);
    return;
  }

  trackEvent('original_artwork_delivery_quote_requested', {
    product: state.product.id,
    country: state.country,
    source: 'original-artworks',
  });
  setCheckoutBusy(true, 'Calculating delivery…');

  try {
    const response = await fetch('/api/artworks-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Delivery is temporarily unavailable.');
    state.quote = payload;
    renderQuote(payload);
    setCheckoutBusy(false);
    trackEvent('original_artwork_delivery_quote_succeeded', {
      product: state.product.id,
      country: state.country,
      outcome: 'success',
      source: 'original-artworks',
    });
  } catch (error) {
    console.error(error);
    setStoreMessage(error.message || 'Delivery is temporarily unavailable.');
    setCheckoutBusy(false);
    await loadArtworkCatalogue();
  }
}

function rememberArtworkCheckout(payload) {
  sessionStorage.setItem('aliCapaLastArtworkOrder', JSON.stringify({
    title: state.product?.title || '',
    productId: state.product?.id || '',
    sessionId: payload.sessionId,
    createdAt: new Date().toISOString(),
  }));
}

async function startArtworkCheckout() {
  if (!state.quote || !state.product || !state.country) return;

  if (state.checkout?.url) {
    rememberArtworkCheckout(state.checkout);
    window.location.assign(state.checkout.url);
    return;
  }

  setStoreMessage('');
  setCheckoutBusy(true, 'Reserving artwork…');
  trackEvent('original_artwork_checkout_started', {
    product: state.product.id,
    country: state.country,
    source: 'original-artworks',
  });

  try {
    const response = await fetch('/api/artworks-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        productId: state.product.id,
        countryCode: state.country,
        reservationToken: state.reservationToken,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.url) throw new Error(payload.error || 'Secure checkout could not be opened.');

    const finalQuote = {
      ...state.quote,
      priceCents: payload.priceCents,
      shippingCents: payload.shippingCents,
      totalCents: payload.totalCents,
      estimateNote: payload.estimateNote || state.quote.estimateNote,
    };
    const amountChanged = Number(finalQuote.totalCents) !== Number(state.quote.totalCents)
      || Number(finalQuote.shippingCents) !== Number(state.quote.shippingCents);

    state.quote = finalQuote;
    state.checkout = { url: payload.url, sessionId: payload.sessionId };
    renderQuote(finalQuote);

    if (amountChanged) {
      setStoreMessage('The delivery total changed while checkout was prepared. Review the updated total before continuing.');
      checkoutButton.disabled = false;
      checkoutButton.textContent = `Confirm ${formatEuro(finalQuote.totalCents)} and continue`;
      return;
    }

    trackEvent('original_artwork_checkout_session_created', {
      product: state.product.id,
      country: state.country,
      outcome: 'redirect',
      source: 'original-artworks',
    });
    rememberArtworkCheckout(state.checkout);
    window.location.assign(state.checkout.url);
  } catch (error) {
    console.error(error);
    state.checkout = null;
    setStoreMessage(error.message || 'Secure checkout is temporarily unavailable.');
    setCheckoutBusy(false);
    await loadArtworkCatalogue();
  }
}

countrySelect?.addEventListener('change', requestArtworkQuote);
checkoutButton?.addEventListener('click', startArtworkCheckout);
storeClose?.addEventListener('click', () => storeDialog?.close());
storeDialog?.addEventListener('click', (event) => {
  if (event.target === storeDialog) storeDialog.close();
});
storeDialog?.addEventListener('close', () => {
  state.product = null;
  state.country = '';
  state.quote = null;
  state.checkout = null;
  state.reservationToken = '';
  setStoreMessage('');
});

updateArtworkCards();
loadArtworkCatalogue();
