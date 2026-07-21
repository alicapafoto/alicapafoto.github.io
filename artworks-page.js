const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeButton = document.getElementById('lightboxClose');

const ARTWORK_IDS = ['dusaemas', 'gold', 'study', 'untitled'];
const acquisitionState = {
  catalogue: null,
  selectedArtwork: null,
  quote: null,
  checkoutAttemptId: null,
  busy: false,
};

loadAcquisitionStyles();
const acquisitionDialog = createAcquisitionDialog();
const acquisitionForm = acquisitionDialog.querySelector('[data-artwork-form]');
const acquisitionTitle = acquisitionDialog.querySelector('[data-artwork-dialog-title]');
const acquisitionSubtitle = acquisitionDialog.querySelector('[data-artwork-dialog-subtitle]');
const acquisitionMessage = acquisitionDialog.querySelector('[data-artwork-message]');
const quoteBox = acquisitionDialog.querySelector('[data-artwork-quote]');
const quoteButton = acquisitionDialog.querySelector('[data-artwork-get-quote]');
const checkoutButton = acquisitionDialog.querySelector('[data-artwork-checkout]');
const dialogCloseButton = acquisitionDialog.querySelector('[data-artwork-close]');
const countrySelect = acquisitionDialog.querySelector('[data-artwork-country]');

function loadAcquisitionStyles() {
  if (document.querySelector('link[data-artwork-acquisition-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'artwork-acquisition.css?v=20260721-quote-first';
  link.dataset.artworkAcquisitionStyles = 'true';
  document.head.append(link);
}

function createAcquisitionDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'artwork-acquisition-dialog';
  dialog.id = 'artworkAcquisitionDialog';
  dialog.setAttribute('aria-labelledby', 'artworkAcquisitionTitle');
  dialog.innerHTML = `
    <div class="artwork-acquisition-dialog__inner">
      <div class="artwork-acquisition-dialog__top">
        <div>
          <p class="eyebrow">Original Artworks</p>
          <h2 id="artworkAcquisitionTitle" data-artwork-dialog-title>Acquire this artwork</h2>
          <p class="artwork-acquisition-dialog__subtitle" data-artwork-dialog-subtitle></p>
        </div>
        <button class="artwork-acquisition-dialog__close" data-artwork-close type="button">Close</button>
      </div>
      <p class="artwork-acquisition-dialog__intro">Enter the delivery address to calculate insured delivery. The artwork is not reserved until you approve the complete total and secure checkout is created.</p>
      <form class="artwork-acquisition-form" data-artwork-form novalidate>
        <label class="artwork-field artwork-field--wide">
          <span>Recipient name</span>
          <input autocomplete="name" data-artwork-recipient maxlength="100" required type="text"/>
        </label>
        <label class="artwork-field artwork-field--wide">
          <span>Address</span>
          <input autocomplete="address-line1" data-artwork-address-one maxlength="120" required type="text"/>
        </label>
        <label class="artwork-field artwork-field--wide">
          <span>Address line 2 <small>Optional</small></span>
          <input autocomplete="address-line2" data-artwork-address-two maxlength="120" type="text"/>
        </label>
        <label class="artwork-field">
          <span>City</span>
          <input autocomplete="address-level2" data-artwork-city maxlength="80" required type="text"/>
        </label>
        <label class="artwork-field">
          <span>State or region <small>Optional</small></span>
          <input autocomplete="address-level1" data-artwork-state maxlength="80" type="text"/>
        </label>
        <label class="artwork-field">
          <span>Postal code</span>
          <input autocomplete="postal-code" data-artwork-postal maxlength="16" required type="text"/>
        </label>
        <label class="artwork-field">
          <span>Country</span>
          <select autocomplete="country" data-artwork-country required><option value="">Choose a country</option></select>
        </label>
      </form>
      <div class="artwork-quote" data-artwork-quote hidden></div>
      <p aria-live="polite" class="artwork-acquisition-message" data-artwork-message role="status"></p>
      <div class="artwork-acquisition-actions">
        <button class="artwork-acquisition-secondary" data-artwork-get-quote type="button">Calculate insured delivery</button>
        <button class="artwork-acquisition-primary" data-artwork-checkout disabled type="button">Reserve and continue</button>
      </div>
      <p class="artwork-acquisition-terms">Secure payment is completed through Stripe. By continuing, you agree to the <a href="terms.html" target="_blank">Terms</a> and acknowledge the <a href="privacy.html" target="_blank">Privacy Policy</a>.</p>
    </div>`;
  document.body.append(dialog);
  return dialog;
}

function formatEuro(cents) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);
}

