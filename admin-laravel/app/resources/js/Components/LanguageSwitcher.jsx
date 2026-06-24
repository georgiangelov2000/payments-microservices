import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher({ compact = false }) {
    const { locale = 'en', locales = {} } = usePage().props;
    const { i18n, t } = useTranslation();

    useEffect(() => {
        if (locale && i18n.language !== locale) {
            i18n.changeLanguage(locale);
            document.documentElement.lang = locale;
        }
    }, [i18n, locale]);

    const changeLocale = (event) => {
        router.post(route('locale.update'), { locale: event.target.value }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => window.location.reload(),
        });
    };

    return (
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className={compact ? 'sr-only' : ''}>{t('common.language.label')}</span>
            <select
                value={locale}
                onChange={changeLocale}
                aria-label={t('common.language.label')}
                className="rounded-lg border-slate-200 bg-white py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
                {Object.entries(locales).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                ))}
            </select>
        </label>
    );
}
