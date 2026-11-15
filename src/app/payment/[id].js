import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Image, Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, FileText, RefreshCw, Send, ShieldCheck } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Card, Loader, T, Tap } from '../../components/ui';
import { PermissionSheet } from '../../components/DocumentSheets';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatClock, formatPrice } from '../../utils/format';
import { LINKS, REGION_GROUP_LINKS } from '../../utils/constants';
import { ALIF_SVG, XAZNA_SVG } from '../../utils/brandSvgs';

const Method = ({ logo, svgXml, icon: Icon, title, subtitle, onPress, disabled, tint }) => (
	<Tap onPress={onPress} disabled={disabled} style={[styles.method, disabled && { opacity: 0.5 }]}>
		<View style={[styles.methodLogo, tint && { backgroundColor: tint }]}>
			{svgXml ? <SvgXml xml={svgXml} width={62} height={26} /> : logo ? <Image source={logo} style={{ width: 64, height: 28 }} resizeMode="contain" /> : <Icon size={24} color="#fff" />}
		</View>
		<View style={{ flex: 1 }}>
			<T v="h3">{title}</T>
			<T v="small">{subtitle}</T>
		</View>
		<ChevronRight size={20} color={colors.faint} />
	</Tap>
);

export default function PaymentScreen() {
	const { id, regId, group_id, groupId, total } = useLocalSearchParams();
	const { currentUser, fetchMe } = useAuth();
	const { t, lang, pick } = useLanguage();
	const toast = useToast();
	const { getOlympiad, fetchOlympiadById, userRegistrations, fetchUserRegistrations, getPaymentLink, registerForOlympiad } = useOlympiad();
	const oly = getOlympiad(id);
	const [status, setStatus] = useState('pending'); // pending | processing | success | failed
	const [timeLeft, setTimeLeft] = useState(null);
	const [checking, setChecking] = useState(false);
	const [showPermission, setShowPermission] = useState(false);

	const isGroup = Boolean(group_id || groupId);
	const groupIdNum = group_id || groupId;

	const reg = useMemo(() => {
		const byId = (r) => regId && String(r.id) === String(regId);
		const byOly = (r) => String(r.olympiad_id || r.olympiad?.id || r.olympiad) === String(id) && r.payment_status !== 'expired';
		const found = userRegistrations.find(byId) || currentUser?.registrations?.find(byId);
		if (found) return found;
		// A fresh registration may not be in the lists yet — pay by its id anyway (website fallback).
		if (regId) return { id: Number(regId) || regId, seconds_left: 600, olympiad: id };
		return userRegistrations.find(byOly) || currentUser?.registrations?.find(byOly) || null;
	}, [userRegistrations, currentUser?.registrations, id, regId]);

	const effectiveRegId = isGroup ? (10000000 + Number(groupIdNum)) : (reg?.id || (regId ? Number(regId) : null));
	const displayPrice = total ? Number(total) : oly?.price;

	useEffect(() => {
		if (!oly) fetchOlympiadById(id);
		fetchUserRegistrations();
	}, [id]);

	// Timer is initialised once from the registration's seconds_left.
	useEffect(() => {
		if (timeLeft === null && reg?.seconds_left !== undefined) setTimeLeft(reg.seconds_left);
		if (reg?.payment_status === 'paid' && status !== 'success') setStatus('success');
	}, [reg]);

	useEffect(() => {
		if (status !== 'pending' || timeLeft === null) return;
		if (timeLeft <= 0) {
			setStatus('failed');
			return;
		}
		const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [timeLeft, status]);

	const checkPayment = useCallback(async (manual = false) => {
		setChecking(true);
		try {
			if (isGroup && groupIdNum) {
				try {
					const res = await api.get(E.GROUP_PAYMENT_STATUS(groupIdNum));
					if (res.data?.is_paid || res.data?.status === 'paid') {
						setStatus('success');
						toast.success(t('paySuccess'));
						await Promise.all([fetchUserRegistrations(), fetchMe()]);
						setChecking(false);
						return;
					}
				} catch {}
			}
			if (reg?.id) {
				try {
					const res = await api.get(`registrations/${reg.id}/status/`);
					if (res.data?.is_paid || res.data?.payment_status === 'paid' || res.data?.payment_status === 'free') {
						setStatus('success');
						toast.success(t('paySuccess'));
						await Promise.all([fetchUserRegistrations(), fetchMe()]);
						setChecking(false);
						return;
					}
				} catch {}
			}
			const refreshed = await fetchUserRegistrations();
			await fetchMe();
			const found = refreshed?.find((r) => String(r.id) === String(reg?.id) || String(r.olympiad_id || r.olympiad?.id || r.olympiad) === String(id));
			if (found && (found.payment_status === 'paid' || found.payment_status === 'free')) {
				setStatus('success');
				toast.success(t('paySuccess'));
			} else if (manual) {
				toast.info(t('paymentProcessing') || "To'lov hali qabul qilinmadi. Iltimos, bir necha soniya kuting yoki qayta tekshiring.");
			}
		} catch {
			if (manual) toast.error(t('error'));
		} finally {
			setChecking(false);
		}
	}, [isGroup, groupIdNum, reg?.id, id, fetchUserRegistrations, fetchMe, t]);

	// Auto poll status while processing
	useEffect(() => {
		if (status !== 'processing') return;
		const interval = setInterval(() => {
			checkPayment(false);
		}, 4000);
		return () => clearInterval(interval);
	}, [status, checkPayment]);

	// Back from payment provider → re-check the registration status.
	useEffect(() => {
		const sub = AppState.addEventListener('change', (s) => {
			if (s === 'active') {
				if (status === 'processing') setStatus('pending');
				checkPayment(false);
			}
		});
		return () => sub.remove();
	}, [status, checkPayment]);

	const pay = async (provider) => {
		if (!effectiveRegId) {
			toast.error(t('regNotFound'));
			setStatus('failed');
			return;
		}
		setStatus('processing');
		const link = await getPaymentLink(provider, effectiveRegId);
		if (link) {
			await Linking.openURL(link);
		} else {
			toast.error(t('payError'));
			setStatus('failed');
		}
	};

	const tryAgain = async () => {
		// The reservation is still alive → just show the payment methods again.
		if (reg && (reg.payment_status === 'pending' || !reg.is_expired) && timeLeft > 0) {
			setStatus('pending');
			return;
		}
		setStatus('processing');
		const res = await registerForOlympiad(id);
		if (res.success) {
			setStatus('pending');
			setTimeLeft(res.seconds_left !== undefined ? res.seconds_left : 30 * 60);
		} else {
			toast.error(t('renewError'));
			setStatus('failed');
		}
	};

	if (!oly) return <Screen header={<StackHeader title={t('paymentTitle')} />}><Loader /></Screen>;

	if (status === 'success') {
		const groupLink = currentUser?.region ? REGION_GROUP_LINKS[currentUser.region] : null;
		return (
			<Screen header={<StackHeader />}>
				<Animated.View entering={FadeIn.duration(200)} style={{ alignItems: 'center', marginTop: 10 }}>
					<View style={styles.successIcon}>
						<CheckCircle2 size={46} color="#fff" strokeWidth={2.2} />
					</View>
					<T v="display" style={{ textAlign: 'center', marginTop: 18, fontSize: 28 }}>{t('paySuccess')}</T>
					<T v="body" style={{ textAlign: 'center', marginTop: 6 }}>{t('paySuccessMsg')}</T>
				</Animated.View>
				<Card style={{ marginTop: 22, alignItems: 'center' }}>
					<T style={styles.amount}>{formatPrice(oly.price)}</T>
					<T v="small" style={{ textAlign: 'center', marginTop: 4 }}>{pick(oly)}</T>
					<View style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }}>
						{reg ? <Button title={t('downloadPermission')} icon={FileText} variant="dark" onPress={() => setShowPermission(true)} /> : null}
						<Button title={t('goToDash')} onPress={() => router.navigate('/olympiads')} />
					</View>
				</Card>
				{groupLink ? (
					<Tap onPress={() => Linking.openURL(groupLink)} style={styles.group}>
						<View style={styles.groupIcon}><Send size={20} color="#fff" /></View>
						<View style={{ flex: 1 }}>
							<T v="strong" color="#fff">{t('joinRegionGroup')}</T>
							<T v="small" color="rgba(255,255,255,0.8)">{t('joinRegionGroupSub')}</T>
						</View>
						<ChevronRight size={20} color="#fff" />
					</Tap>
				) : null}
				<PermissionSheet visible={showPermission} onClose={() => setShowPermission(false)} reg={reg} oly={oly} user={currentUser} />
			</Screen>
		);
	}

	const urgent = timeLeft !== null && timeLeft < 120;

	return (
		<Screen header={<StackHeader title={t('paymentTitle')} subtitle={pick(oly)} />} onRefresh={checkPayment}>
			<Animated.View entering={FadeInDown}>
				<View style={styles.amountCard}>
					<View style={styles.glow} />
					<T v="label" color="rgba(255,255,255,0.6)">{t('amount')}</T>
					<T style={[styles.amount, { color: colors.gold, fontSize: 36 }]}>{formatPrice(displayPrice)}</T>
					<T v="small" color="rgba(255,255,255,0.7)" numberOfLines={2}>{pick(oly)}</T>
					<View style={[styles.timer, urgent && { backgroundColor: 'rgba(229,72,77,0.2)' }]}>
						<Clock size={16} color={urgent ? '#FF8A8D' : colors.gold} />
						<T v="small" color="rgba(255,255,255,0.8)">{t('reservation')}</T>
						<T style={[styles.timerText, urgent && { color: '#FF8A8D' }]}>{timeLeft === null ? '--:--' : formatClock(timeLeft)}</T>
					</View>
				</View>
			</Animated.View>

			{status === 'failed' ? (
				<Card style={{ marginTop: 16, alignItems: 'center' }}>
					<View style={[styles.state, { backgroundColor: colors.redSoft }]}>
						<AlertTriangle size={20} color={colors.red} />
						<T v="strong" color={colors.red}>{t('payFailed')}</T>
					</View>
					<Button title={t('retry')} icon={RefreshCw} style={{ alignSelf: 'stretch', marginTop: 14 }} onPress={tryAgain} />
				</Card>
			) : (
				<>
					<T v="h3" style={{ marginTop: 22, marginBottom: 12 }}>{t('selectMethod')}</T>
					<View style={{ gap: 10 }}>
						<Method logo={require('../../../assets/brand/payme.png')} title="Payme" subtitle={t('payViaApp')} onPress={() => pay('payme')} disabled={status === 'processing'} />
						<Method logo={require('../../../assets/brand/click.png')} title="CLICK" subtitle={t('payViaClick')} onPress={() => pay('click')} disabled={status === 'processing'} />
						<Method svgXml={ALIF_SVG} title="Alif Pay" subtitle="Uzcard, Humo, Alif Mobi" onPress={() => pay('alif')} disabled={status === 'processing'} />
						<Method svgXml={XAZNA_SVG} title="Xazna" subtitle={lang === 'ru' ? 'Халк Банк, Uzcard, Humo' : 'Xalq Banki, Uzcard, Humo'} onPress={() => pay('xazna')} disabled={status === 'processing'} />
						<Method icon={Send} tint="#0088CC" title="Telegram" subtitle={t('payViaCoordinator')} onPress={() => Linking.openURL(LINKS.coordinator)} />
					</View>
					<View style={styles.note}>
						<ShieldCheck size={18} color={colors.green} />
						<T v="small" style={{ flex: 1 }}>{t('redirectNote')}</T>
					</View>
					<Button title={t('checkPayment')} icon={RefreshCw} variant="light" loading={checking} onPress={() => checkPayment(true)} style={{ marginTop: 14 }} />
				</>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	amountCard: { backgroundColor: colors.navyDeep, borderRadius: 30, padding: 22, overflow: 'hidden', gap: 6, ...shadow(2) },
	glow: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, borderWidth: 28, borderColor: 'rgba(253,200,0,0.1)' },
	amount: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.ink },
	timer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
	timerText: { fontFamily: fonts.extrabold, fontSize: 16, color: '#fff', fontVariant: ['tabular-nums'] },
	method: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.xl, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadow(1) },
	methodLogo: { width: 76, height: 52, borderRadius: 16, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	note: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, padding: 14, borderRadius: radius.lg, backgroundColor: colors.greenSoft },
	state: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, alignSelf: 'stretch' },
	successIcon: { width: 96, height: 96, borderRadius: 34, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', ...shadow(2) },
	group: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 16, borderRadius: radius.xl, backgroundColor: '#0088CC' },
	groupIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
