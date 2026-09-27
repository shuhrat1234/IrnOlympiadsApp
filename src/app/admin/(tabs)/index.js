import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Activity, ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, CreditCard, GraduationCap, Plane, Target, TrendingUp, Trophy, Users, Wifi } from 'lucide-react-native';
import api from '../../../api/client';
import E from '../../../api/endpoints';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useOlympiad } from '../../../context/OlympiadContext';
import { Screen, LargeTitle } from '../../../components/layout';
import { Card, IconBadge, Loader, T, Tap } from '../../../components/ui';
import { AreaChart, ColumnChart, Donut, HBarList, Legend, compact } from '../../../components/charts';
import { colors, fonts, gradients, radius, shadow } from '../../../theme';

const L = {
	title: { uz: 'Dashboard', ru: 'Дашборд', en: 'Dashboard' },
	subtitle: { uz: "Umumiy ko'rinish", ru: 'Общий обзор', en: 'Overview' },
	totalUsers: { uz: 'Jami foydalanuvchilar', ru: 'Пользователи', en: 'Total Users' },
	totalOlympiads: { uz: 'Olimpiadalar', ru: 'Олимпиады', en: 'Olympiads' },
	online: { uz: 'Onlayn', ru: 'Онлайн', en: 'Online' },
	offline: { uz: 'Oflayn', ru: 'Офлайн', en: 'Offline' },
	totalPaid: { uz: "To'lovlar", ru: 'Платежи', en: 'Payments' },
	totalRevenue: { uz: 'Daromad', ru: 'Доход', en: 'Revenue' },
	trend: { uz: "Ro'yxatdan o'tish dinamikasi", ru: 'Динамика регистраций', en: 'Registration Trend' },
	fill: { uz: "Olimpiadalar to'ldirilishi", ru: 'Заполняемость олимпиад', en: 'Olympiad Fill Rates' },
	regions: { uz: 'Top viloyatlar', ru: 'Топ регионы', en: 'Top Regions' },
	byType: { uz: "Turi bo'yicha", ru: 'По типу', en: 'By Type' },
	byGrade: { uz: "Sinflar bo'yicha", ru: 'По классам', en: 'By Grade' },
	onlineNow: { uz: 'Jami onlayn', ru: 'Всего онлайн', en: 'Total Online' },
	registered: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' },
	guests: { uz: 'Mehmonlar', ru: 'Гости', en: 'Guests' },
	activity: { uz: 'Hozirgi faoliyat', ru: 'Текущая активность', en: 'Current Activity' },
	noActive: { uz: "Faol foydalanuvchilar yo'q", ru: 'Нет активных пользователей', en: 'No active users' },
	visaTitle: { uz: 'Viza / Elchixona', ru: 'Виза / Посольство', en: 'Visa / Embassy' },
	visaSub: { uz: 'Elchixona uchun hujjatlarni boshqarish', ru: 'Управление документами для посольства', en: 'Manage embassy documents' },
	reg: { uz: "ro'yxat", ru: 'рег.', en: 'reg' },
	paid: { uz: "to'lov", ru: 'оплач.', en: 'paid' },
	unpaid: { uz: "to'lamagan", ru: 'неоплач.', en: 'unpaid' },
	today: { uz: 'Bugun', ru: 'Сегодня', en: 'Today' },
	noData: { uz: "Ma'lumot yo'q", ru: 'Нет данных', en: 'No data' },
};

// Percent badges — same heuristics as the website dashboard.
const growth = (s) => {
	if (Array.isArray(s.trend_data) && s.trend_data.length >= 2) {
		const curr = s.trend_data[s.trend_data.length - 1]?.registrations || 0;
		const prev = s.trend_data[s.trend_data.length - 2]?.registrations || 0;
		if (prev > 0) {
			const pct = Math.round(((curr - prev) / prev) * 100);
			return { change: `${pct >= 0 ? '+' : ''}${pct}%`, trend: pct >= 0 ? 'up' : 'down' };
		}
		if (curr > 0) return { change: '+100%', trend: 'up' };
	}
	if (s.registered_yesterday > 0) {
		const pct = Math.round((((s.registered_today || 0) - s.registered_yesterday) / s.registered_yesterday) * 100);
		return { change: `${pct >= 0 ? '+' : ''}${pct}%`, trend: pct >= 0 ? 'up' : 'down' };
	}
	if (s.total_users > 0 && s.registered_today) return { change: `+${Math.max(1, Math.round((s.registered_today / s.total_users) * 100))}%`, trend: 'up' };
	return { change: '+0%', trend: 'up' };
};

const conversion = (s) => {
	const regs = (s.online_registrations || 0) + (s.offline_registrations || 0) || (s.oly_fill || []).reduce((a, o) => a + (o.registered || 0), 0) || s.total_users || 0;
	return regs > 0 ? `+${Math.min(100, Math.round(((s.total_paid || 0) / regs) * 100))}%` : '+0%';
};

