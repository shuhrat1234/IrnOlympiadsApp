import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Robust Telegram opener for Android & iOS:
 * 1. Attempts direct native deep link: tg://resolve?domain=...
 * 2. Falls back to https://t.me/... via Linking.openURL
 * 3. Falls back to in-app WebBrowser if intent resolution fails on Android
 */
export async function openTelegram(target) {
	if (!target) return;
	let clean = target.trim();
	if (clean.startsWith('https://t.me/')) {
		clean = clean.replace('https://t.me/', '');
	}
	if (clean.startsWith('http://t.me/')) {
		clean = clean.replace('http://t.me/', '');
	}
	if (clean.startsWith('@')) {
		clean = clean.slice(1);
	}
	// Extract query params if any (e.g. ?start=...)
	const [domain, query] = clean.split('?');
	const queryParam = query ? `&${query}` : '';

	const tgAppUrl = `tg://resolve?domain=${domain}${queryParam}`;
	const webUrl = `https://t.me/${clean}`;

	try {
		const canOpen = await Linking.canOpenURL(tgAppUrl);
		if (canOpen) {
			await Linking.openURL(tgAppUrl);
			return;
		}
	} catch {}

	try {
		await Linking.openURL(webUrl);
	} catch {
		try {
			await WebBrowser.openBrowserAsync(webUrl);
		} catch {}
	}
}
