import React, { useEffect, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AlertTriangle, Building2, Calendar, CheckCircle2, ChevronRight, Clock, Wifi } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useOlympiad } from '../context/OlympiadContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../components/layout';
import { Button, Card, EmptyState, IconBadge, Pill, Sheet, T, Tap } from '../components/ui';
import { colors, fonts, radius } from '../theme';
import { formatDate, formatMoney } from '../utils/format';

export default function HistoryScreen() {
	const { t, lang } = useLanguage();
	const toast = useToast();
	const { userRegistrations, fetchUserRegistrations, getPaymentLink } = useOlympiad();
	const [active, setActive] = useState(null);

	useEffect(() => {
		fetchUserRegistrations();
	}, []);

	const payme = async (reg) => {
		const link = await getPaymentLink('payme', reg.id);
		if (link) Linking.openURL(link);
		else toast.error(t('payError'));
	};

	return (
		<Screen header={<StackHeader />} onRefresh={fetchUserRegistrations}>
			<LargeTitle title={t('history')} subtitle={t('historySub')} />
			{userRegistrations.length === 0 ? (
				<EmptyState icon={Clock} title={t('noHistory')} text={t('noHistorySub')} />
			) : (
				userRegistrations.map((reg, i) => {
					const online = reg.olympiad_type === 'online';
					const paidLike = reg.payment_status === 'paid' || reg.payment_status === 'free';
					const tone = paidLike ? [colors.green, colors.greenSoft] : reg.payment_status === 'pending' ? [colors.amber, colors.goldTint] : [colors.red, colors.redSoft];
					const clickable = reg.price > 0 && (paidLike || reg.payment_status === 'pending');
					return (
						<Animated.View key={reg.id || i} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
							<Card onPress={clickable ? () => setActive(reg) : undefined} style={{ marginBottom: 10, padding: 16 }}>
								<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
									<IconBadge icon={online ? Wifi : Building2} color={online ? colors.amber : colors.navy} bg={online ? colors.goldTint : colors.navySoft} size={42} />
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={2}>{reg.olympiad_title}</T>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
											<Calendar size={12} color={colors.faint} />
											<T v="small" style={{ fontSize: 12 }}>{formatDate(reg.registered_at, lang)}</T>
										</View>
									</View>
									{clickable ? <ChevronRight size={18} color={colors.faint} /> : null}
								</View>
								<View style={styles.footer}>
									<Pill label={reg.status_label || reg.payment_status} color={tone[0]} bg={tone[1]} dot />
									<Pill label={online ? t('online') : t('offline')} />
									<T style={styles.amount}>{reg.price > 0 ? `${formatMoney(reg.price)} UZS` : t('free')}</T>
								</View>
							</Card>
						</Animated.View>
					);
				})
			)}

			<Sheet visible={!!active} onClose={() => setActive(null)} title={active && (active.payment_status === 'paid' || active.payment_status === 'free') ? t('paid') : t('selectMethod')}>
				{active ? (
					<View style={{ gap: 14 }}>
						<T v="body">{active.olympiad_title}</T>
						<T style={[styles.amount, { fontSize: 28, textAlign: 'left' }]}>{formatMoney(active.price)} <T v="small">UZS</T></T>
						{active.payment_status === 'paid' || active.payment_status === 'free' ? (
							<Card style={{ backgroundColor: '#FFFBEF', borderColor: colors.goldSoft }}>
								<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
									<AlertTriangle size={18} color={colors.amber} />
									<T v="h3">{t('importantInfo')}</T>
								</View>
								<T v="small" style={{ lineHeight: 19 }}>{t('refundWarning')}</T>
							</Card>
						) : (
							<Tap onPress={() => payme(active)} style={styles.method}>
								<Image source={require('../../assets/brand/payme.png')} style={{ width: 70, height: 30 }} resizeMode="contain" />
								<T v="h3" style={{ flex: 1 }}>Payme</T>
								<ChevronRight size={20} color={colors.faint} />
							</Tap>
						)}
						{active.payment_status === 'paid' ? (
							<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
								<CheckCircle2 size={16} color={colors.green} />
								<T v="strong" color={colors.green}>{t('paid')}</T>
							</View>
						) : null}
						<Button title={t('close')} variant="light" size="md" onPress={() => setActive(null)} />
					</View>
				) : null}
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
	amount: { flex: 1, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink },
	method: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.xl, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
});
