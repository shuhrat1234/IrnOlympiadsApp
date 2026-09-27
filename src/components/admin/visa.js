import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Bell, CalendarDays, Clock, FileBarChart, FlaskConical, Kanban, LayoutDashboard, Trash2, Users2 } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { store } from '../../api/storage';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { IconButton, Sheet, T, Tap } from '../ui';
import { colors, fonts, radius } from '../../theme';

export const STATUS_OPTIONS = [
	{ value: 'new', uz: 'Yangi ishtirokchi', ru: 'Новый участник', en: 'New applicant' },
	{ value: 'awaiting_payment', uz: "To'lov kutilmoqda", ru: 'Ожидается оплата', en: 'Awaiting payment' },
	{ value: 'awaiting_documents', uz: 'Hujjatlar kutilmoqda', ru: 'Ожидаются документы', en: 'Awaiting documents' },
	{ value: 'documents_received', uz: 'Hujjatlar qabul qilindi', ru: 'Документы получены', en: 'Documents received' },
	{ value: 'documents_reviewing', uz: 'Hujjatlar tekshirilmoqda', ru: 'Документы проверяются', en: 'Documents under review' },
	{ value: 'needs_correction', uz: 'Tuzatish kerak', ru: 'Требуется исправление', en: 'Correction needed' },
	{ value: 'needs_replacement', uz: 'Almashtirish kerak', ru: 'Требуется замена документов', en: 'Document replacement needed' },
	{ value: 'awaiting_translation', uz: 'Tarjima kutilmoqda', ru: 'Ожидается перевод', en: 'Awaiting translation' },
	{ value: 'awaiting_appointment', uz: 'Elchixona uchun navbat kutilmoqda', ru: 'Ожидается запись в посольство', en: 'Awaiting embassy appointment' },
	{ value: 'appointment_scheduled', uz: 'Navbat belgilandi', ru: 'Запись назначена', en: 'Appointment scheduled' },
	{ value: 'ready_for_embassy', uz: 'Elchixonaga tayyor', ru: 'Готов к посольству', en: 'Ready for embassy' },
	{ value: 'documents_submitted', uz: 'Hujjatlar topshirildi', ru: 'Документы поданы', en: 'Documents submitted' },
	{ value: 'awaiting_decision', uz: 'Qaror kutilmoqda', ru: 'Ожидается решение', en: 'Awaiting decision' },
	{ value: 'visa_approved', uz: 'Viza tasdiqlandi', ru: 'Виза одобрена', en: 'Visa approved' },
	{ value: 'passport_received', uz: 'Pasport qaytarildi', ru: 'Паспорт получен', en: 'Passport returned' },
	{ value: 'visa_rejected', uz: 'Viza rad etildi', ru: 'Виза отклонена', en: 'Visa rejected' },
	{ value: 'cancelled', uz: 'Bekor qilindi', ru: 'Заявка отменена', en: 'Application cancelled' },
];
export const FINISHED_STATUSES = ['cancelled', 'visa_rejected', 'visa_approved', 'passport_received'];
export const ACTIVE_STATUSES = STATUS_OPTIONS.map((s) => s.value).filter((s) => !FINISHED_STATUSES.includes(s));

export const statusTone = (status) => {
	if (['visa_approved', 'passport_received', 'ready_for_embassy'].includes(status)) return [colors.green, colors.greenSoft];
	if (['visa_rejected', 'cancelled', 'needs_correction', 'needs_replacement'].includes(status)) return [colors.red, colors.redSoft];
	if (['appointment_scheduled', 'documents_submitted', 'awaiting_decision'].includes(status)) return [colors.blue, colors.blueSoft];
	return [colors.ink2, colors.cardMuted];
};

export const useStatusLabel = () => {
	const { tx } = useLanguage();
	return useCallback((status) => {
		const o = STATUS_OPTIONS.find((s) => s.value === status);
		return o ? tx(o) : status;
	}, [tx]);
};

export const apiError = (err, fallback) => {
	const data = err?.response?.data;
	if (!data) return fallback;
	if (typeof data === 'string') return data;
	if (data.detail) return data.detail;
	const key = Object.keys(data)[0];
	if (key) {
		const val = data[key];
		return `${key}: ${Array.isArray(val) ? val[0] : val}`;
	}
	return fallback;
};

// Every applicant (backend caps page_size at 100).
export const fetchAllApplicants = async (params = {}) => {
	const all = [];
	for (let page = 1; page <= 1000; page++) {
		const res = await api.get(E.VISA_APPLICANTS, { params: { ...params, page_size: 100, page } });
		if (Array.isArray(res.data)) { all.push(...res.data); break; }
		const chunk = res.data.results || [];
		all.push(...chunk);
		if (!res.data.next || !chunk.length || (typeof res.data.count === 'number' && all.length >= res.data.count)) break;
	}
	return all;
};

export const fetchStaff = async () => {
	const res = await api.get(E.USERS, { params: { page_size: 100 } });
	return (res.data.results || res.data || []).filter((u) => ['admin', 'superadmin', 'coordinator'].includes(u.role));
};

