import { calculateCustomerShippingCents, chooseBestQuote, getProdigiQuotes } from "./prodigi.js";
import { getFixedShippingCents } from "./products.js";

export async function quoteProduct({ product, countryCode, env }) {
  const mode = product?.fulfillment?.mode;

  if (mode === "prodigi-live") {
    const payload = await getProdigiQuotes({ env, sku: product.providerSku, countryCode });
    const quote = chooseBestQuote(payload);
    const shipping = calculateCustomerShippingCents(quote, countryCode, env);
    return {
      quote,
      shipping,
      estimateNote: "Made to order. Production normally takes 36–72 hours before dispatch.",
    };
  }

  if (mode === "configured-fixed") {
    const customerCents = getFixedShippingCents(product, countryCode, env);
    if (customerCents === null) throw new Error("Collector delivery has not been configured for this destination");
    const quote = {
      method: "tracked",
      itemAmount: 0,
      shippingAmount: customerCents / 100,
      currency: "EUR",
      carrier: "Creativehub / theprintspace",
      service: "Tracked delivery",
      fulfillmentCountry: "",
      labCode: "",
      issues: [],
    };
    const shipping = {
      taxRate: 0,
      itemBaseCents: 0,
      shippingBaseCents: customerCents,
      itemTaxCents: 0,
      shippingTaxCents: 0,
      estimatedProviderTotalCents: customerCents,
      processingRate: 0,
      handlingCents: 0,
      customerCents,
    };
    return {
      quote,
      shipping,
      estimateNote: "Produced to order by Creativehub / theprintspace. A Certificate of Authenticity and personal letter are included.",
    };
  }

  throw new Error("This print is not currently available for checkout");
}
