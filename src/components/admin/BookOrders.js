import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CheckCircle, Clock, ExternalLink, MapPin, Package, PackageCheck, Phone, Receipt, Truck, User, X, XCircle } from 'lucide-react-native';
import api, { mediaUrl } from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button, Card, EmptyState, Pill, T, Tap } from '../ui';
import { TextArea } from '../form';
import { colors, fonts, radius } from '../../theme';
import { formatMoney, formatShortDate } from '../../utils/format';

const L = {
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	pending: { uz: 'Kutilmoqda', ru: 'Ожидает', en: 'Pending' },
	accepted: { uz: "To'lov qabul qilindi", ru: 'Оплата принята', en: 'Payment accepted' },
	rejected: { uz: 'Rad etildi', ru: 'Отклонен', en: 'Rejected' },
	delivering: { uz: "Yo'lda", ru: 'В пути', en: 'Delivering' },
	delivered: { uz: 'Yetkazib berildi', ru: 'Доставлено', en: 'Delivered' },
	noOrders: { uz: 'Buyurtmalar topilmadi', ru: 'Заказов не найдено', en: 'No orders found' },
	order: { uz: 'Buyurtma', ru: 'Заказ', en: 'Order' },
	pcs: { uz: 'ta', ru: 'шт.', en: 'pcs' },
	address: { uz: 'Yetkazish manzili', ru: 'Адрес доставки', en: 'Delivery address' },
	bts: { uz: 'BTS punkti', ru: 'Пункт BTS', en: 'BTS point' },
	map: { uz: "Xaritada ko'rish", ru: 'На карте', en: 'View on map' },
	receipt: { uz: "Chekni ko'rish", ru: 'Посмотреть чек', en: 'View receipt' },
	accept: { uz: "To'lovni tasdiqlash", ru: 'Подтвердить оплату', en: 'Accept payment' },
	reject: { uz: 'Rad etish', ru: 'Отклонить', en: 'Reject' },
	rejectConfirm: { uz: 'Rad etishni tasdiqlash', ru: 'Подтвердить отказ', en: 'Confirm rejection' },
	reason: { uz: 'Rad etish sababini yozing...', ru: 'Укажите причину отклонения...', en: 'Enter rejection reason...' },
	toDelivering: { uz: 'Yetkazishga berish', ru: 'Передать в доставку', en: 'Mark as delivering' },
	toDelivered: { uz: 'Yetkazib berildi', ru: 'Доставлено', en: 'Mark as delivered' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	needReason: { uz: 'Rad etish sababini kiriting', ru: 'Укажите причину отклонения', en: 'Enter a rejection reason' },
	updated: { uz: 'Buyurtma holati yangilandi', ru: 'Статус заказа обновлен', en: 'Order status updated' },
	updateErr: { uz: "Holatni yangilab bo'lmadi", ru: 'Не удалось обновить статус', en: 'Failed to update status' },
};

const TONE = {
	pending: [colors.amber, colors.goldTint, Clock],
	accepted: [colors.green, colors.greenSoft, CheckCircle],
	rejected: [colors.red, colors.redSoft, XCircle],
	delivering: [colors.blue, colors.blueSoft, Truck],
	delivered: [colors.purple, colors.purpleSoft, PackageCheck],
};
export const ORDER_FILTERS = ['all', 'pending', 'accepted', 'delivering', 'delivered', 'rejected'];

// Shared by the Books and Telegram sections (same API and actions on the website).
export const BookOrdersList = ({ orders, loading, filter, onFilter, onChanged }) => {
	const { tx, lang, pick } = useLanguage();
	const toast = useToast();
	const [reasons, setReasons] = useState({});
	const [rejecting, setRejecting] = useState({});
	const [busy, setBusy] = useState(null);
	const [receipt, setReceipt] = useState(null);

	const update = async (order, status) => {
		const reason = reasons[order.id] || '';
		if (status === 'rejected' && !reason.trim()) return toast.info(tx(L.needReason));
		setBusy(`${order.id}:${status}`);
		try {
			await api.post(E.BOOK_ORDER_UPDATE_STATUS(order.id), { status, rejection_reason: reason });
			toast.success(tx(L.updated));
			setRejecting((p) => ({ ...p, [order.id]: false }));
			setReasons((p) => ({ ...p, [order.id]: '' }));
			onChanged?.(order.id, status);
		} catch {
			toast.error(tx(L.updateErr));
		}
		setBusy(null);
	};

	const counts = ORDER_FILTERS.reduce((acc, f) => ({ ...acc, [f]: f === 'all' ? orders.length : orders.filter((o) => o.status === f).length }), {});
	const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

	return (
		<View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
				{ORDER_FILTERS.map((f) => {
					const on = filter === f;
					return (
						<Tap key={f} onPress={() => onFilter(f)} style={[styles.chip, on && styles.chipOn]}>
							<T style={[styles.chipText, on && { color: colors.navyDeep }]}>{tx(L[f])}</T>
							<View style={[styles.count, on && { backgroundColor: 'rgba(12,26,54,0.12)' }]}><T style={styles.countText}>{counts[f]}</T></View>
						</Tap>
					);
				})}
			</ScrollView>

			{loading && !orders.length ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 20 }} /> : !shown.length ? <EmptyState icon={Package} title={tx(L.noOrders)} /> : shown.map((order) => {
				const [c, bg, Icon] = TONE[order.status] || [colors.muted, colors.cardMuted, Clock];
				const bts = order.bts_point_detail;
				const title = pick(order, 'book_title') || order.book_title_ru || order.book_title_uz || order.book_title_en;
				return (
					<Card key={order.id} style={{ marginBottom: 12 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<T v="label" style={{ flex: 1 }}>{tx(L.order)} #{order.id}</T>
							<Pill icon={Icon} label={tx(L[order.status]) || order.status} color={c} bg={bg} />
						</View>
						<T v="h3" style={{ marginTop: 8, fontSize: 16 }}>{title}</T>
						<View style={{ gap: 6, marginTop: 10 }}>
							<View style={styles.line}><User size={14} color={colors.muted} /><T v="body" style={{ flex: 1 }}>{order.user_name}</T></View>
							<Tap onPress={() => order.user_phone && Linking.openURL(`tel:${order.user_phone}`)} style={styles.line}><Phone size={14} color={colors.muted} /><T v="body" color={colors.blue}>{order.user_phone}</T></Tap>
							<View style={styles.line}>
								<Package size={14} color={colors.muted} />
								<T v="body" style={{ flex: 1 }}>{order.amount} {tx(L.pcs)} · <T v="strong">{formatMoney(order.total_price || 0)} UZS</T></T>
								<T v="small" style={{ fontSize: 11.5 }}>{formatShortDate(order.created_at, lang)}</T>
							</View>
						</View>
						{order.delivery_address ? (
							<View style={styles.box}><T v="label" style={{ fontSize: 9.5 }}>{tx(L.address)}</T><T v="body" style={{ fontSize: 13.5 }}>{order.delivery_address}</T></View>
						) : null}
						{bts ? (
							<View style={styles.box}>
								<T v="label" style={{ fontSize: 9.5 }}>{tx(L.bts)}</T>
								<T v="strong">{bts.name}</T>
								{bts.region_name ? <T v="small">{bts.region_name}</T> : null}
								<T v="small">{bts.address}</T>
								{bts.latitude && bts.longitude ? (
									<Tap onPress={() => Linking.openURL(`https://www.google.com/maps?q=${bts.latitude},${bts.longitude}`)} style={[styles.line, { marginTop: 4 }]}>
										<MapPin size={14} color={colors.blue} /><T v="strong" color={colors.blue} style={{ fontSize: 13 }}>{tx(L.map)}</T><ExternalLink size={12} color={colors.blue} />
									</Tap>
								) : null}
							</View>
						) : null}
						{order.delivery_payment_method_display ? <Pill label={order.delivery_payment_method_display} style={{ alignSelf: 'flex-start', marginTop: 8 }} /> : null}
						{order.receipt_image ? <Button size="sm" variant="light" icon={Receipt} title={tx(L.receipt)} onPress={() => setReceipt(mediaUrl(order.receipt_image))} style={{ marginTop: 10 }} /> : null}

						{order.status === 'pending' ? (
							!rejecting[order.id] ? (
								<View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
									<Button style={{ flex: 1 }} size="sm" variant="light" icon={XCircle} title={tx(L.reject)} onPress={() => setRejecting((p) => ({ ...p, [order.id]: true }))} />
									<Button style={{ flex: 1.3 }} size="sm" variant="success" icon={CheckCircle} title={tx(L.accept)} loading={busy === `${order.id}:accepted`} onPress={() => update(order, 'accepted')} />
								</View>
							) : (
								<View style={{ gap: 8, marginTop: 12 }}>
									<TextArea rows={2} value={reasons[order.id] || ''} placeholder={tx(L.reason)} onChangeText={(v) => setReasons((p) => ({ ...p, [order.id]: v }))} />
									<View style={{ flexDirection: 'row', gap: 8 }}>
										<Button style={{ flex: 1 }} size="sm" variant="ghost" title={tx(L.cancel)} onPress={() => setRejecting((p) => ({ ...p, [order.id]: false }))} />
										<Button style={{ flex: 1.4 }} size="sm" variant="danger" title={tx(L.rejectConfirm)} loading={busy === `${order.id}:rejected`} onPress={() => update(order, 'rejected')} />
									</View>
								</View>
							)
						) : null}
						{order.status === 'accepted' ? <Button size="sm" variant="dark" icon={Truck} title={tx(L.toDelivering)} loading={busy === `${order.id}:delivering`} onPress={() => update(order, 'delivering')} style={{ marginTop: 12 }} /> : null}
						{order.status === 'delivering' ? <Button size="sm" variant="success" icon={PackageCheck} title={tx(L.toDelivered)} loading={busy === `${order.id}:delivered`} onPress={() => update(order, 'delivered')} style={{ marginTop: 12 }} /> : null}
					</Card>
				);
			})}

			<Modal visible={!!receipt} transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
				<Pressable style={styles.lightbox} onPress={() => setReceipt(null)}>
					{receipt ? <Image source={{ uri: receipt }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
					<View style={styles.close}><X size={22} color={colors.white} /></View>
				</Pressable>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	chipOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink2 },
	count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	countText: { fontFamily: fonts.extrabold, fontSize: 10.5, color: colors.ink2 },
	line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	box: { marginTop: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, gap: 2 },
	lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
	close: { position: 'absolute', top: 60, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
