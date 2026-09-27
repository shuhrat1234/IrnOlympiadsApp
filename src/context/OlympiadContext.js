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

	const getPaymentLink = useCallback(async (provider, regId) => {
		try {
			const res = await api.get(provider === 'click' ? E.CLICK_GET_LINK(regId) : E.PAYME_GET_LINK(regId));
			return res.data?.link || null;
		} catch {
			return null;
		}
	}, []);

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


	// ——— Admin operations (website OlympiadContext) ———
	const run = useCallback(async (fn, refetch = true) => {
		try {
			const res = await fn();
			if (refetch) await fetchOlympiads(true);
			return { success: true, data: res?.data };
		} catch (err) {
			return { success: false, error: errorMessage(err), raw: err.response?.data };
		}
	}, [fetchOlympiads]);

	const createOlympiad = useCallback(
		(form) =>
			run(() =>
				api.post(
					E.OLYMPIADS,
					{
						...form,
						olympiad_type: form.type || form.olympiad_type || 'online',
						start_datetime: form.date || form.start_datetime || null,
						duration_minutes: form.duration || form.duration_minutes || 60,
						max_participants: parseInt(form.max_participants, 10) || 0,
						registration_end_date: form.registration_end_date || null,
						subs: (form.subs || []).map((sub) => ({
							title_ru: sub.title_ru,
							title_uz: sub.title_uz,
							title_en: sub.title_en,
							grade_sessions: (sub.grade_sessions || []).map((gs) => ({ grade: String(gs.grade), start_datetime: gs.start_datetime || null, duration_minutes: parseInt(gs.duration_minutes, 10) || 60 })),
						})),
					},
					{ timeout: 120000 }
				)
			),
		[run]
	);
	const updateOlympiad = useCallback((id, data) => run(() => api.patch(E.OLYMPIAD_DETAIL(id), data, { timeout: 120000 })), [run]);
	const deleteOlympiad = useCallback((id) => run(() => api.delete(E.OLYMPIAD_DETAIL(id))), [run]);
	const startOlympiad = useCallback((id) => run(() => api.post(E.OLYMPIAD_START(id))), [run]);
	const finishOlympiad = useCallback((id) => run(() => api.post(E.OLYMPIAD_FINISH(id))), [run]);
	const startGradeSession = useCallback((id, userIds) => run(() => api.post(E.GRADE_SESSION_START(id), userIds ? { user_ids: userIds } : undefined)), [run]);
	const finishGradeSession = useCallback((id, userIds) => run(() => api.post(E.GRADE_SESSION_FINISH(id), userIds ? { user_ids: userIds } : undefined)), [run]);

	const moveOlympiad = useCallback(async (id, direction) => {
		let order = [];
		setOlympiads((prev) => {
			const list = [...prev];
			const i = list.findIndex((o) => Number(o.id) === Number(id));
			const j = direction === 'up' ? i - 1 : i + 1;
			if (i < 0 || j < 0 || j >= list.length) return prev;
			const [moved] = list.splice(i, 1);
			list.splice(j, 0, moved);
			order = list.map((o) => Number(o.id));
			store.set('olympiads', list);
			return list;
		});
		if (order.length) {
			try {
				await api.post(E.OLYMPIADS_REORDER, { order });
			} catch {}
		}
	}, []);

	const createTest = useCallback(
		(payload) => {
			const clean = {
				olympiad: payload.olympiad ? parseInt(payload.olympiad, 10) : undefined,
				sub_olympiad: payload.sub_olympiad ? parseInt(payload.sub_olympiad, 10) : undefined,
				sub_olympiad_grade: payload.sub_olympiad_grade ? parseInt(payload.sub_olympiad_grade, 10) : undefined,
			};
			const title = `Test for ${clean.sub_olympiad_grade ? `Grade ${clean.sub_olympiad_grade}` : clean.sub_olympiad ? `Sub ${clean.sub_olympiad}` : `Oly ${clean.olympiad}`}`;
			return run(() => api.post(E.TESTS, { ...clean, title }));
		},
		[run]
	);

	// Question with an optional new image picked from the gallery ({ uri, name, mimeType }).
	const saveQuestion = useCallback(
		(testId, questionId, q) => {
			const fields = {
				test: parseInt(testId, 10),
				text_uz: q.text_uz || '',
				text_ru: q.text_ru || '',
				text_en: q.text_en || '',
				correct_option: q.correct_option || 'A',
				options: q.options,
			};
			let body = fields;
			if (q.newImage) {
				body = new FormData();
				Object.keys(fields).forEach((k) => body.append(k, k === 'options' ? JSON.stringify(fields[k]) : String(fields[k])));
				body.append('image', { uri: q.newImage.uri, name: q.newImage.name || 'question.jpg', type: q.newImage.mimeType || 'image/jpeg' });
			} else if (q.removeImage) {
				body = { ...fields, image: null };
			}
			return run(() => (questionId ? api.patch(E.QUESTION_DETAIL(questionId), body) : api.post(E.QUESTIONS, body)));
		},
		[run]
	);
	const deleteQuestion = useCallback((questionId) => run(() => api.delete(E.QUESTION_DETAIL(questionId))), [run]);

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
			fetchExamQuestions,
			submitExamResult,
			getRemainingSeats,
			isFull,
			isRegistrationClosed,
			createOlympiad,
			updateOlympiad,
			deleteOlympiad,
			startOlympiad,
			finishOlympiad,
			startGradeSession,
			finishGradeSession,
			moveOlympiad,
			createTest,
			saveQuestion,
			deleteQuestion,
			setOlympiads,
		}),
		[olympiads, isLoaded, isFetching, userRegistrations, fetchOlympiads, fetchOlympiadById, fetchUserRegistrations, getOlympiad, registerForOlympiad, cancelRegistration, getPaymentLink, fetchExamQuestions, submitExamResult, getRemainingSeats, isFull, isRegistrationClosed, createOlympiad, updateOlympiad, deleteOlympiad, startOlympiad, finishOlympiad, startGradeSession, finishGradeSession, moveOlympiad, createTest, saveQuestion, deleteQuestion]
	);

	return <OlympiadContext.Provider value={value}>{children}</OlympiadContext.Provider>;
};

export const useOlympiad = () => useContext(OlympiadContext);
