(() => {
  const formatEuro = (cents) => new Intl.NumberFormat(document.documentElement.lang || 'en', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(cents / 100);

  const state = { catalog: null, product: null, country: '', quote: null };
  const buttons = [...document.querySelectorAll('[data-store-product]')];
  const status = document.querySelector('[data-store-status]');
  const dialog = document.getElementById('storeDialog');
  if (!dialog || buttons.length === 0) return;

  const title = dialog.querySelector('[data-dialog-title]');
  const countrySelect = dialog.querySelector('[data-country]');
  const quoteBox = dialog.querySelector('[data-quote]');
  const action = dialog.querySelector('[data-checkout]');
  const message = dialog.querySelector('[data-store-message]');
  const closeButton = dialog.querySelector('[data-dialog-close]');

  const setMessage = (text = '') => { message.textContent = text; };
  const setBusy = (busy, label = 'Continue to secure checkout') => {
    action.disabled = busy || !state.quote;
    action.textContent = busy ? 'Preparing secure checkout…' : label;
  };

  async function loadCatalog() {
    try {
      const response = await fetch('/api/catalog', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Store configuration could not be loaded');
      state.catalog = await response.json();
      countrySelect.innerHTML = '<option value="">Select delivery country</option>' + state.catalog.countries
        .map(({ code, name }) => `<option value="${code}">${name}</option>`).join('');

      for (const button of buttons) {
        const product = state.catalog.products.find((item) => item.id === button.dataset.storeProduct);
        if (!product) continue;
        const panel = button.closest('.product-panel');
        panel?.querySelector('[data-store-price]')?.replaceChildren(document.createTextNode(formatEuro(product.priceCents)));
        panel?.querySelector('[data-store-price-label]')?.replaceChildren(document.createTextNode(product.priceLabel));
        button.disabled = !product.active || !state.catalog.checkoutReady;
        if (!state.catalog.checkoutReady) button.textContent = 'Checkout setup in progress';
      }

      if (status) {
        status.textContent = state.catalog.checkoutReady ? 'Secure checkout available' : 'Secure checkout staging';
        status.classList.toggle('is-live', state.catalog.checkoutReady);
      }
    } catch (error) {
      console.error(error);
      buttons.forEach((button) => { button.disabled = true; button.textContent = 'Checkout temporarily unavailable'; });
      if (status) status.textContent = 'Checkout temporarily unavailable';
    }
  }

  function openFor(productId) {
    const product = state.catalog?.products.find((item) => item.id === productId);
    if (!product?.active || !state.catalog.checkoutReady) return;
    state.product = product;
    state.country = '';
    state.quote = null;
    title.textContent = product.title;
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
      quoteBox.innerHTML = `
        <div class="store-quote__row"><span>${payload.product.title}</span><strong>${formatEuro(payload.priceCents)}</strong></div>
        <div class="store-quote__row"><span>Shipping &amp; handling</span><strong>${formatEuro(payload.shippingCents)}</strong></div>
        <div class="store-quote__row store-quote__row--total"><span>Total</span><strong>${formatEuro(payload.totalCents)}</strong></div>
        <p class="store-quote__note">${payload.estimateNote} Delivery is fulfilled from the nearest available production partner where possible.</p>`;
      quoteBox.hidden = false;
      setBusy(false);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!state.quote || !state.product || !state.country) return;
    setMessage('');
    setBusy(true);
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: state.product.id, countryCode: state.country }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Secure checkout could not be opened');
      sessionStorage.setItem('aliCapaLastOrder', JSON.stringify({
        title: state.product.title, sessionId: payload.sessionId, createdAt: new Date().toISOString(),
      }));
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  buttons.forEach((button) => button.addEventListener('click', () => openFor(button.dataset.storeProduct)));
  countrySelect.addEventListener('change', getQuote);
  action.addEventListener('click', startCheckout);
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { state.product = null; state.quote = null; setMessage(''); });

  loadCatalog();
})();
