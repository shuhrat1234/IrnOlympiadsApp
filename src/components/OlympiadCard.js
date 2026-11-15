import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertTriangle, ArrowRight, Building2, Calendar, CheckCircle2, Clock, CreditCard, Sparkles, Users, Wifi } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useOlympiad } from '../context/OlympiadContext';
import { mediaUrl } from '../api/client';
import { Card, Pill, ProgressBar, T } from './ui';
import OlympiadBanner from './OlympiadBanner';
import { colors, fonts, radius } from '../theme';
import { formatDate, formatPrice, formatShortDate, formatTime, getOlympiadBannerSource, sortedSessions } from '../utils/format';

// Catalog card — schedule summary per sub-olympiad, seats bar, grade chips.
export default function OlympiadCard({ oly, userGrade, registered, pendingPayment, closed }) {
	const { t, lang, pick } = useLanguage();
	const { getRemainingSeats, isFull } = useOlympiad();
	const { currentUser } = useAuth();
	const isTeacher = currentUser?.role === 'teacher';
	const online = (oly.type || oly.olympiad_type) === 'online';
	const remaining = getRemainingSeats(oly);
	const fill = oly.max_participants > 0 ? Math.round(((oly.registered_count || 0) / oly.max_participants) * 100) : 0;
	const desc = pick(oly, 'description');

	const scheduleRows = (oly.subs || []).map((sub) => {
		const sessions = sortedSessions(sub);
		let when = '';
		if (sessions.length) {
			const first = sessions[0].start_datetime;
			const last = sessions[sessions.length - 1].start_datetime;
			when = online && sessions.length > 1 ? `${formatShortDate(first, lang, { time: false })}, ${formatTime(first)} – ${formatTime(last)}` : formatShortDate(first, lang);
		} else if (sub.start_datetime) {
			when = formatDate(sub.start_datetime, lang);
		}
		const soon = !when && (sub.grade_sessions || []).length > 0;
		return { id: sub.id, title: pick(sub), when: when || (soon ? t('soon') : ''), soon };
	});

	// Same priority as the website card: teacher → completed → closed → full → pay → registered → register.
	const state = oly.is_completed ? 'completed' : closed ? 'closed' : isFull(oly) ? 'full' : pendingPayment ? 'pay' : registered ? 'registered' : 'register';
	const cta = isTeacher ? {
		icon: Users,
		label: t('teacherRegisterStudents'),
		color: colors.navyDeep,
		bg: colors.goldTint,
		arrow: true,
	} : {
		completed: { icon: CheckCircle2, label: t('completed'), color: colors.muted, bg: colors.cardMuted },
		closed: { icon: AlertTriangle, label: t('noSeats'), color: colors.muted, bg: colors.cardMuted },
		full: { label: t('noSeats'), color: colors.muted, bg: colors.cardMuted },
		pay: { icon: CreditCard, label: t('payNow'), color: colors.amber, bg: colors.goldTint },
		registered: { icon: CheckCircle2, label: t('alreadyRegistered'), color: colors.green, bg: colors.greenSoft },
		register: { label: t('registerBtn'), color: colors.navyDeep, bg: colors.goldTint, arrow: true },
	}[state];
	const open = () => router.push(isTeacher ? '/teacher' : state === 'registered' ? '/olympiads' : state === 'pay' ? `/payment/${oly.id}` : `/olympiad/${oly.id}`);

	return (
		<Card onPress={open} style={{ marginBottom: 14, overflow: 'hidden' }} padded={false}>
			<OlympiadBanner
				source={getOlympiadBannerSource(oly.banner_image, oly.id)}
				borderRadius={0}
			/>
			<View style={{ backgroundColor: online ? '#FFFBF0' : '#F6F8FC', padding: 18, paddingBottom: 14 }}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
					<View style={[styles.typeIcon, { backgroundColor: online ? colors.gold : colors.navy }]}>
						{online ? <Wifi size={20} color={colors.navyDeep} strokeWidth={2.4} /> : <Building2 size={20} color={colors.gold} strokeWidth={2.2} />}
					</View>
					{Number(oly.price) === 0 ? (
						<Pill icon={Sparkles} label={t('free')} color={colors.green} bg={colors.greenSoft} />
					) : (
						<View style={styles.price}><T style={styles.priceText}>{formatPrice(oly.price)}</T></View>
					)}
				</View>
				<T v="h3" style={{ marginTop: 14, fontSize: 17 }} numberOfLines={2}>{pick(oly)}</T>
				{desc ? <T v="small" numberOfLines={2} style={{ marginTop: 6 }}>{desc}</T> : null}
			</View>

			<View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
				{scheduleRows.length ? (
					<View style={{ gap: 6 }}>
						{scheduleRows.map((r) => (
							<View key={r.id} style={styles.schedRow}>
								{r.soon ? <Clock size={13} color={colors.amber} /> : <Calendar size={13} color={colors.faint} />}
								<T v="small" style={{ fontFamily: fonts.bold, color: r.soon ? colors.amber : colors.ink2 }} numberOfLines={1}>{r.when}</T>
								<T v="small" numberOfLines={1} style={{ flex: 1 }}>· {r.title}</T>
							</View>
						))}
					</View>
				) : (
					<View style={styles.schedRow}>
						<Calendar size={13} color={colors.faint} />
						<T v="small" style={{ fontFamily: fonts.bold, color: colors.ink2 }}>{formatDate(oly.date, lang)}</T>
						{online && oly.duration ? <T v="small">· {oly.duration} {t('min')}</T> : null}
					</View>
				)}

				{oly.registration_end_date ? (
					<View style={styles.schedRow}>
						<Clock size={13} color={colors.faint} />
						<T v="small" numberOfLines={1} style={{ flex: 1 }}>{t('regEndDate')}: <T v="small" style={{ fontFamily: fonts.bold, color: colors.ink2 }}>{formatShortDate(oly.registration_end_date, lang)}</T></T>
					</View>
				) : null}

				<View style={{ gap: 6 }}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<View style={styles.schedRow}>
							<Users size={13} color={colors.faint} />
							<T v="small">{oly.max_participants > 0 ? `${remaining} ${t('seatsLeft')}` : '∞'}</T>
						</View>
						{oly.max_participants > 0 ? <T v="small" style={{ fontFamily: fonts.bold }}>{fill}%</T> : null}
					</View>
					{oly.max_participants > 0 ? <ProgressBar value={fill} color={fill > 90 ? colors.red : fill > 70 ? colors.goldDeep : colors.gold} /> : null}
				</View>

				{oly.grades?.length ? (
					<View style={styles.grades}>
						{oly.grades.map((g) => {
							const mine = String(g) === String(userGrade);
							return (
								<View key={g} style={[styles.grade, mine && styles.gradeMine]}>
									<T v="strong" style={{ fontSize: 11.5 }} color={mine ? colors.navyDeep : colors.muted}>{g}</T>
								</View>
							);
						})}
					</View>
				) : null}

				<View style={[styles.cta, { backgroundColor: cta.bg }, state !== 'register' && state !== 'pay' && { borderColor: 'transparent' }]}>
					{cta.icon ? <cta.icon size={16} color={cta.color} /> : null}
					<T v="strong" style={{ fontSize: 14 }} color={cta.color}>{cta.label}</T>
					{cta.arrow ? <ArrowRight size={16} color={colors.navyDeep} /> : null}
				</View>
			</View>
		</Card>
	);
}

const styles = StyleSheet.create({
	typeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
	price: { backgroundColor: colors.navyDeep, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
	priceText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.gold },
	schedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
	grade: { minWidth: 28, height: 26, borderRadius: 9, paddingHorizontal: 6, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	gradeMine: { backgroundColor: colors.gold },
	cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.pill, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.goldSoft },
});
