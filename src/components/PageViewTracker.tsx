import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    trackEvent("page_view", {
      path: location.pathname,
    });
  }, [location.pathname]);

  return null;
}
