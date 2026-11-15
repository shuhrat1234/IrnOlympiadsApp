import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_URL, WS_URL } from '../api/client';
import { tokens } from '../api/storage';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';

const SocketContext = createContext({ olympiadUpdates: null, isConnected: false });

const MAX_ATTEMPTS = 5;

// Mirrors the website: /ws/olympiads/ for start/finish broadcasts and
// /ws/notifications/ for personal notifications. Sockets are closed while the
// app is backgrounded and reopened when it comes back.
export const SocketProvider = ({ children }) => {
	const { currentUser, fetchMe } = useAuth();
	const { t, pick } = useLanguage();
	const toast = useToast();
	const [olympiadUpdates, setOlympiadUpdates] = useState(null);
	const [isConnected, setIsConnected] = useState(false);

	const olySocket = useRef(null);
	const notifSocket = useRef(null);
	const attempts = useRef({ oly: 0, notif: 0 });
	const timers = useRef([]);
	const active = useRef(true);
	const handlers = useRef({});
	handlers.current = { t, pick, toast, fetchMe };

	const baseUrl = useCallback(() => {
		try {
			if (typeof API_URL === 'string' && API_URL.startsWith('http')) {
				const url = new URL(API_URL);
				return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
			}
		} catch {}
		return WS_URL || 'wss://x8k2m9f3.irnolympiad.uz';
	}, []);

	const disconnect = useCallback(() => {
		timers.current.forEach(clearTimeout);
		timers.current = [];
		[olySocket, notifSocket].forEach((ref) => {
			try {
				if (ref.current) {
					ref.current.onclose = null;
					ref.current.close();
				}
			} catch {}
			ref.current = null;
		});
		setIsConnected(false);
	}, []);

	const connect = useCallback(() => {
		if (!active.current) return;
		const query = tokens.access ? `?token=${tokens.access}` : '';

		if (!olySocket.current && attempts.current.oly < MAX_ATTEMPTS) {
			const ws = new WebSocket(`${baseUrl()}/ws/olympiads/${query}`);
			ws.onopen = () => {
				setIsConnected(true);
				attempts.current.oly = 0;
			};
			ws.onmessage = (e) => {
				try {
					const data = JSON.parse(e.data);
					setOlympiadUpdates({ ...data, _at: Date.now() });
					if (data.event === 'STARTED') {
						const h = handlers.current;
						h.toast.show({ title: h.t('olympiadStarted'), message: h.t('olympiadStartedMsg'), type: 'success' });
					}
				} catch {}
			};
			ws.onerror = () => {};
			ws.onclose = () => {
				setIsConnected(false);
				olySocket.current = null;
				attempts.current.oly += 1;
				if (attempts.current.oly < MAX_ATTEMPTS && active.current) {
					timers.current.push(setTimeout(connect, 5000 * attempts.current.oly));
				}
			};
			olySocket.current = ws;
		}

		if (currentUser && !notifSocket.current && attempts.current.notif < MAX_ATTEMPTS) {
			const ws = new WebSocket(`${baseUrl()}/ws/notifications/${query}`);
			ws.onopen = () => {
				attempts.current.notif = 0;
			};
			ws.onmessage = (e) => {
				try {
					const data = JSON.parse(e.data);
					const h = handlers.current;
					const title = h.pick(data, 'title') || 'IRN';
					const message = h.pick(data, 'message');
					h.toast.show({ title, message, type: data.type || 'info' });
					h.fetchMe?.();
				} catch {}
			};
			ws.onerror = () => {};
			ws.onclose = () => {
				notifSocket.current = null;
				attempts.current.notif += 1;
				if (attempts.current.notif < MAX_ATTEMPTS && active.current) {
					timers.current.push(setTimeout(connect, 7000 * attempts.current.notif));
				}
			};
			notifSocket.current = ws;
		}
	}, [baseUrl, currentUser?.id]);

	useEffect(() => {
		active.current = AppState.currentState !== 'background';
		attempts.current = { oly: 0, notif: 0 };
		disconnect();
		connect();
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				active.current = true;
				attempts.current = { oly: 0, notif: 0 };
				connect();
			} else if (state === 'background') {
				active.current = false;
				disconnect();
			}
		});
		return () => {
			sub.remove();
			active.current = false;
			disconnect();
		};
	}, [connect, disconnect]);

	return <SocketContext.Provider value={{ olympiadUpdates, isConnected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