// ---------- Reminders (website useVisaReminders: appointments ≤48h, debts, expired docs) ----------
const SEEN_KEY = 'visa_reminder_seen';
const FEED_KEY = 'visa_reminder_feed';
const POLL_INTERVAL = 3 * 60 * 1000;
const WINDOW_H = 48;

const fmt = (date, lang) => date.toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const MSG = {
	appointment: (lang, name, date) => ({
		title: { ru: 'Приём в посольстве', uz: 'Elchixona uchrashuvi', en: 'Embassy appointment' }[lang],
		message: { ru: `Скоро приём в посольстве: ${name} — ${fmt(date, lang)}`, uz: `${name} uchun elchixonaga tez orada uchrashuv — ${fmt(date, lang)}`, en: `Upcoming embassy appointment: ${name} — ${fmt(date, lang)}` }[lang],
	}),
	debt: (lang, name, debt) => ({
		title: { ru: 'Задолженность', uz: "To'lov qarzi", en: 'Outstanding payment' }[lang],
		message: { ru: `Задолженность по оплате: ${name} — ${debt.toLocaleString()} UZS`, uz: `${name} uchun to'lov qarzi: ${debt.toLocaleString()} UZS`, en: `Outstanding payment: ${name} — ${debt.toLocaleString()} UZS` }[lang],
	}),
	docs: (lang, name) => ({
		title: { ru: 'Просроченные документы', uz: "Muddati o'tgan hujjatlar", en: 'Expired documents' }[lang],
		message: { ru: `Просроченные документы: ${name}`, uz: `${name} uchun muddati o'tgan hujjatlar`, en: `Expired documents: ${name}` }[lang],
	}),
	test: (lang) => ({
		title: { ru: 'Тестовое уведомление', uz: 'Test bildirishnomasi', en: 'Test notification' }[lang],
		message: { ru: 'Это тестовое напоминание — уведомления работают.', uz: 'Bu test eslatmasi — bildirishnomalar ishlayapti.', en: 'This is a test reminder — notifications are working.' }[lang],
	}),
};

const VisaContext = createContext(null);

export const VisaProvider = ({ children }) => {
	const { lang } = useLanguage();
	const toast = useToast();
	const [feed, setFeed] = useState([]);
	const seen = useRef(new Set());
	const ready = useRef(false);

	useEffect(() => {
		Promise.all([store.get(SEEN_KEY, []), store.get(FEED_KEY, [])]).then(([s, f]) => {
			seen.current = new Set(s);
			setFeed(f);
			ready.current = true;
		});
	}, []);

	const saveFeed = (next) => { store.set(FEED_KEY, next); return next; };

	const push = useCallback((type, kind, { title, message }) => {
		toast[kind]?.(message, title);
		Haptics.notificationAsync(kind === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning).catch(() => {});
		setFeed((prev) => saveFeed([{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, title, message, created_at: new Date().toISOString(), is_read: false }, ...prev].slice(0, 30)));
	}, [toast]);

	useEffect(() => {
		let cancelled = false;
		const timers = [];
		const check = async () => {
			if (!ready.current) return;
			try {
				const res = await api.get(E.VISA_APPLICANTS, { params: { page_size: 100 } });
				if (cancelled) return;
				const list = res.data.results || res.data || [];
				const day = new Date().toISOString().slice(0, 10);
				const now = new Date();
				const end = new Date(now.getTime() + WINDOW_H * 3600 * 1000);
				const found = [];
				list.forEach((a) => {
					if (FINISHED_STATUSES.includes(a.status)) return;
					if (a.embassy_appointment_date) {
						const d = new Date(a.embassy_appointment_date);
						const key = `appt-${a.id}-${day}`;
						if (d >= now && d <= end && !seen.current.has(key)) found.push({ key, type: 'warning', kind: 'warning', content: MSG.appointment(lang, a.full_name, d) });
					}
					if (a.debt > 0) {
						const key = `debt-${a.id}-${day}`;
						if (!seen.current.has(key)) found.push({ key, type: 'payment', kind: 'error', content: MSG.debt(lang, a.full_name, a.debt) });
					}
					if (a.has_expired_documents) {
						const key = `docs-${a.id}-${day}`;
						if (!seen.current.has(key)) found.push({ key, type: 'warning', kind: 'warning', content: MSG.docs(lang, a.full_name) });
					}
				});
				found.forEach((r, i) => {
					timers.push(setTimeout(() => {
						push(r.type, r.kind, r.content);
						seen.current.add(r.key);
						store.set(SEEN_KEY, [...seen.current].slice(-500));
					}, i * 3000));
				});
			} catch {}
		};
		const first = setTimeout(check, 1500);
		const interval = setInterval(check, POLL_INTERVAL);
		return () => { cancelled = true; clearTimeout(first); clearInterval(interval); timers.forEach(clearTimeout); };
	}, [lang, push]);

	const value = useMemo(() => ({
		reminders: feed,
		sendTest: () => push('info', 'info', MSG.test(lang)),
		markRead: (id) => setFeed((p) => saveFeed(p.map((n) => (n.id === id ? { ...n, is_read: true } : n)))),
		markAllRead: () => setFeed((p) => saveFeed(p.map((n) => ({ ...n, is_read: true })))),
		clearAll: () => setFeed(saveFeed([])),
	}), [feed, push, lang]);

	return <VisaContext.Provider value={value}>{children}</VisaContext.Provider>;
};

