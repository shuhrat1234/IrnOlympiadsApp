import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight, Copy, GraduationCap, LifeBuoy, LogOut, Phone } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { LANGS, useLanguage } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { useToast } from '../../context/ToastContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Card, Dialog, IconBadge, Segmented, T, Tap } from '../../components/ui';
import { colors, fonts, gradients, radius, shadow } from '../../theme';
import { initialsOf } from '../../utils/format';

export default function TeacherMore() {
	const { currentUser, logout } = useAuth();
	const { t, tx, lang, changeLanguage } = useLanguage();
	const { unreadCount } = useSupport();
	const toast = useToast();
	const [confirm, setConfirm] = useState(false);
	if (!currentUser) return null;

	return (
		<Screen tabBar>
			<LargeTitle title={tx({ uz: "O'qituvchi paneli", ru: 'Панель учителя', en: 'Teacher panel' })} />
			<LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
				<View style={styles.avatar}><T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: colors.navyDeep }}>{initialsOf(currentUser) || 'T'}</T></View>
				<View style={{ flex: 1, gap: 4 }}>
					<T v="h3" color="#fff" numberOfLines={1}>{currentUser.last_name} {currentUser.first_name}</T>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<GraduationCap size={13} color={colors.gold} />
						<T v="small" color={colors.gold} style={{ fontFamily: fonts.bold }}>{tx({ uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' })}</T>
					</View>
					{currentUser.phone ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Phone size={12} color="rgba(255,255,255,0.6)" /><T v="small" color="rgba(255,255,255,0.75)">{currentUser.phone}</T></View> : null}
				</View>
				{currentUser.participant_id ? (
					<Tap onPress={async () => { await Clipboard.setStringAsync(String(currentUser.participant_id)); toast.info(t('copied')); }} style={styles.idPill}>
						<T style={{ fontFamily: fonts.bold, fontSize: 11.5, color: colors.white }}>{currentUser.participant_id}</T>
						<Copy size={11} color={colors.white} />
					</Tap>
				) : null}
			</LinearGradient>

			<Tap onPress={() => router.push('/support')} style={styles.row}>
				<IconBadge icon={LifeBuoy} color={colors.green} bg={colors.greenSoft} size={44} />
				<View style={{ flex: 1 }}>
					<T v="strong">{t('support')}</T>
					<T v="small" style={{ fontSize: 12 }}>{t('supportSub')}</T>
				</View>
				{unreadCount ? <View style={styles.badge}><T style={styles.badgeText}>{unreadCount}</T></View> : null}
				<ChevronRight size={18} color={colors.faint} />
			</Tap>

			<Card style={{ marginTop: 14 }}>
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
	idPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', alignSelf: 'flex-start' },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, ...shadow(1) },
	badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
	badgeText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 11 },
	logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, height: 54, borderRadius: 27, backgroundColor: colors.redSoft },
});
