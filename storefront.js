import { PRINT_CATALOG, PRINT_CATEGORIES } from './catalog/prints.js';

(() => {
  const state = {
    api: null,
    apiProducts: new Map(),
    product: null,
    country: '',
    quote: null,
    checkout: null,
  };

  const groupNodes = new Map(
    [...document.querySelectorAll('[data-catalogue-group]')].map((node) => [node.dataset.catalogueGroup, node]),
  );
  const deepView = document.querySelector('[data-deep-view]');
  const dialog = document.getElementById('storeDialog');
  const title = dialog?.querySelector('[data-dialog-title]');
  const dialogVariant = dialog?.querySelector('[data-dialog-variant]');
  const countrySelect = dialog?.querySelector('[data-country]');
  const quoteBox = dialog?.querySelector('[data-quote]');
  const action = dialog?.querySelector('[data-checkout]');
  const message = dialog?.querySelector('[data-store-message]');
  const closeButton = dialog?.querySelector('[data-dialog-close]');
  const lightbox = document.getElementById('printLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxClose = document.getElementById('lightboxClose');

  const formatEuro = (cents) => new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);

  function borderClass(work) {
    if (work.borderMm >= 25) return ' border-25';
    if (work.borderMm >= 20) return ' border-20';
    return '';
  }

  function pictureMarkup({ src, webp, alt, loading = 'lazy', eager = false }) {
    const source = webp ? `<source srcset="${webp}" type="image/webp"/>` : '';
    return `<picture>${source}<img alt="${alt}" decoding="async" loading="${eager ? 'eager' : loading}" src="${src}"/></picture>`;
  }

  function categoryWorks(categoryId) {
    return PRINT_CATALOG
      .filter((work) => work.category === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  function renderCatalogue() {
    for (const categoryId of ['open', 'collector']) {
      const node = groupNodes.get(categoryId);
      const category = PRINT_CATEGORIES[categoryId];
      if (!node || !category) continue;
      node.innerHTML = `
        <header class="catalogue-group__header">
          <div><p class="eyebrow">${category.eyebrow}</p><h2 id="${categoryId}EditionsTitle">${category.title}</h2></div>
          <p>${category.overviewDescription}</p>
        </header>
        <div class="catalogue-grid">
          ${categoryWorks(categoryId).map(renderCard).join('')}
        </div>`;
    }
  }

  function renderCard(work) {
    const bordered = work.borderMm > 0;
    const availability = work.variants[0]?.availability;
    const badge = availability === 'upcoming'
      ? 'Available soon'
      : work.category === 'collector' ? 'Collector Edition' : 'Dream Edition';
    const preview = pictureMarkup({
      src: work.previewPath,
      webp: work.previewWebpPath,
      alt: `${work.title}, a photograph by Ali Capa`,
      eager: true,
    });
    const image = bordered
      ? `<span class="catalogue-card__paper${borderClass(work)}">${preview}</span>`
      : preview;
    return `
      <article class="catalogue-card">
        <a class="catalogue-card__link" href="#${work.id}" aria-label="View ${work.title} print details">
          <figure class="catalogue-card__image">${image}<span class="catalogue-card__badge">${badge}</span></figure>
          <div class="catalogue-card__meta"><h3>${work.title}</h3><p>${work.cardSummary}</p></div>
        </a>
      </article>`;
  }

  function renderDeepView() {
    if (!deepView) return;
    deepView.innerHTML = ['open', 'collector'].map((categoryId) => {
      const category = PRINT_CATEGORIES[categoryId];
      return `
        <header class="deep-category">
          <div class="deep-category__inner"><p class="eyebrow">${category.eyebrow}</p><h2>${category.title}</h2><p>${category.deepDescription}</p></div>
        </header>
        ${categoryWorks(categoryId).map(renderWork).join('')}`;
    }).join('');
  }

  function renderWork(work) {
    const artworkPicture = pictureMarkup({
      src: work.artworkPath,
      webp: work.artworkWebpPath,
      alt: `${work.title}, a photograph by Ali Capa`,
    });
    const artworkMedia = work.borderMm > 0
      ? `<span class="carousel-slide__paper${borderClass(work)}">${artworkPicture}</span>`
      : artworkPicture;
    const category = PRINT_CATEGORIES[work.category];
    return `
      <section class="print-reveal" id="${work.id}" data-work="${work.id}">
        <div class="reveal-heading">
          <div><span class="reveal-heading__category">${category.revealLabel}</span><h2>${work.title}</h2></div>
          <a href="#selection">Return to selection</a>
        </div>
        <div class="artwork-carousel" data-title="${work.title}">
          <div class="carousel-track">
            <button aria-label="Open ${work.title} full screen" class="carousel-slide artwork-expand is-active" data-full="${work.artworkWebpPath || work.artworkPath}" data-title="${work.title}" data-border="${work.borderMm}" type="button">${artworkMedia}<span>View full screen</span></button>
            <button aria-label="Open framed wall view of ${work.title} full screen" class="carousel-slide artwork-expand" data-full="${work.mockupPath}" data-title="${work.title}, framed view" data-border="0" type="button">${pictureMarkup({ src: work.mockupPath, webp: work.mockupWebpPath, alt: `${work.title} displayed as a framed print in an interior` })}<span>View full screen</span></button>
          </div>
          <div aria-label="Photograph views" class="carousel-controls">
            <button aria-label="Previous view" class="carousel-prev" type="button">←</button>
            <span><button aria-label="Show photograph view" class="carousel-dot is-active" type="button">01</button><button aria-label="Show framed view" class="carousel-dot" type="button">02</button></span>
            <button aria-label="Next view" class="carousel-next" type="button">→</button>
          </div>
        </div>
        ${renderProductPanel(work)}
      </section>`;
  }

  function renderProductPanel(work) {
    const first = work.variants[0];
    const variantOptions = work.variants.length > 1
      ? `<div class="variant-selector" role="group" aria-label="Choose ${work.title} size">${work.variants.map((variant, index) => `
          <button class="variant-option${index === 0 ? ' is-selected' : ''}" data-variant-option="${variant.id}" type="button"><strong>${variant.label}</strong><span>${variant.size} · ${formatEuro(variant.priceCents)}</span></button>`).join('')}</div>`
      : '';
    const extra = work.category === 'collector'
      ? `${work.borderMm ? `${work.borderMm} mm even white border · ` : 'Full bleed · '}Certificate of Authenticity: ${work.certificate} · Personal letter included`
      : 'Made to order · Supplied unframed · A printed thank-you note may be included where the fulfilment route permits';
    return `
      <div class="product-panel" data-product-panel="${work.id}" data-selected-variant="${first.id}">
        <div>
          <p class="product-panel__eyebrow">${work.category === 'collector' ? 'Limited Collector Edition' : first.availability === 'upcoming' ? 'In development' : 'Dream Edition'}</p>
          <h3>${work.title}</h3>
          <p class="product-panel__description">${work.description}</p>
          <p class="product-panel__specs" data-product-specs>${first.size} · ${first.paper} · Unframed</p>
          <p class="product-panel__note">${extra}</p>
          ${variantOptions}
          <p class="edition-note" data-edition-note>${editionText(first)}</p>
        </div>
        <div class="product-panel__price">
          <strong data-store-price>${first.priceCents === null ? 'Soon' : formatEuro(first.priceCents)}</strong>
          <small data-store-price-label>${first.label}</small>
          <button class="store-buy" data-store-product="${first.id}" disabled type="button">${initialButtonLabel(first)}</button>
        </div>
      </div>`;
  }

  function editionText(variant) {
    if (!variant.editionSize) return '';
    const remaining = Math.max(0, variant.editionSize - Number(variant.soldCount || 0));
    return `Edition of ${variant.editionSize} · ${remaining} currently available`;
  }

  function initialButtonLabel(variant) {
    if (variant.availability === 'upcoming') return 'Available soon';
    if (variant.availability === 'sold-out') return 'Sold out';
    return 'Checkout';
  }

  function bindCarouselsAndLightbox() {
    document.querySelectorAll('.artwork-expand').forEach((button) => button.addEventListener('click', () => {
      if (!lightbox || !lightboxImage || !lightboxTitle) return;
      lightboxImage.src = button.dataset.full;
      lightboxImage.alt = `${button.dataset.title}, full-screen view`;
      const lightboxBorder = Number(button.dataset.border || 0);
      lightboxImage.classList.toggle('border-25', lightboxBorder >= 25);
      lightboxImage.classList.toggle('border-20', lightboxBorder >= 20 && lightboxBorder < 25);
      lightboxTitle.textContent = button.dataset.title;
      lightbox.showModal();
      document.body.classList.add('lightbox-open');
    }));

    document.querySelectorAll('.artwork-carousel').forEach((carousel) => {
      const track = carousel.querySelector('.carousel-track');
      const slides = [...carousel.querySelectorAll('.carousel-slide')];
      const dots = [...carousel.querySelectorAll('.carousel-dot')];
      let index = 0;
      const show = (next) => {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, position) => slide.classList.toggle('is-active', position === index));
        dots.forEach((dot, position) => dot.classList.toggle('is-active', position === index));
      };
      carousel.querySelector('.carousel-prev')?.addEventListener('click', () => show(index - 1));
      carousel.querySelector('.carousel-next')?.addEventListener('click', () => show(index + 1));
      dots.forEach((dot, position) => dot.addEventListener('click', () => show(position)));
      let startX = 0;
      track.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', (event) => {
        const delta = event.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1));
      }, { passive: true });
    });
  }

  function closeViewer() {
    if (!lightbox) return;
    lightbox.close();
    lightboxImage.src = '';
    lightboxImage.classList.remove('border-20', 'border-25');
    document.body.classList.remove('lightbox-open');
  }

  function bindVariantSelectors() {
    document.querySelectorAll('[data-product-panel]').forEach((panel) => {
      const work = PRINT_CATALOG.find((entry) => entry.id === panel.dataset.productPanel);
      if (!work) return;
      panel.querySelectorAll('[data-variant-option]').forEach((button) => button.addEventListener('click', () => {
        panel.querySelectorAll('[data-variant-option]').forEach((option) => option.classList.toggle('is-selected', option === button));
        panel.dataset.selectedVariant = button.dataset.variantOption;
        updatePanel(work, button.dataset.variantOption);
      }));
    });
  }

  function updatePanel(work, productId) {
    const panel = document.querySelector(`[data-product-panel="${work.id}"]`);
    const variant = work.variants.find((entry) => entry.id === productId);
    if (!panel || !variant) return;
    const apiProduct = state.apiProducts.get(productId);
    panel.querySelector('[data-product-specs]').textContent = `${variant.size} · ${variant.paper} · Unframed`;
    panel.querySelector('[data-store-price]').textContent = variant.priceCents === null ? 'Soon' : formatEuro(apiProduct?.priceCents ?? variant.priceCents);
    panel.querySelector('[data-store-price-label]').textContent = apiProduct?.priceLabel || variant.label;
    panel.querySelector('[data-edition-note]').textContent = editionText(variant);
    const button = panel.querySelector('[data-store-product]');
    button.dataset.storeProduct = variant.id;
    if (apiProduct) {
      button.disabled = !apiProduct.checkoutReady;
      button.textContent = apiProduct.statusLabel;
    } else {
      button.disabled = true;
      button.textContent = initialButtonLabel(variant);
    }
  }

  async function loadApiCatalogue() {
    try {
      const response = await fetch('/api/catalog', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue unavailable');
      state.api = await response.json();
      state.apiProducts = new Map(state.api.products.map((product) => [product.id, product]));
      countrySelect.replaceChildren(new Option('Select delivery country', ''));
      state.api.countries.forEach(({ code, name }) => countrySelect.add(new Option(name, code)));
      PRINT_CATALOG.forEach((work) => updatePanel(work, document.querySelector(`[data-product-panel="${work.id}"]`)?.dataset.selectedVariant || work.variants[0].id));
      bindBuyButtons();
    } catch (error) {
      console.error(error);
      document.querySelectorAll('[data-store-product]').forEach((button) => {
        const staticVariant = PRINT_CATALOG.flatMap((work) => work.variants).find((variant) => variant.id === button.dataset.storeProduct);
        if (staticVariant?.availability === 'available') button.textContent = 'Checkout unavailable';
        button.disabled = true;
      });
    }
  }

  function bindBuyButtons() {
    document.querySelectorAll('[data-store-product]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => openFor(button.dataset.storeProduct));
    });
  }

  function setMessage(value) { if (message) message.textContent = value || ''; }
  function setBusy(busy, label = 'Continue to secure checkout') {
    if (!action) return;
    action.disabled = busy || !state.quote;
    action.textContent = busy ? label : 'Continue to secure checkout';
  }

  function renderQuote(payload) {
    if (!quoteBox || !payload) return;
    quoteBox.innerHTML = `
      <div class="store-quote__row"><span>${payload.product.title}, ${payload.product.label}</span><strong>${formatEuro(payload.priceCents)}</strong></div>
      <div class="store-quote__row"><span>Shipping &amp; handling</span><strong>${formatEuro(payload.shippingCents)}</strong></div>
      <div class="store-quote__row store-quote__row--total"><span>Total</span><strong>${formatEuro(payload.totalCents)}</strong></div>
      <p class="store-quote__note">${payload.estimateNote} Shipping is paid by the purchaser.</p>`;
    quoteBox.hidden = false;
  }

  function rememberCheckout(payload) {
    sessionStorage.setItem('aliCapaLastOrder', JSON.stringify({
      title: state.product.title,
      variant: state.product.label,
      sessionId: payload.sessionId,
      createdAt: new Date().toISOString(),
    }));
  }

  function openFor(productId) {
    const product = state.apiProducts.get(productId);
    if (!product?.checkoutReady || !dialog) return;
    state.product = product;
    state.country = '';
    state.quote = null;
    state.checkout = null;
    title.textContent = product.title;
    dialogVariant.textContent = `${product.label} · ${product.size}`;
    countrySelect.value = '';
    quoteBox.hidden = true;
    quoteBox.innerHTML = '';
    setMessage('');
    setBusy(false);
    dialog.showModal();
    countrySelect.focus();
  }

  async function getQuote() {
    state.country = countrySelect.value;
    state.quote = null;
    state.checkout = null;
    quoteBox.hidden = true;
    setMessage('');
    setBusy(true, 'Calculating delivery…');
    if (!state.country || !state.product) { setBusy(false); return; }
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Delivery could not be calculated');
      state.quote = payload;
      renderQuote(payload);
      setBusy(false);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!state.quote || !state.product || !state.country) return;

    if (state.checkout?.url) {
      rememberCheckout(state.checkout);
      window.location.assign(state.checkout.url);
      return;
    }

    setMessage('');
    setBusy(true, 'Confirming final delivery…');
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Secure checkout could not be opened');

      const finalQuote = {
        ...state.quote,
        priceCents: payload.priceCents,
        shippingCents: payload.shippingCents,
        totalCents: payload.totalCents,
        shippingMethod: payload.shippingMethod,
        estimateNote: payload.estimateNote || state.quote.estimateNote,
      };
      const amountChanged = Number(finalQuote.totalCents) !== Number(state.quote.totalCents)
        || Number(finalQuote.shippingCents) !== Number(state.quote.shippingCents);

      state.quote = finalQuote;
      state.checkout = { url: payload.url, sessionId: payload.sessionId };
      renderQuote(finalQuote);

      if (amountChanged) {
        setMessage('The live delivery rate changed while checkout was prepared. Review the exact total below, then confirm to continue.');
        action.disabled = false;
        action.textContent = `Confirm ${formatEuro(finalQuote.totalCents)} and continue`;
        return;
      }

      rememberCheckout(state.checkout);
      window.location.assign(state.checkout.url);
    } catch (error) {
      state.checkout = null;
      setMessage(error.message);
      setBusy(false);
    }
  }

  renderCatalogue();
  renderDeepView();
  bindCarouselsAndLightbox();
  bindVariantSelectors();
  PRINT_CATALOG.forEach((work) => updatePanel(work, work.variants[0].id));
  loadApiCatalogue();

  countrySelect?.addEventListener('change', getQuote);
  action?.addEventListener('click', startCheckout);
  closeButton?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('close', () => { state.product = null; state.quote = null; state.checkout = null; setMessage(''); });
  lightboxClose?.addEventListener('click', closeViewer);
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeViewer(); });
  lightbox?.addEventListener('cancel', (event) => { event.preventDefault(); closeViewer(); });
})();
