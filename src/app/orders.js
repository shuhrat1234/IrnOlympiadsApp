import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, CheckCircle2, Clock, MapPin, Package, Truck, XCircle } from 'lucide-react-native';
import api from '../api/client';
import E from '../api/endpoints';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../components/layout';
import { Button, Card, EmptyState, Pill, SkeletonCard, T } from '../components/ui';
import { colors, fonts, radius } from '../theme';
import { formatDay, formatMoney } from '../utils/format';
import { LINKS } from '../utils/constants';

const STATUS = {
	pending: { icon: Clock, color: colors.amber, bg: colors.goldTint, key: 'stepPending' },
	accepted: { icon: CheckCircle2, color: colors.green, bg: colors.greenSoft, key: 'stepAccepted' },
	delivering: { icon: Truck, color: colors.blue, bg: colors.blueSoft, key: 'stepDelivering' },
	delivered: { icon: Package, color: colors.purple, bg: colors.purpleSoft, key: 'stepDelivered' },
	rejected: { icon: XCircle, color: colors.red, bg: colors.redSoft, key: 'orderRejected' },
};
const STEPS = ['pending', 'accepted', 'delivering', 'delivered'];

export default function OrdersScreen() {
	const { t, pick } = useLanguage();
	const toast = useToast();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);

	const load = async () => {
		try {
			const res = await api.get(E.BOOK_ORDERS);
			setOrders(res.data?.results || res.data || []);
		} catch {
			toast.error(t('error'));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const openShop = () => WebBrowser.openBrowserAsync(LINKS.books);

	return (
		<Screen header={<StackHeader />} onRefresh={load}>
			<LargeTitle title={t('myOrders')} subtitle={t('ordersSub')} />
			<Button title={t('toBookShop')} icon={BookOpen} variant="dark" size="md" onPress={openShop} style={{ marginBottom: 18 }} />
			{loading ? (
				<SkeletonCard />
			) : orders.length === 0 ? (
				<EmptyState icon={Package} title={t('noOrders')} />
			) : (
				orders.map((order) => {
					const st = STATUS[order.status] || STATUS.pending;
					const stepIdx = STEPS.indexOf(order.status);
					return (
						<Card key={order.id} style={{ marginBottom: 12 }}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
								<View style={{ flex: 1 }}>
									<T v="label">{t('orderId')} #{order.id}</T>
									<T v="h3" numberOfLines={2} style={{ marginTop: 4 }}>{pick(order, 'book_title') || order.book_title_ru}</T>
								</View>
								<Pill icon={st.icon} label={t(st.key)} color={st.color} bg={st.bg} />
							</View>

							{order.status !== 'rejected' ? (
								<View style={styles.stepper}>
									{STEPS.map((s, i) => {
										const Icon = STATUS[s].icon;
										const done = i <= stepIdx;
										const current = i === stepIdx;
										return (
											<View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
												<View style={styles.stepLineWrap}>
													{i > 0 ? <View style={[styles.stepLine, i <= stepIdx && { backgroundColor: colors.green }]} /> : <View style={{ flex: 1 }} />}
													<View style={[styles.stepDot, done && { backgroundColor: colors.green, borderColor: colors.green }, current && { backgroundColor: colors.gold, borderColor: colors.goldDeep }]}>
														<Icon size={13} color={done ? (current ? colors.navyDeep : '#fff') : colors.faint} />
													</View>
													{i < STEPS.length - 1 ? <View style={[styles.stepLine, i < stepIdx && { backgroundColor: colors.green }]} /> : <View style={{ flex: 1 }} />}
												</View>
												<T v="small" style={{ fontSize: 10, textAlign: 'center', fontFamily: current ? fonts.extrabold : fonts.semibold }} color={done ? colors.ink : colors.faint}>{t(STATUS[s].key)}</T>
											</View>
										);
									})}
								</View>
							) : null}

							<View style={styles.grid}>
								<View style={styles.cell}><T v="label" style={{ fontSize: 9.5 }}>{t('quantity')}</T><T v="strong">{order.amount} {t('pcs')}</T></View>
								<View style={styles.cell}><T v="label" style={{ fontSize: 9.5 }}>{t('total')}</T><T v="strong">{formatMoney(order.total_price)} UZS</T></View>
								<View style={styles.cell}><T v="label" style={{ fontSize: 9.5 }}>{t('date')}</T><T v="strong">{formatDay(order.created_at)}</T></View>
							</View>
							{order.delivery_address ? (
								<View style={styles.address}>
									<MapPin size={15} color={colors.muted} />
									<T v="small" style={{ flex: 1 }}>{order.delivery_address}</T>
								</View>
							) : null}
							{order.status === 'rejected' && order.rejection_reason ? (
								<View style={[styles.address, { backgroundColor: colors.redSoft }]}>
									<XCircle size={15} color={colors.red} />
									<View style={{ flex: 1 }}>
										<T v="label" color={colors.red} style={{ fontSize: 9.5 }}>{t('rejectionReason')}</T>
										<T v="small" color={colors.red}>{order.rejection_reason}</T>
									</View>
								</View>
							) : null}
						</Card>
					);
				})
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	stepper: { flexDirection: 'row', marginTop: 18 },
	stepLineWrap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
	stepLine: { flex: 1, height: 3, backgroundColor: colors.line },
	stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	grid: { flexDirection: 'row', gap: 8, marginTop: 16 },
	cell: { flex: 1, backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 10, gap: 4 },
	address: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
});
