import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequest as confirmationEndpoint } from "../functions/api/original-artworks/confirmation.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  artworkPageScript,
  reservedPage,
  reservedScript,
  confirmedPage,
  confirmedScript,
  cancelledPage,
  cancelledScript,
  headers,
  shippingAdapter,
  originalArtworkFoundation,
] = await Promise.all([
  read("artworks-page.js"),
  read("artwork-reserved.html"),
  read("artwork-reserved.js"),
  read("artwork-confirmed.html"),
  read("artwork-confirmed.js"),
  read("artwork-checkout-cancelled.html"),
  read("artwork-checkout-cancelled.js"),
  read("_headers"),
  read("functions/_lib/original-artwork-shipping.js"),
  read("functions/_lib/original-artworks.js"),
]);

assert.match(artworkPageScript, /\/api\/original-artworks\/quote/);
assert.match(artworkPageScript, /\/api\/original-artworks\/reserve-and-checkout/);
assert.doesNotMatch(artworkPageScript, /fetch\(['"]\/api\/original-artworks\/reserve['"]/);
assert.match(artworkPageScript, /expectedShippingCents/);
assert.match(artworkPageScript, /crypto\.randomUUID\(\)/);
assert.match(artworkPageScript, /sessionStorage\.setItem\('aliCapaOriginalReservation'/);

assert.match(reservedPage, /Temporary reservation remaining/);
assert.match(reservedPage, /data-cancel-reservation/);
assert.match(reservedScript, /checkout\.stripe\.com/);
assert.match(reservedScript, /\/api\/original-artworks\/release/);
assert.match(reservedScript, /setInterval\(updateTimer, 1000\)/);

assert.match(confirmedPage, /data-confirmed-content hidden/);
assert.match(confirmedPage, /Your artwork is confirmed\./);
assert.match(confirmedScript, /\/api\/original-artworks\/confirmation/);
assert.match(confirmedScript, /payload\.confirmed/);
assert.match(confirmedScript, /sessionStorage\.removeItem\('aliCapaOriginalReservation'\)/);

assert.match(cancelledPage, /No payment was made\./);
assert.match(cancelledScript, /\/api\/original-artworks\/release/);
assert.match(cancelledScript, /sessionStorage\.removeItem\(STORAGE_KEY\)/);

for (const page of ["/artwork-reserved.html", "/artwork-confirmed.html", "/artwork-checkout-cancelled.html"]) {
  const section = headers.slice(headers.indexOf(page));
  assert.ok(section.startsWith(page), `${page} header section is missing`);
  assert.match(section.split("\n\n")[0], /Cache-Control: no-store/);
  assert.match(section.split("\n\n")[0], /X-Robots-Tag: noindex, nofollow/);
}

assert.match(shippingAdapter, /const DHL_LIVE_ADAPTER_IMPLEMENTED = false/);
assert.match(shippingAdapter, /STORE_ENV[^\n]+live/);
assert.match(originalArtworkFoundation, /Only reservations that have not reached Stripe Checkout/);
assert.doesNotMatch(originalArtworkFoundation, /WHERE status IN \('active', 'checkout-created'\) AND reserved_until <=/);

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const target = String(url);
  if (target.includes("cs_test_paid")) {
    return new Response(JSON.stringify({
      id: "cs_test_paid",
      payment_status: "paid",
      metadata: {
        order_type: "original-artwork",
        artwork_id: "dusaemas",
        artwork: "DusaEmas",
        reservation_id: "owr_test",
      },
      line_items: { data: [] },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (target.includes("cs_test_unpaid")) {
    return new Response(JSON.stringify({
      id: "cs_test_unpaid",
      payment_status: "unpaid",
      metadata: {
        order_type: "original-artwork",
        artwork_id: "dusaemas",
        reservation_id: "owr_test",
      },
      line_items: { data: [] },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  throw new Error(`Unexpected fetch: ${target}`);
};

const env = { STRIPE_SECRET_KEY: "sk_test_confirmation" };
const paidResponse = await confirmationEndpoint({
  request: new Request("https://example.test/api/original-artworks/confirmation?session_id=cs_test_paid"),
  env,
});
assert.equal(paidResponse.status, 200);
assert.deepEqual(await paidResponse.json(), {
  confirmed: true,
  artwork: { id: "dusaemas", title: "DusaEmas" },
  sessionId: "cs_test_paid",
});

const unpaidResponse = await confirmationEndpoint({
  request: new Request("https://example.test/api/original-artworks/confirmation?session_id=cs_test_unpaid"),
  env,
});
assert.equal(unpaidResponse.status, 409);
assert.equal((await unpaidResponse.json()).confirmed, false);

const invalidResponse = await confirmationEndpoint({
  request: new Request("https://example.test/api/original-artworks/confirmation?session_id=invalid"),
  env,
});
assert.equal(invalidResponse.status, 400);

globalThis.fetch = realFetch;
console.log("Original Works collector UI and confirmation tests passed.");
