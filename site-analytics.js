(() => {
  const endpoint = "/api/track";
  const sentViews = new Set();
  const release = "20260721-gallery-fixes-2";

  function loadEnhancements() {
    if (!document.querySelector(`link[data-ali-capa-fixes="${release}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = `/site-fixes.css?v=${release}`;
      stylesheet.dataset.aliCapaFixes = release;
      document.head.append(stylesheet);
    }

    const page = window.location.pathname;
    const needsGallery = page.endsWith("/prints.html")
      || page.endsWith("/artworks.html")
      || page.endsWith("prints.html")
      || page.endsWith("artworks.html");
    if (needsGallery && !document.querySelector(`script[data-ali-capa-gallery="${release}"]`)) {
      const script = document.createElement("script");
      script.src = `/gallery-enhancements.js?v=${release}`;
      script.async = false;
      script.dataset.aliCapaGallery = release;
      document.body.append(script);
    }
  }

  function restoreSafeExternalLinks() {
    const externalLinks = [
      {
        selector: '[data-analytics-event="nine_purchase_clicked"][data-analytics-source="americas"]',
        href: "https://mixam.com/print-on-demand/6a417907f343e9478f5c9f85",
      },
      {
        selector: '[data-analytics-event="nine_purchase_clicked"][data-analytics-source="europe"]',
        href: "https://mixam.de/print-on-demand/6a43f46089757fcb48bb3c67",
      },
      {
        selector: '#patreon[data-analytics-event="patreon_clicked"]',
        href: "https://www.patreon.com/AliCapa",
      },
      {
        selector: '#contribution[data-analytics-event="contribution_clicked"]',
        href: "https://buy.stripe.com/7sY6oI4iWbND0OO759gIo00",
      },
    ];

    externalLinks.forEach(({ selector, href }) => {
      const link = document.querySelector(selector);
      if (!link) return;
      link.href = href;
      link.removeAttribute("data-staging-disabled");
      link.removeAttribute("aria-disabled");
    });
  }

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

  loadEnhancements();
  restoreSafeExternalLinks();
  window.AliCapaAnalytics = Object.freeze({ track });

  document.addEventListener("click", (event) => {
    const disabled = event.target.closest("[data-staging-disabled]");
    if (disabled) {
      const stagingEvent = disabled.dataset.analyticsEvent;
      if (stagingEvent) track(stagingEvent, { source: disabled.dataset.analyticsSource || "staging-preview", outcome: "blocked-preview" });
      event.preventDefault();
      window.alert("Preview only. Live print and original artwork purchases are not yet enabled on this site.");
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.href || "";
    if (href.includes("patreon.com")) track("patreon_clicked", { source: "join-us" });
    else if (href.includes("buy.stripe.com")) track("contribution_clicked", { source: "join-us" });
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
