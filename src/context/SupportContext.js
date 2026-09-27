import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import api from '../api/client';
import E from '../api/endpoints';
import { store } from '../api/storage';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { useToast } from './ToastContext';

const SupportContext = createContext(null);

const STAFF = ['admin', 'superadmin', 'coordinator'];

// RN FormData takes { uri, name, type } objects for files.
const toFormData = (fields, image) => {
	const fd = new FormData();
	Object.keys(fields).forEach((k) => fd.append(k, String(fields[k] ?? '')));
	if (image) fd.append('image', { uri: image.uri, name: image.name || 'photo.jpg', type: image.mimeType || 'image/jpeg' });
	return fd;
};

export const SupportProvider = ({ children }) => {
	const { currentUser } = useAuth();
	const { t } = useLanguage();
	const toast = useToast();
	const [tickets, setTickets] = useState([]);
	const [loading, setLoading] = useState(false);
	const [readStatus, setReadStatus] = useState({});
	const prevUnread = useRef(0);
	const viewingSupport = useRef(false);
	const staff = STAFF.includes(currentUser?.role);

	useEffect(() => {
		store.get('support_read_status', {}).then((s) => setReadStatus(s || {}));
	}, []);

	const unreadIds = useMemo(() => {
		const ids = new Set();
		tickets.forEach((ticket) => {
			const lastRead = readStatus[ticket.id] ? new Date(readStatus[ticket.id]) : new Date(0);
			if (new Date(ticket.updated_at) <= lastRead) return;
			const last = ticket.replies?.[ticket.replies.length - 1];
			// Staff: waiting on us (no reply yet / user wrote last). Users: support wrote last.
			if (staff ? ticket.status !== 'resolved' && (!last || !STAFF.includes(last.user_role)) : last && STAFF.includes(last.user_role)) ids.add(ticket.id);
		});
		return ids;
	}, [tickets, readStatus, staff]);

	const fetchTickets = useCallback(async () => {
		if (!currentUser) return;
		setLoading(true);
		try {
			const res = await api.get(E.SUPPORT_TICKETS, { params: { page_size: 100 } });
			setTickets(Array.isArray(res.data) ? res.data : res.data?.results || []);
		} catch {
		} finally {
			setLoading(false);
		}
	}, [currentUser?.id]);

	// Toast when a new staff reply shows up while the user is elsewhere in the app.
	useEffect(() => {
		const count = unreadIds.size;
		if (count > prevUnread.current && !viewingSupport.current) {
			const latest = tickets.find((x) => unreadIds.has(x.id));
			if (latest) toast.show({ title: t('newMessage'), message: staff ? `${latest.user_full_name || ''}: ${latest.subject}` : `Admin: ${latest.subject}`, type: 'info' });
		}
		prevUnread.current = count;
	}, [unreadIds]);

	useEffect(() => {
		if (!currentUser) {
			setTickets([]);
			return;
		}
		fetchTickets();
		const interval = setInterval(() => {
			if (AppState.currentState === 'active') fetchTickets();
		}, 90000);
		const sub = AppState.addEventListener('change', (s) => s === 'active' && fetchTickets());
		return () => {
			clearInterval(interval);
			sub.remove();
		};
	}, [fetchTickets]);

	const markTicketAsRead = useCallback((ticketId) => {
		setReadStatus((prev) => {
			const next = { ...prev, [ticketId]: new Date().toISOString() };
			store.set('support_read_status', next);
			return next;
		});
	}, []);

	const createTicket = useCallback(async ({ subject, message }, image) => {
		const data = image ? toFormData({ subject, message }, image) : { subject, message };
		const res = await api.post(E.SUPPORT_TICKETS, data);
		setTickets((prev) => [res.data, ...prev]);
		return res.data;
	}, []);

	const addReply = useCallback(
		async (ticketId, message, image) => {
			const data = image ? toFormData({ ticket: ticketId, message }, image) : { ticket: ticketId, message };
			const res = await api.post(E.SUPPORT_REPLIES, data);
			await fetchTickets();
			return res.data;
		},
		[fetchTickets]
	);

	const deleteReply = useCallback(
		async (replyId) => {
			await api.delete(`${E.SUPPORT_REPLIES}${replyId}/`);
			await fetchTickets();
		},
		[fetchTickets]
	);

	// Staff only: close a ticket.
	const resolveTicket = useCallback(async (ticketId) => {
		await api.post(E.SUPPORT_RESOLVE_TICKET(ticketId));
		setTickets((prev) => prev.map((x) => (x.id === ticketId ? { ...x, status: 'resolved' } : x)));
	}, []);

	const setViewingSupport = useCallback((v) => {
		viewingSupport.current = v;
	}, []);

	const value = useMemo(
		() => ({
			tickets,
			loading,
			unreadIds,
			unreadCount: unreadIds.size,
			notClosedCount: tickets.filter((x) => x.status !== 'resolved').length,
			fetchTickets,
			createTicket,
			addReply,
			deleteReply,
			resolveTicket,
			markTicketAsRead,
			setViewingSupport,
			isStaff: staff,
		}),
		[tickets, loading, unreadIds, fetchTickets, createTicket, addReply, deleteReply, resolveTicket, markTicketAsRead, setViewingSupport, staff]
	);

	return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};

export const useSupport = () => useContext(SupportContext);
