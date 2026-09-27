import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tokens live in the keychain; everything else (cached profile, exam
// autosave, language…) in AsyncStorage. The axios interceptors need the access
// token synchronously, so both tokens are also mirrored in memory.
const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

const memory = { access: null, refresh: null };

export const tokens = {
	async load() {
		try {
			memory.access = await SecureStore.getItemAsync(ACCESS);
			memory.refresh = await SecureStore.getItemAsync(REFRESH);
		} catch {
			memory.access = null;
			memory.refresh = null;
		}
		return { ...memory };
	},
	get access() {
		return memory.access;
	},
	get refresh() {
		return memory.refresh;
	},
	async set(access, refresh) {
		memory.access = access || null;
		if (refresh) memory.refresh = refresh;
		try {
			if (access) await SecureStore.setItemAsync(ACCESS, access);
			if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
		} catch {}
	},
	async clear() {
		memory.access = null;
		memory.refresh = null;
		try {
			await SecureStore.deleteItemAsync(ACCESS);
			await SecureStore.deleteItemAsync(REFRESH);
		} catch {}
	},
};

export const store = {
	async get(key, fallback = null) {
		try {
			const raw = await AsyncStorage.getItem(key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch {
			return fallback;
		}
	},
	async set(key, value) {
		try {
			await AsyncStorage.setItem(key, JSON.stringify(value));
		} catch {}
	},
	async remove(key) {
		try {
			await AsyncStorage.removeItem(key);
		} catch {}
	},
};
