import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Clock, LifeBuoy, MessageCircle, Plus } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, IconBadge, Pill, Segmented, T } from '../../components/ui';
import { colors, radius } from '../../theme';
import { formatShortDate } from '../../utils/format';
import { ticketStatus } from '../../components/support';

const SL = {
	allTickets: { uz: 'Barcha murojaatlar', ru: 'Все обращения', en: 'All tickets' },
	manage: { uz: 'Foydalanuvchilar murojaatlarini boshqarish', ru: 'Управление обращениями пользователей', en: 'Manage user inquiries' },
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	teachers: { uz: "O'qituvchilar", ru: 'Учителя', en: 'Teachers' },
	participants: { uz: 'Ishtirokchilar', ru: 'Участники', en: 'Participants' },
};

export default function SupportList() {
	const { t, tx, lang } = useLanguage();
	const { tickets, fetchTickets, unreadIds, isStaff } = useSupport();
	const [roleFilter, setRoleFilter] = useState('all');

	useEffect(() => {
		fetchTickets();
	}, []);

	// Open tickets first, then newest.
	const sorted = useMemo(
		() => [...(isStaff && roleFilter !== 'all' ? tickets.filter((x) => x.user_role === roleFilter) : tickets)].sort((a, b) => ((a.status === 'resolved') - (b.status === 'resolved')) || Number(b.id) - Number(a.id)),
		[tickets, isStaff, roleFilter]
	);

	return (
		<Screen header={<StackHeader />} onRefresh={fetchTickets}>
			{isStaff ? (
				<>
					<LargeTitle title={tx(SL.allTickets)} subtitle={tx(SL.manage)} />
					<Segmented value={roleFilter} onChange={setRoleFilter} style={{ marginBottom: 16 }} options={[{ value: 'all', label: tx(SL.all) }, { value: 'teacher', label: tx(SL.teachers) }, { value: 'participant', label: tx(SL.participants) }]} />
				</>
			) : (
				<>
					<LargeTitle title={t('support')} subtitle={t('supportSub')} />
					<View style={styles.notice}>
						<Clock size={16} color={colors.green} />
						<T v="small" style={{ flex: 1, color: colors.ink2 }}>{t('supportNotice')}</T>
					</View>
					<Button title={t('newTicket')} icon={Plus} onPress={() => router.push('/support/new')} style={{ marginBottom: 18 }} />
				</>
			)}
			{sorted.length === 0 ? (
				<EmptyState icon={LifeBuoy} title={t('noTickets')} />
			) : (
				sorted.map((ticket, i) => {
					const st = ticketStatus(ticket.status, t);
					const unread = unreadIds.has(ticket.id);
					return (
						<Animated.View key={ticket.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
							<Card onPress={() => router.push(`/support/${ticket.id}`)} style={[{ marginBottom: 10, padding: 16 }, unread && { borderColor: colors.gold }]}>
								<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
									<IconBadge icon={MessageCircle} color={ticket.status === 'resolved' ? colors.muted : colors.green} bg={ticket.status === 'resolved' ? colors.cardMuted : colors.greenSoft} size={42} />
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={1}>{ticket.subject}</T>
										{isStaff ? <T v="small" style={{ fontSize: 12.5, color: colors.ink2 }} numberOfLines={1}>{ticket.user_full_name} · {ticket.user_participant_id || `USR-${ticket.user}`}</T> : null}
										<T v="small" style={{ fontSize: 12 }}>#{ticket.id} · {formatShortDate(ticket.updated_at || ticket.created_at, lang)}</T>
									</View>
									{unread ? <View style={styles.dot} /> : null}
									<ChevronRight size={18} color={colors.faint} />
								</View>
								<View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
									<Pill label={st.label} color={st.color} bg={st.bg} dot />
									{ticket.replies?.length ? <Pill icon={MessageCircle} label={String(ticket.replies.length)} /> : null}
								</View>
							</Card>
						</Animated.View>
					);
				})
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.greenSoft, marginBottom: 14 },
	dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
});
