import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";

export function UserSettingsSync() {
  const { settings } = useUserSettings();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (settings?.language && i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }

    // Set document direction for RTL support
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language, settings?.language]);

  return null;
}
