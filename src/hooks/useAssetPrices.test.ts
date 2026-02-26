import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAssetPriceSnapshot } from "@/hooks/useAssetPrices";

describe("fetchAssetPriceSnapshot", () => {
  const originalApiKey = import.meta.env.VITE_METALPRICEAPI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (import.meta.env as { VITE_METALPRICEAPI_API_KEY?: string }).VITE_METALPRICEAPI_API_KEY =
      originalApiKey;
  });

  it("returns live source when crypto and metal providers succeed", async () => {
    (import.meta.env as { VITE_METALPRICEAPI_API_KEY?: string }).VITE_METALPRICEAPI_API_KEY =
      "test-key";

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bitcoin: { usd: 60000 },
            ethereum: { usd: 3000 },
            cardano: { usd: 0.75 },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            rates: {
              USDXAU: 2400,
              USDXAG: 29,
            },
          }),
        } as Response),
    );

    const snapshot = await fetchAssetPriceSnapshot();

    expect(snapshot.source).toBe("live");
    expect(snapshot.warning).toBeNull();
    expect(snapshot.confidence).toBe("high");
    expect(snapshot.prices.bitcoin).toBe(60000);
    expect(snapshot.prices.gold).toBe(2400);
  });

  it("returns fallback/mixed data when providers are unavailable", async () => {
    (import.meta.env as { VITE_METALPRICEAPI_API_KEY?: string }).VITE_METALPRICEAPI_API_KEY =
      "";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const snapshot = await fetchAssetPriceSnapshot();

    expect(snapshot.source).toBe("fallback");
    expect(snapshot.warning).toContain("Crypto rates unavailable.");
    expect(snapshot.warning).toContain("Metal price API key is missing");
    expect(snapshot.confidence).toBe("low");
    expect(snapshot.prices.gold).toBeDefined();
    expect(snapshot.prices.silver).toBeDefined();
  });
});
