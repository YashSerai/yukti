import { describe, expect, it } from "vitest";
import { fetchFlowerProducts, parseFtdCatalog } from "../providers/products/flowers";

const fixture = `<div data-testid="product-tile-BD2"><a href="/product/birthday-brights-bouquet-prd-bd2" aria-label="product image for Birthday Brights Bouquet"><img src="https://cdn.example/birthday.jpg"/></a><div data-testid="regular-price">$55 - $95</div><div>SAME DAY AVAILABLE</div></div>
<div data-testid="product-tile-HIGH"><a href="/product/too-expensive" aria-label="product image for Too Expensive"><img src="https://cdn.example/high.jpg"/></a><div data-testid="regular-price">$120</div></div>`;

describe("real flower product adapter", () => {
  it("keeps canonical merchant facts and applies the exact budget", () => {
    expect(parseFtdCatalog(fixture, 7500, "2026-07-31T00:00:00.000Z")).toEqual([{
      merchantProductId: "BD2", merchant: "FTD", title: "Birthday Brights Bouquet", amountMinor: 5500, currency: "USD",
      url: "https://www.ftd.com/product/birthday-brights-bouquet-prd-bd2", imageUrl: "https://cdn.example/birthday.jpg",
      availability: "Same-day option shown by merchant; destination eligibility varies", retrievedAt: "2026-07-31T00:00:00.000Z",
    }]);
  });

  it("uses the live merchant response rather than a hard-coded product", async () => {
    const fetcher = async () => new Response(fixture, { status: 200 });
    await expect(fetchFlowerProducts(7500, fetcher as typeof fetch)).resolves.toHaveLength(1);
  });
});
