import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../../components/layout';
import { Card, Pill, T, Tap } from '../../../components/ui';
import { VisaBell, VisaNav, fetchAllApplicants, statusTone, useStatusLabel } from '../../../components/admin/visa';
import { colors, fonts, radius } from '../../../theme';

const WEEKDAYS = { ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
const MONTHS = {
	ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
	uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
	en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const L = {
	title: { uz: 'Taqvim', ru: 'Календарь', en: 'Calendar' },
	subtitle: { uz: 'Elchixonaga yozuvlar', ru: 'Записи в посольство', en: 'Embassy appointments' },
	appointmentsOn: { uz: 'Yozuvlar', ru: 'Записи на', en: 'Appointments on' },
	noneOnDay: { uz: "Bu kunda yozuvlar yo'q", ru: 'В этот день записей нет', en: 'No appointments on this day' },
	selectDay: { uz: 'Yozuvli kunni tanlang', ru: 'Выберите день с записью', en: 'Select a day with an appointment' },
	loadErr: { uz: "Ma'lumotlarni yuklab bo'lmadi", ru: 'Не удалось загрузить данные', en: 'Failed to load data' },
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function VisaCalendar() {
	const { tx, lang } = useLanguage();
	const toast = useToast();
	const statusLabel = useStatusLabel();
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
	const [selected, setSelected] = useState(() => new Date());

	const load = useCallback(async () => {
		try {
			setApplicants((await fetchAllApplicants()).filter((a) => a.embassy_appointment_date));
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, []);
	useEffect(() => { load(); }, [load]);

	const weeks = useMemo(() => {
		const y = cursor.getFullYear();
		const m = cursor.getMonth();
		const cells = Array.from({ length: (new Date(y, m, 1).getDay() + 6) % 7 }, () => null);
		const days = new Date(y, m + 1, 0).getDate();
		for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
		while (cells.length % 7) cells.push(null);
		const out = [];
		for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
		return out;
	}, [cursor]);

	const forDay = (day) => (day ? applicants.filter((a) => sameDay(new Date(a.embassy_appointment_date), day)).sort((a, b) => new Date(a.embassy_appointment_date) - new Date(b.embassy_appointment_date)) : []);
	const today = new Date();
	const dayList = forDay(selected);
	const monthCount = applicants.filter((a) => { const d = new Date(a.embassy_appointment_date); return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth(); }).length;

	return (
		<Screen header={<StackHeader onBack={() => router.back()} right={<VisaBell />} />} onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<VisaNav />
			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 30 }} /> : (
				<>
					<Card style={{ marginBottom: 14 }}>
						<View style={styles.monthRow}>
							<Tap onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} style={styles.monthBtn}><ChevronLeft size={18} color={colors.ink} /></Tap>
							<View style={{ flex: 1, alignItems: 'center' }}>
								<T v="strong" style={{ fontSize: 16 }}>{(MONTHS[lang] || MONTHS.ru)[cursor.getMonth()]} {cursor.getFullYear()}</T>
								<T v="small" style={{ fontSize: 11 }}>{monthCount} ✈︎</T>
							</View>
							<Tap onPress={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} style={styles.monthBtn}><ChevronRight size={18} color={colors.ink} /></Tap>
						</View>
						<View style={styles.week}>{(WEEKDAYS[lang] || WEEKDAYS.ru).map((w) => <T key={w} v="label" style={styles.wd}>{w}</T>)}</View>
						{weeks.map((week, wi) => (
							<View key={wi} style={styles.week}>
								{week.map((day, di) => {
									if (!day) return <View key={di} style={styles.cell} />;
									const n = forDay(day).length;
									const isToday = sameDay(day, today);
									const isSel = sameDay(day, selected);
									return (
										<Tap key={di} onPress={() => setSelected(day)} containerStyle={{ flex: 1 }} style={[styles.cell, n > 0 && styles.cellHas, isToday && styles.cellToday, isSel && styles.cellSel]}>
											<T style={[styles.dayNum, isSel && { color: colors.navyDeep }]}>{day.getDate()}</T>
											{n > 0 ? <View style={{ flexDirection: 'row', gap: 2 }}>{Array.from({ length: Math.min(n, 3) }, (_, k) => <View key={k} style={[styles.dot, isSel && { backgroundColor: colors.navyDeep }]} />)}</View> : null}
										</Tap>
									);
								})}
							</View>
						))}
					</Card>

					<Card>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
							<CalendarDays size={16} color={colors.blue} />
							<T v="strong">{tx(L.appointmentsOn)} {selected.toLocaleDateString()}</T>
						</View>
						{!dayList.length ? <T v="small">{tx(L.noneOnDay)}</T> : dayList.map((a) => {
							const d = new Date(a.embassy_appointment_date);
							const [c, bg] = statusTone(a.status);
							return (
								<Tap key={a.id} onPress={() => router.push(`/admin/visa/participants/${a.id}`)} style={styles.appt}>
									<View style={styles.time}><T style={{ fontFamily: fonts.extrabold, fontSize: 14, color: colors.blue }}>{hhmm(d)}</T></View>
									<View style={{ flex: 1, gap: 4 }}>
										<T v="strong" style={{ fontSize: 14 }}>{a.full_name}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{a.country}{a.assigned_to_name ? ` · ${a.assigned_to_name}` : ''}</T>
										<Pill label={statusLabel(a.status)} color={c} bg={bg} style={{ alignSelf: 'flex-start' }} />
									</View>
								</Tap>
							);
						})}
					</Card>
				</>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
	monthBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	week: { flexDirection: 'row', gap: 4, marginBottom: 4 },
	wd: { flex: 1, textAlign: 'center', fontSize: 10 },
	cell: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
	cellHas: { backgroundColor: colors.blueSoft },
	cellToday: { borderWidth: 1.5, borderColor: colors.goldDeep },
	cellSel: { backgroundColor: colors.gold },
	dayNum: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink2 },
	dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue },
	appt: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
	time: { width: 58, height: 40, borderRadius: radius.md, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
});
