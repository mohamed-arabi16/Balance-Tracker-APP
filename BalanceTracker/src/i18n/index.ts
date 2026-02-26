import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import { resources } from './resources';

export const LANG_KEY = 'app_language';

/**
 * Initializes i18next with device language detection and RTL support.
 *
 * RTL is applied via I18nManager.forceRTL() at startup — this forces RTL
 * regardless of device locale, enabling Arabic selection on non-Arabic devices.
 * A cold restart is required for the RTL direction to take effect after switching.
 *
 * @returns The resolved language code ('en' or 'ar')
 */
export async function initI18n(): Promise<string> {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
  const language = saved ?? (deviceLang === 'ar' ? 'ar' : 'en');

  // Allow RTL before forcing it — both calls are required
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(language === 'ar');

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

  return language;
}

/**
 * Changes the active language at runtime.
 *
 * Text updates immediately via i18next. RTL direction change only takes
 * effect on the next cold start — the caller should show a restart banner
 * when this function returns true.
 *
 * @param lang - The language code to switch to
 * @returns true if the RTL direction changed (restart banner needed), false otherwise
 */
export async function changeLanguage(lang: 'en' | 'ar'): Promise<boolean> {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);

  const rtlChanged = (lang === 'ar') !== I18nManager.isRTL;
  return rtlChanged;
}

export default i18n;
