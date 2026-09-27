import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, ArrowRightLeft, Check } from 'lucide-react-native';
import api from '../../../api/client';
import E from '../../../api/endpoints';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../../components/layout';
import { Card, Sheet, T, Tap } from '../../../components/ui';
import { VisaBell, VisaNav, fetchAllApplicants } from '../../../components/admin/visa';
import { colors, fonts, radius } from '../../../theme';
import { formatMoney } from '../../../utils/format';

const COLUMNS = [
	{ key: 'new_payment', ru: 'Новый / Оплата', uz: "Yangi / To'lov", en: 'New / Payment', statuses: ['new', 'awaiting_payment'], primary: 'new', tone: colors.muted },
	{ key: 'documents', ru: 'Документы', uz: 'Hujjatlar', en: 'Documents', statuses: ['awaiting_documents', 'documents_received', 'documents_reviewing', 'needs_correction', 'needs_replacement'], primary: 'awaiting_documents', tone: colors.amber },
	{ key: 'appointment', ru: 'Перевод / Запись', uz: 'Tarjima / Navbat', en: 'Translation / Appointment', statuses: ['awaiting_translation', 'awaiting_appointment', 'appointment_scheduled'], primary: 'awaiting_translation', tone: colors.purple },
	{ key: 'ready', ru: 'Готов к посольству', uz: 'Elchixonaga tayyor', en: 'Ready for embassy', statuses: ['ready_for_embassy'], primary: 'ready_for_embassy', tone: colors.green },
	{ key: 'submitted', ru: 'Подано', uz: 'Topshirildi', en: 'Submitted', statuses: ['documents_submitted', 'awaiting_decision'], primary: 'documents_submitted', tone: colors.blue },
	{ key: 'decision', ru: 'Решение', uz: 'Qaror', en: 'Decision', statuses: ['visa_approved', 'passport_received', 'visa_rejected'], primary: 'visa_approved', tone: colors.navy },
	{ key: 'closed', ru: 'Закрыто', uz: 'Yopilgan', en: 'Closed', statuses: ['cancelled'], primary: 'cancelled', tone: colors.red },
];
const columnFor = (status) => COLUMNS.find((c) => c.statuses.includes(status)) || COLUMNS[0];

const L = {
	title: { uz: 'Kanban', ru: 'Канбан', en: 'Kanban' },
	subtitle: { uz: "Statusni o'zgartirish uchun kartadagi ⇄ tugmasini bosing", ru: 'Нажмите ⇄ на карточке, чтобы перенести её в другую колонку', en: 'Tap ⇄ on a card to move it to another column' },
	moveTo: { uz: "Ko'chirish", ru: 'Перенести в', en: 'Move to' },
	moveErr: { uz: "Statusni o'zgartirib bo'lmadi", ru: 'Не удалось изменить статус', en: 'Failed to change status' },
	loadErr: { uz: "Ishtirokchilarni yuklab bo'lmadi", ru: 'Не удалось загрузить участников', en: 'Failed to load applicants' },
	empty: { uz: "Bo'sh", ru: 'Пусто', en: 'Empty' },
};

export default function VisaKanban() {
	const { tx } = useLanguage();
	const toast = useToast();
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [active, setActive] = useState(COLUMNS[0].key);
	const [moving, setMoving] = useState(null);

	const load = useCallback(async () => {
		try {
			setApplicants(await fetchAllApplicants());
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, []);
	useEffect(() => { load(); }, [load]);

	const grouped = useMemo(() => {
		const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
		applicants.forEach((a) => map[columnFor(a.status).key].push(a));
		return map;
	}, [applicants]);

	const move = async (applicant, column) => {
		setMoving(null);
		if (column.statuses.includes(applicant.status)) return;
		const prev = applicant.status;
		setApplicants((p) => p.map((a) => (a.id === applicant.id ? { ...a, status: column.primary } : a)));
		try {
			await api.patch(E.VISA_APPLICANT_DETAIL(applicant.id), { status: column.primary });
		} catch {
			toast.error(tx(L.moveErr));
			setApplicants((p) => p.map((a) => (a.id === applicant.id ? { ...a, status: prev } : a)));
		}
	};

	const col = COLUMNS.find((c) => c.key === active);

	return (
		<Screen header={<StackHeader onBack={() => router.back()} right={<VisaBell />} />} onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<VisaNav />
			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 30 }} /> : (
				<>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14, paddingHorizontal: 18 }} style={{ marginHorizontal: -18 }}>
						{COLUMNS.map((c) => {
							const on = c.key === active;
							return (
								<Tap key={c.key} onPress={() => setActive(c.key)} style={[styles.col, on && { backgroundColor: c.tone, borderColor: c.tone }]}>
									<T style={[styles.colText, on && { color: colors.white }]}>{tx(c)}</T>
									<View style={[styles.count, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}><T style={[styles.countText, on && { color: colors.white }]}>{grouped[c.key].length}</T></View>
								</Tap>
							);
						})}
					</ScrollView>

					{!grouped[active].length ? <T v="small" style={{ textAlign: 'center', marginTop: 30 }}>{tx(L.empty)}</T> : grouped[active].map((a) => (
						<Card key={a.id} onPress={() => router.push(`/admin/visa/participants/${a.id}`)} style={[styles.card, { borderLeftColor: col.tone }]}>
							<View style={{ flex: 1, gap: 3 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<T v="strong" style={{ flexShrink: 1 }} numberOfLines={1}>{a.full_name}</T>
									{a.has_expired_documents || a.has_documents_needing_replacement ? <AlertTriangle size={13} color={colors.red} /> : null}
								</View>
								<T v="small" style={{ fontSize: 12 }}>{a.country} · {a.status_display}</T>
								{a.debt > 0 ? <T v="strong" style={{ fontSize: 12 }} color={colors.red}>{formatMoney(a.debt)} UZS</T> : null}
							</View>
							<Tap onPress={() => setMoving(a)} style={styles.moveBtn} hitSlop={6}><ArrowRightLeft size={16} color={colors.navy} /></Tap>
						</Card>
					))}
				</>
			)}

			<Sheet visible={!!moving} onClose={() => setMoving(null)} title={`${tx(L.moveTo)}…`} scroll>
				{moving ? (
					<View style={{ gap: 8, paddingBottom: 8 }}>
						<T v="strong" style={{ marginBottom: 4 }}>{moving.full_name}</T>
						{COLUMNS.map((c) => {
							const current = c.statuses.includes(moving.status);
							return (
								<Tap key={c.key} onPress={() => move(moving, c)} style={[styles.option, current && { borderColor: c.tone, backgroundColor: colors.cardMuted }]}>
									<View style={[styles.swatch, { backgroundColor: c.tone }]} />
									<T v="strong" style={{ flex: 1 }}>{tx(c)}</T>
									{current ? <Check size={16} color={c.tone} /> : <T v="small">{grouped[c.key].length}</T>}
								</Tap>
							);
						})}
					</View>
				) : null}
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	col: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	colText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.ink2 },
	count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	countText: { fontFamily: fonts.extrabold, fontSize: 10.5, color: colors.ink2 },
	card: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, padding: 14, borderLeftWidth: 4 },
	moveBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
	option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
	swatch: { width: 12, height: 12, borderRadius: 6 },
});
