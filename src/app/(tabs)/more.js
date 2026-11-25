import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { BookOpen, ChevronRight, Globe, History, Languages, LifeBuoy, LogOut, Package, Send, Trash2, User } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LANGS } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { useToast } from '../../context/ToastContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Avatar, Card, Dialog, IconBadge, Segmented, T, Tap } from '../../components/ui';
import { colors, fonts } from '../../theme';
import { gradeLabel, initialsOf } from '../../utils/format';
import { LINKS } from '../../utils/constants';
import { openTelegram } from '../../utils/telegram';

const Row = ({ icon, tint, label, value, badge, onPress, last }) => (
	<Tap onPress={onPress} scale={0.985} style={[styles.row, !last && styles.rowBorder]}>
		<IconBadge icon={icon} bg={tint[0]} color={tint[1]} size={38} />
		<T v="strong" style={{ flex: 1 }}>{label}</T>
		{value ? <T v="small">{value}</T> : null}
		{badge ? <View style={styles.badge}><T style={styles.badgeText}>{badge}</T></View> : null}
		<ChevronRight size={18} color={colors.faint} />
	</Tap>
);

export default function MoreTab() {
	const { currentUser, logout } = useAuth();
	const { t, lang, changeLanguage } = useLanguage();
	const { unreadCount, notClosedCount } = useSupport();
	const toast = useToast();
	const [confirmLogout, setConfirmLogout] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await api.delete(E.PROFILE).catch(() => {});
		} catch {}
		setDeleting(false);
		setConfirmDelete(false);
		toast.info(t('deleteAccountSuccess'));
		await logout();
	};

	if (!currentUser) return null;

	return (
		<Screen tabBar>
			<LargeTitle title={t('tabMore')} />

			<Card onPress={() => router.push('/profile')} style={styles.profile}>
				<Avatar initials={initialsOf(currentUser)} size={58} dark />
				<View style={{ flex: 1 }}>
					<T v="h3" numberOfLines={1} style={{ fontSize: 17 }}>{currentUser.first_name} {currentUser.last_name}</T>
					<T v="small" numberOfLines={1}>#{currentUser.participant_id}{currentUser.grade ? ` · ${gradeLabel(currentUser.grade, t)}` : ''}</T>
					<T v="strong" color={colors.amber} style={{ fontSize: 13, marginTop: 4 }}>{t('editProfile')} →</T>
				</View>
			</Card>

			<T v="label" style={styles.group}>{t('account')}</T>
			<Card padded={false}>
				<Row icon={User} tint={[colors.goldTint, colors.amber]} label={t('profile')} onPress={() => router.push('/profile')} />
				<Row icon={History} tint={[colors.blueSoft, colors.blue]} label={t('history')} onPress={() => router.push('/history')} />
				<Row icon={BookOpen} tint={[colors.goldTint, colors.amber]} label={t('bookShop')} onPress={() => router.push('/books')} />
				<Row icon={Package} tint={[colors.purpleSoft, colors.purple]} label={t('myOrders')} onPress={() => router.push('/orders')} />
				<Row icon={LifeBuoy} tint={[colors.greenSoft, colors.green]} label={t('support')} badge={unreadCount || notClosedCount || null} onPress={() => router.push('/support')} last />
			</Card>

			<T v="label" style={styles.group}>{t('settings')}</T>
			<Card>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
					<IconBadge icon={Languages} bg={colors.navySoft} color={colors.navy} size={38} />
					<T v="strong">{t('language')}</T>
				</View>
				<Segmented value={lang} onChange={changeLanguage} options={LANGS.map((l) => ({ value: l.code, label: l.label }))} />
			</Card>

			<Card padded={false} style={{ marginTop: 12 }}>
				<Row icon={Send} tint={[colors.blueSoft, '#0088CC']} label={t('telegramChannel')} value="@IRN_Olympiads" onPress={() => openTelegram(LINKS.channel)} />
				<Row icon={Globe} tint={[colors.cardMuted, colors.ink2]} label="irnolympiad.uz" onPress={() => Linking.openURL(LINKS.site)} last />
			</Card>

			<T v="label" style={styles.group}>{t('accountManagement')}</T>
			<Card padded={false}>
				<Row icon={Trash2} tint={[colors.redSoft, colors.red]} label={t('deleteAccount')} onPress={() => setConfirmDelete(true)} last />
			</Card>

			<Tap onPress={() => setConfirmLogout(true)} style={styles.logout}>
				<LogOut size={18} color={colors.red} />
				<T v="strong" color={colors.red}>{t('logout')}</T>
			</Tap>

			<T v="small" style={{ textAlign: 'center', marginTop: 14 }}>IRN Olympiads · {t('version')} {Constants.expoConfig?.version}</T>

			<Dialog
				visible={confirmLogout}
				onClose={() => setConfirmLogout(false)}
				icon={LogOut}
				tone="red"
				title={t('confirmLogoutTitle')}
				message={t('confirmLogoutMsg')}
				actions={[
					{
						title: t('yesLogout'),
						variant: 'danger',
						onPress: async () => {
							setConfirmLogout(false);
							setTimeout(async () => {
								await logout();
								toast.info(t('loggedOut'));
							}, 60);
						},
					},
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirmLogout(false) },
				]}
			/>

			<Dialog
				visible={confirmDelete}
				onClose={() => setConfirmDelete(false)}
				icon={Trash2}
				tone="red"
				title={t('deleteAccountConfirmTitle')}
				message={t('deleteAccountConfirmMsg')}
				actions={[
					{ title: t('deleteAccount'), variant: 'danger', loading: deleting, onPress: handleDelete },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirmDelete(false) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	group: { marginTop: 24, marginBottom: 10, marginLeft: 6 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
	badgeText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 11 },
	logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, height: 54, borderRadius: 27, backgroundColor: colors.redSoft },
	deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 10 },
});
