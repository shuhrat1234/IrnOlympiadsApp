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

const ALIF_SVG = `<svg width="121" height="36" viewBox="0 0 121 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#0F172A" d="M55.5473 6.493H52.5856V23.9594H55.5473V6.493ZM59.6481 10.0622C60.7112 10.0622 61.5466 9.3028 61.5466 8.16369C61.5466 7.10052 60.7872 6.26518 59.6481 6.26518C58.5849 6.26518 57.6736 7.02458 57.6736 8.16369C57.7496 9.22686 58.5849 10.0622 59.6481 10.0622ZM61.1669 11.5051H58.1293V23.9594H61.1669V11.5051ZM70.1279 8.69528C70.6595 8.69528 71.3429 8.84716 72.1023 9.22686L73.0136 6.8727C71.8745 6.34112 70.8114 6.03735 69.6722 6.03735C66.7106 6.03735 64.7361 7.78399 64.7361 10.8976V11.5051H62.7616V14.0111H64.7361V23.9594H67.6978V14.0111H71.5708V11.5051H67.6978V10.9735C67.6978 9.45468 68.5331 8.69528 70.1279 8.69528Z"></path><path fill="#0F172A" d="M47.1938 17.7322C47.1938 18.7954 46.8141 19.7067 46.1306 20.4661C45.4472 21.2255 44.384 21.5292 43.3208 21.5292C42.2577 21.5292 41.3464 21.1495 40.6629 20.4661C39.9795 19.7067 39.6757 18.7954 39.6757 17.7322C39.6757 16.669 40.0554 15.7577 40.6629 15.0743C41.3464 14.3149 42.2577 13.9352 43.3208 13.9352C44.384 13.9352 45.4472 14.3149 46.1306 15.0743C46.8141 15.7577 47.1938 16.5931 47.1938 17.7322ZM47.1179 12.6442C45.9788 11.657 44.6118 11.2013 43.0171 11.2013C41.2704 11.2013 39.5238 11.8088 38.3847 13.0239C37.1696 14.2389 36.6381 15.8337 36.6381 17.6563C36.6381 19.5548 37.2456 21.1495 38.3847 22.3646C39.5238 23.6556 41.1945 24.2631 43.0171 24.2631C44.6878 24.2631 45.8269 23.8075 47.1179 22.8202V23.9593H49.9277V11.4291H47.1179V12.6442Z"></path><path fill="#0F172A" d="M85.5445 11.0874C83.7219 11.0874 82.2031 11.8468 81.064 13.2897V11.3912H79.0136V28.7056H81.064V21.871C82.1272 23.2379 83.646 23.9973 85.4686 23.9973C87.2152 23.9973 88.734 23.3898 89.8731 22.1747C91.0122 20.8837 91.6198 19.3649 91.6198 17.6183C91.6198 15.7957 91.0122 14.2769 89.8731 13.0619C88.734 11.6949 87.2911 11.0874 85.5445 11.0874ZM85.3167 22.0988C84.0257 22.0988 82.9625 21.6432 82.2031 20.8078C81.4437 19.8965 80.9881 18.8334 80.9881 17.5424C80.9881 16.2514 81.3678 15.1882 82.2031 14.2769C82.9625 13.3656 84.0257 12.91 85.3167 12.91C86.6077 12.91 87.6708 13.3656 88.4302 14.2769C89.2656 15.1882 89.6453 16.2514 89.6453 17.5424C89.6453 18.8334 89.2656 19.8965 88.4302 20.8078C87.5949 21.6432 86.6077 22.0988 85.3167 22.0988ZM103.694 13.2137C102.555 11.8468 101.112 11.0874 99.2898 11.0874C97.5431 11.0874 96.0243 11.6949 94.8852 12.91C93.6702 14.125 93.1386 15.6438 93.1386 17.4664C93.1386 19.289 93.6702 20.8837 94.8852 22.1747C96.0243 23.3898 97.5431 23.9973 99.2898 23.9973C101.112 23.9973 102.555 23.3138 103.694 21.9469V23.6936H105.669V11.3912H103.694V13.2137ZM103.77 17.5424C103.77 18.8334 103.391 19.8965 102.555 20.8078C101.72 21.6432 100.733 22.0988 99.4416 22.0988C98.1507 22.0988 97.1634 21.6432 96.3281 20.8078C95.5687 19.8965 95.189 18.8334 95.189 17.5424C95.189 16.2514 95.5687 15.1882 96.3281 14.2769C97.1634 13.3656 98.1507 12.91 99.4416 12.91C100.733 12.91 101.796 13.3656 102.555 14.2769C103.391 15.1882 103.77 16.2514 103.77 17.5424ZM113.491 20.8078L109.542 11.3912H107.188L112.503 23.6176L112.048 24.8327C111.44 26.2755 110.681 27.0349 109.618 27.0349C109.238 27.0349 108.706 26.959 108.099 26.6552L107.871 28.4778C108.327 28.7816 108.934 28.9335 109.77 28.9335C111.592 28.9335 112.883 27.8703 113.946 25.2124L119.11 11.3912H116.832L113.491 20.8078Z"></path><path fill="#00B060" fill-rule="evenodd" clip-rule="evenodd" d="M16.1206 35.9201C13.6905 35.6922 11.4122 35.0088 9.28588 33.8697C5.26101 31.6674 2.14743 27.9463 0.704556 23.2379C-0.662381 18.5296 0.0210872 13.6694 2.22337 9.72044C5.10913 4.40457 10.6528 0.759409 16.5762 0H16.7281L18.2469 3.79705C18.171 3.79705 18.095 3.79705 18.095 3.79705C13.0829 4.10081 8.07083 7.06251 5.64072 11.543C3.89407 14.6566 3.43843 18.4536 4.5016 22.0988C5.56477 25.8199 8.07083 28.7057 11.1844 30.3764C12.8551 31.2877 14.6777 31.8192 16.5762 32.0471C20.753 32.4268 24.6259 31.0598 27.6636 28.6297C27.8155 28.4778 27.9673 28.4019 28.1192 28.25L29.638 32.0471C25.9169 34.8569 21.1327 36.3757 16.1206 35.9201ZM20.2214 8.88509H15.4371L9.134 24.453H13.2348L17.8672 12.3784L22.4996 24.453H26.6004L20.2214 8.88509Z"></path></svg>`;

