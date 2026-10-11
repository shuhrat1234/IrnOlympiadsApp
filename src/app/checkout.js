import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { AlertCircle, Check, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, ImagePlus, MapPin, Navigation, Search, X } from 'lucide-react-native';
import api, { fetchAllPages } from '../api/client';
import E from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader } from '../components/layout';
import { Button, Card, EmptyState, Field, IconBadge, Pill, SelectField, T, Tap } from '../components/ui';
import { TextArea } from '../components/form';
import { pickImage } from '../components/support';
import { colors, fonts, radius } from '../theme';
import { formatMoney } from '../utils/format';
import { cart, useCart } from '../utils/cart';

// Same requisites as the website's CartDrawer.
const PAYMENT_CARD_NUMBER = '5614 6821 1094 2531';
const PAYMENT_CARD_HOLDER = 'Botirova Mohinur';
const BTS_DELIVERY_FEE = 50000;
const MAX_POINTS = 40;

const L = {
	title: { uz: 'Buyurtmani rasmiylashtirish', ru: 'Оформление заказа', en: 'Order checkout' },
	emptyCart: { uz: "Savatingiz bo'sh", ru: 'Ваша корзина пуста', en: 'Your cart is empty' },
	toShop: { uz: "Do'konga qaytish", ru: 'Вернуться в магазин', en: 'Back to the shop' },
	order: { uz: 'Buyurtma', ru: 'Ваш заказ', en: 'Your order' },
	address: { uz: "Yetkazib berish manzili (uy / ko'cha)", ru: 'Точный адрес получателя', en: 'Delivery address' },
	addressPh: { uz: "Tuman, ko'cha, uy raqami", ru: 'Город/район, улица, номер дома/квартиры', en: 'District, street, building number' },
	bts: { uz: 'BTS topshirish punkti', ru: 'Пункт выдачи BTS', en: 'BTS pickup point' },
	btsSelected: { uz: 'Tanlandi', ru: 'Выбран', en: 'Selected' },
	btsSearch: { uz: "Nom yoki manzil bo'yicha qidirish...", ru: 'Поиск по названию или адресу...', en: 'Search by name or address...' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	allRegions: { uz: 'Barcha viloyatlar', ru: 'Все регионы', en: 'All regions' },
	btsEmpty: { uz: 'Punktlar topilmadi', ru: 'Пункты не найдены', en: 'No pickup points found' },
	btsMore: { uz: "Yana {n} ta punkt — qidiruvni aniqlashtiring", ru: 'Ещё {n} пунктов — уточните поиск', en: '{n} more points — refine the search' },
	map: { uz: 'Xaritada', ru: 'На карте', en: 'Map' },
	deliveryNotice: {
		uz: "Yetkazib berish muddati hududga bog'liq va odatda 2 dan 5 ish kunigacha davom etadi. Bayram va dam olish kunlarida yetkazib berish muddati oshishi mumkin.",
		ru: 'Срок доставки зависит от региона и обычно составляет от 2 до 5 рабочих дней. В праздничные и выходные дни срок доставки может увеличиться.',
		en: 'Delivery time depends on the region and usually takes 2 to 5 business days. During holidays and weekends, delivery may take longer.',
	},
	payMethod: { uz: "Yetkazib berish to'lovi usuli", ru: 'Способ оплаты доставки BTS', en: 'Delivery payment method' },
	prepaid: { uz: "BTS yetkazib berishni hoziroq to'lash", ru: 'Оплатить доставку BTS сразу', en: 'Pay BTS delivery now' },
	prepaidDesc: { uz: "Yetkazib berish summasi buyurtma bilan birga to'lanadi", ru: 'Стоимость доставки оплачивается вместе с заказом', en: 'Delivery is paid together with the order' },
	prepaidBadge: { uz: "+50 000 so'm", ru: '+50 000 сум', en: '+50,000 UZS' },
	onDelivery: { uz: "Olganda / BTS orqali o'zim to'layman", ru: 'Оплачу доставку при получении / через BTS', en: 'Pay delivery yourself upon receipt / via BTS' },
	onDeliveryDesc: { uz: "Yetkazib berish uchun to'lov posilkani BTS punktida olayotganda to'lanadi", ru: 'Оплата доставки при получении посылки в отделении BTS', en: 'Pay for delivery when picking up the parcel at BTS' },
	onDeliveryBadge: { uz: "Olganda to'lanadi", ru: 'При получении', en: 'Pay on receipt' },
	payInfo: { uz: "Kitoblar uchun to'lov rekvizitlari", ru: 'Реквизиты для оплаты заказа', en: 'Payment details' },
	cardHolder: { uz: 'Karta egasi', ru: 'Получатель', en: 'Cardholder' },
	transfer: { uz: "O'tkazma summasi", ru: 'Сумма к переводу', en: 'Transfer amount' },
	copied: { uz: 'Karta raqami nusxalandi', ru: 'Номер карты скопирован', en: 'Card number copied' },
	receipt: { uz: "To'lov cheki (skrinshot)", ru: 'Чек об оплате (скриншот или фото)', en: 'Payment receipt (screenshot)' },
	receiptHint: { uz: "To'lovni amalga oshirgach, chek rasmini yuklang", ru: 'Прикрепите скриншот подтверждения перевода', en: 'Upload a payment receipt photo' },
	booksTotal: { uz: 'Kitoblar summasi', ru: 'Стоимость книг', en: 'Books subtotal' },
	deliveryFee: { uz: 'BTS yetkazib berish', ru: 'Доставка BTS', en: 'BTS delivery' },
	total: { uz: 'Jami', ru: 'Итого к оплате', en: 'Total' },
	submit: { uz: 'Buyurtmani tasdiqlash', ru: 'Подтвердить заказ', en: 'Place order' },
	needAddress: { uz: 'Iltimos, manzilingizni kiriting', ru: 'Пожалуйста, введите адрес доставки', en: 'Please enter your delivery address' },
	needBts: { uz: 'Iltimos, BTS topshirish punktini tanlang', ru: 'Пожалуйста, выберите пункт выдачи BTS', en: 'Please choose a BTS pickup point' },
	needReceipt: { uz: "Iltimos, to'lov chekini yuklang", ru: 'Пожалуйста, прикрепите чек оплаты', en: 'Please upload the payment receipt' },
	failed: { uz: "Buyurtmani rasmiylashtirishda xatolik. Qayta urinib ko'ring.", ru: 'Ошибка при оформлении заказа. Попробуйте ещё раз.', en: 'Could not place the order. Please try again.' },
	photoDenied: { uz: 'Galereyaga ruxsat berilmagan', ru: 'Нет доступа к галерее', en: 'Photo library access was denied' },
	doneTitle: { uz: 'Buyurtma qabul qilindi!', ru: 'Заказ успешно оформлен!', en: 'Order placed successfully!' },
	doneText: {
		uz: "Buyurtmangiz tizimga kiritildi. Administrator to'lovni tekshirib, BTS orqali jo'natish holatini yangilaydi.",
		ru: 'Заказ принят! Администратор проверит оплату и передаст заказ в выбранный пункт BTS. Статус можно отслеживать в разделе «Заказы книг».',
		en: 'Your order has been received. Our manager will verify the payment and dispatch it to the BTS branch.',
	},
	myOrders: { uz: 'Buyurtmalarim', ru: 'Мои заказы', en: 'My orders' },
};

// BTS pickup points: region filter + search over the full (paginated) list.
const BtsPointPicker = ({ value, onChange }) => {
	const { tx, pick } = useLanguage();
	const { regions } = useAuth();
	const [points, setPoints] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [region, setRegion] = useState('all');

	useEffect(() => {
		let alive = true;
		fetchAllPages(E.BTS_POINTS, { page_size: 100 })
			.then((list) => alive && setPoints(list.filter((p) => p.is_active !== false)))
			.catch(() => {})
			.finally(() => alive && setLoading(false));
		return () => { alive = false; };
	}, []);

	const regionOptions = useMemo(() => {
		const ids = [...new Set(points.map((p) => p.region).filter(Boolean))];
		const named = ids.map((id) => {
			const r = regions.find((x) => Number(x.id) === Number(id));
			return { value: String(id), label: (r && pick(r, 'name')) || points.find((p) => p.region === id)?.region_name || String(id) };
		});
		return [{ value: 'all', label: tx(L.allRegions) }, ...named.sort((a, b) => a.label.localeCompare(b.label))];
	}, [points, regions, pick, tx]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return points.filter((p) => (region === 'all' || String(p.region) === region) && (!q || `${p.name || ''} ${p.address || ''}`.toLowerCase().includes(q)));
	}, [points, region, search]);
	const selected = points.find((p) => String(p.id) === String(value));
	const shown = filtered.slice(0, MAX_POINTS);

	return (
		<Card style={{ gap: 10 }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<Navigation size={16} color={colors.amber} />
				<T v="h3" style={{ flex: 1 }}>{tx(L.bts)}</T>
				{selected ? <Pill icon={Check} label={tx(L.btsSelected)} color={colors.green} bg={colors.greenSoft} /> : null}
			</View>
			{selected ? (
				<View style={[styles.point, styles.pointOn]}>
					<View style={{ flex: 1 }}>
						<T v="strong" style={{ fontSize: 13.5 }}>{selected.name}</T>
						<T v="small" style={{ fontSize: 12 }}>{selected.address}</T>
					</View>
					<Tap onPress={() => onChange(null)} style={styles.clear}><X size={14} color={colors.ink2} /></Tap>
				</View>
			) : null}
			<SelectField icon={MapPin} title={tx(L.region)} value={region} options={regionOptions} onChange={setRegion} />
			<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.btsSearch)} autoCorrect={false} autoCapitalize="none" />
			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 12 }} /> : !filtered.length ? <T v="small" style={{ textAlign: 'center' }}>{tx(L.btsEmpty)}</T> : (
				<View style={{ gap: 6 }}>
					{shown.map((p) => {
						const on = String(p.id) === String(value);
						return (
							<Tap key={p.id} onPress={() => onChange(p.id)} scale={0.99} style={[styles.point, on && styles.pointOn]}>
								<View style={{ flex: 1 }}>
									<T v="strong" style={{ fontSize: 13.5 }}>{p.name}</T>
									<T v="small" style={{ fontSize: 12 }}>{p.address}</T>
								</View>
								{p.latitude && p.longitude ? (
									<Tap onPress={() => Linking.openURL(`https://yandex.uz/maps/?pt=${p.longitude},${p.latitude}&z=16&l=map`).catch(() => {})} hitSlop={6} style={styles.clear} accessibilityLabel={tx(L.map)}>
										<ExternalLink size={13} color={colors.blue} />
									</Tap>
								) : null}
								{on ? <Check size={16} color={colors.green} /> : null}
							</Tap>
						);
					})}
					{filtered.length > shown.length ? <T v="small" style={{ textAlign: 'center', fontSize: 12 }}>{tx(L.btsMore).replace('{n}', filtered.length - shown.length)}</T> : null}
				</View>
			)}
		</Card>
	);
};

