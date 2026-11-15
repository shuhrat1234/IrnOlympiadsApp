import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertTriangle, ArrowRight, Building2, Calendar, CheckCircle2, Clock, CreditCard, FileText, GraduationCap, MapPin, Users, Wifi, Sparkles } from 'lucide-react-native';
import { mediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Loader, Pill, ProgressBar, T } from '../../components/ui';
import RegionGroupsSheet from '../../components/RegionGroupsSheet';
import { PermissionSheet } from '../../components/DocumentSheets';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatDate, formatPrice, formatShortDate, getOlympiadBannerSource, sortedSessions } from '../../utils/format';
import { registrationStateFor } from '../../utils/olympiadLogic';

const InfoRow = ({ icon: Icon, label, value, last }) => (
	<View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
		<View style={styles.infoIcon}><Icon size={17} color={colors.amber} /></View>
		<View style={{ flex: 1 }}>
			<T v="label" style={{ fontSize: 10 }}>{label}</T>
			<T v="strong" style={{ marginTop: 2 }}>{value}</T>
		</View>
	</View>
);

export default function OlympiadDetailScreen() {
	const { id } = useLocalSearchParams();
	const { currentUser, regions } = useAuth();
	const { t, lang, pick } = useLanguage();
	const toast = useToast();
	const { getOlympiad, fetchOlympiadById, getRemainingSeats, isRegistrationClosed, registerForOlympiad, userRegistrations, fetchUserRegistrations } = useOlympiad();
	const oly = getOlympiad(id);
	const [loading, setLoading] = useState(false);
	const [missing, setMissing] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const [freeResult, setFreeResult] = useState(null);
	const [showGroups, setShowGroups] = useState(false);
	const [showPermission, setShowPermission] = useState(false);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		fetchOlympiadById(id).then((o) => !o && !getOlympiad(id) && setMissing(true));
		if (currentUser) fetchUserRegistrations();
	}, [id, currentUser?.id]);

	if (!oly) {
		return (
			<Screen header={<StackHeader />}>
				{missing ? <EmptyState icon={AlertTriangle} title={t('notFound')} action={<Button title={t('back')} variant="dark" onPress={() => router.back()} />} /> : <Loader />}
			</Screen>
		);
	}

	const online = (oly.type || oly.olympiad_type) === 'online';
	const remaining = getRemainingSeats(oly);
	const closed = isRegistrationClosed(oly);
	const fill = oly.max_participants > 0 ? Math.round(((oly.registered_count || 0) / oly.max_participants) * 100) : 0;
	const { userReg, isPaid, isPendingPayment } = currentUser ? registrationStateFor(currentUser, userRegistrations, oly) : {};
	const isTeacher = currentUser?.role === 'teacher';
	const desc = pick(oly, 'description');
	const hasSubs = oly.subs?.length > 0;
	// Offline olympiads list one date per subject instead of a per-grade schedule (website).
	const offlineDates = !online && hasSubs
		? oly.subs.map((sub) => {
			const first = (sub.grade_sessions || []).find((s) => s.start_datetime);
			const dt = sub.start_datetime || first?.start_datetime || oly.start_datetime || oly.date;
			return `${dt ? formatDate(dt, lang) : t('soon')} — ${pick(sub)}`;
		}).join('\n')
		: null;
	const gradeRange = oly.grades?.length ? `${oly.grades[0]}–${oly.grades[oly.grades.length - 1]}${t('gradeSuffix')}` : '—';

	const handleRegister = async () => {
		setConfirm(false);
		if (!currentUser) {
			router.push(`/register/${id}`);
			return;
		}
		setLoading(true);
		const res = await registerForOlympiad(id);
		const paidOly = Number(oly.price) > 0;
		setLoading(false);
		if (res.success) {
			if (paidOly) router.push({ pathname: `/payment/${id}`, params: { regId: res.registration_id || res.id } });
			else {
				setFreeResult(res);
				setShowGroups(true);
			}
		} else if (paidOly && res.isAlreadyRegistered) {
			router.push(`/payment/${id}`);
		} else {
			toast.error(res.error || t('error'));
		}
	};

	return (
		<Screen header={<StackHeader />}>
			{/* Hero */}
			<Animated.View entering={FadeInDown.duration(450)}>
				<View style={[styles.hero, { backgroundColor: online ? colors.gold : colors.navyDeep }]}>
					<View style={styles.bannerWrap}>
						<Image
							source={getOlympiadBannerSource(oly.banner_image, oly.id)}
							style={styles.banner}
							contentFit="contain"
							cachePolicy="memory-disk"
							transition={200}
						/>
					</View>
					<View style={styles.heroGlow} />
					<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<View style={[styles.heroIcon, { backgroundColor: online ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.1)' }]}>
							{online ? <Wifi size={22} color={colors.navyDeep} /> : <Building2 size={22} color={colors.gold} />}
						</View>
						<Pill label={online ? t('online') : t('offline')} color={online ? colors.navyDeep : colors.gold} bg={online ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'} />
					</View>
					<T v="h1" color={online ? colors.navyDeep : '#fff'} style={{ marginTop: 18 }}>{pick(oly)}</T>
				</View>
			</Animated.View>

			{/* Registration card */}
			<Card style={{ marginTop: 16 }}>
				<View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
					<View>
						<T v="label">{t('price')}</T>
						{Number(oly.price) === 0 ? (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
								<Sparkles size={18} color={colors.green} />
								<T style={[styles.price, { color: colors.green }]}>{t('free')}</T>
							</View>
						) : (
							<T style={styles.price}>{formatPrice(oly.price)}</T>
						)}
					</View>
					<View style={{ alignItems: 'flex-end' }}>
						<T v="label">{t('remaining')}</T>
						<T style={[styles.price, { fontSize: 22 }]}>{oly.max_participants > 0 ? remaining : '∞'}</T>
					</View>
				</View>
				{oly.max_participants > 0 ? <ProgressBar value={fill} style={{ marginTop: 12 }} color={fill > 90 ? colors.red : colors.gold} /> : null}

				<View style={{ marginTop: 16 }}>
					{closed ? (
						<View style={[styles.state, { backgroundColor: colors.redSoft }]}>
							<AlertTriangle size={18} color={colors.red} />
							<T v="strong" color={colors.red}>{t('noSeats')}</T>
						</View>
					) : isTeacher ? (
						<Button title={t('teacherRegisterStudents')} icon={Users} iconRight={ArrowRight} onPress={() => router.push('/teacher')} />
					) : isPendingPayment ? (
						<View style={{ gap: 10 }}>
							<View style={[styles.state, { backgroundColor: colors.goldTint }]}>
								<Clock size={17} color={colors.amber} />
								<T v="strong" color={colors.amber} style={{ flex: 1 }}>{t('paymentPending')}</T>
							</View>
							<Button title={t('payNowMethods')} icon={CreditCard} onPress={() => router.push({ pathname: `/payment/${oly.id}`, params: userReg?.id ? { regId: userReg.id } : {} })} />
						</View>
					) : isPaid ? (
						<View style={{ gap: 10 }}>
							<View style={[styles.state, { backgroundColor: colors.greenSoft }]}>
								<CheckCircle2 size={18} color={colors.green} />
								<T v="strong" color={colors.green}>{t('alreadyRegistered')}</T>
							</View>
							<Button title={t('goToDash')} variant="dark" iconRight={ArrowRight} onPress={() => router.navigate('/olympiads')} />
						</View>
					) : (
						<Button title={t('register')} iconRight={ArrowRight} loading={loading} onPress={() => setConfirm(true)} />
					)}
				</View>
			</Card>

			{desc ? (
				<Card style={{ marginTop: 14 }}>
					<T v="h3" style={{ marginBottom: 8 }}>{t('description')}</T>
					<T v="body" numberOfLines={expanded ? undefined : 6}>{desc}</T>
					{desc.length > 280 ? (
						<Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={{ marginTop: 8 }}>
							<T v="strong" color={colors.amber} style={{ fontSize: 14 }}>{expanded ? t('showLess') : t('showMore')}</T>
						</Pressable>
					) : null}
				</Card>
			) : null}

			<Card style={{ marginTop: 14, paddingVertical: 6 }}>
				<InfoRow icon={Calendar} label={t('dateTime')} value={offlineDates || (hasSubs ? t('scheduleBelow') : formatDate(oly.date || oly.start_datetime, lang))} />
				{oly.registration_end_date ? <InfoRow icon={Clock} label={t('regEndDate')} value={formatShortDate(oly.registration_end_date, lang)} /> : null}
				{online && oly.duration ? <InfoRow icon={Clock} label={t('duration')} value={`${oly.duration} ${t('minutes')}`} /> : null}
				<InfoRow icon={GraduationCap} label={t('grades')} value={gradeRange} />
				<InfoRow icon={Users} label={t('maxPart')} value={oly.max_participants > 0 ? String(oly.max_participants) : '∞'} last />
			</Card>

			<Card style={{ marginTop: 14 }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
					<MapPin size={16} color={colors.amber} />
					<T v="h3">{t('regions')}</T>
				</View>
				{oly.region_ids?.length ? null : <T v="small" style={{ marginBottom: 10 }}>{t('allRegionsNationwide')}</T>}
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
					{(oly.region_ids?.length ? oly.region_ids.map((rid) => regions.find((x) => x.id === rid)) : regions).map((r) => (r ? <Pill key={r.id} label={pick(r, 'name')} /> : null))}
				</View>
			</Card>

			{hasSubs && online ? (
				<View style={{ marginTop: 22 }}>
					<T v="h2">{t('schedule')}</T>
					<T v="small" style={{ marginTop: 4, marginBottom: 12 }}>{t('scheduleSub')}</T>
					{oly.subs.map((sub) => {
						const sessions = sortedSessions(sub);
						if (!sessions.length) return null;
						return (
							<Card key={sub.id} style={{ marginBottom: 12 }}>
								<T v="h3" style={{ marginBottom: 10 }}>{pick(sub)}</T>
								<View style={{ gap: 8 }}>
									{sessions.map((gs) => {
										const mine = String(gs.grade) === String(currentUser?.grade);
										return (
											<View key={gs.id} style={[styles.session, mine && { backgroundColor: colors.goldTint, borderColor: colors.gold }]}>
												<View style={[styles.gradeBox, mine && { backgroundColor: colors.gold }]}>
													<T v="strong" style={{ fontSize: 13 }} color={colors.navyDeep}>{gs.grade}</T>
												</View>
												<T v="strong" style={{ flex: 1, fontSize: 14 }}>{formatShortDate(gs.start_datetime, lang)}</T>
												{gs.is_started && !gs.is_completed ? <Pill label={t('active')} color={colors.green} bg={colors.greenSoft} dot /> : null}
											</View>
										);
									})}
								</View>
							</Card>
						);
					})}
				</View>
			) : null}

			<Dialog
				visible={confirm}
				onClose={() => setConfirm(false)}
				icon={GraduationCap}
				title={t('confirmRegTitle')}
				message={t('confirmRegMsg')}
				actions={[
					{ title: t('yesRegister'), onPress: handleRegister },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirm(false) },
				]}
			/>
			<Dialog
				visible={!!freeResult && !showGroups && !showPermission}
				onClose={() => setFreeResult(null)}
				icon={CheckCircle2}
				tone="green"
				title={t('regSuccess')}
				actions={[
					{ title: t('downloadPermission'), icon: FileText, variant: 'dark', onPress: () => setShowPermission(true) },
					{ title: t('goToDash'), onPress: () => { setFreeResult(null); router.navigate('/olympiads'); } },
				]}
			/>
			<RegionGroupsSheet visible={showGroups} onClose={() => setShowGroups(false)} userRegion={currentUser?.region} />
			<PermissionSheet visible={showPermission} onClose={() => setShowPermission(false)} reg={freeResult} oly={oly} user={currentUser} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { borderRadius: 30, padding: 22, overflow: 'hidden', ...shadow(2) },
	bannerWrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#07101E', overflow: 'hidden', marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
	banner: { width: '100%', height: '100%' },
	heroGlow: { position: 'absolute', right: -60, bottom: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.07)' },
	heroIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	price: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.ink, marginTop: 2 },
	state: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg },
	infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	infoIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	session: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	gradeBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