function setMessage(value) {
  acquisitionMessage.textContent = value || '';
}

function setBusy(busy, label = '') {
  acquisitionState.busy = busy;
  quoteButton.disabled = busy;
  checkoutButton.disabled = busy || !acquisitionState.quote;
  if (busy && label) quoteButton.textContent = label;
  else quoteButton.textContent = 'Calculate insured delivery';
  checkoutButton.textContent = busy ? 'Preparing secure checkout…' : 'Reserve and continue';
  acquisitionForm.querySelectorAll('input, select').forEach((field) => { field.disabled = busy; });
}

function shippingAddressFromForm() {
  return {
    recipientName: acquisitionForm.querySelector('[data-artwork-recipient]').value,
    addressLine1: acquisitionForm.querySelector('[data-artwork-address-one]').value,
    addressLine2: acquisitionForm.querySelector('[data-artwork-address-two]').value,
    city: acquisitionForm.querySelector('[data-artwork-city]').value,
    state: acquisitionForm.querySelector('[data-artwork-state]').value,
    postalCode: acquisitionForm.querySelector('[data-artwork-postal]').value,
    countryCode: countrySelect.value,
  };
}

function resetQuote() {
  acquisitionState.quote = null;
  acquisitionState.checkoutAttemptId = null;
  quoteBox.hidden = true;
  quoteBox.innerHTML = '';
  checkoutButton.disabled = true;
  setMessage('');
}

function renderQuote(payload) {
  acquisitionState.quote = payload;
  quoteBox.innerHTML = `
    <div class="artwork-quote__row"><span>Original artwork</span><strong>${formatEuro(payload.artwork.priceCents)}</strong></div>
    <div class="artwork-quote__row"><span>Insured delivery</span><strong>${formatEuro(payload.shipping.customerCents)}</strong></div>
    <div class="artwork-quote__row artwork-quote__row--total"><span>Total</span><strong>${formatEuro(payload.totalCents)}</strong></div>
    <p><strong>${payload.shipping.method}</strong><br>${payload.shipping.estimateNote}</p>
    <p>The complete artwork is declared and insured at ${formatEuro(payload.artwork.declaredValueCents)}.</p>`;
  quoteBox.hidden = false;
  checkoutButton.disabled = false;
}

function populateCountries(countries = []) {
  if (countrySelect.options.length > 1) return;
  countries.forEach(({ code, name }) => countrySelect.add(new Option(name, code)));
}

function updateArtworkCard(artwork) {
  const card = document.getElementById(artwork.id);
  if (!card) return;
  const statusNode = card.querySelector('.work-details dd.upcoming, .work-details dd.available, .work-details dd.sold, .work-details dd.unavailable');
  const button = card.querySelector('.work-actions button');
  const shippingNote = card.querySelector('.shipping-note');
  if (statusNode) {
    statusNode.textContent = artwork.status.label;
    statusNode.classList.remove('upcoming', 'available', 'sold', 'unavailable');
    const statusClass = artwork.status.code === 'available' ? 'available'
      : artwork.status.code === 'opening-soon' ? 'upcoming'
        : artwork.status.code;
    statusNode.classList.add(statusClass);
  }
  if (button) {
    button.disabled = !artwork.status.reservable;
    button.textContent = artwork.status.label;
    button.dataset.acquireArtwork = artwork.id;
    button.classList.toggle('action-link--disabled', !artwork.status.reservable);
  }
  if (shippingNote) {
    shippingNote.textContent = artwork.status.reservable
      ? 'Insured delivery is calculated for your destination.'
      : artwork.status.code === 'sold'
        ? 'This unique artwork has entered a private collection.'
        : 'Insured delivery is being prepared.';
  }
}

