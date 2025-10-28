import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
  es: { translation: es },
} as const;

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  resources,
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
