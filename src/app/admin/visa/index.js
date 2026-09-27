import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, FileWarning, ShieldAlert, Users2, Wallet } from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../../components/layout';
import { Card, T, Tap } from '../../../components/ui';
import { ACTIVE_STATUSES, FINISHED_STATUSES, VisaBell, VisaNav, fetchAllApplicants } from '../../../components/admin/visa';
import { colors, fonts } from '../../../theme';
import { formatMoney } from '../../../utils/format';

const L = {
	title: { uz: 'Viza / Elchixona', ru: 'Виза / Посольство', en: 'Visa / Embassy' },
	subtitle: { uz: "Viza moduli bo'yicha umumiy holat", ru: 'Общая картина по визовому модулю', en: 'Overview of the visa module' },
	total: { uz: 'Jami ishtirokchilar', ru: 'Всего участников', en: 'Total applicants' },
	ready: { uz: "To'liq tayyor", ru: 'Полностью готовы', en: 'Fully ready' },
	debtors: { uz: 'Qarzdorlar', ru: 'С задолженностью', en: 'With debt' },
	missingDocs: { uz: 'Hujjat kutilmoqda', ru: 'Ожидают документы', en: 'Awaiting documents' },
	expiredDocs: { uz: "Muddati o'tgan hujjatlar", ru: 'Просроченные документы', en: 'Expired documents' },
	appointments7: { uz: 'Keyingi 7 kunlik yozuvlar', ru: 'Записи на ближайшие 7 дней', en: 'Appointments in the next 7 days' },
	urgent: { uz: "Shoshilinch e'tibor talab qiladi", ru: 'Требуют срочного внимания', en: 'Require urgent attention' },
	workload: { uz: 'Xodimlar yuklamasi', ru: 'Нагрузка сотрудников', en: 'Staff workload' },
	noAppointments: { uz: "Keyingi 7 kunda yozuvlar yo'q", ru: 'Нет записей в ближайшие 7 дней', en: 'No appointments in the next 7 days' },
	noUrgent: { uz: "Shoshilinch holatlar yo'q", ru: 'Нет срочных случаев', en: 'No urgent cases' },
	notAssigned: { uz: 'Tayinlanmagan', ru: 'Не назначен', en: 'Not assigned' },
	people: { uz: 'kishi', ru: 'чел.', en: 'people' },
	loadErr: { uz: "Ma'lumotlarni yuklab bo'lmadi", ru: 'Не удалось загрузить данные', en: 'Failed to load data' },
};

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function VisaDashboard() {
	const { tx } = useLanguage();
	const toast = useToast();
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		try {
			setApplicants(await fetchAllApplicants());
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, []);
	useEffect(() => { load(); }, [load]);

	const stats = useMemo(() => {
		const debtors = applicants.filter((a) => a.debt > 0);
		const now = new Date();
		const in7 = new Date(now.getTime() + 7 * 86400000);
		const workload = {};
		applicants.forEach((a) => { const k = a.assigned_to_name || tx(L.notAssigned); workload[k] = (workload[k] || 0) + 1; });
		return {
			total: applicants.length,
			ready: applicants.filter((a) => a.debt <= 0 && !a.has_expired_documents && !a.has_documents_needing_replacement && ACTIVE_STATUSES.includes(a.status)).length,
			debtors: debtors.length,
			totalDebt: debtors.reduce((s, a) => s + (a.debt || 0), 0),
			missingDocs: applicants.filter((a) => a.status === 'awaiting_documents').length,
			expiredDocs: applicants.filter((a) => a.has_expired_documents).length,
			upcoming: applicants.filter((a) => a.embassy_appointment_date && new Date(a.embassy_appointment_date) >= now && new Date(a.embassy_appointment_date) <= in7).sort((a, b) => new Date(a.embassy_appointment_date) - new Date(b.embassy_appointment_date)),
			urgent: applicants.filter((a) => (a.has_expired_documents || a.has_documents_needing_replacement) && !FINISHED_STATUSES.includes(a.status)),
			workload: Object.entries(workload).sort((a, b) => b[1] - a[1]),
		};
	}, [applicants, tx]);

	const tiles = [
		{ label: L.total, value: stats.total, icon: Users2, c: [colors.ink2, colors.cardMuted] },
		{ label: L.ready, value: stats.ready, icon: CheckCircle2, c: [colors.green, colors.greenSoft] },
		{ label: L.debtors, value: stats.debtors, sub: `${formatMoney(stats.totalDebt)} UZS`, icon: Wallet, c: [colors.red, colors.redSoft] },
		{ label: L.missingDocs, value: stats.missingDocs, icon: FileWarning, c: [colors.amber, colors.goldTint] },
		{ label: L.expiredDocs, value: stats.expiredDocs, icon: AlertTriangle, c: [colors.red, colors.redSoft] },
	];
	const open = (id) => router.push(`/admin/visa/participants/${id}`);

	return (
		<Screen header={<StackHeader onBack={() => router.back()} right={<VisaBell />} />} onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<VisaNav />
			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 30 }} /> : (
				<>
					<View style={styles.tiles}>
						{tiles.map((t) => (
							<Card key={t.label.en} style={styles.tile}>
								<View style={[styles.tileIcon, { backgroundColor: t.c[1] }]}><t.icon size={16} color={t.c[0]} /></View>
								<T style={styles.tileValue}>{t.value}</T>
								<T v="small" style={{ fontSize: 11.5 }} numberOfLines={2}>{tx(t.label)}</T>
								{t.sub ? <T v="strong" style={{ fontSize: 11.5 }} color={colors.red}>{t.sub}</T> : null}
							</Card>
						))}
					</View>

					<Card style={{ marginBottom: 12 }}>
						<View style={styles.head}><CalendarClock size={16} color={colors.blue} /><T v="strong">{tx(L.appointments7)}</T></View>
						{!stats.upcoming.length ? <T v="small">{tx(L.noAppointments)}</T> : stats.upcoming.map((a) => {
							const d = new Date(a.embassy_appointment_date);
							return (
								<Tap key={a.id} onPress={() => open(a.id)} style={styles.row}>
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 14 }}>{a.full_name}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{a.country}</T>
									</View>
									<View style={{ alignItems: 'flex-end' }}>
										<T v="strong" style={{ fontSize: 13 }} color={colors.blue}>{d.toLocaleDateString()}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{hhmm(d)}</T>
									</View>
								</Tap>
							);
						})}
					</Card>

					<Card style={{ marginBottom: 12 }}>
						<View style={styles.head}><ShieldAlert size={16} color={colors.red} /><T v="strong">{tx(L.urgent)}</T></View>
						{!stats.urgent.length ? <T v="small">{tx(L.noUrgent)}</T> : stats.urgent.map((a) => (
							<Tap key={a.id} onPress={() => open(a.id)} style={styles.row}>
								<AlertTriangle size={14} color={colors.red} />
								<View style={{ flex: 1 }}>
									<T v="strong" style={{ fontSize: 14 }}>{a.full_name}</T>
									<T v="small" style={{ fontSize: 11.5 }}>{a.status_display}</T>
								</View>
								<ChevronRight size={15} color={colors.muted} />
							</Tap>
						))}
					</Card>

					<Card>
						<View style={styles.head}><Users2 size={16} color={colors.navy} /><T v="strong">{tx(L.workload)}</T></View>
						{stats.workload.map(([name, count]) => (
							<View key={name} style={{ marginBottom: 10 }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
									<T v="body" style={{ fontSize: 13.5, flex: 1 }} numberOfLines={1}>{name}</T>
									<T v="strong" style={{ fontSize: 12.5 }}>{count} {tx(L.people)}</T>
								</View>
								<View style={styles.track}><View style={[styles.fill, { width: `${stats.total ? (count / stats.total) * 100 : 0}%` }]} /></View>
							</View>
						))}
					</Card>
				</>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
	tile: { width: '47%', flexGrow: 1, padding: 14, gap: 4 },
	tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
	tileValue: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink },
	head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
	track: { height: 8, borderRadius: 4, backgroundColor: colors.cardMuted, overflow: 'hidden' },
	fill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
});
