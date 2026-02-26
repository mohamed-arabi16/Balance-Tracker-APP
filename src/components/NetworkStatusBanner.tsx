import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const RECONNECTED_MESSAGE_DURATION_MS = 4000;

export function NetworkStatusBanner() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!showReconnected) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowReconnected(false);
    }, RECONNECTED_MESSAGE_DURATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showReconnected]);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-b border-amber-300 bg-amber-100 text-amber-900 px-4 py-3"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{t("offline.banner.title")}: </span>
            {t("offline.banner.message")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-emerald-300 bg-emerald-100 text-emerald-900 px-4 py-2"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm font-medium">
        <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("offline.banner.reconnected")}</span>
      </div>
    </div>
  );
}
