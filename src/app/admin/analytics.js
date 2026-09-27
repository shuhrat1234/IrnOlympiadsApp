import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import * as XLSX from 'xlsx';
import { Award, BarChart3, Calendar, CheckCircle2, ChevronDown, CreditCard, Download, GraduationCap, History, Minus, Percent, Phone, PhoneCall, Plus, Search, Trash2, TrendingUp, Trophy, Users, Wifi } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, Field, IconBadge, IconButton, Loader, Pill, SelectField, Sheet, T, Tap } from '../../components/ui';
import { ColumnChart, Donut, HBarList, Legend, AreaChart, compact } from '../../components/charts';
import { DateTimeField, TextArea } from '../../components/form';
import TeacherSearch from '../../components/TeacherSearch';
import { colors, fonts, radius } from '../../theme';
import { GRADES } from '../../utils/constants';
import { formatMoney, formatShortDate } from '../../utils/format';
import { shareFile } from '../../utils/files';

const L = {
	title: { uz: 'Analitika', ru: 'Аналитика', en: 'Analytics' },
	subtitle: { uz: 'Batafsil statistika', ru: 'Подробная статистика', en: 'Detailed statistics' },
	overview: { uz: 'Umumiy', ru: 'Обзор', en: 'Overview' },
	regions: { uz: 'Viloyatlar', ru: 'Регионы', en: 'Regions' },
	olympiads: { uz: 'Olimpiadalar', ru: 'Олимпиады', en: 'Olympiads' },
	registrants: { uz: "Ro'yxatdan o'tganlar", ru: 'Зарегистрированные', en: 'Registered' },
	coins: { uz: "O'qituvchilar reytingi", ru: 'Рейтинг учителей', en: 'Teacher coins' },
	totalPart: { uz: 'Jami qatnashchilar', ru: 'Участников', en: 'Participants' },
	totalPaid: { uz: "To'lovlar soni", ru: 'Оплаты', en: 'Payments' },
	totalRevenue: { uz: 'Jami daromad', ru: 'Общий доход', en: 'Total revenue' },
	conversion: { uz: 'Konversiya', ru: 'Конверсия', en: 'Conversion' },
	avgTicket: { uz: "O'rtacha tushum", ru: 'Средний чек', en: 'Avg ticket' },
	activeOlys: { uz: 'Faol olimpiadalar', ru: 'Активные олимпиады', en: 'Active olympiads' },
	trend: { uz: "Ro'yxatdan o'tish dinamikasi", ru: 'Динамика регистраций', en: 'Registration trend' },
	byType: { uz: "Turi bo'yicha", ru: 'По типу', en: 'By type' },
	byGrade: { uz: "Sinf bo'yicha", ru: 'По классам', en: 'By grade' },
	byRegion: { uz: "Viloyat bo'yicha", ru: 'По регионам', en: 'By region' },
	online: { uz: 'Onlayn', ru: 'Онлайн', en: 'Online' },
	offline: { uz: 'Oflayn', ru: 'Офлайн', en: 'Offline' },
	totalOnline: { uz: 'Jami onlayn', ru: 'Всего онлайн', en: 'Total online' },
	users: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' },
	guests: { uz: 'Mehmonlar', ru: 'Гости', en: 'Guests' },
	today: { uz: 'Bugun', ru: 'Сегодня', en: 'Today' },
	yesterday: { uz: 'Kecha', ru: 'Вчера', en: 'Yesterday' },
	calendar: { uz: "Taqvim bo'yicha", ru: 'По календарю', en: 'By calendar' },
	start: { uz: 'Boshlanish sanasi', ru: 'Дата начала', en: 'Start date' },
	end: { uz: 'Tugash sanasi', ru: 'Дата окончания', en: 'End date' },
	query: { uz: "So'rov", ru: 'Запрос', en: 'Query' },
	rangeTotal: { uz: 'Tanlangan oraliqda jami', ru: 'Всего за период', en: 'Total in range' },
	noRange: { uz: "Ushbu oraliqda ro'yxatdan o'tganlar yo'q", ru: 'Нет регистраций за период', en: 'No registrations in range' },
	registrations: { uz: "Ro'yxatlar", ru: 'Регистрации', en: 'Registrations' },
	paid: { uz: "To'langan", ru: 'Оплачено', en: 'Paid' },
	unpaid: { uz: "To'lamagan", ru: 'Не оплачено', en: 'Unpaid' },
	fill: { uz: "To'ldirilish", ru: 'Заполняемость', en: 'Fill rate' },
	revenue: { uz: 'Daromad', ru: 'Доход', en: 'Revenue' },
	searchPh: { uz: "Ism yoki telefon bo'yicha qidirish...", ru: 'Поиск по имени или телефону...', en: 'Search by name or phone...' },
	noOne: { uz: 'Hech kim topilmadi', ru: 'Никто не найден', en: 'No one found' },
	noPhone: { uz: "Telefon yo'q", ru: 'Нет телефона', en: 'No phone' },
	markCalled: { uz: 'Tel qilindi', ru: 'Позвонили', en: 'Called' },
	lastCalled: { uz: "Oxirgi qo'ng'iroq:", ru: 'Последний звонок:', en: 'Last called:' },
	loadMore: { uz: "Ko'proq", ru: 'Показать ещё', en: 'Show more' },
	allRegions: { uz: 'Barcha viloyatlar', ru: 'Все регионы', en: 'All regions' },
	allOlympiads: { uz: 'Barcha olimpiadalar', ru: 'Все олимпиады', en: 'All olympiads' },
	allGrades: { uz: 'Barcha sinflar', ru: 'Все классы', en: 'All grades' },
	noCoins: { uz: "Ma'lumot topilmadi", ru: 'Данные не найдены', en: 'No data found' },
	manageCoins: { uz: "O'qituvchi tangalarini boshqarish", ru: 'Управление монетами учителя', en: 'Manage teacher coins' },
	adjust: { uz: "Tanga qo'shish/ayirish", ru: 'Добавить/убрать монеты', en: 'Add/remove coins' },
	history: { uz: 'Tarix', ru: 'История', en: 'History' },
	amount: { uz: 'Miqdor (+/-)', ru: 'Количество (+/-)', en: 'Amount (+/-)' },
	note: { uz: 'Izoh (ixtiyoriy)', ru: 'Примечание (необязательно)', en: 'Note (optional)' },
	add: { uz: "Qo'shish", ru: 'Добавить', en: 'Add' },
	noAdjustments: { uz: "Hali o'zgarish yo'q", ru: 'Пока нет изменений', en: 'No adjustments yet' },
	change: { uz: "O'zgartirish", ru: 'Изменить', en: 'Change' },
	gold: { uz: 'Oltin', ru: 'Золото', en: 'Gold' },
	silver: { uz: 'Kumush', ru: 'Серебро', en: 'Silver' },
	bronze: { uz: 'Bronza', ru: 'Бронза', en: 'Bronze' },
	totalCoins: { uz: 'Jami tanga', ru: 'Всего монет', en: 'Total coins' },
	students: { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
	medalists: { uz: 'Medalchilar', ru: 'Медалисты', en: 'Medalists' },
	manual: { uz: "Qo'lda", ru: 'Вручную', en: 'Manual' },
	approved: { uz: 'Tasdiqlangan', ru: 'Подтверждён', en: 'Approved' },
	approval: { uz: 'Tasdiqlash', ru: 'Подтверждение', en: 'Approval' },
	medals: { uz: 'Medallar', ru: 'Медали', en: 'Medals' },
	coinHistory: { uz: 'Tanga manbalari tarixi', ru: 'История начисления монет', en: 'Coin earnings history' },
	historyEmpty: { uz: 'Tanga manbalari topilmadi', ru: 'История начислений пуста', en: 'No coin history found' },
	export: { uz: 'Excel yuklash', ru: 'Загрузить Excel', en: 'Export Excel' },
	activity: { uz: 'Hozirgi faoliyat', ru: 'Текущая активность', en: 'Current activity' },
};

const TABS = ['overview', 'regions', 'olympiads', 'registrants', 'coins'];
const isoDay = (d) => d.toISOString().split('T')[0];

export default function Analytics() {
	const { tx, lang, pick } = useLanguage();
	const { regions } = useAuth();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const [tab, setTab] = useState('overview');
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showOnline, setShowOnline] = useState(false);
	const [showCal, setShowCal] = useState(false);
	const [start, setStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return isoDay(d); });
	const [end, setEnd] = useState(() => isoDay(new Date()));
	const [rangeBusy, setRangeBusy] = useState(false);
	const [range, setRange] = useState({ total: null, daily: [] });
	const [registrants, setRegistrants] = useState(null);
	const [regSearch, setRegSearch] = useState('');
	const [regLimit, setRegLimit] = useState(20);
	const [calling, setCalling] = useState(null);
	const [coins, setCoins] = useState(null);
	const [coinFilters, setCoinFilters] = useState({ region: '', olympiad: '', grade: '' });
	const [adjust, setAdjust] = useState(null); // { teacher, amount, note, list, loading, busy }
	const [history, setHistory] = useState(null);

	const fetchStats = useCallback(async (s = start, e = end) => {
		try {
			const res = await api.get(`${E.ADMIN_STATS}?start_date=${s}&end_date=${e}`);
			setStats(res.data);
			if (res.data.calendar_total !== undefined) setRange({ total: res.data.calendar_total, daily: res.data.calendar_daily || [] });
		} catch {
		} finally {
			setLoading(false);
			setRangeBusy(false);
		}
	}, [start, end]);

	useEffect(() => {
		fetchStats();
	}, []);

	useEffect(() => {
		if (tab === 'registrants' && registrants === null) {
			api.get(E.REGISTRATIONS, { params: { page_size: 100 } }).then((r) => setRegistrants(r.data.results || r.data || [])).catch(() => setRegistrants([]));
		}
	}, [tab, registrants]);

	const fetchCoins = useCallback(async () => {
		setCoins(null);
		try {
			const params = {};
			Object.entries(coinFilters).forEach(([k, v]) => { if (v) params[k] = v; });
			const res = await api.get(E.TEACHER_COINS, { params });
			setCoins(res.data || []);
		} catch {
			setCoins([]);
		}
	}, [coinFilters]);

	useEffect(() => {
		if (tab === 'coins') fetchCoins();
	}, [tab, fetchCoins]);

	const loadAdjustments = async (teacherId) => {
		setAdjust((a) => ({ ...a, loading: true }));
		try {
			const res = await api.get(E.TEACHER_COIN_ADJUSTMENTS, { params: { teacher: teacherId } });
			setAdjust((a) => ({ ...a, list: res.data.results || res.data || [], loading: false }));
		} catch {
			setAdjust((a) => ({ ...a, list: [], loading: false }));
		}
	};

	const openAdjust = (teacher) => {
		setAdjust({ teacher, amount: '', note: '', list: [], loading: false, busy: false });
		if (teacher) loadAdjustments(teacher.teacher_id);
	};

	const submitAdjust = async () => {
		const amount = parseInt(adjust.amount, 10);
		if (!amount) return;
		setAdjust((a) => ({ ...a, busy: true }));
		try {
			await api.post(E.TEACHER_COIN_ADJUSTMENTS, { teacher: adjust.teacher.teacher_id, amount, note: adjust.note || undefined });
			setAdjust((a) => ({ ...a, amount: '', note: '', busy: false }));
			loadAdjustments(adjust.teacher.teacher_id);
			fetchCoins();
		} catch {
			setAdjust((a) => ({ ...a, busy: false }));
		}
	};

	const deleteAdjust = async (id) => {
		try {
			await api.delete(E.TEACHER_COIN_ADJUSTMENT_DETAIL(id));
			setAdjust((a) => ({ ...a, list: a.list.filter((x) => x.id !== id) }));
			fetchCoins();
		} catch {}
	};

	const openHistory = async (row) => {
		setHistory({ teacher: row, data: null, loading: true });
		try {
			const res = await api.get(E.TEACHER_COIN_HISTORY(row.teacher_id), { params: { lang } });
			setHistory((h) => ({ ...h, data: res.data, loading: false }));
		} catch {
			setHistory((h) => ({ ...h, loading: false }));
		}
	};

	const markCalled = async (id) => {
		setCalling(id);
		try {
			const res = await api.patch(E.REGISTRATION_DETAIL(id), { last_called_at: new Date().toISOString() });
			setRegistrants((prev) => prev.map((r) => (r.id === id ? { ...r, last_called_at: res.data.last_called_at } : r)));
		} catch {}
		setCalling(null);
	};

	if (loading) return <Screen header={<StackHeader />}><Loader /></Screen>;
	if (!stats) return <Screen header={<StackHeader />} onRefresh={() => fetchStats()}><EmptyState icon={BarChart3} title={tx(L.noCoins)} /></Screen>;

	const regionStats = (stats.region_stats || []).map((r) => ({ label: String(r.region), value: r.count })).sort((a, b) => b.value - a.value);
	const gradeStats = (stats.grade_stats || []).map((g) => ({ label: String(g.grade), value: g.count }));
	const totalRegs = (stats.online_registrations || 0) + (stats.offline_registrations || 0);
	const conv = totalRegs > 0 ? ((stats.total_paid / totalRegs) * 100).toFixed(1) : 0;
	const avgTicket = stats.total_paid > 0 ? Math.round(stats.total_revenue / stats.total_paid) : 0;
	const trend = Array.isArray(stats.trend_data) && stats.trend_data.length >= 2
		? stats.trend_data.map((d) => ({ label: String(d.month || d.label || '').slice(0, 6), value: d.registrations }))
		: [0.4, 0.55, 0.7, 0.85, 1].map((f, i) => ({ label: i === 4 ? tx(L.today) : `${[1, 7, 14, 21][i]}`, value: Math.round((stats.total_users || 0) * f) }));

	const olyStats = (stats.oly_fill || []).map((o) => {
		const full = olympiads.find((x) => String(x.id) === String(o.id));
		const registered = o.registered ?? full?.registered_count ?? 0;
		const price = o.price ?? full?.price ?? 0;
		let paid = o.paid_count ?? full?.paid_count ?? o.paid;
		if (paid === undefined) paid = registered;
		paid = Math.min(registered, paid);
		const max = o.max ?? full?.max_participants ?? 0;
		return {
			title: pick(o) || pick(full),
			registered,
			paid,
			unpaid: o.unpaid_count ?? Math.max(0, registered - paid),
			max,
			fill: o.fill ?? (max > 0 ? Math.min(100, Math.round((registered / max) * 100)) : registered > 0 ? 100 : 0),
			revenue: o.revenue ?? paid * price,
			type: o.type,
		};
	});

	const cards = [
		{ icon: Users, label: L.totalPart, value: compact(stats.total_users || 0) },
		{ icon: CreditCard, label: L.totalPaid, value: compact(stats.total_paid || 0) },
		{ icon: TrendingUp, label: L.totalRevenue, value: `${compact(stats.total_revenue || 0)} UZS` },
		{ icon: Percent, label: L.conversion, value: `${conv}%` },
		{ icon: CreditCard, label: L.avgTicket, value: `${compact(avgTicket)} UZS` },
		{ icon: BarChart3, label: L.activeOlys, value: stats.oly_fill?.length || 0 },
	];

	const exportExcel = async () => {
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Metric', 'Value'], [tx(L.totalPart), stats.total_users || 0], [tx(L.totalPaid), stats.total_paid || 0], [tx(L.totalRevenue), stats.total_revenue || 0], ['Online Registrations', stats.online_registrations || 0], ['Offline Registrations', stats.offline_registrations || 0]]), 'Overview');
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Region', 'Full Name', 'Count'], ...regionStats.map((r) => [r.label.split(' ')[0], r.label, r.value])]), 'Regions');
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Grade', 'Participant Count'], ...gradeStats.map((g) => [g.label, g.value])]), 'Grades');
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Olympiad', 'Type', 'Registered', 'Max', 'Fill (%)', 'Paid Count'], ...olyStats.map((o) => [o.title, o.type, o.registered, o.max, o.fill, o.paid])]), 'Olympiads');
		try {
			await shareFile(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), `analytics_report_${isoDay(new Date())}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		} catch {
			toast.error('Excel');
		}
	};

	const filteredRegs = (registrants || []).filter((r) => {
		const q = regSearch.trim().toLowerCase();
		return !q || (r.user_full_name || '').toLowerCase().includes(q) || (r.user_phone || '').toLowerCase().includes(q);
	});

	return (
		<Screen header={<StackHeader right={<IconButton icon={Download} color={colors.green} onPress={exportExcel} />} />} onRefresh={() => fetchStats()}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />

			<Card>
				<Tap onPress={() => setShowOnline((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<IconBadge icon={Wifi} color={colors.green} bg={colors.greenSoft} />
					<View style={{ flex: 1 }}>
						<T style={styles.big}>{stats.total_online || stats.online_users || 0}</T>
						<T v="small" style={{ fontSize: 12 }}>{tx(L.totalOnline)} · {stats.online_users || 0} {tx(L.users)} · {stats.online_guests || 0} {tx(L.guests)}</T>
					</View>
					<ChevronDown size={18} color={colors.faint} style={{ transform: [{ rotate: showOnline ? '180deg' : '0deg' }] }} />
				</Tap>
				{showOnline ? (
					<View style={{ marginTop: 12, gap: 6 }}>
						<T v="label">{tx(L.activity)}</T>
						{(stats.online_users_list || []).map((u, i) => (
							<View key={i} style={styles.line}><T v="strong" style={{ flex: 1, fontSize: 13.5 }}>{u.full_name}</T><T v="small">{u.participant_id}</T></View>
						))}
					</View>
				) : null}
			</Card>

			<Card style={{ marginTop: 12 }}>
				<Tap onPress={() => setShowCal((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<IconBadge icon={Users} color={colors.blue} bg={colors.blueSoft} />
					<View style={{ flex: 1, flexDirection: 'row', gap: 18 }}>
						<View><T style={styles.big}>{stats.registered_today || 0}</T><T v="small" style={{ fontSize: 12 }}>{tx(L.today)}</T></View>
						<View><T style={styles.big}>{stats.registered_yesterday || 0}</T><T v="small" style={{ fontSize: 12 }}>{tx(L.yesterday)}</T></View>
					</View>
					<Pill icon={Calendar} label={tx(L.calendar)} />
				</Tap>
				{showCal ? (
					<View style={{ gap: 10, marginTop: 14 }}>
						<DateTimeField mode="date" label={tx(L.start)} value={start} clearable={false} onChange={(v) => setStart(v.slice(0, 10))} />
						<DateTimeField mode="date" label={tx(L.end)} value={end} clearable={false} onChange={(v) => setEnd(v.slice(0, 10))} />
						<Button size="md" icon={Calendar} title={tx(L.query)} loading={rangeBusy} onPress={() => { setRangeBusy(true); fetchStats(start, end); }} />
						{range.total !== null ? (
							<>
								<T v="strong">{tx(L.rangeTotal)}: <T v="strong" color={colors.amber}>{range.total}</T></T>
								{range.daily.length ? <ColumnChart data={range.daily.map((d) => ({ label: String(d.date).split('-').slice(1).reverse().join('.'), value: d.count }))} /> : <T v="small">{tx(L.noRange)}</T>}
							</>
						) : null}
					</View>
				) : null}
			</Card>

			<View style={styles.cards}>
				{cards.map((c, i) => (
					<View key={i} style={styles.card}>
						<c.icon size={15} color={colors.amber} />
						<T style={[styles.big, { fontSize: 19, marginTop: 6 }]} numberOfLines={1} adjustsFontSizeToFit>{c.value}</T>
						<T v="small" style={{ fontSize: 11 }} numberOfLines={1}>{tx(c.label)}</T>
					</View>
				))}
			</View>

			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginVertical: 14 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
				{TABS.map((k) => (
					<Tap key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
						<T v="strong" style={{ fontSize: 13 }} color={tab === k ? colors.navyDeep : colors.ink2}>{tx(L[k])}</T>
					</Tap>
				))}
			</ScrollView>

			{tab === 'overview' ? (
				<View style={{ gap: 12 }}>
					<Card><T v="h3" style={styles.h}>{tx(L.trend)}</T><AreaChart data={trend} /></Card>
					<Card>
						<T v="h3" style={styles.h}>{tx(L.byType)}</T>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
							<Donut size={120} segments={[{ value: stats.online_registrations || 0, color: colors.gold }, { value: stats.offline_registrations || 0, color: colors.navy }]} center={<T style={styles.big}>{totalRegs}</T>} />
							<View style={{ flex: 1 }}><Legend items={[{ label: tx(L.online), value: `${totalRegs ? Math.round(((stats.online_registrations || 0) / totalRegs) * 100) : 0}%`, color: colors.gold }, { label: tx(L.offline), value: `${totalRegs ? Math.round(((stats.offline_registrations || 0) / totalRegs) * 100) : 0}%`, color: colors.navy }]} /></View>
						</View>
					</Card>
					<Card><T v="h3" style={styles.h}>{tx(L.byGrade)}</T><ColumnChart data={gradeStats} /></Card>
					<Card><T v="h3" style={styles.h}>{tx(L.regions)}</T><HBarList data={regionStats.slice(0, 5)} color={colors.navy} /></Card>
				</View>
			) : tab === 'regions' ? (
				<Card><T v="h3" style={styles.h}>{tx(L.byRegion)}</T><HBarList data={regionStats} color={colors.gold} /></Card>
			) : tab === 'olympiads' ? (
				<View style={{ gap: 10 }}>
					{olyStats.map((o, i) => (
						<Card key={i}>
							<T v="strong" numberOfLines={2}>{o.title}</T>
							<View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
								<Pill label={`${tx(L.registrations)}: ${o.registered}/${o.max > 0 ? o.max : '∞'}`} />
								<Pill label={`${tx(L.paid)}: ${o.paid}`} color={colors.green} bg={colors.greenSoft} />
								<Pill label={`${tx(L.unpaid)}: ${o.unpaid}`} color={colors.red} bg={colors.redSoft} />
								<Pill label={`${tx(L.fill)}: ${o.fill}%`} color={colors.navyDeep} bg={colors.goldSoft} />
							</View>
							<T v="strong" style={{ marginTop: 10 }} color={colors.amber}>{o.revenue > 0 ? `${formatMoney(o.revenue)} UZS` : '—'}</T>
						</Card>
					))}
				</View>
			) : tab === 'registrants' ? (
				<View>
					<Field icon={Search} value={regSearch} onChangeText={(v) => { setRegSearch(v); setRegLimit(20); }} placeholder={tx(L.searchPh)} style={{ marginBottom: 12 }} />
					{registrants === null ? <ActivityIndicator color={colors.goldDeep} /> : !filteredRegs.length ? <EmptyState icon={Users} title={tx(L.noOne)} /> : (
						<>
							{filteredRegs.slice(0, regLimit).map((r) => (
								<Card key={r.id} style={{ marginBottom: 10, padding: 14 }}>
									<T v="strong">{r.user_full_name || '—'}</T>
									<T v="small" style={{ fontSize: 12 }} numberOfLines={2}>{r.user_grade ? `${r.user_grade} · ` : ''}{r.olympiad_title} · {formatShortDate(r.registered_at, lang)}</T>
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
										{r.user_phone ? <Button style={{ flex: 1 }} size="sm" variant="light" icon={Phone} title={r.user_phone} onPress={() => Linking.openURL(`tel:${r.user_phone}`)} /> : <Pill label={tx(L.noPhone)} />}
										<Button size="sm" variant={r.last_called_at ? 'success' : 'soft'} icon={PhoneCall} title={tx(L.markCalled)} loading={calling === r.id} onPress={() => markCalled(r.id)} />
									</View>
									{r.last_called_at ? <T v="small" style={{ fontSize: 11.5, marginTop: 6 }}>{tx(L.lastCalled)} {formatShortDate(r.last_called_at, lang)}</T> : null}
								</Card>
							))}
							{filteredRegs.length > regLimit ? <Button size="md" variant="light" title={`${tx(L.loadMore)} (${filteredRegs.length - regLimit})`} onPress={() => setRegLimit((n) => n + 20)} /> : null}
						</>
					)}
				</View>
			) : (
				<View style={{ gap: 10 }}>
					<SelectField value={coinFilters.region} onChange={(v) => setCoinFilters((f) => ({ ...f, region: v }))} placeholder={tx(L.allRegions)} options={[{ value: '', label: tx(L.allRegions) }, ...regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))]} />
					<SelectField value={coinFilters.olympiad} onChange={(v) => setCoinFilters((f) => ({ ...f, olympiad: v }))} placeholder={tx(L.allOlympiads)} options={[{ value: '', label: tx(L.allOlympiads) }, ...olympiads.map((o) => ({ value: String(o.id), label: pick(o) }))]} />
					<SelectField value={coinFilters.grade} onChange={(v) => setCoinFilters((f) => ({ ...f, grade: v }))} placeholder={tx(L.allGrades)} options={[{ value: '', label: tx(L.allGrades) }, ...GRADES.map((g) => ({ value: String(g), label: String(g) }))]} />
					<Button size="md" icon={Plus} title={tx(L.manageCoins)} onPress={() => openAdjust(null)} />
					{coins === null ? <ActivityIndicator color={colors.goldDeep} /> : !coins.length ? <EmptyState icon={Award} title={tx(L.noCoins)} /> : coins.map((row, i) => (
						<Card key={row.teacher_id}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
								<T v="h3" style={{ width: 28 }}>{i + 1}</T>
								<View style={{ flex: 1 }}>
									<T v="strong">{row.teacher_name}</T>
									<T v="small" style={{ fontSize: 12 }}>{row.teacher_phone}{row.region_name ? ` · ${row.region_name}` : ''}</T>
								</View>
								<View style={styles.coin}><Award size={14} color={colors.navyDeep} /><T v="strong" style={{ fontSize: 15 }}>{row.total_coins}</T></View>
							</View>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
								<Pill label={`🥇 ${row.gold}`} /><Pill label={`🥈 ${row.silver}`} /><Pill label={`🥉 ${row.bronze}`} />
								<Pill label={`${tx(L.registrations)} +${row.student_reg_count || 0}`} />
								<Pill label={`${tx(L.medalists)}: ${row.student_count}`} />
								{row.manual_adjustment ? <Pill label={`${tx(L.manual)}: ${row.manual_adjustment > 0 ? '+' : ''}${row.manual_adjustment}`} color={colors.purple} bg={colors.purpleSoft} /> : null}
								{row.teacher_approved ? <Pill icon={CheckCircle2} label={tx(L.approved)} color={colors.green} bg={colors.greenSoft} /> : null}
							</View>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
								<Button style={{ flex: 1 }} size="sm" variant="light" icon={History} title={tx(L.history)} onPress={() => openHistory(row)} />
								<Button style={{ flex: 1 }} size="sm" variant="soft" icon={Plus} title={tx(L.adjust)} onPress={() => openAdjust(row)} />
							</View>
						</Card>
					))}
				</View>
			)}

			<Sheet visible={!!adjust} onClose={() => setAdjust(null)} title={tx(L.manageCoins)} scroll maxHeight="92%">
				{adjust ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						{adjust.teacher ? (
							<View style={styles.teacher}>
								<T v="strong" style={{ flex: 1 }}>{adjust.teacher.teacher_name}</T>
								<Button size="sm" variant="light" title={tx(L.change)} onPress={() => setAdjust((a) => ({ ...a, teacher: null, list: [] }))} />
							</View>
						) : (
							<TeacherSearch onSelect={(t) => { const teacher = { teacher_id: t.id, teacher_name: t.full_name }; setAdjust((a) => ({ ...a, teacher })); loadAdjustments(t.id); }} />
						)}
						{adjust.teacher ? (
							<>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<Tap onPress={() => setAdjust((a) => ({ ...a, amount: a.amount.startsWith('-') ? a.amount.slice(1) : `-${a.amount}` }))} style={styles.sign}><T v="strong" style={{ fontSize: 18 }}>±</T></Tap>
									<Field style={{ flex: 1 }} value={adjust.amount} keyboardType="numbers-and-punctuation" placeholder={tx(L.amount)} onChangeText={(v) => setAdjust((a) => ({ ...a, amount: v.replace(/[^\d-]/g, '') }))} />
								</View>
								<TextArea rows={2} value={adjust.note} placeholder={tx(L.note)} onChangeText={(v) => setAdjust((a) => ({ ...a, note: v }))} />
								<Button title={tx(L.add)} icon={Plus} loading={adjust.busy} disabled={!parseInt(adjust.amount, 10)} onPress={submitAdjust} />
								<T v="h3">{tx(L.history)}</T>
								{adjust.loading ? <ActivityIndicator color={colors.goldDeep} /> : !adjust.list.length ? <T v="small">{tx(L.noAdjustments)}</T> : adjust.list.map((a) => (
									<View key={a.id} style={styles.line}>
										{a.amount >= 0 ? <Plus size={13} color={colors.green} /> : <Minus size={13} color={colors.red} />}
										<T v="strong" color={a.amount >= 0 ? colors.green : colors.red}>{Math.abs(a.amount)}</T>
										<T v="small" style={{ flex: 1 }} numberOfLines={2}>{a.note || ''}</T>
										<Tap onPress={() => deleteAdjust(a.id)}><Trash2 size={15} color={colors.red} /></Tap>
									</View>
								))}
							</>
						) : null}
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!history} onClose={() => setHistory(null)} title={tx(L.coinHistory)} scroll maxHeight="92%">
				{history ? (
					<View style={{ gap: 10, paddingBottom: 10 }}>
						<T v="h3">{history.data?.teacher_name || history.teacher.teacher_name}</T>
						<T v="small">{history.data?.teacher_phone || history.teacher.teacher_phone}{(history.data?.region_name || history.teacher.region_name) ? ` · ${history.data?.region_name || history.teacher.region_name}` : ''}</T>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
							<Pill label={`${tx(L.approval)} +${history.data?.registration_coin ?? (history.teacher.teacher_approved ? 1 : 0)}`} />
							<Pill label={`${tx(L.registrations)} +${history.data?.student_reg_count ?? history.teacher.student_reg_count ?? 0}`} />
							<Pill label={`${tx(L.medals)} +${history.data?.medal_coins ?? (history.teacher.gold || 0) * 5 + (history.teacher.silver || 0) * 4 + (history.teacher.bronze || 0) * 3}`} color={colors.navyDeep} bg={colors.goldSoft} />
							<Pill label={`${tx(L.manual)} ${history.data?.manual_adjustment ?? history.teacher.manual_adjustment ?? 0}`} color={colors.purple} bg={colors.purpleSoft} />
						</View>
						<T v="strong" color={colors.amber}>{tx(L.totalCoins)}: {history.data?.total_coins ?? history.teacher.total_coins ?? 0}</T>
						{history.loading ? <ActivityIndicator color={colors.goldDeep} /> : !history.data?.history?.length ? <T v="small">{tx(L.historyEmpty)}</T> : history.data.history.map((item, idx) => {
							const Icon = item.type === 'teacher_approval' ? CheckCircle2 : item.type === 'student_registration' ? GraduationCap : item.type === 'medal_result' ? Trophy : item.coins >= 0 ? Plus : Minus;
							return (
								<View key={idx} style={styles.hist}>
									<Icon size={16} color={colors.amber} />
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 13.5 }}>{item.title}</T>
										{item.description ? <T v="small" style={{ fontSize: 12 }}>{item.description}</T> : null}
										{item.date ? <T v="small" style={{ fontSize: 11 }}>{formatShortDate(item.date, lang)}</T> : null}
									</View>
									<Pill label={item.coins > 0 ? `+${item.coins}` : String(item.coins)} color={item.coins > 0 ? colors.green : item.coins < 0 ? colors.red : colors.muted} bg={item.coins > 0 ? colors.greenSoft : item.coins < 0 ? colors.redSoft : colors.cardMuted} />
								</View>
							);
						})}
					</View>
				) : null}
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	big: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink },
	line: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginTop: 12 },
	card: { width: '32%', backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
	tab: { paddingHorizontal: 14, height: 38, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	tabOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	h: { marginBottom: 12 },
	coin: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.gold },
	teacher: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.greenSoft },
	sign: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	hist: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
});