// Website CartDrawer checkout: address + BTS point + delivery payment + card transfer receipt.
export default function CheckoutScreen() {
	const { tx, pick } = useLanguage();
	const toast = useToast();
	const { items, total } = useCart();
	const [address, setAddress] = useState('');
	const [btsPoint, setBtsPoint] = useState(null);
	const [delivery, setDelivery] = useState('prepaid');
	const [receipt, setReceipt] = useState(null);
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);

	const fee = delivery === 'prepaid' ? BTS_DELIVERY_FEE : 0;
	const finalTotal = total + fee;

	const attach = async () => {
		try {
			const img = await pickImage();
			if (img) setReceipt(img);
		} catch {
			toast.error(tx(L.photoDenied));
		}
	};

	const submit = async () => {
		const problem = !address.trim() ? L.needAddress : !btsPoint ? L.needBts : !receipt ? L.needReceipt : null;
		if (problem) {
			setError(tx(problem));
			toast.error(tx(problem));
			return;
		}
		setError('');
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('items', JSON.stringify(items.map((i) => ({ book: i.book.id, amount: i.quantity }))));
			fd.append('delivery_address', address.trim());
			fd.append('bts_point', String(btsPoint));
			fd.append('delivery_payment_method', delivery);
			fd.append('receipt_image', { uri: receipt.uri, name: receipt.name || 'receipt.jpg', type: receipt.mimeType || 'image/jpeg' });
			await api.post(E.BOOK_ORDERS_CHECKOUT, fd);
			cart.clear();
			setDone(true);
		} catch (err) {
			const d = err.response?.data;
			const msg = d?.error || (d?.items ? JSON.stringify(d.items) : null) || d?.detail || tx(L.failed);
			setError(msg);
			toast.error(msg);
		}
		setSubmitting(false);
	};

	if (done) {
		return (
			<Screen header={<StackHeader onBack={() => router.replace('/books')} />}>
				<View style={{ alignItems: 'center', gap: 10, marginTop: 30 }}>
					<IconBadge icon={CheckCircle2} color={colors.green} bg={colors.greenSoft} size={84} />
					<T v="h1" style={{ textAlign: 'center' }}>{tx(L.doneTitle)}</T>
					<T v="body" style={{ textAlign: 'center' }}>{tx(L.doneText)}</T>
				</View>
				<View style={{ gap: 10, marginTop: 26 }}>
					<Button title={tx(L.myOrders)} onPress={() => router.replace('/orders')} />
					<Button title={tx(L.toShop)} variant="light" onPress={() => router.replace('/books')} />
				</View>
			</Screen>
		);
	}

	if (!items.length) {
		return (
			<Screen header={<StackHeader title={tx(L.title)} />}>
				<EmptyState icon={CreditCard} title={tx(L.emptyCart)} action={<Button title={tx(L.toShop)} variant="dark" onPress={() => router.replace('/books')} />} />
			</Screen>
		);
	}

	return (
		<Screen header={<StackHeader title={tx(L.title)} />} keyboard>
			<Card style={{ gap: 8 }}>
				<T v="label">{tx(L.order)}</T>
				{items.map(({ book, quantity }) => (
					<View key={book.id} style={styles.line}>
						<T v="small" style={{ flex: 1, color: colors.ink2 }} numberOfLines={2}>{pick(book) || book.title}</T>
						<T v="strong" style={{ fontSize: 13 }}>{quantity} × {formatMoney(book.price)}</T>
					</View>
				))}
			</Card>

			<View style={{ marginTop: 14 }}>
				<TextArea rows={2} label={tx(L.address)} value={address} onChangeText={setAddress} placeholder={tx(L.addressPh)} />
			</View>

			<View style={{ marginTop: 14 }}><BtsPointPicker value={btsPoint} onChange={setBtsPoint} /></View>

			<View style={styles.notice}>
				<Clock size={16} color={colors.blue} />
				<T v="small" style={{ flex: 1, color: colors.ink2 }}>{tx(L.deliveryNotice)}</T>
			</View>

			<T v="h3" style={{ marginTop: 18, marginBottom: 10 }}>{tx(L.payMethod)}</T>
			<View style={{ gap: 8 }}>
				{[['prepaid', L.prepaid, L.prepaidDesc, L.prepaidBadge], ['on_delivery', L.onDelivery, L.onDeliveryDesc, null]].map(([value, title, desc, badge]) => {
					const on = delivery === value;
					return (
						<Tap key={value} onPress={() => setDelivery(value)} scale={0.99} style={[styles.option, on && styles.optionOn]}>
							<View style={[styles.radio, on && { borderColor: colors.goldDeep }]}>{on ? <View style={styles.radioDot} /> : null}</View>
							<View style={{ flex: 1, gap: 3 }}>
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
									<T v="strong" style={{ fontSize: 14, flexShrink: 1 }}>{tx(title)}</T>
									{badge ? <Pill label={tx(badge)} color={colors.amber} bg={colors.goldTint} /> : null}
								</View>
								<T v="small" style={{ fontSize: 12 }}>{tx(desc)}</T>
							</View>
						</Tap>
					);
				})}
			</View>

			<Card style={{ marginTop: 16, backgroundColor: colors.navyDeep, borderColor: colors.navyDeep, gap: 6 }}>
				<T v="label" color="rgba(255,255,255,0.6)">{tx(L.payInfo)}</T>
				<Tap onPress={async () => { await Clipboard.setStringAsync(PAYMENT_CARD_NUMBER.replace(/\s/g, '')); toast.success(tx(L.copied)); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
					<T style={styles.cardNumber}>{PAYMENT_CARD_NUMBER}</T>
					<Copy size={16} color={colors.gold} />
				</Tap>
				<T v="small" color="rgba(255,255,255,0.7)">{tx(L.cardHolder)}: <T v="small" color="#fff" style={{ fontFamily: fonts.bold }}>{PAYMENT_CARD_HOLDER}</T></T>
				<View style={[styles.line, { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }]}>
					<T v="small" color="rgba(255,255,255,0.7)" style={{ flex: 1 }}>{tx(L.transfer)}:</T>
					<T style={[styles.cardNumber, { fontSize: 18, color: colors.gold }]}>{formatMoney(finalTotal)} UZS</T>
				</View>
			</Card>

			<T v="label" style={{ marginTop: 16, marginBottom: 8, marginLeft: 4 }}>{tx(L.receipt)}</T>
			<Tap onPress={attach} style={styles.receipt}>
				{receipt ? <Image source={{ uri: receipt.uri }} style={{ width: 52, height: 52, borderRadius: 12 }} /> : <IconBadge icon={ImagePlus} size={52} />}
				<T v="small" style={{ flex: 1, color: receipt ? colors.ink : colors.muted }} numberOfLines={2}>{receipt ? receipt.name : tx(L.receiptHint)}</T>
				{receipt ? <Tap onPress={() => setReceipt(null)} style={styles.clear}><X size={14} color={colors.ink2} /></Tap> : null}
			</Tap>

			{error ? (
				<View style={styles.error}>
					<AlertCircle size={16} color={colors.red} />
					<T v="small" color={colors.red} style={{ flex: 1, fontFamily: fonts.bold }}>{error}</T>
				</View>
			) : null}

			<Card style={{ marginTop: 16, gap: 8 }}>
				<View style={styles.line}><T v="small" style={{ flex: 1 }}>{tx(L.booksTotal)}</T><T v="strong">{formatMoney(total)} UZS</T></View>
				<View style={styles.line}><T v="small" style={{ flex: 1 }}>{tx(L.deliveryFee)}</T><T v="strong" color={fee ? colors.ink : colors.amber}>{fee ? `+${formatMoney(fee)} UZS` : tx(L.onDeliveryBadge)}</T></View>
				<View style={[styles.line, { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }]}><T v="strong" style={{ flex: 1 }}>{tx(L.total)}</T><T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink }}>{formatMoney(finalTotal)} UZS</T></View>
			</Card>
			<Button title={tx(L.submit)} icon={Check} loading={submitting} onPress={submit} style={{ marginTop: 14 }} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	point: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	pointOn: { borderColor: colors.green, backgroundColor: colors.greenSoft },
	clear: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.blueSoft },
	option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
	optionOn: { borderColor: colors.goldDeep, backgroundColor: '#FFFCF1' },
	radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.goldDeep },
	cardNumber: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.white, letterSpacing: 1 },
	receipt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, backgroundColor: colors.white },
	error: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.redSoft },
});
