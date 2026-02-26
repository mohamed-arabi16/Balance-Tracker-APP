const SERVICE_WORKER_PATH = "/sw.js";

export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD) {
    return;
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error("Service worker registration failed", error);
      }
    });
  });
};
