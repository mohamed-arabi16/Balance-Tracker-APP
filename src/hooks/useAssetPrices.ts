import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AssetPrices {
  bitcoin?: number;
  ethereum?: number;
  cardano?: number;
  gold?: number;
  silver?: number;
}

export interface AssetPriceSnapshot {
  prices: AssetPrices;
  source: "live" | "mixed" | "fallback";
  warning: string | null;
  confidence: "high" | "medium" | "low";
}

const FALLBACK_GOLD_PRICE = 2300;
const FALLBACK_SILVER_PRICE = 28;

const buildFallbackSnapshot = (warning: string): AssetPriceSnapshot => ({
  prices: {
    gold: FALLBACK_GOLD_PRICE,
    silver: FALLBACK_SILVER_PRICE,
  },
  source: "fallback",
  warning,
  confidence: "low",
});

export const fetchAssetPriceSnapshot = async (): Promise<AssetPriceSnapshot> => {
  const warnings: string[] = [];
  let bitcoin: number | undefined;
  let ethereum: number | undefined;
  let cardano: number | undefined;
  let gold: number | undefined;
  let silver: number | undefined;

  try {
    const cryptoResponse = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano&vs_currencies=usd",
    );

    if (!cryptoResponse.ok) {
      throw new Error(`Crypto API request failed with status ${cryptoResponse.status}`);
    }

    const cryptoData = await cryptoResponse.json();
    bitcoin = cryptoData.bitcoin?.usd;
    ethereum = cryptoData.ethereum?.usd;
    cardano = cryptoData.cardano?.usd;
  } catch {
    warnings.push("Crypto rates unavailable.");
  }

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const metalResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/metal-prices`,
    );

    if (!metalResponse.ok) {
      throw new Error(`Metal API request failed with status ${metalResponse.status}`);
    }

    const metalData = await metalResponse.json();
    if (!metalData.success) {
      throw new Error(metalData.error?.info ?? "Unknown metal API error.");
    }

    gold = metalData.rates?.USDXAU;
    silver = metalData.rates?.USDXAG;
  } catch {
    warnings.push("Metal rates unavailable.");
  }

  if (gold === undefined) {
    gold = FALLBACK_GOLD_PRICE;
  }

  if (silver === undefined) {
    silver = FALLBACK_SILVER_PRICE;
  }

  const priceCount = [bitcoin, ethereum, cardano, gold, silver].filter(
    (value) => typeof value === "number",
  ).length;

  if (priceCount === 0) {
    return buildFallbackSnapshot(
      "All providers are unavailable; using safe fallback estimates.",
    );
  }

  if (warnings.length === 0) {
    return {
      prices: { bitcoin, ethereum, cardano, gold, silver },
      source: "live",
      warning: null,
      confidence: "high",
    };
  }

  const onlyFallbackMetals =
    bitcoin === undefined && ethereum === undefined && cardano === undefined;

  return {
    prices: { bitcoin, ethereum, cardano, gold, silver },
    source: onlyFallbackMetals ? "fallback" : "mixed",
    warning: warnings.join(" "),
    confidence: onlyFallbackMetals ? "low" : "medium",
  };
};

const PRICING_STALE_TIME_MS = 1000 * 60 * 5;
const PRICING_REFETCH_INTERVAL_MS = 1000 * 60 * 5;

export const useAssetPrices = (enabled: boolean = true) => {
  const query = useQuery({
    queryKey: ["asset-prices"],
    queryFn: fetchAssetPriceSnapshot,
    enabled,
    staleTime: PRICING_STALE_TIME_MS,
    refetchInterval: enabled ? PRICING_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    gcTime: 1000 * 60 * 60,
  });

  const freshness = useMemo(() => {
    if (!query.dataUpdatedAt) {
      return { isStale: true, lastUpdatedAt: null as string | null };
    }

    return {
      isStale: Date.now() - query.dataUpdatedAt > PRICING_STALE_TIME_MS,
      lastUpdatedAt: new Date(query.dataUpdatedAt).toISOString(),
    };
  }, [query.dataUpdatedAt]);

  return {
    prices: query.data?.prices ?? {},
    snapshot: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.isError ? (query.error instanceof Error ? query.error.message : "Failed to fetch asset prices.") : null,
    isStale: freshness.isStale,
    lastUpdatedAt: freshness.lastUpdatedAt,
    refresh: query.refetch,
  };
};
