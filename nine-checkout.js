(() => {
  const PRODUCT_ID = "nine-europe-softcover";
  const dialog = document.getElementById("nineDialog");
  const openButton = document.querySelector("[data-nine-checkout]");
  const closeButton = dialog?.querySelector("[data-nine-close]");
  const countrySelect = dialog?.querySelector("[data-nine-country]");
  const quoteBox = dialog?.querySelector("[data-nine-quote]");
  const action = dialog?.querySelector("[data-nine-action]");
  const message = dialog?.querySelector("[data-nine-message]");
  let quote = null;
  let checkout = null;

  const euro = (cents) => new Intl.NumberFormat("en-IE", {
    style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100);

  function setBusy(busy, label = "Continue to secure checkout") {
    action.disabled = busy || !quote;
    action.textContent = busy ? label : "Continue to secure checkout";
  }

  function showMessage(value = "") { message.textContent = value; }

  async function loadCatalogue() {
    try {
      const response = await fetch("/api/catalog", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Catalogue unavailable");
      const payload = await response.json();
      const product = payload.products.find((item) => item.id === PRODUCT_ID);
      if (!product?.checkoutReady) throw new Error("Book checkout unavailable");
      countrySelect.replaceChildren(new Option("Choose a country", ""));
      payload.countries.forEach(({ code, name }) => countrySelect.add(new Option(name, code)));
      openButton.disabled = false;
    } catch (error) {
      console.error(error);
      openButton.disabled = true;
      openButton.textContent = "Europe · temporarily unavailable";
    }
  }

  async function getQuote() {
    quote = null; checkout = null; quoteBox.hidden = true; showMessage(); setBusy(false);
    const countryCode = countrySelect.value;
    if (!countryCode) return;
    setBusy(true, "Finding delivery options…");
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ productId: PRODUCT_ID, countryCode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Delivery unavailable");
      quote = payload;
      quoteBox.innerHTML = `<div class="store-quote__row"><span>NiNE · European Softcover</span><strong>${euro(payload.priceCents)}</strong></div>
        <div class="store-quote__row"><span>Delivery</span><strong>${euro(payload.shippingCents)}</strong></div>
        <div class="store-quote__row store-quote__row--total"><span>Total</span><strong>${euro(payload.totalCents)}</strong></div>
        <p class="store-quote__note"><strong>Production & delivery</strong><br>${payload.estimateNote}</p>`;
      quoteBox.hidden = false;
      setBusy(false);
    } catch (error) {
      console.error(error);
      showMessage("Delivery is temporarily unavailable. Please try again shortly.");
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!quote || !countrySelect.value) return;
    if (checkout?.url) { window.location.assign(checkout.url); return; }
    showMessage(); setBusy(true, "Preparing secure checkout…");
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ productId: PRODUCT_ID, countryCode: countrySelect.value }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout unavailable");
      checkout = payload;
      window.location.assign(payload.url);
    } catch (error) {
      console.error(error);
      showMessage("Secure checkout is temporarily unavailable. Please try again shortly.");
      setBusy(false);
    }
  }

  openButton?.addEventListener("click", () => {
    window.AliCapaAnalytics?.track?.("nine_purchase_clicked", { source: "europe" });
    quote = null; checkout = null; countrySelect.value = ""; quoteBox.hidden = true; showMessage(); setBusy(false);
    dialog.showModal(); countrySelect.focus();
  });
  closeButton?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  countrySelect?.addEventListener("change", getQuote);
  action?.addEventListener("click", startCheckout);
  if (openButton) openButton.disabled = true;
  loadCatalogue();
})();