async function loadArtworkAvailability() {
  try {
    const response = await fetch('/api/original-artworks/status', { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('Availability unavailable');
    const payload = await response.json();
    acquisitionState.catalogue = payload;
    populateCountries(payload.countries);
    payload.artworks.forEach(updateArtworkCard);
  } catch (error) {
    console.error(error);
    ARTWORK_IDS.forEach((id) => {
      const button = document.querySelector(`#${id} .work-actions button`);
      if (button) {
        button.disabled = true;
        button.textContent = 'Acquisition opening soon';
        button.classList.add('action-link--disabled');
      }
    });
  }
}

function openAcquisition(artworkId) {
  const artwork = acquisitionState.catalogue?.artworks?.find((item) => item.id === artworkId);
  if (!artwork?.status?.reservable || acquisitionState.busy) return;
  acquisitionState.selectedArtwork = artwork;
  acquisitionTitle.textContent = `Acquire ${artwork.title}`;
  acquisitionSubtitle.textContent = `Unique original · ${formatEuro(artwork.priceCents)}`;
  acquisitionForm.reset();
  resetQuote();
  acquisitionDialog.showModal();
  acquisitionForm.querySelector('[data-artwork-recipient]').focus();
}

async function requestQuote() {
  if (acquisitionState.busy || !acquisitionState.selectedArtwork) return;
  if (!acquisitionForm.reportValidity()) return;
  setBusy(true, 'Calculating insured delivery…');
  setMessage('');
  try {
    const response = await fetch('/api/original-artworks/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        artworkId: acquisitionState.selectedArtwork.id,
        shippingAddress: shippingAddressFromForm(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Insured delivery could not be calculated.');
    renderQuote(payload);
  } catch (error) {
    console.error(error);
    resetQuote();
    setMessage(error.message || 'Insured delivery could not be calculated.');
  } finally {
    setBusy(false);
  }
}

async function reserveAndCreateCheckout() {
  if (acquisitionState.busy || !acquisitionState.quote || !acquisitionState.selectedArtwork) return;
  if (!acquisitionForm.reportValidity()) return;
  acquisitionState.checkoutAttemptId ||= crypto.randomUUID();
  setBusy(true);
  setMessage('The delivery quote is being rechecked before the artwork is reserved.');
  try {
    const response = await fetch('/api/original-artworks/reserve-and-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        artworkId: acquisitionState.selectedArtwork.id,
        shippingAddress: shippingAddressFromForm(),
        expectedShippingCents: acquisitionState.quote.shipping.customerCents,
        checkoutAttemptId: acquisitionState.checkoutAttemptId,
      }),
    });
    const payload = await response.json();
    if (payload.quoteChanged) {
      renderQuote(payload);
      setMessage(payload.error);
      setBusy(false);
      return;
    }
    if (!response.ok || !payload.url) throw new Error(payload.error || 'Secure checkout could not be created.');

    sessionStorage.setItem('aliCapaOriginalReservation', JSON.stringify({
      artworkId: acquisitionState.selectedArtwork.id,
      title: acquisitionState.selectedArtwork.title,
      priceCents: payload.artwork.priceCents,
      shippingCents: payload.shipping.customerCents,
      totalCents: payload.totalCents,
      reservationId: payload.reservationId,
      reservationToken: payload.reservationToken || '',
      reservedUntil: payload.reservedUntil,
      sessionId: payload.sessionId,
      checkoutUrl: payload.url,
      createdAt: new Date().toISOString(),
    }));
    window.location.assign('artwork-reserved.html');
  } catch (error) {
    console.error(error);
    setMessage(error.message || 'Secure checkout could not be created.');
    setBusy(false);
    await loadArtworkAvailability();
  }
}

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

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-acquire-artwork]');
  if (button && !button.disabled) openAcquisition(button.dataset.acquireArtwork);
});
acquisitionForm.addEventListener('input', resetQuote);
acquisitionForm.addEventListener('change', resetQuote);
quoteButton.addEventListener('click', requestQuote);
checkoutButton.addEventListener('click', reserveAndCreateCheckout);
dialogCloseButton.addEventListener('click', () => {
  if (!acquisitionState.busy) acquisitionDialog.close();
});
acquisitionDialog.addEventListener('click', (event) => {
  if (event.target === acquisitionDialog && !acquisitionState.busy) acquisitionDialog.close();
});
acquisitionDialog.addEventListener('close', () => {
  acquisitionState.selectedArtwork = null;
  acquisitionState.quote = null;
  acquisitionState.checkoutAttemptId = null;
  setMessage('');
});

loadArtworkAvailability();
setInterval(() => {
  if (!document.hidden && !acquisitionDialog.open) loadArtworkAvailability();
}, 60_000);