const XAZNA_SVG = `<svg width="140" height="26" viewBox="0 0 140 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.21151 6.12158V25.9997H0V6.12158H5.21151Z" fill="#3F6D5B"/><path d="M17.6525 6.12148C17.6525 2.7407 14.8675 0 11.432 0C7.99625 0 5.21118 2.7407 5.21118 6.12148H17.6525Z" fill="#6EB974"/><path fill-rule="evenodd" clip-rule="evenodd" d="M22.8637 6.12134H0.0403678V6.12198H0V26.0001H5.21151V25.9997H17.6527V25.9998H22.8644V6.1217H22.8637V6.12134ZM17.6527 20.8712V11.25H5.21151V20.8711L17.6527 20.8712Z" fill="#3F6D5B"/><path d="M54.223 25.0843H47.4038L43.5071 19.7159L39.5129 25.0843H32.8235L40.0162 16.121L32.9372 7.14136H39.7563L43.5882 12.414L47.4361 7.14136H54.1418L47.0465 15.9771L54.223 25.0843Z" fill="#111827"/><path d="M68.446 20.4033V16.6645C67.6558 16.7283 66.8006 16.8188 65.8807 16.936C64.9605 17.0426 64.2624 17.1705 63.7862 17.3195C63.2015 17.5005 62.7524 17.767 62.4384 18.1184C62.1353 18.4593 61.9839 18.912 61.9839 19.4765C61.9839 19.8495 62.0162 20.1528 62.0813 20.3873C62.1462 20.6217 62.3085 20.8452 62.5684 21.0583C62.8172 21.2714 63.1149 21.4311 63.4614 21.5376C63.8076 21.6335 64.3489 21.6815 65.0849 21.6815C65.6696 21.6815 66.2595 21.5643 66.8548 21.3299C67.461 21.0957 67.9912 20.7867 68.446 20.4033ZM68.446 23.1835C68.132 23.4177 67.7424 23.6999 67.277 24.0302C66.8114 24.3605 66.3732 24.6214 65.9618 24.8131C65.388 25.0687 64.7926 25.2551 64.1758 25.3723C63.5588 25.5002 62.8823 25.564 62.1462 25.564C60.4142 25.564 58.9639 25.0369 57.7949 23.9822C56.6257 22.9277 56.0413 21.5803 56.0413 19.94C56.0413 18.6297 56.3389 17.5592 56.9343 16.7283C57.5296 15.8976 58.374 15.2423 59.4672 14.763C60.5496 14.2837 61.8919 13.943 63.4937 13.7406C65.0957 13.5382 66.7574 13.3889 68.4783 13.2931V13.1972C68.4783 12.2066 68.0671 11.5249 67.2444 11.1521C66.4218 10.7686 65.2094 10.5769 63.6074 10.5769C62.6441 10.5769 61.6157 10.7473 60.5225 11.0883C59.4292 11.4183 58.6445 11.6741 58.1683 11.8552H57.6324V7.52515C58.2494 7.36545 59.2507 7.17907 60.6362 6.966C62.0325 6.74225 63.4288 6.63037 64.8252 6.63037C68.1483 6.63037 70.5459 7.13637 72.0179 8.14836C73.5008 9.14968 74.2424 10.726 74.2424 12.8778V25.0847H68.446V23.1835Z" fill="#111827"/><path d="M95.3498 25.0843H78.2205V21.3936L87.8323 11.3435H78.6101V7.14136H95.1713V10.7683L85.7055 20.8024H95.3498V25.0843Z" fill="#111827"/><path d="M117.772 25.0845H111.895V16.185C111.895 15.4606 111.857 14.7417 111.781 14.028C111.705 13.3036 111.575 12.7711 111.391 12.4302C111.175 12.0361 110.856 11.7485 110.434 11.5674C110.022 11.3864 109.443 11.2958 108.696 11.2958C108.166 11.2958 107.625 11.381 107.072 11.5514C106.531 11.7218 105.941 11.9936 105.303 12.3663V25.0845H99.4578V7.14156H105.303V9.12284C106.342 8.32393 107.338 7.71139 108.29 7.28546C109.254 6.85931 110.32 6.64624 111.489 6.64624C113.459 6.64624 114.996 7.21073 116.1 8.33993C117.215 9.46892 117.772 11.1573 117.772 13.4048V25.0845Z" fill="#111827"/><path d="M134.203 20.4033V16.6645C133.413 16.7283 132.558 16.8188 131.638 16.936C130.718 17.0426 130.02 17.1705 129.544 17.3195C128.959 17.5005 128.51 17.767 128.196 18.1184C127.893 18.4593 127.741 18.912 127.741 19.4765C127.741 19.8495 127.774 20.1528 127.839 20.3873C127.904 20.6217 128.066 20.8452 128.326 21.0583C128.575 21.2714 128.872 21.4311 129.219 21.5376C129.565 21.6335 130.106 21.6815 130.842 21.6815C131.427 21.6815 132.017 21.5643 132.612 21.3299C133.218 21.0957 133.749 20.7867 134.203 20.4033ZM134.203 23.1835C133.89 23.4177 133.5 23.6999 133.034 24.0302C132.569 24.3605 132.131 24.6214 131.719 24.8131C131.146 25.0687 130.55 25.2551 129.933 25.3723C129.316 25.5002 128.64 25.564 127.904 25.564C126.172 25.564 124.721 25.0369 123.552 23.9822C122.383 22.9277 121.799 21.5803 121.799 19.94C121.799 18.6297 122.096 17.5592 122.692 16.7283C123.287 15.8976 124.131 15.2423 125.225 14.763C126.307 14.2837 127.649 13.943 129.251 13.7406C130.853 13.5382 132.515 13.3889 134.236 13.2931V13.1972C134.236 12.2066 133.825 11.5249 133.002 11.1521C132.179 10.7686 130.967 10.5769 129.365 10.5769C128.402 10.5769 127.373 10.7473 126.28 11.0883C125.187 11.4183 124.402 11.6741 123.926 11.8552H123.39V7.52515C124.007 7.36545 125.008 7.17907 126.394 6.966C127.79 6.74225 129.186 6.63037 130.583 6.63037C133.906 6.63037 136.303 7.13637 137.775 8.14836C139.258 9.14968 140 10.726 140 12.8778V25.0847H134.203V23.1835Z" fill="#111827"/></svg>`;

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
				<Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center', marginTop: 10 }}>
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
