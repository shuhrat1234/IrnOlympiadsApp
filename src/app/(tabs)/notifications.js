import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Bell, Calendar, Check, CheckCheck, CheckCircle2, AlertCircle, CreditCard, Info, Search, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Card, Dialog, EmptyState, Field, IconButton, Pill, Segmented, T, Tap } from '../../components/ui';
import { colors, radius } from '../../theme';
import { formatShortDate } from '../../utils/format';

const TYPE = {
	success: { icon: CheckCircle2, color: colors.green, bg: colors.greenSoft },
	warning: { icon: AlertCircle, color: colors.amber, bg: colors.goldTint },
	payment: { icon: CreditCard, color: colors.red, bg: colors.redSoft },
	info: { icon: Info, color: colors.blue, bg: colors.blueSoft },
};

export default function NotificationsTab() {
	const { currentUser, fetchMe, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } = useAuth();
	const { t, lang, pick } = useLanguage();
	const [filter, setFilter] = useState('all');
	const [query, setQuery] = useState('');
	const [confirmClear, setConfirmClear] = useState(false);

	const list = currentUser?.notifications || [];
	const unread = list.filter((n) => !n.is_read).length;

	const filtered = useMemo(() => {
		// Every word must match in any language of the title/message or in the type.
		const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return list.filter((n) => {
			if (filter === 'unread' && n.is_read) return false;
			if (filter === 'read' && !n.is_read) return false;
			if (!words.length) return true;
			const pool = [n.title_uz, n.title_ru, n.title_en, n.title, n.message_uz, n.message_ru, n.message_en, n.message, n.type].filter(Boolean).join(' ').toLowerCase();
			return words.every((w) => pool.includes(w));
		});
	}, [list, filter, query]);

	return (
		<Screen onRefresh={fetchMe} tabBar>
			<LargeTitle
				title={t('notifications')}
				subtitle={t('notificationsSub')}
				right={
					<View style={{ flexDirection: 'row', gap: 8 }}>
						{unread > 0 ? <IconButton icon={CheckCheck} onPress={markAllNotificationsAsRead} color={colors.green} /> : null}
						{list.length > 0 ? <IconButton icon={Trash2} onPress={() => setConfirmClear(true)} color={colors.red} /> : null}
					</View>
				}
			/>
			<Segmented
				value={filter}
				onChange={setFilter}
				options={[
					{ value: 'all', label: t('all') },
					{ value: 'unread', label: t('unread'), badge: unread || null },
					{ value: 'read', label: t('read') },
				]}
			/>
			<Field icon={Search} value={query} onChangeText={setQuery} placeholder={t('search')} style={{ marginTop: 12, marginBottom: 16 }} returnKeyType="search" />

			{filtered.length === 0 ? (
				<EmptyState icon={Bell} title={t('noNotif')} />
			) : (
				filtered.map((n, i) => {
					const cfg = TYPE[n.type] || TYPE.info;
					const Icon = cfg.icon;
					return (
						<Animated.View key={n.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)} exiting={FadeOut} layout={LinearTransition}>
							<Tap onPress={() => !n.is_read && markNotificationAsRead(n.id)} scale={0.99}>
								<Card style={[styles.card, !n.is_read && styles.unread]}>
									<View style={{ flexDirection: 'row', gap: 12 }}>
										<View style={[styles.icon, { backgroundColor: cfg.bg }]}><Icon size={19} color={cfg.color} /></View>
										<View style={{ flex: 1 }}>
											<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
												<T v="strong" style={{ flex: 1 }} numberOfLines={2}>{pick(n, 'title')}</T>
												{!n.is_read ? <View style={styles.dot} /> : null}
											</View>
											<T v="body" style={{ marginTop: 4, fontSize: 14 }}>{pick(n, 'message')}</T>
											<View style={styles.footer}>
												<Pill label={TYPE[n.type] ? t(`notifType_${n.type}`) : n.type || t('notifType_info')} color={cfg.color} bg={cfg.bg} />
												<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
													<Calendar size={11} color={colors.faint} />
													<T v="small" style={{ fontSize: 11.5 }}>{formatShortDate(n.created_at, lang)}</T>
												</View>
												{!n.is_read ? (
													<Tap onPress={() => markNotificationAsRead(n.id)} style={styles.action}><Check size={15} color={colors.green} /></Tap>
												) : null}
												<Tap onPress={() => deleteNotification(n.id)} style={styles.action}><Trash2 size={15} color={colors.red} /></Tap>
											</View>
										</View>
									</View>
								</Card>
							</Tap>
						</Animated.View>
					);
				})
			)}

			<Dialog
				visible={confirmClear}
				onClose={() => setConfirmClear(false)}
				icon={Trash2}
				tone="red"
				title={t('clearAll')}
				message={t('clearAllConfirm')}
				actions={[
					{ title: t('delete'), variant: 'danger', onPress: () => { setConfirmClear(false); deleteAllNotifications(); } },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirmClear(false) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	card: { marginBottom: 10, padding: 16 },
	unread: { borderColor: colors.gold, backgroundColor: '#FFFDF4' },
	icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold, marginTop: 5 },
	footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
	action: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
});
