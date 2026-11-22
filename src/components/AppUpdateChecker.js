import React, { useEffect, useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { ArrowUpCircle, ExternalLink, ShieldAlert, Sparkles, X } from 'lucide-react-native';
import api from '../api/client';
import E from '../api/endpoints';
import { store } from '../api/storage';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, T, Tap } from './ui';
import { colors, fonts, radius } from '../theme';

const DISMISS_KEY = 'update_modal_dismissed_at';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const semverLt = (a, b) => {
	if (!a || !b) return false;
	const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
	const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const na = pa[i] || 0;
		const nb = pb[i] || 0;
		if (na < nb) return true;
		if (na > nb) return false;
	}
	return false;
};

export default function AppUpdateChecker() {
	const { t, lang } = useLanguage();
	const [updateInfo, setUpdateInfo] = useState(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		let isMounted = true;
		const check = async () => {
			try {
				const currentVersion = Constants.expoConfig?.version || '1.0.0';
				const currentIosBuild = parseInt(Constants.expoConfig?.ios?.buildNumber || '1', 10);
				const currentAndroidCode = parseInt(Constants.expoConfig?.android?.versionCode || '1', 10);

				const res = await api.get(E.APP_VERSION, { timeout: 6000 });
				const data = res?.data;
				if (!data || !isMounted) return;

				const isIos = Platform.OS === 'ios';
				const latestVersion = data.latest_version || '1.0.1';
				const latestBuild = isIos ? (data.latest_build_ios || 29) : (data.latest_build_android || 3);
				const currentBuild = isIos ? currentIosBuild : currentAndroidCode;

				const hasNewerVersion = semverLt(currentVersion, latestVersion) || currentBuild < latestBuild;

				if (hasNewerVersion) {
					const isForced = data.force_update !== undefined ? Boolean(data.force_update) : true;
					const dismissedAt = await store.get(DISMISS_KEY, 0);

					if (!isForced && dismissedAt && Date.now() - dismissedAt < ONE_DAY_MS) {
						return;
					}

					setUpdateInfo({
						...data,
						force_update: isForced,
						currentVersion,
						latestVersion,
						url: isIos
							? (data.ios_url || 'https://apps.apple.com/app/id6834832792')
							: (data.android_url || 'https://play.google.com/store/apps/details?id=uz.irnolympiad.app')
					});
					setVisible(true);
				}
			} catch {
				// Keep fallback state if network check fails
			}
		};

		check();
		return () => {
			isMounted = false;
		};
	}, []);

	const handleUpdate = async () => {
		if (Platform.OS === 'ios') {
			const nativeUrl = 'itms-apps://apps.apple.com/app/id6834832792';
			const webUrl = updateInfo?.ios_url || 'https://apps.apple.com/app/id6834832792';
			try {
				const canOpen = await Linking.canOpenURL(nativeUrl);
				if (canOpen) {
					await Linking.openURL(nativeUrl);
				} else {
					await Linking.openURL(webUrl);
				}
			} catch {
				await Linking.openURL(webUrl);
			}
		} else if (Platform.OS === 'android') {
			const nativeUrl = 'market://details?id=uz.irnolympiad.app';
			const webUrl = updateInfo?.android_url || 'https://play.google.com/store/apps/details?id=uz.irnolympiad.app';
			try {
				const canOpen = await Linking.canOpenURL(nativeUrl);
				if (canOpen) {
					await Linking.openURL(nativeUrl);
				} else {
					await Linking.openURL(webUrl);
				}
			} catch {
				await Linking.openURL(webUrl);
			}
		} else {
			const fallback = updateInfo?.url || 'https://irnolympiad.uz';
			try {
				await Linking.openURL(fallback);
			} catch {}
		}
	};

	const handleDismiss = async () => {
		if (updateInfo?.force_update) return; // Cannot dismiss mandatory update
		setVisible(false);
		await store.set(DISMISS_KEY, Date.now());
	};

	if (!visible || !updateInfo) return null;

	const isForced = Boolean(updateInfo.force_update);
	const title = updateInfo.title?.[lang] || t('updateAvailable');
	const message = updateInfo.message?.[lang] || t('updateAvailableMsg');

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={isForced ? () => {} : handleDismiss}>
			<View style={styles.overlay}>
				<Animated.View entering={ZoomIn.duration(260)} style={styles.container}>
					<Card style={styles.card}>
						{!isForced && (
							<Tap onPress={handleDismiss} style={styles.closeBtn}>
								<X size={18} color={colors.ink2} />
							</Tap>
						)}

						<View style={styles.iconCircle}>
							<ArrowUpCircle size={38} color={colors.goldDeep} />
							<View style={styles.badgeSparkle}>
								<Sparkles size={13} color="#fff" />
							</View>
						</View>

						<T v="h2" style={{ textAlign: 'center', marginTop: 14 }}>
							{title}
						</T>

						<T v="body" style={{ textAlign: 'center', color: colors.ink2, marginTop: 8, fontSize: 13.5, lineHeight: 20 }}>
							{message}
						</T>

						{/* Notice for mandatory update */}
						{isForced && (
							<View style={styles.mandatoryNotice}>
								<ShieldAlert size={14} color={colors.goldDeep} />
								<T v="small" style={{ color: colors.ink, fontSize: 11.5, fontFamily: fonts.medium, flex: 1 }}>
									{t('updateRequiredNotice')}
								</T>
							</View>
						)}

						{/* Action Buttons: Only Update button for forced update */}
						<View style={{ width: '100%', gap: 10, marginTop: 18 }}>
							<Button title={t('updateBtn')} iconRight={ExternalLink} size="lg" onPress={handleUpdate} />
							{!isForced && (
								<Button title={t('later')} variant="ghost" size="md" onPress={handleDismiss} />
							)}
						</View>
					</Card>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(9, 9, 12, 0.72)',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20
	},
	container: {
		width: '100%',
		maxWidth: 390
	},
	card: {
		padding: 22,
		borderRadius: 24,
		backgroundColor: colors.white,
		alignItems: 'center'
	},
	closeBtn: {
		position: 'absolute',
		top: 16,
		right: 16,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 5
	},
	iconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#FEF3C7',
		borderWidth: 2,
		borderColor: '#FDE68A',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4
	},
	badgeSparkle: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: colors.goldDeep,
		alignItems: 'center',
		justifyContent: 'center'
	},
	mandatoryNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		width: '100%',
		marginTop: 12,
		paddingHorizontal: 12,
		paddingVertical: 9,
		backgroundColor: '#FFFBEB',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#FDE68A'
	}
});
