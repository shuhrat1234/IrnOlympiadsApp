import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage, LANGS } from '../../../context/LanguageContext';
import { useSupport } from '../../../context/SupportContext';
import { useAdmin } from '../../../context/AdminContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, LargeTitle } from '../../../components/layout';
import { Card, Dialog, IconBadge, Segmented, T, Tap } from '../../../components/ui';
import { sectionsFor } from '../../../components/admin/sections';
import { colors, fonts, gradients, radius, shadow } from '../../../theme';
import { initialsOf } from '../../../utils/format';

const ROLE_LABEL = {
	superadmin: { uz: 'Superadmin', ru: 'Суперадмин', en: 'Superadmin' },
	admin: { uz: 'Administrator', ru: 'Администратор', en: 'Administrator' },
	coordinator: { uz: 'Koordinator', ru: 'Координатор', en: 'Coordinator' },
};

export default function AdminMenu() {
	const { currentUser, logout } = useAuth();
	const { t, tx, lang, changeLanguage } = useLanguage();
	const { notClosedCount } = useSupport();
	const { pendingEditRequests, pendingBookOrders } = useAdmin();
	const toast = useToast();
	const [confirm, setConfirm] = useState(false);
	if (!currentUser) return null;
	const badges = { support: notClosedCount, edits: pendingEditRequests, books: pendingBookOrders };

	return (
		<Screen tabBar>
			<LargeTitle title={tx({ uz: 'Boshqaruv', ru: 'Управление', en: 'Management' })} />
			<LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
				<View style={styles.avatar}><T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: colors.navyDeep }}>{initialsOf(currentUser) || 'A'}</T></View>
				<View style={{ flex: 1 }}>
					<T v="h3" color="#fff" numberOfLines={1}>{currentUser.first_name} {currentUser.last_name}</T>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
						<Shield size={13} color={colors.gold} />
						<T v="small" color={colors.gold} style={{ fontFamily: fonts.bold }}>{tx(ROLE_LABEL[currentUser.role]) || currentUser.role}</T>
					</View>
				</View>
			</LinearGradient>

			<View style={styles.grid}>
				{sectionsFor(currentUser).map((s, i) => {
					const badge = s.badge ? badges[s.badge] : 0;
					return (
						<Animated.View key={s.key} entering={FadeInDown.delay(Math.min(i, 10) * 30)} style={{ width: '31.5%' }}>
							<Tap onPress={() => router.push(s.route)} style={styles.tile}>
								<IconBadge icon={s.icon} bg={s.tint[0]} color={s.tint[1]} size={44} />
								<T v="strong" numberOfLines={2} style={{ fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>{tx(s.label)}</T>
								{badge ? <View style={styles.badge}><T style={styles.badgeText}>{badge > 99 ? '99+' : badge}</T></View> : null}
							</Tap>
						</Animated.View>
					);
				})}
			</View>

			<Card style={{ marginTop: 18 }}>
				<T v="strong" style={{ marginBottom: 12 }}>{t('language')}</T>
				<Segmented value={lang} onChange={changeLanguage} options={LANGS.map((l) => ({ value: l.code, label: l.label }))} />
			</Card>

			<Tap onPress={() => setConfirm(true)} style={styles.logout}>
				<LogOut size={18} color={colors.red} />
				<T v="strong" color={colors.red}>{t('logout')}</T>
			</Tap>

			<Dialog
				visible={confirm}
				onClose={() => setConfirm(false)}
				icon={LogOut}
				tone="red"
				title={t('confirmLogoutTitle')}
				message={t('confirmLogoutMsg')}
				actions={[
					{ title: t('yesLogout'), variant: 'danger', onPress: async () => { setConfirm(false); await logout(); toast.info(t('loggedOut')); } },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirm(false) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 26, marginBottom: 18, ...shadow(2) },
	avatar: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
	tile: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 6, borderWidth: 1, borderColor: colors.line, minHeight: 108, ...shadow(1) },
	badge: { position: 'absolute', top: 8, right: 8, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
	badgeText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 10 },
	logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, height: 54, borderRadius: 27, backgroundColor: colors.redSoft },
});
