import { calculateCustomerShippingCents, chooseBestQuote, getProdigiQuotes } from "./prodigi.js";
import { getFixedShippingCents, getRegionalCents } from "./products.js";

export async function quoteProduct({ product, countryCode, env }) {
  const mode = product?.fulfillment?.mode;

  if (mode === "prodigi-live") {
    const payload = await getProdigiQuotes({
      env,
      sku: product.providerSku,
      countryCode,
      pageCount: product.fulfillment?.pageCount || null,
    });
    const quote = chooseBestQuote(payload);
    const shipping = calculateCustomerShippingCents(quote, countryCode, env);
    return {
      quote,
      shipping,
      estimateNote: product.productType === "book"
        ? "Printed to order in Europe; production and delivery timing vary by destination."
        : "Made to order. Production usually takes 2 to 3 business days before dispatch; delivery timing varies by destination.",
    };
  }

  if (mode === "configured-fixed") {
    const customerCents = getFixedShippingCents(product, countryCode, env);
    if (customerCents === null) throw new Error("Collector delivery has not been configured for this destination");
    const providerItemCents = Number(product.fulfillment.providerPrintCostCents || 0)
      + Number(product.fulfillment.providerExtrasCents || 0);
    const providerShippingCents = getRegionalCents(product.fulfillment.providerShippingEstimateCents, countryCode)
      ?? customerCents;
    const quote = {
      method: "tracked",
      itemAmount: providerItemCents / 100,
      shippingAmount: providerShippingCents / 100,
      currency: "EUR",
      carrier: "Creativehub / theprintspace",
      service: "Tracked delivery",
      fulfillmentCountry: "",
      labCode: "",
      issues: [],
    };
    const shipping = {
      taxRate: 0,
      itemBaseCents: providerItemCents,
      shippingBaseCents: providerShippingCents,
      itemTaxCents: 0,
      shippingTaxCents: 0,
      estimatedProviderTotalCents: providerItemCents + providerShippingCents,
      processingRate: 0,
      handlingCents: 0,
      customerCents,
    };
    return {
      quote,
      shipping,
      estimateNote: "Produced to order; delivery timing varies by destination. Import duties or local taxes may apply outside the European Union.",
    };
  }

  throw new Error("This print is not currently available for checkout");
}
