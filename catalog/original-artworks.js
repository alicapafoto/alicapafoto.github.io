export const ORIGINAL_ARTWORK_CATALOG = Object.freeze([
  {
    id: "dusaemas",
    title: "DusaEmas",
    priceCents: 20000,
    declaredValueCents: 20000,
    currency: "EUR",
    framed: { widthCm: 30, heightCm: 40, depthCm: 2 },
    parcel: { lengthCm: 55, widthCm: 45, heightCm: 15, weightKg: 2.5 },
  },
  {
    id: "gold",
    title: "Gold",
    priceCents: 20000,
    declaredValueCents: 20000,
    currency: "EUR",
    framed: { widthCm: 40, heightCm: 30, depthCm: 2 },
    parcel: { lengthCm: 55, widthCm: 45, heightCm: 15, weightKg: 2.5 },
  },
  {
    id: "study",
    title: "Study",
    priceCents: 20000,
    declaredValueCents: 20000,
    currency: "EUR",
    framed: { widthCm: 40, heightCm: 30, depthCm: 2 },
    parcel: { lengthCm: 55, widthCm: 45, heightCm: 15, weightKg: 2.5 },
  },
  {
    id: "untitled",
    title: "Untitled",
    priceCents: 20000,
    declaredValueCents: 20000,
    currency: "EUR",
    framed: { widthCm: 30, heightCm: 40, depthCm: 2 },
    parcel: { lengthCm: 55, widthCm: 45, heightCm: 15, weightKg: 2.5 },
  },
].map((artwork) => Object.freeze({
  ...artwork,
  framed: Object.freeze({ ...artwork.framed }),
  parcel: Object.freeze({ ...artwork.parcel }),
})));

export const ORIGINAL_ARTWORKS_BY_ID = Object.freeze(
  Object.fromEntries(ORIGINAL_ARTWORK_CATALOG.map((artwork) => [artwork.id, artwork])),
);

export function findOriginalArtwork(artworkId) {
  return ORIGINAL_ARTWORKS_BY_ID[String(artworkId || "").toLowerCase()] || null;
}
