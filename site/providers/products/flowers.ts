export type FlowerProduct = {
  merchantProductId: string; merchant: "FTD"; title: string; amountMinor: number; currency: "USD";
  url: string; imageUrl: string | null; availability: string; retrievedAt: string;
};

const catalogUrl = "https://www.ftd.com/flowers/from-you";

export async function fetchFlowerProducts(maximumAmountMinor: number, fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<FlowerProduct[]> {
  const response = await fetcher(catalogUrl, { headers: { "user-agent": "Yukti/0.1 product-research" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Flower catalog returned ${response.status}`);
  return parseFtdCatalog(await response.text(), maximumAmountMinor, new Date().toISOString()).slice(0, 5);
}

export function parseFtdCatalog(html: string, maximumAmountMinor: number, retrievedAt: string): FlowerProduct[] {
  const products: FlowerProduct[] = [];
  const tile = /data-testid="product-tile-([^"]+)"([\s\S]*?)(?=data-testid="product-tile-|$)/g;
  for (const match of html.matchAll(tile)) {
    const segment = match[2];
    const href = /<a href="(\/product\/[^"]+)"[^>]+aria-label="product image for ([^"]+)"/.exec(segment);
    const image = /<img[^>]+src="([^"]+)"/.exec(segment);
    const price = /data-testid="regular-price"[^>]*>\$(\d+)(?:\s*-\s*\$?\d+)?</.exec(segment);
    if (!href || !price) continue;
    const amountMinor = Number(price[1]) * 100;
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > maximumAmountMinor) continue;
    const availability = /SAME DAY AVAILABLE/i.test(segment) ? "Same-day option shown by merchant; destination eligibility varies" : "Check delivery availability with merchant";
    products.push({ merchantProductId: match[1], merchant: "FTD", title: decodeHtml(href[2]), amountMinor, currency: "USD",
      url: `https://www.ftd.com${decodeHtml(href[1])}`, imageUrl: image ? decodeHtml(image[1]) : null, availability, retrievedAt });
  }
  return products.filter((item, index) => products.findIndex((candidate) => candidate.merchantProductId === item.merchantProductId) === index);
}

function decodeHtml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}
