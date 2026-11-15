import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage, fetchAllPages } from '../api/client';
import E from '../api/endpoints';
import { store } from '../api/storage';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const OlympiadContext = createContext(null);

const normalize = (o) => ({
	...o,
	type: o.olympiad_type || o.type,
	date: o.start_datetime || o.date,
	duration: o.duration_minutes || o.duration,
});

// Server-defined display order (admin drag & drop), newest first otherwise.
const applyOrder = (items, order) => {
	if (!Array.isArray(order) || order.length === 0) return [...items].sort((a, b) => b.id - a.id);
	const idx = new Map(order.map((id, i) => [Number(id), i]));
	return [...items].sort((a, b) => {
		const ia = idx.has(Number(a.id)) ? idx.get(Number(a.id)) : 999999;
		const ib = idx.has(Number(b.id)) ? idx.get(Number(b.id)) : 999999;
		return ia !== ib ? ia - ib : b.id - a.id;
	});
};

export const OlympiadProvider = ({ children }) => {
	const { currentUser, fetchMe } = useAuth();
	const { olympiadUpdates } = useSocket();
	const [olympiads, setOlympiads] = useState([]);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isFetching, setIsFetching] = useState(false);
	const [userRegistrations, setUserRegistrations] = useState([]);
	const inflight = useRef(null);

	// Cached catalog renders instantly on cold start.
	useEffect(() => {
		store.get('olympiads', []).then((cached) => {
			if (Array.isArray(cached) && cached.length) {
				setOlympiads((prev) => (prev.length ? prev : cached));
				setIsLoaded(true);
			}
		});
	}, []);

	const fetchOlympiads = useCallback(async (force = false) => {
		if (!force && inflight.current) return inflight.current;
		const run = (async () => {
			setIsFetching(true);
			try {
				const orderPromise = api
					.get(E.OLYMPIADS_REORDER, { timeout: 3500 })
					.then((r) => (Array.isArray(r.data?.order) ? r.data.order : null))
					.catch(() => null);
				let items;
				try {
					items = await fetchAllPages(E.OLYMPIADS, { page_size: 100 }, { timeout: 25000 });
				} catch {
					await new Promise((r) => setTimeout(r, 1000));
					items = await fetchAllPages(E.OLYMPIADS, { page_size: 100 }, { timeout: 25000 });
				}
				const order = await orderPromise;
				const sorted = applyOrder(items.map(normalize), order);
				setOlympiads(sorted);
				store.set('olympiads', sorted);
			} catch {
				// keep whatever is cached
			} finally {
				setIsFetching(false);
				setIsLoaded(true);
				inflight.current = null;
			}
		})();
		inflight.current = run;
		return run;
	}, []);

	const fetchOlympiadById = useCallback(async (id) => {
		try {
			const res = await api.get(E.OLYMPIAD_DETAIL(id));
			const oly = normalize(res.data);
			setOlympiads((prev) => (prev.some((o) => String(o.id) === String(oly.id)) ? prev.map((o) => (String(o.id) === String(oly.id) ? oly : o)) : [oly, ...prev]));
			return oly;
		} catch {
			return null;
		}
	}, []);

	const fetchUserRegistrations = useCallback(async () => {
		if (!currentUser) return;
		try {
			setUserRegistrations(await fetchAllPages(E.REGISTRATIONS));
		} catch {}
	}, [currentUser?.id]);

	useEffect(() => {
		fetchOlympiads();
		if (currentUser) fetchUserRegistrations();
		else setUserRegistrations([]);
	}, [currentUser?.id]);

	// Start/finish broadcasts: refetch with jitter so every client doesn't hit the API at once.
	useEffect(() => {
		if (!olympiadUpdates) return;
		const { type, event } = olympiadUpdates;
		const relevant = ['status_change', 'grade_session_status_change'].includes(type) || ['STARTED', 'FINISHED', 'GRADE_STARTED', 'GRADE_FINISHED'].includes(event);
		if (!relevant) return;
		const timer = setTimeout(() => {
			fetchOlympiads(true);
			fetchMe?.();
		}, Math.floor(Math.random() * 8000));
		return () => clearTimeout(timer);
	}, [olympiadUpdates]);

	const getOlympiad = useCallback((id) => olympiads.find((o) => String(o.id) === String(id)), [olympiads]);

	const registerForOlympiad = useCallback(
		async (olympiadId, extra = {}) => {
			try {
				const res = await api.post(E.REGISTER_FOR_OLYMPIAD(olympiadId), extra);
				fetchUserRegistrations();
				fetchMe?.();
				fetchOlympiads(true);
				return { success: true, ...res.data };
			} catch (err) {
				const msg = errorMessage(err);
				return { success: false, error: msg, isAlreadyRegistered: /allaqachon|already|зарегистрирован|mavjud/i.test(String(msg)) };
			}
		},
		[fetchUserRegistrations, fetchMe, fetchOlympiads]
	);

	const cancelRegistration = useCallback(
		async (registrationId) => {
			try {
				await api.delete(E.REGISTRATION_DETAIL(registrationId));
				await Promise.all([fetchUserRegistrations(), fetchMe?.()]);
				return { success: true };
			} catch (err) {
				return { success: false, error: errorMessage(err) };
			}
		},
		[fetchUserRegistrations, fetchMe]
	);

	const getPaymentLink = useCallback(async (provider, regId, returnUrl = null) => {
		try {
			let endpoint;
			if (provider === 'click') endpoint = E.CLICK_GET_LINK(regId);
			else if (provider === 'alif') endpoint = E.ALIF_GET_LINK(regId);
			else if (provider === 'xazna') endpoint = E.XAZNA_GET_LINK(regId);
			else endpoint = E.PAYME_GET_LINK(regId);
			const params = returnUrl ? { return_url: returnUrl } : {};
			const res = await api.get(endpoint, { params });
			return res.data?.link || null;
		} catch {
			return null;
		}
	}, []);

	const getAlifLink = useCallback(async (regId, returnUrl = null) => {
		return getPaymentLink('alif', regId, returnUrl);
	}, [getPaymentLink]);

	const getXaznaLink = useCallback(async (regId, returnUrl = null) => {
		return getPaymentLink('xazna', regId, returnUrl);
	}, [getPaymentLink]);

	const fetchExamQuestions = useCallback(async (sessionId) => {
		try {
			const res = await api.get(E.EXAM_QUESTIONS(sessionId), { params: { t: Date.now() } });
			return { success: true, data: res.data };
		} catch (err) {
			return { success: false, error: errorMessage(err, 'Failed to load questions') };
		}
	}, []);

	const submitExamResult = useCallback(
		async (sessionId, answers, tabSwitches = 0) => {
			try {
				const res = await api.post(E.SUBMIT_EXAM(sessionId), { answers, tab_switches: tabSwitches });
				await fetchMe?.();
				return { success: true, data: res.data };
			} catch (err) {
				return { success: false, error: err.response?.data };
			}
		},
		[fetchMe]
	);


	const getRemainingSeats = useCallback((oly) => {
		if (!oly) return 0;
		if (!oly.max_participants) return 9999;
		return Math.max(0, oly.max_participants - (oly.registered_count || 0));
	}, []);

	const isFull = useCallback((oly) => !!oly?.max_participants && getRemainingSeats(oly) <= 0, [getRemainingSeats]);

	const isRegistrationClosed = useCallback(
		(oly) => {
			if (!oly) return true;
			const now = new Date();
			const start = oly.date || oly.start_datetime;
			if (start) {
				const d = new Date(start);
				if (!isNaN(d.getTime()) && now >= d) return true;
			}
			if (oly.registration_end_date && now >= new Date(oly.registration_end_date)) return true;
			return isFull(oly);
		},
		[isFull]
	);

	const value = useMemo(
		() => ({
			olympiads,
			isLoaded,
			isFetching,
			userRegistrations,
			fetchOlympiads,
			fetchOlympiadById,
			fetchUserRegistrations,
			getOlympiad,
			registerForOlympiad,
			cancelRegistration,
			getPaymentLink,
			getAlifLink,
			getXaznaLink,
			fetchExamQuestions,
			submitExamResult,
			getRemainingSeats,
			isFull,
			isRegistrationClosed,
		}),
		[olympiads, isLoaded, isFetching, userRegistrations, fetchOlympiads, fetchOlympiadById, fetchUserRegistrations, getOlympiad, registerForOlympiad, cancelRegistration, getPaymentLink, getAlifLink, getXaznaLink, fetchExamQuestions, submitExamResult, getRemainingSeats, isFull, isRegistrationClosed]
	);

	return <OlympiadContext.Provider value={value}>{children}</OlympiadContext.Provider>;
};

export const useOlympiad = () => useContext(OlympiadContext);
