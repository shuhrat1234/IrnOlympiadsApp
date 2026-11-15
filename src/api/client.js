import axios from 'axios';
import { Platform } from 'react-native';
import { tokens } from './storage';

const REMOTE_API = 'https://x8k2m9f3.irnolympiad.uz/api/';
const isLocalWeb = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_URL = isLocalWeb ? '/api/' : (process.env.EXPO_PUBLIC_API_URL || REMOTE_API);
export const MEDIA_BASE = 'https://x8k2m9f3.irnolympiad.uz';
export const SITE_URL = 'https://irnolympiad.uz';
export const WS_URL = 'wss://x8k2m9f3.irnolympiad.uz';

// Same rule as the website: always https, relative paths resolve against the API host.
export const mediaUrl = (path) => {
	if (!path) return null;
	if (path.startsWith('data:') || path.startsWith('file:') || path.startsWith('blob:')) return path;
	if (path.startsWith('http://')) return path.replace(/^http:\/\//i, 'https://');
	if (path.startsWith('https://')) return path;
	const clean = path.startsWith('/') ? path.slice(1) : path;
	if (clean.startsWith('assets/')) {
		return `${SITE_URL}/${clean}`;
	}
	return `${MEDIA_BASE}/${clean}`;
};

const api = axios.create({
	baseURL: API_URL,
	timeout: 60000,
	headers: { 'Content-Type': 'application/json' },
	paramsSerializer: (params) => {
		const sp = new URLSearchParams();
		Object.keys(params || {}).forEach((key) => {
			const value = params[key];
			if (value === undefined || value === null) return;
			if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
			else sp.append(key, value);
		});
		return sp.toString();
	},
});

api.interceptors.request.use((config) => {
	if (tokens.access && !config._anonymous) {
		config.headers.Authorization = `Bearer ${tokens.access}`;
	}
	if (config.data instanceof FormData) {
		delete config.headers['Content-Type'];
	}
	return config;
});

// Called when the refresh token is gone/expired — AuthContext plugs in here so
// the whole app drops back to the login screen (the site's `window.location = /login`).
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
	onSessionExpired = fn;
};

const AUTH_URLS = ['auth/login', 'auth/register', 'auth/token/refresh', 'auth/2fa'];
const PUBLIC_URLS = ['olympiads/', 'books/', 'bts-points/', 'gallery/', 'regions/', 'teachers/search/'];

let refreshing = null;

api.interceptors.response.use(
	(res) => res,
	async (error) => {
		const original = error.config || {};
		if (error.code === 'ECONNABORTED') {
			error.friendlyMessage = 'timeout';
			return Promise.reject(error);
		}
		if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

		const url = String(original.url || '');
		if (AUTH_URLS.some((u) => url.includes(u))) return Promise.reject(error);

		const isPublicGet = PUBLIC_URLS.some((u) => url.includes(u)) && (original.method || 'get').toLowerCase() === 'get';
		original._retry = true;

		if (tokens.refresh) {
			try {
				// A single refresh shared by every request that 401'd at the same time.
				refreshing = refreshing || axios
					.post(`${API_URL}auth/token/refresh/`, { refresh: tokens.refresh })
					.then(async (r) => {
						await tokens.set(r.data.access, r.data.refresh);
						return r.data.access;
					})
					.finally(() => {
						setTimeout(() => { refreshing = null; }, 0);
					});
				const access = await refreshing;
				original.headers.Authorization = `Bearer ${access}`;
				return api(original);
			} catch (refreshError) {
				await tokens.clear();
				if (isPublicGet) {
					delete original.headers.Authorization;
					original._anonymous = true;
					return api(original);
				}
				onSessionExpired();
				return Promise.reject(refreshError);
			}
		}

		if (isPublicGet) {
			delete original.headers.Authorization;
			original._anonymous = true;
			return api(original);
		}
		await tokens.clear();
		onSessionExpired();
		return Promise.reject(error);
	}
);

// DRF endpoints are sometimes paginated, sometimes flat arrays — walk every page.
export const fetchAllPages = async (endpoint, params = { page_size: 100 }, config = {}) => {
	let items = [];
	let next = endpoint;
	let page = 0;
	while (next && page < 20) {
		page += 1;
		const res = await api.get(next, { ...config, ...(page === 1 ? { params } : {}) });
		if (Array.isArray(res.data)) return res.data;
		if (!res.data || !Array.isArray(res.data.results)) break;
		items = items.concat(res.data.results);
		if (res.data.next) {
			const match = String(res.data.next).match(/\/api\/(.*)$/);
			next = match ? match[1] : null;
		} else {
			next = null;
		}
	}
	return items;
};

export const errorMessage = (err, fallback = 'Error') => {
	const d = err?.response?.data;
	return (
		d?.error ||
		d?.detail ||
		d?.message ||
		(Array.isArray(d?.non_field_errors) ? d.non_field_errors[0] : null) ||
		(typeof d === 'string' && d.length < 300 ? d : null) ||
		fallback
	);
};

export default api;
