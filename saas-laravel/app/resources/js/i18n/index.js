import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import bg from './locales/bg';

const fallbackLng = 'en';

if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
        resources: {
            en: { translation: en },
            bg: { translation: bg },
        },
        lng: document.documentElement.lang || fallbackLng,
        fallbackLng,
        interpolation: {
            escapeValue: false,
        },
    });
}

export default i18n;