const realization = (s) => {
	const potential = (s.oly_fill || []).reduce((sum, o) => sum + (o.registered || 0) * (o.price || (o.paid_count > 0 && o.revenue ? Math.round(o.revenue / o.paid_count) : 0)), 0);
	if (potential > 0 && s.total_revenue > 0) return `+${Math.min(100, Math.round((s.total_revenue / potential) * 100))}%`;
	return conversion(s) === '+0%' ? '+100%' : conversion(s);
};

export default function AdminDashboard() {
	const { tx, pick } = useLanguage();
	const { fetchMe } = useAuth();
	const { olympiads, fetchOlympiads } = useOlympiad();
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showOnline, setShowOnline] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await api.get(E.ADMIN_STATS);
			setStats(res.data);
		} catch {
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMe();
		fetchOlympiads(true);
		load();
	}, []);

	if (loading) return <Screen tabBar><Loader /></Screen>;
	if (!stats) return <Screen tabBar onRefresh={load}><LargeTitle title={tx(L.title)} /><T v="body">{tx(L.noData)}</T></Screen>;

	const total = stats.total_users || 0;
	const trendData = Array.isArray(stats.trend_data) && stats.trend_data.length >= 2
		? stats.trend_data.map((d) => ({ label: String(d.month || d.label || '').slice(0, 6), value: d.registrations }))
		: [0.4, 0.55, 0.7, 0.85, 1].map((f, i) => ({ label: i === 4 ? tx(L.today) : `${[1, 7, 14, 21][i]}`, value: Math.round(total * f) }));

	const fillData = (stats.oly_fill || []).map((o) => {
		const full = olympiads.find((x) => String(x.id) === String(o.id));
		const registered = full?.registered_count ?? o.registered ?? 0;
		let paid = full?.paid_count ?? o.paid ?? o.paid_count;
		if (paid === undefined) paid = registered;
		paid = Math.min(registered, paid);
		const max = full?.max_participants || o.max || 0;
		const fill = max > 0 ? Math.min(100, Math.round((registered / max) * 100)) : registered > 0 ? 100 : 0;
		return { label: pick(o).split(' ').slice(0, 3).join(' ') || 'Olympiad', value: fill, sub: `${registered} ${tx(L.reg)}, ${paid} ${tx(L.paid)}${registered - paid > 0 ? `, ${registered - paid} ${tx(L.unpaid)}` : ''}` };
	});

	const topRegions = (stats.region_stats || [])
		.filter((r) => r.region && r.region !== 'Unknown' && r.region !== 'null' && r.region.trim())
		.slice(0, 6)
		.map((r) => ({ label: r.region, value: r.count }));

	const grades = (stats.grade_stats || [])
		.filter((g) => g.grade !== null && g.grade !== undefined && String(g.grade).trim() && !['null', 'undefined'].includes(String(g.grade)))
		.sort((a, b) => (parseInt(a.grade, 10) || 99) - (parseInt(b.grade, 10) || 99))
		.map((g) => ({ label: String(g.grade), value: g.count }));

	const g = growth(stats);
	const cards = [
		{ icon: Users, label: tx(L.totalUsers), value: compact(total), change: g.change, trend: g.trend, dark: true },
		{ icon: Trophy, label: tx(L.totalOlympiads), value: stats.total_olympiads, change: `${stats.online_oly} / ${stats.offline_oly}`, sub: `${tx(L.online)} / ${tx(L.offline)}` },
		{ icon: CreditCard, label: tx(L.totalPaid), value: compact(stats.total_paid), change: conversion(stats), dark: true },
		{ icon: TrendingUp, label: tx(L.totalRevenue), value: `${compact(stats.total_revenue)} UZS`, change: realization(stats) },
	];

	const onlineTotal = stats.total_online || stats.online_users || 0;

	return (
		<Screen tabBar onRefresh={() => Promise.all([load(), fetchOlympiads(true)])}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />

			<Tap onPress={() => router.push('/admin/visa')} style={styles.visa}>
				<IconBadge icon={Plane} color={colors.gold} bg="rgba(255,255,255,0.1)" size={42} />
				<View style={{ flex: 1 }}>
					<T v="strong" color="#fff">{tx(L.visaTitle)}</T>
					<T v="small" color="rgba(255,255,255,0.65)">{tx(L.visaSub)}</T>
				</View>
				<ChevronRight size={20} color="#fff" />
			</Tap>

			{/* Live online */}
			<Card style={{ marginTop: 14 }}>
				<Tap onPress={() => setShowOnline((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<IconBadge icon={Wifi} color={colors.green} bg={colors.greenSoft} size={44} />
					<View style={{ flex: 1 }}>
						<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
							<T style={{ fontFamily: fonts.extrabold, fontSize: 26, color: colors.ink }}>{onlineTotal}</T>
							<T v="small">{tx(L.onlineNow)}</T>
						</View>
						<T v="small" style={{ fontSize: 12 }}>{stats.online_users || 0} {tx(L.registered)} · {stats.online_guests || 0} {tx(L.guests)}</T>
					</View>
					<View style={styles.live}><View style={styles.liveDot} /><T v="label" color={colors.green} style={{ fontSize: 9.5 }}>Live</T></View>
					<ChevronDown size={18} color={colors.faint} style={{ transform: [{ rotate: showOnline ? '180deg' : '0deg' }] }} />
				</Tap>
				{showOnline ? (
					<Animated.View entering={FadeIn} style={{ marginTop: 14, gap: 8 }}>
						<T v="label">{tx(L.activity)}</T>
						{stats.online_users_list?.length ? (
							stats.online_users_list.map((u, i) => (
								<View key={i} style={styles.onlineRow}>
									<View style={styles.onlineAvatar}><T v="strong" style={{ fontSize: 12 }}>{u.full_name?.charAt(0)}</T></View>
									<T v="strong" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1}>{u.full_name}</T>
									<T v="small" style={{ fontSize: 11.5 }}>{u.participant_id}</T>
								</View>
							))
						) : (
							<T v="small">{tx(L.noActive)}</T>
						)}
					</Animated.View>
				) : null}
			</Card>

			<View style={styles.cards}>
				{cards.map((c, i) => (
					<Animated.View key={i} entering={FadeInDown.delay(i * 60)} style={{ width: '48.5%' }}>
						<LinearGradient colors={c.dark ? gradients.navy : gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stat}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
								<View style={[styles.statIcon, { backgroundColor: c.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)' }]}>
									<c.icon size={16} color={c.dark ? colors.gold : colors.navyDeep} />
								</View>
								<View style={[styles.change, { backgroundColor: c.dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)' }]}>
									{c.trend === 'down' ? <ArrowDownRight size={11} color={c.dark ? '#FF8A8D' : colors.red} /> : c.trend === 'up' ? <ArrowUpRight size={11} color={c.dark ? colors.gold : colors.navyDeep} /> : null}
									<T style={{ fontFamily: fonts.bold, fontSize: 10.5, color: c.dark ? '#fff' : colors.navyDeep }}>{c.change}</T>
								</View>
							</View>
							<T style={{ fontFamily: fonts.extrabold, fontSize: 24, marginTop: 14, color: c.dark ? '#fff' : colors.navyDeep }} numberOfLines={1} adjustsFontSizeToFit>{c.value}</T>
							<T style={{ fontFamily: fonts.semibold, fontSize: 12, color: c.dark ? 'rgba(255,255,255,0.65)' : 'rgba(12,26,54,0.7)' }} numberOfLines={1}>{c.label}</T>
							{c.sub ? <T style={{ fontFamily: fonts.medium, fontSize: 10.5, color: 'rgba(12,26,54,0.6)' }}>{c.sub}</T> : null}
						</LinearGradient>
					</Animated.View>
				))}
			</View>

			<Card style={{ marginTop: 14 }}>
				<View style={styles.cardHead}><TrendingUp size={16} color={colors.amber} /><T v="h3">{tx(L.trend)}</T></View>
				<AreaChart data={trendData} />
			</Card>

			<Card style={{ marginTop: 14 }}>
				<View style={styles.cardHead}><Trophy size={16} color={colors.amber} /><T v="h3">{tx(L.byType)}</T></View>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
					<Donut
						size={130}
						segments={[{ value: stats.online_oly, color: colors.gold }, { value: stats.offline_oly, color: colors.navy }]}
						center={<T style={{ fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink }}>{stats.total_olympiads}</T>}
					/>
					<View style={{ flex: 1 }}>
						<Legend items={[{ label: tx(L.online), value: stats.online_oly, color: colors.gold }, { label: tx(L.offline), value: stats.offline_oly, color: colors.navy }]} />
					</View>
				</View>
			</Card>

			<Card style={{ marginTop: 14 }}>
				<View style={styles.cardHead}><Target size={16} color={colors.amber} /><T v="h3">{tx(L.fill)}</T></View>
				{fillData.length ? <HBarList data={fillData.slice(0, 6)} format={(v) => `${v}%`} /> : <T v="small">{tx(L.noData)}</T>}
			</Card>

			<Card style={{ marginTop: 14 }}>
				<View style={styles.cardHead}><Activity size={16} color={colors.amber} /><T v="h3">{tx(L.regions)}</T></View>
				{topRegions.length ? <HBarList data={topRegions} color={colors.navy} /> : <T v="small">{tx(L.noData)}</T>}
			</Card>

			<Card style={{ marginTop: 14 }}>
				<View style={styles.cardHead}><GraduationCap size={16} color={colors.amber} /><T v="h3">{tx(L.byGrade)}</T></View>
				{grades.length ? <ColumnChart data={grades} /> : <T v="small">{tx(L.noData)}</T>}
			</Card>
		</Screen>
	);
}

const styles = StyleSheet.create({
	visa: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.xl, backgroundColor: colors.navy, ...shadow(2) },
	live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
	liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
	onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	onlineAvatar: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 14 },
	stat: { borderRadius: 24, padding: 16, minHeight: 138, ...shadow(1) },
	statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	change: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
	cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
});
