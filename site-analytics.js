(() => {
  const legacyHosts = new Set([
    "alicapafoto.github.io",
    "www.alicapafoto.github.io",
  ]);

  if (legacyHosts.has(window.location.hostname.toLowerCase())) {
    const path = window.location.pathname === "/index.html" ? "/" : window.location.pathname;
    const destination = `https://alicapa.com${path}${window.location.search}${window.location.hash}`;
    window.location.replace(destination);
    return;
  }

  const endpoint = "/api/track";
  const sentViews = new Set();

  function clean(value, max = 80) {
    return String(value || "").replace(/[\r\n\t]/g, " ").trim().slice(0, max);
  }

  function track(event, details = {}) {
    const payload = {
      event: clean(event, 64),
      page: window.location.pathname.slice(0, 120),
      product: clean(details.product),
      variant: clean(details.variant),
      outcome: clean(details.outcome, 40),
      source: clean(details.source),
      country: clean(details.country, 8),
    };
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  }

  window.AliCapaAnalytics = Object.freeze({ track });

  document.addEventListener("click", (event) => {
    const disabled = event.target.closest("[data-staging-disabled]");
    if (disabled) {
      const stagingEvent = disabled.dataset.analyticsEvent;
      if (stagingEvent) track(stagingEvent, { source: disabled.dataset.analyticsSource || "staging-preview", outcome: "blocked-preview" });
      event.preventDefault();
      window.alert("Preview only. Live purchases are disabled on this staging site.");
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.href || "";
    if (href.includes("patreon.com")) track("patreon_clicked", { source: "join-us" });
    else if (href.includes("mixam.com") || href.includes("mixam.de")) {
      track("nine_purchase_clicked", { source: href.includes("mixam.de") ? "europe" : "americas" });
    }
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        const node = entry.target;
        const product = node.dataset.work || node.id || "";
        const kind = node.matches(".work-card") ? "original_artwork_viewed" : "print_detail_viewed";
        const key = `${kind}:${product}`;
        if (!product || sentViews.has(key)) return;
        sentViews.add(key);
        track(kind, { product, source: "viewport" });
        observer.unobserve(node);
      });
    }, { threshold: [0.35] });
    document.querySelectorAll("[data-work], .work-card[id]").forEach((node) => observer.observe(node));
  }

  if (window.location.pathname.endsWith("/checkout-success.html") || window.location.pathname.endsWith("checkout-success.html")) {
    track("checkout_returned_success", { outcome: "return", source: "browser" });
  }
  if (window.location.pathname.endsWith("/checkout-cancelled.html") || window.location.pathname.endsWith("checkout-cancelled.html")) {
    track("checkout_cancelled", { outcome: "cancelled", source: "browser" });
  }
})();
