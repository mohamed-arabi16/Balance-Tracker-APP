// TODO: Plan 03 will implement the full RN i18n initialization
// This placeholder prevents import errors from locale.ts which imports '@/i18n'
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
    });
}

export default i18n;
