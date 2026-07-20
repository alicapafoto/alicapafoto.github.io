import { PRINT_CATALOG, PRINT_CATEGORIES } from './catalog/prints.js?v=20260720-colourful-dimensions-staging';

(() => {
  const trackEvent = (event, details = {}) => window.AliCapaAnalytics?.track?.(event, details);

  const state = {
    api: null,
    apiProducts: new Map(),
    work: null,
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
  const dialogIntro = dialog?.querySelector('[data-dialog-intro]');
  const dialogVariants = dialog?.querySelector('[data-dialog-variants]');
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

  const metricSize = (size) => String(size || '').split('/')[0].trim();
  const publicPaper = (work) => work.category === 'collector' ? 'Hahnemühle Pearl' : 'Lustre photographic paper';

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
            <button aria-label="Open framed wall view of ${work.title} full screen" class="carousel-slide artwork-expand" data-full="${work.mockupPath}" data-title="${work.title}, framed view" data-border="0" type="button">${pictureMarkup({ src: work.mockupPath, webp: work.mockupWebpPath, alt: `${work.title} displayed as a framed print in an interior` })}<span>View full screen</span><small class="carousel-caption">Shown framed for scale. Print supplied unframed.</small></button>
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

  function editionText(variant) {
    return variant.editionSize ? `Edition of ${variant.editionSize}` : 'Open edition';
  }

  function renderProductPanel(work) {
    const first = work.variants[0];
    const isCollector = work.category === 'collector';
    const borderText = work.borderMm ? `${work.borderMm} mm white border · ` : '';
    const sharedCertificate = isCollector ? '<p>Signed and numbered Certificate of Authenticity</p>' : '';
    const variantPreview = work.variants.length > 1
      ? `<div class="edition-preview">${work.variants.map((variant) => `
          <div><strong>${variant.label}</strong><span>${metricSize(variant.size)} · ${editionText(variant)} · ${formatEuro(variant.priceCents)}</span></div>`).join('')}</div>`
      : '';
    const price = work.variants.length > 1 ? `From ${formatEuro(Math.min(...work.variants.map((variant) => variant.priceCents)))}` : (first.priceCents === null ? 'Soon' : formatEuro(first.priceCents));
    return `
      <div class="product-panel" data-product-panel="${work.id}">
        <div>
          <p class="product-panel__eyebrow">${isCollector ? 'Collector Edition' : 'Dream Edition'}</p>
          <h3>${work.title}</h3>
          <div class="product-panel__facts">
            ${work.variants.length === 1 ? `<p>${metricSize(first.size)} · ${borderText}Unframed</p><p>${publicPaper(work)}</p><p>${editionText(first)}</p>` : `<p>${publicPaper(work)} · Unframed</p>`}
            ${sharedCertificate}
          </div>
          ${variantPreview}
          <p class="product-panel__delivery">Delivery is calculated for your destination.</p>
        </div>
        <div class="product-panel__price">
          <strong data-store-price>${price}</strong>
          <small>${work.variants.length > 1 ? 'Choose inside' : first.label}</small>
          <button class="store-buy" data-store-work="${work.id}" disabled type="button">${initialWorkButtonLabel(work)}</button>
        </div>
      </div>`;
  }

  function initialWorkButtonLabel(work) {
    if (work.variants.every((variant) => variant.availability === 'upcoming')) return 'Available soon';
    if (work.variants.every((variant) => variant.availability === 'sold-out')) return 'Sold out';
    return 'Acquire this print';
  }

  function bindCarouselsAndLightbox() {
    document.querySelectorAll('.artwork-expand').forEach((button) => button.addEventListener('click', () => {
      if (!lightbox || !lightboxImage || !lightboxTitle) return;
      lightboxImage.src = button.dataset.full;
      lightboxImage.alt = `${button.dataset.title}, full screen view`;
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

  function workStatus(work) {
    const apiVariants = work.variants.map((variant) => state.apiProducts.get(variant.id)).filter(Boolean);
    if (!apiVariants.length) return { enabled: false, label: initialWorkButtonLabel(work) };
    if (apiVariants.some((variant) => variant.checkoutReady)) return { enabled: true, label: 'Acquire this print' };
    if (apiVariants.every((variant) => variant.availability === 'upcoming')) return { enabled: false, label: 'Available soon' };
    if (apiVariants.every((variant) => variant.availability === 'sold-out')) return { enabled: false, label: 'Sold out' };
    return { enabled: false, label: 'Temporarily unavailable' };
  }

  function updateWorkButtons() {
    PRINT_CATALOG.forEach((work) => {
      const panel = document.querySelector(`[data-product-panel="${work.id}"]`);
      const button = panel?.querySelector('[data-store-work]');
      if (!button) return;
      const status = workStatus(work);
      button.disabled = !status.enabled;
      button.textContent = status.label;
    });
  }

  async function loadApiCatalogue() {
    try {
      const response = await fetch('/api/catalog', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue unavailable');
      state.api = await response.json();
      state.apiProducts = new Map(state.api.products.map((product) => [product.id, product]));
      countrySelect.replaceChildren(new Option('Choose a country', ''));
      state.api.countries.forEach(({ code, name }) => countrySelect.add(new Option(name, code)));
      updateWorkButtons();
      bindBuyButtons();
    } catch (error) {
      console.error(error);
      document.querySelectorAll('[data-store-work]').forEach((button) => {
        const work = PRINT_CATALOG.find((entry) => entry.id === button.dataset.storeWork);
        if (work?.variants.every((variant) => variant.availability === 'upcoming')) {
          button.textContent = 'Available soon';
        } else {
          button.textContent = 'Temporarily unavailable';
        }
        button.disabled = true;
      });
    }
  }

  function bindBuyButtons() {
    document.querySelectorAll('[data-store-work]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => openForWork(button.dataset.storeWork));
    });
  }

  function setMessage(value) {
    if (message) message.textContent = value || '';
  }

  function setBusy(busy, label = 'Continue to secure checkout') {
    if (!action) return;
    action.disabled = busy || !state.quote;
    action.textContent = busy ? label : 'Continue to secure checkout';
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
    setMessage('');
    setBusy(false);
  }

  function selectProduct(productId, recordSelection = false) {
    const product = state.apiProducts.get(productId);
    if (!product?.checkoutReady) return;
    state.product = product;
    if (recordSelection) trackEvent("print_variant_selected", { product: product.id, variant: product.label, source: "acquisition-dialog" });
    if (dialogVariant) dialogVariant.textContent = `${product.label} · ${metricSize(product.size)}`;
    dialogVariants?.querySelectorAll('[data-dialog-product]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.dialogProduct === productId);
      button.setAttribute('aria-pressed', String(button.dataset.dialogProduct === productId));
    });
    if (countrySelect) countrySelect.disabled = false;
    clearQuote();
  }

  function renderDialogVariants(work) {
    if (!dialogVariants) return;
    dialogVariants.innerHTML = '';
    if (work.variants.length === 1) {
      dialogVariants.hidden = true;
      const only = state.apiProducts.get(work.variants[0].id);
      if (only?.checkoutReady) selectProduct(only.id);
      return;
    }

    dialogVariants.hidden = false;
    dialogVariants.innerHTML = `
      <p class="dialog-variants__label">Choose an edition</p>
      <div class="dialog-variants__grid">
        ${work.variants.map((variant) => {
          const product = state.apiProducts.get(variant.id);
          const disabled = !product?.checkoutReady;
          return `<button type="button" data-dialog-product="${variant.id}" aria-pressed="false" ${disabled ? 'disabled' : ''}><strong>${variant.label}</strong><span>${metricSize(variant.size)}</span><span>${editionText(variant)} · ${formatEuro(variant.priceCents)}</span></button>`;
        }).join('')}
      </div>`;
    dialogVariants.querySelectorAll('[data-dialog-product]').forEach((button) => {
      button.addEventListener('click', () => selectProduct(button.dataset.dialogProduct, true));
    });
  }

  function openForWork(workId) {
    const work = PRINT_CATALOG.find((entry) => entry.id === workId);
    if (!work || !dialog) return;
    state.work = work;
    trackEvent("acquire_print_clicked", { product: work.id, source: "print-card" });
    state.product = null;
    state.quote = null;
    state.checkout = null;
    title.textContent = `Acquire ${work.title}`;
    dialogVariant.textContent = '';
    dialogIntro.textContent = work.variants.length > 1
      ? 'Choose an edition and your destination to see delivery and the complete price.'
      : 'Choose your destination to see delivery and the complete price.';
    countrySelect.disabled = work.variants.length > 1;
    clearQuote();
    renderDialogVariants(work);
    dialog.showModal();
    if (work.variants.length > 1) {
      dialogVariants.querySelector('button:not([disabled])')?.focus();
    } else {
      countrySelect.focus();
    }
  }

  function renderQuote(payload) {
    if (!quoteBox || !payload) return;
    quoteBox.innerHTML = `
      <div class="store-quote__row"><span>Print</span><strong>${formatEuro(payload.priceCents)}</strong></div>
      <div class="store-quote__row"><span>Delivery</span><strong>${formatEuro(payload.shippingCents)}</strong></div>
      <div class="store-quote__row store-quote__row--total"><span>Total</span><strong>${formatEuro(payload.totalCents)}</strong></div>
      <p class="store-quote__note"><strong>Estimated delivery</strong><br>${payload.estimateNote}</p>`;
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

  async function getQuote() {
    state.country = countrySelect.value;
    state.quote = null;
    state.checkout = null;
    quoteBox.hidden = true;
    setMessage('');
    if (!state.country || !state.product) {
      setBusy(false);
      return;
    }
    trackEvent("delivery_quote_requested", { product: state.product.id, variant: state.product.label, country: state.country, source: "browser" });
    setBusy(true, 'Finding delivery options…');
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Delivery is temporarily unavailable.');
      state.quote = payload;
      trackEvent("delivery_quote_succeeded", { product: state.product.id, variant: state.product.label, country: state.country, outcome: "success", source: "browser" });
      renderQuote(payload);
      setBusy(false);
    } catch (error) {
      console.error(error);
      trackEvent("delivery_quote_failed", { product: state.product?.id, variant: state.product?.label, country: state.country, outcome: "failed", source: "browser" });
      setMessage('Delivery is temporarily unavailable. Please try again shortly.');
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!state.quote || !state.product || !state.country) return;

    if (state.checkout?.url) {
      trackEvent("checkout_session_created", { product: state.product.id, variant: state.product.label, country: state.country, outcome: "redirect", source: "browser" });
      rememberCheckout(state.checkout);
      window.location.assign(state.checkout.url);
      return;
    }

    setMessage('');
    trackEvent("checkout_started", { product: state.product.id, variant: state.product.label, country: state.country, source: "browser" });
    setBusy(true, 'Preparing secure checkout…');
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be opened');

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
        setMessage('The delivery total changed while checkout was prepared. Please review the updated total before continuing.');
        action.disabled = false;
        action.textContent = `Confirm ${formatEuro(finalQuote.totalCents)} and continue`;
        return;
      }

      trackEvent("checkout_session_created", { product: state.product.id, variant: state.product.label, country: state.country, outcome: "redirect", source: "browser" });
      rememberCheckout(state.checkout);
      window.location.assign(state.checkout.url);
    } catch (error) {
      console.error(error);
      state.checkout = null;
      setMessage('Secure checkout is temporarily unavailable. Please try again shortly.');
      setBusy(false);
    }
  }

  renderCatalogue();
  renderDeepView();
  bindCarouselsAndLightbox();
  updateWorkButtons();
  loadApiCatalogue();

  countrySelect?.addEventListener('change', getQuote);
  action?.addEventListener('click', startCheckout);
  closeButton?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog?.addEventListener('close', () => {
    state.work = null;
    state.product = null;
    state.quote = null;
    state.checkout = null;
    setMessage('');
  });
  lightboxClose?.addEventListener('click', closeViewer);
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeViewer(); });
  lightbox?.addEventListener('cancel', (event) => { event.preventDefault(); closeViewer(); });
})();
