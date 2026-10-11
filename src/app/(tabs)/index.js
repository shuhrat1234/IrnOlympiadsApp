import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Award, Bell, BookOpen, Check, ChevronRight, Clock, Copy, CreditCard, Download, History, LifeBuoy, MapPin, Package, Play, Search, Shield, Star, Trophy, Zap, CheckCircle2, GraduationCap } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useSupport } from '../../context/SupportContext';
import { useToast } from '../../context/ToastContext';
import { Screen, PaymentCountdown } from '../../components/layout';
import { Avatar, Button, Card, Dialog, IconBadge, IconButton, Pill, SectionTitle, T, Tap } from '../../components/ui';
import { colors, fonts, gradients, radius, shadow } from '../../theme';
import { formatDate, gradeLabel, initialsOf } from '../../utils/format';
import { canStartExam, olyIdOf, userSessionFor } from '../../utils/olympiadLogic';
import { finalPermissionPdf } from '../../utils/documents';
import SubjectTeachers from '../../components/SubjectTeachers';

const ACH_ICONS = { Trophy, Star, Award, Shield, Bird: Star };

export default function HomeScreen() {
	const { currentUser, fetchMe, regions } = useAuth();
	const { t, lang, pick } = useLanguage();
	const { olympiads, getOlympiad, fetchOlympiads, fetchUserRegistrations, userRegistrations } = useOlympiad();
	const { unreadCount } = useSupport();
	const toast = useToast();
	const [confirm, setConfirm] = useState(null);
	const [downloading, setDownloading] = useState(null);

	const refresh = useCallback(() => Promise.all([fetchMe(), fetchOlympiads(true), fetchUserRegistrations()]), [fetchMe, fetchOlympiads, fetchUserRegistrations]);

	const registrations = currentUser?.registrations?.length ? currentUser.registrations : userRegistrations;
	const completed = registrations.filter((r) => r.status === 'completed').length;
	const scores = (currentUser?.exam_results || []).map((r) => Number(r.score)).filter((n) => !isNaN(n));
	const best = scores.length ? Math.max(...scores) : null;
	const region = regions.find((r) => r.id === parseInt(currentUser?.region, 10));
	const unreadNotifs = (currentUser?.notifications || []).filter((n) => !n.is_read).length;

	const pendingPayments = (currentUser?.registrations || []).filter((r) => r.payment_status === 'pending' && r.seconds_left > 0);

	// Sessions that can be started right now — the most important thing on the screen.
	const liveNow = useMemo(() => {
		const list = [];
		registrations.forEach((reg) => {
			const oly = getOlympiad(olyIdOf(reg));
			if (!oly) return;
			if (oly.subs?.length) {
				oly.subs.forEach((sub) => {
					const session = userSessionFor(sub, currentUser);
					if (session && canStartExam(currentUser, reg, oly, session)) list.push({ key: `s${session.id}`, oly, sub, route: `/exam/${session.id}` });
				});
			} else if (canStartExam(currentUser, reg, oly)) {
				list.push({ key: `o${oly.id}`, oly, route: `/exam/${oly.id}` });
			}
		});
		return list;
	}, [registrations, olympiads, currentUser]);

	const copyId = async () => {
		await Clipboard.setStringAsync(String(currentUser?.participant_id || ''));
		toast.success(t('idCopied'));
	};

	const quick = [
		{ icon: Search, label: t('availableTitle'), onPress: () => router.push({ pathname: '/olympiads', params: { tab: 'available' } }), tint: [colors.goldTint, colors.amber] },
		{ icon: History, label: t('history'), onPress: () => router.push('/history'), tint: [colors.blueSoft, colors.blue] },
		{ icon: LifeBuoy, label: t('support'), onPress: () => router.push('/support'), tint: [colors.greenSoft, colors.green], badge: unreadCount },
		{ icon: Package, label: t('myOrders'), onPress: () => router.push('/orders'), tint: [colors.purpleSoft, colors.purple] },
	];

	if (!currentUser) return null;

	return (
		<Screen onRefresh={refresh} tabBar>
			{/* Greeting */}
			<View style={styles.topRow}>
				<Tap onPress={() => router.push('/profile')} containerStyle={{ flex: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					<Avatar initials={initialsOf(currentUser)} size={50} />
					<View style={{ flex: 1 }}>
						<T v="small">{t('greeting')} 👋</T>
						<T v="h2" numberOfLines={1}>{currentUser.first_name} {currentUser.last_name}</T>
					</View>
				</Tap>
				<IconButton icon={Bell} onPress={() => router.push('/notifications')} badge={unreadNotifs} />
			</View>

			{/* Student pass */}
			<Animated.View entering={FadeInDown.duration(500)}>
				<LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pass}>
					<View style={styles.passGlow} />
					<View style={styles.passRing} />
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<T v="label" color={colors.gold} style={{ letterSpacing: 2 }}>IRN · STUDENT</T>
						<Image source={require('../../../assets/brand/trophy.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
					</View>
					<Tap onPress={copyId} style={styles.idChip}>
						<T v="mono" style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>#{currentUser.participant_id}</T>
						<Copy size={15} color="rgba(255,255,255,0.6)" />
					</Tap>
					<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
						{currentUser.grade ? <Pill icon={GraduationCap} label={gradeLabel(currentUser.grade, t)} color={colors.navyDeep} bg={colors.gold} /> : null}
						{region ? <Pill icon={MapPin} label={pick(region, 'name')} color="#fff" bg="rgba(255,255,255,0.12)" /> : null}
					</View>
					<View style={styles.stats}>
						{[
							{ value: registrations.length, label: t('totalOlympiads'), icon: BookOpen },
							{ value: completed, label: t('completedCount'), icon: Check },
							{ value: best !== null ? best : '—', label: t('bestScore'), icon: Star },
						].map((s, i) => (
							<View key={i} style={[styles.stat, i > 0 && styles.statDivider]}>
								<T style={styles.statValue}>{s.value}</T>
								<T v="small" color="rgba(255,255,255,0.6)" style={{ fontSize: 11.5 }} numberOfLines={1}>{s.label}</T>
							</View>
						))}
					</View>
				</LinearGradient>
			</Animated.View>

			{/* Subject teachers promo (math / english) */}
			<SubjectTeachers variant="banner" style={{ marginTop: 16 }} />

			{/* Live sessions */}
			{liveNow.length > 0 ? (
				<View style={{ marginTop: 22 }}>
					<SectionTitle title={t('activeNow')} />
					{liveNow.map((item, i) => (
						<Animated.View key={item.key} entering={FadeInDown.delay(80 * i)}>
							<Tap onPress={() => setConfirm(item.route)} style={styles.live}>
								<LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
								<View style={styles.livePulse}><Zap size={20} color={colors.navyDeep} fill={colors.navyDeep} /></View>
								<View style={{ flex: 1 }}>
									<T v="strong" color={colors.navyDeep} numberOfLines={1}>{item.sub ? pick(item.sub) : pick(item.oly)}</T>
									<T v="small" color="rgba(12,26,54,0.7)" numberOfLines={1}>{pick(item.oly)}</T>
								</View>
								<View style={styles.liveBtn}><Play size={16} color={colors.gold} fill={colors.gold} /></View>
							</Tap>
						</Animated.View>
					))}
				</View>
			) : null}

			{/* Payment timers */}
			{pendingPayments.map((reg) => {
				const oly = getOlympiad(reg.olympiad);
				if (!oly) return null;
				return (
					<Card key={`pay-${reg.id}`} style={{ marginTop: 16, borderColor: colors.goldSoft, backgroundColor: '#FFFCF1' }}>
						<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
							<IconBadge icon={CreditCard} color={colors.red} bg={colors.redSoft} />
							<View style={{ flex: 1 }}>
								<T v="strong">{t('paymentRequired')}</T>
								<T v="small" numberOfLines={1}>{pick(oly)}</T>
							</View>
						</View>
						<PaymentCountdown seconds={reg.seconds_left} onExpire={fetchMe} style={{ marginTop: 14 }} />
						<Button title={t('payNow')} icon={CreditCard} size="md" onPress={() => router.push(`/payment/${oly.id}`)} style={{ marginTop: 12 }} />
					</Card>
				);
			})}

			{/* Final round permissions */}
			{(currentUser.final_round_permissions || []).map((perm) => (
				<Card key={`perm-${perm.id}`} style={{ marginTop: 16, borderColor: '#BDEBCF', backgroundColor: '#F6FDF8' }}>
					<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
						<IconBadge icon={CheckCircle2} color={colors.green} bg={colors.greenSoft} />
						<View style={{ flex: 1 }}>
							<T v="label" color={colors.green}>{t('finalPermission')}</T>
							<T v="strong" numberOfLines={2} style={{ marginTop: 2 }}>{pick(perm.olympiad)}</T>
							{perm.exam_date ? (
								<T v="small" style={{ marginTop: 2 }}>
									{perm.exam_date}
									{perm.exam_time ? ` · ${perm.exam_time}` : ''}
									{perm.venue ? ` · ${perm.venue}` : ''}
								</T>
							) : null}
						</View>
					</View>
					<Button
						title={t('downloadFinalPermission')}
						icon={Download}
						variant="success"
						size="md"
						loading={downloading === perm.id}
						style={{ marginTop: 14 }}
						onPress={async () => {
							setDownloading(perm.id);
							try {
								await finalPermissionPdf({ perm, user: currentUser, lang });
							} catch {
								toast.error(t('error'));
							}
							setDownloading(null);
						}}
					/>
				</Card>
			))}

			{/* Quick actions */}
			<SectionTitle title={t('quickActions')} style={{ marginTop: 24 }} />
			<View style={styles.grid}>
				{quick.map((q, i) => (
					<Animated.View key={i} entering={FadeInDown.delay(60 * i)} style={{ width: '48.5%' }}>
						<Tap onPress={q.onPress} style={styles.quick}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
								<IconBadge icon={q.icon} bg={q.tint[0]} color={q.tint[1]} size={42} />
								{q.badge ? <View style={styles.qBadge}><T style={styles.qBadgeText}>{q.badge}</T></View> : <ChevronRight size={18} color={colors.faint} />}
							</View>
							<T v="strong" numberOfLines={2} style={{ marginTop: 14, fontSize: 14.5 }}>{q.label}</T>
						</Tap>
					</Animated.View>
				))}
			</View>

			{/* Achievements */}
			<SectionTitle title={t('achievements')} style={{ marginTop: 24 }} />
			{currentUser.achievements?.length ? (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }} style={{ marginHorizontal: -18, paddingLeft: 18 }}>
					{currentUser.achievements.map((ach) => {
						const Icon = ACH_ICONS[ach.icon] || Award;
						return (
							<View key={ach.id} style={styles.ach}>
								<LinearGradient colors={gradients.gold} style={styles.achIcon}><Icon size={22} color={colors.navyDeep} /></LinearGradient>
								<T v="strong" numberOfLines={2} style={{ fontSize: 13.5, marginTop: 10 }}>{pick(ach)}</T>
								<T v="small" style={{ fontSize: 11.5, marginTop: 4 }}>{t('earned')}: {formatDate(ach.earned_at, lang, { time: false })}</T>
							</View>
						);
					})}
				</ScrollView>
			) : (
				<Card style={{ alignItems: 'center', paddingVertical: 26 }}>
					<View style={styles.achEmpty}><Trophy size={26} color={colors.faint} /></View>
					<T v="strong" style={{ marginTop: 12 }}>{t('noAchievements')}</T>
					<T v="small" style={{ textAlign: 'center', marginTop: 4 }}>{t('startParticipating')}</T>
				</Card>
			)}

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={Clock}
				title={t('confirmStartTitle')}
				message={t('confirmStartMsg')}
				actions={[
					{ title: t('yesStart'), icon: Play, onPress: () => { const r = confirm; setConfirm(null); router.push(r); } },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
	pass: { borderRadius: 30, padding: 22, overflow: 'hidden', gap: 14, ...shadow(3) },
	passGlow: { position: 'absolute', top: -90, right: -70, width: 240, height: 240, borderRadius: 120, borderWidth: 30, borderColor: 'rgba(253,200,0,0.09)' },
	passRing: { position: 'absolute', bottom: -60, left: -40, width: 160, height: 160, borderRadius: 80, borderWidth: 18, borderColor: 'rgba(255,255,255,0.04)' },
	idChip: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
	stats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingVertical: 14, marginTop: 4 },
	stat: { flex: 1, alignItems: 'center', gap: 2 },
	statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
	statValue: { fontFamily: fonts.extrabold, fontSize: 22, color: '#fff' },
	live: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, overflow: 'hidden', marginBottom: 10, ...shadow(2) },
	livePulse: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
	liveBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navyDeep, alignItems: 'center', justifyContent: 'center' },
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
	quick: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.line, minHeight: 124, ...shadow(1) },
	qBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
	qBadgeText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 11 },
	ach: { width: 150, backgroundColor: colors.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadow(1) },
	achIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
	achEmpty: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
});