export const useVisa = () => useContext(VisaContext);

const NL = {
	notifications: { uz: 'Bildirishnomalar', ru: 'Уведомления', en: 'Notifications' },
	none: { uz: "Bildirishnoma yo'q", ru: 'Нет уведомлений', en: 'No notifications' },
	markRead: { uz: "Barchasini o'qilgan", ru: 'Прочитать все', en: 'Mark all read' },
	clear: { uz: 'Tozalash', ru: 'Очистить', en: 'Clear' },
	test: { uz: 'Test', ru: 'Тест', en: 'Test' },
};

export const VisaBell = () => {
	const { tx, lang } = useLanguage();
	const visa = useVisa();
	const [open, setOpen] = useState(false);
	const unread = visa.reminders.filter((n) => !n.is_read).length;
	const dot = (n) => (n.is_read ? colors.lineStrong : n.type === 'payment' ? colors.red : n.type === 'warning' ? colors.amber : n.type === 'success' ? colors.green : colors.blue);
	return (
		<>
			<IconButton icon={Bell} badge={unread || null} onPress={() => setOpen(true)} />
			<Sheet visible={open} onClose={() => setOpen(false)} title={tx(NL.notifications)} scroll>
				<View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
					<Tap onPress={visa.sendTest} style={styles.chipBtn}><FlaskConical size={13} color={colors.purple} /><T style={styles.chipBtnText}>{tx(NL.test)}</T></Tap>
					{unread ? <Tap onPress={visa.markAllRead} style={styles.chipBtn}><T style={styles.chipBtnText}>{tx(NL.markRead)}</T></Tap> : null}
					{visa.reminders.length ? <Tap onPress={visa.clearAll} style={[styles.chipBtn, { backgroundColor: colors.redSoft }]}><Trash2 size={13} color={colors.red} /><T style={[styles.chipBtnText, { color: colors.red }]}>{tx(NL.clear)}</T></Tap> : null}
				</View>
				{!visa.reminders.length ? <T v="small" style={{ textAlign: 'center', paddingVertical: 20 }}>{tx(NL.none)}</T> : visa.reminders.map((n) => (
					<Tap key={n.id} onPress={() => !n.is_read && visa.markRead(n.id)} style={[styles.notif, !n.is_read && { backgroundColor: colors.goldTint }]}>
						<View style={[styles.dot, { backgroundColor: dot(n) }]} />
						<View style={{ flex: 1, gap: 2 }}>
							<T v="strong" style={{ fontSize: 13.5 }}>{n.title}</T>
							<T v="small">{n.message}</T>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock size={10} color={colors.muted} /><T v="small" style={{ fontSize: 10.5 }}>{fmt(new Date(n.created_at), lang)}</T></View>
						</View>
					</Tap>
				))}
			</Sheet>
		</>
	);
};

const NAV = [
	{ path: '/admin/visa', icon: LayoutDashboard, label: { uz: 'Dashbord', ru: 'Дашборд', en: 'Dashboard' } },
	{ path: '/admin/visa/participants', icon: Users2, label: { uz: 'Ishtirokchilar', ru: 'Участники', en: 'Applicants' } },
	{ path: '/admin/visa/kanban', icon: Kanban, label: { uz: 'Kanban', ru: 'Канбан', en: 'Kanban' } },
	{ path: '/admin/visa/calendar', icon: CalendarDays, label: { uz: 'Taqvim', ru: 'Календарь', en: 'Calendar' } },
	{ path: '/admin/visa/reports', icon: FileBarChart, label: { uz: 'Hisobotlar', ru: 'Отчёты', en: 'Reports' } },
];

export const VisaNav = () => {
	const { tx } = useLanguage();
	const path = usePathname();
	return (
		<View style={styles.navWrap}>
			{NAV.map((n) => {
				const on = path === n.path;
				return (
					<Tap key={n.path} onPress={() => !on && router.navigate(n.path)} style={[styles.nav, on && styles.navOn]}>
						<n.icon size={15} color={on ? colors.navyDeep : colors.muted} />
						<T style={[styles.navText, on && { color: colors.navyDeep }]}>{tx(n.label)}</T>
					</Tap>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	navWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14 },
	nav: { flexGrow: 1, flexBasis: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, minHeight: 42, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	navOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	navText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink2, flexShrink: 1 },
	chipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 32, borderRadius: radius.pill, backgroundColor: colors.cardMuted },
	chipBtnText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink2 },
	notif: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 6 },
	dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
