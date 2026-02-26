type AnalyticsProperties = Record<string, string | number | boolean | null>;

interface AnalyticsEventPayload {
  name: string;
  timestamp: string;
  correlationId: string;
  properties: AnalyticsProperties;
}

const CORRELATION_STORAGE_KEY = "balance-tracker-correlation-id";

const generateCorrelationId = () =>
  `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getCorrelationId = (): string => {
  const existing =
    typeof window !== "undefined"
      ? window.localStorage.getItem(CORRELATION_STORAGE_KEY)
      : null;

  if (existing) {
    return existing;
  }

  const created = generateCorrelationId();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CORRELATION_STORAGE_KEY, created);
  }

  return created;
};

const maybeSendToEndpoint = (payload: AnalyticsEventPayload) => {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;

  if (!endpoint || typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Keep analytics fire-and-forget.
  }
};

export const trackEvent = (
  name: string,
  properties: AnalyticsProperties = {},
) => {
  const payload: AnalyticsEventPayload = {
    name,
    timestamp: new Date().toISOString(),
    correlationId: getCorrelationId(),
    properties,
  };

  if (import.meta.env.DEV) {
    console.info("[analytics]", payload);
  }

  maybeSendToEndpoint(payload);
};
