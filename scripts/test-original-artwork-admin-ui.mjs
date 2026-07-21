import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminHtml = readFileSync("admin-original-works.html", "utf8");
const adminJs = readFileSync("admin-original-works.js", "utf8");
const adminCss = readFileSync("admin-original-works.css", "utf8");
const headers = readFileSync("_headers", "utf8");

assert.match(adminHtml, /Private Original Works fulfilment/);
assert.match(adminHtml, /data-packing-form/);
assert.match(adminHtml, /data-address-reviewed/);
assert.match(adminHtml, /data-create-shipment disabled/);
assert.doesNotMatch(adminHtml, /site-analytics\.js/);
assert.doesNotMatch(adminHtml, /Rua de Jo[aã]o de Aveiro/i);
assert.doesNotMatch(adminHtml, /914159178/);
assert.doesNotMatch(adminHtml, /\+351\d{6,}/);
assert.doesNotMatch(adminJs, /localStorage|sessionStorage/);
assert.doesNotMatch(adminJs, /Rua de Jo[aã]o de Aveiro/i);
assert.doesNotMatch(adminJs, /914159178/);
assert.match(adminJs, /\/api\/admin\/original-artworks\/fulfilment/);
assert.match(adminJs, /\/api\/admin\/original-artworks\/packing/);
assert.match(adminJs, /\/api\/admin\/original-artworks\/ready-for-label/);
assert.match(adminJs, /\/api\/admin\/original-artworks\/create-shipment/);
assert.match(adminCss, /\.shipment-gate/);
assert.match(headers, /\/admin-original-works\.html[\s\S]*Cache-Control: no-store[\s\S]*X-Robots-Tag: noindex, nofollow, noarchive/);
assert.match(headers, /\/admin-original-works\.js[\s\S]*Cache-Control: no-store/);

for (const page of ["index.html", "prints.html", "artworks.html", "about.html", "support.html", "privacy.html", "terms.html"]) {
  const content = readFileSync(page, "utf8");
  assert.doesNotMatch(content, /admin-original-works\.html/, `${page} must not expose the private fulfilment URL`);
}

console.log("Original Works private admin UI privacy tests passed.");
