import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import S from '../i18n/strings';
import { store } from '../api/storage';

const LanguageContext = createContext(null);

export const LANGS = [
	{ code: 'uz', label: "O'zbekcha", short: 'UZ' },
	{ code: 'ru', label: 'Русский', short: 'RU' },
	{ code: 'en', label: 'English', short: 'EN' },
];

export const LanguageProvider = ({ children }) => {
	const [lang, setLang] = useState('uz');

	useEffect(() => {
		store.get('lang', 'uz').then((saved) => {
			if (['uz', 'ru', 'en'].includes(saved)) setLang(saved);
		});
	}, []);

	const changeLanguage = useCallback((next) => {
		setLang(next);
		store.set('lang', next);
	}, []);

	const t = useCallback(
		(key, vars) => {
			const entry = S[key];
			let text = entry ? entry[lang] || entry.en || key : key;
			if (vars) Object.keys(vars).forEach((k) => { text = text.split(`{${k}}`).join(String(vars[k])); });
			return text;
		},
		[lang]
	);

	// Localized field of an API object: obj.title_uz / title_ru / title_en.
	const pick = useCallback(
		(obj, field = 'title') => {
			if (!obj) return '';
			return obj[`${field}_${lang}`] || obj[`${field}_en`] || obj[`${field}_ru`] || obj[`${field}_uz`] || obj[field] || '';
		},
		[lang]
	);

	// Inline dictionary: tx({ uz, ru, en }) — used by admin screens, like the website's per-page labels.
	const tx = useCallback((o) => (o ? o[lang] ?? o.ru ?? o.en ?? o.uz : ''), [lang]);

	const value = useMemo(() => ({ lang, t, tx, pick, changeLanguage }), [lang, t, tx, pick, changeLanguage]);
	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
