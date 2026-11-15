import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BookOpen, Download, Minus, Package, Plus, Search, ShoppingBag, Trash2, Truck } from 'lucide-react-native';
import api, { mediaUrl } from '../api/client';
import E from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../components/layout';
import { Button, Card, EmptyState, Field, IconButton, Pill, Segmented, Sheet, SkeletonCard, T, Tap } from '../components/ui';
import { colors, fonts, radius } from '../theme';
import { formatMoney } from '../utils/format';
import { cart, useCart } from '../utils/cart';

const L = {
	title: { uz: "IRN kitoblar do'koni", ru: 'Книжный магазин IRN', en: 'IRN Book Shop' },
	subtitle: { uz: "Olimpiadaga tayyorlanish uchun foydali qo'llanmalar va kitoblar", ru: 'Полезные пособия и книги для подготовки к олимпиаде', en: 'Study guides and practice books to prepare for the Olympiad' },
	search: { uz: 'Kitoblarni qidirish...', ru: 'Поиск книг...', en: 'Search books...' },
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	free: { uz: 'Tekin', ru: 'Бесплатно', en: 'Free' },
	paid: { uz: 'Pullik', ru: 'Платно', en: 'Paid' },
	price: { uz: 'Narxi', ru: 'Цена', en: 'Price' },
	buy: { uz: 'Sotib olish (BTS)', ru: 'Купить (BTS)', en: 'Buy (BTS)' },
	download: { uz: 'Yuklab olish', ru: 'Скачать', en: 'Download' },
	added: { uz: "Kitob savatga qo'shildi", ru: 'Книга добавлена в корзину', en: 'Added to cart' },
	noBooks: { uz: 'Kitoblar topilmadi', ru: 'Книги не найдены', en: 'No books found' },
	tryFilters: { uz: "Qidiruv yoki filtrni o'zgartirib ko'ring", ru: 'Попробуйте изменить поиск или фильтр', en: 'Try changing the search or filter' },
	cart: { uz: 'Savat', ru: 'Корзина', en: 'Cart' },
	emptyCart: { uz: "Savatingiz bo'sh", ru: 'Ваша корзина пуста', en: 'Your cart is empty' },
	total: { uz: 'Jami', ru: 'Итого', en: 'Total' },
	checkout: { uz: 'Rasmiylashtirish', ru: 'Оформить заказ', en: 'Checkout' },
	myOrders: { uz: 'Buyurtmalarim', ru: 'Мои заказы', en: 'My orders' },
	loginFirst: { uz: 'Buyurtma berish uchun tizimga kiring', ru: 'Для оформления заказа войдите в аккаунт', en: 'Please log in to place an order' },
	login: { uz: "Kirish / Ro'yxatdan o'tish", ru: 'Войти в систему', en: 'Log in' },
	inStock: { uz: 'Omborda', ru: 'В наличии', en: 'In stock' },
	outOfStock: { uz: 'Tugagan', ru: 'Нет в наличии', en: 'Out of stock' },
	noFile: { uz: 'Fayl hali yuklanmagan', ru: 'Файл пока не загружен', en: 'The file is not available yet' },
};

const Cover = ({ book, title, height }) => {
	const [failed, setFailed] = useState(false);
	const src = mediaUrl(book.cover_image);
	if (!src || failed) {
		return (
			<View style={[styles.cover, styles.coverFallback, { height }]}>
				<T v="label" color={colors.gold} style={{ letterSpacing: 3 }}>IRN</T>
				<T v="strong" color="#fff" numberOfLines={3} style={{ textAlign: 'center', fontSize: 13, marginTop: 6 }}>{title}</T>
			</View>
		);
	}
	return <Image source={{ uri: src }} style={[styles.cover, { height }]} contentFit="cover" cachePolicy="memory-disk" transition={200} onError={() => setFailed(true)} />;
};

// Website /books: catalog with search and free/paid filter, book details, and a cart
// that leads to the BTS checkout. Free books are downloaded as PDF.
export default function BooksScreen() {
	const { tx, lang, pick } = useLanguage();
	const toast = useToast();
	const { isLoggedIn } = useAuth();
	const { items, count, total } = useCart();
	const [books, setBooks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState('');
	const [type, setType] = useState('all');
	const [selected, setSelected] = useState(null);
	const [cartOpen, setCartOpen] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await api.get(E.BOOKS, { params: { lang } });
			setBooks(Array.isArray(res.data) ? res.data : res.data?.results || []);
		} catch {}
		setLoading(false);
	}, [lang]);
	useEffect(() => { load(); }, [load]);

	const filtered = useMemo(() => {
		const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return books.filter((b) => {
			if (b.is_active === false) return false;
			if (type !== 'all' && b.book_type !== type) return false;
			if (!words.length) return true;
			const pool = [b.title_uz, b.title_ru, b.title_en, b.title, b.description_uz, b.description_ru, b.description_en, b.description, b.author, b.subject].filter(Boolean).join(' ').toLowerCase();
			return words.every((w) => pool.includes(w));
		});
	}, [books, query, type]);

	const addToCart = (book, open) => {
		cart.add(book);
		toast.success(tx(L.added));
		if (open) setCartOpen(true);
	};
	const download = (book) => {
		const url = mediaUrl(book.pdf_file);
		if (url) Linking.openURL(url).catch(() => {});
		else toast.info(tx(L.noFile));
	};

	const actions = (book, onDone) => {
		if (book.book_type !== 'paid') return <View style={{ flex: 1 }}><Button size="sm" variant="dark" icon={Download} title={tx(L.download)} onPress={() => download(book)} /></View>;
		const soldOut = book.stock !== null && book.stock !== undefined && Number(book.stock) <= 0;
		if (soldOut) return <View style={{ flex: 1 }}><Button size="sm" variant="light" title={tx(L.outOfStock)} disabled /></View>;
		return (
			<>
				<View style={{ flex: 1 }}><Button size="sm" icon={Truck} title={tx(L.buy)} onPress={() => { onDone?.(); addToCart(book, true); }} /></View>
				<Tap onPress={() => addToCart(book, false)} style={styles.bagBtn} accessibilityLabel={tx(L.cart)}><ShoppingBag size={17} color={colors.navyDeep} /></Tap>
			</>
		);
	};

	return (
		<>
			<Screen
				header={<StackHeader right={<IconButton icon={ShoppingBag} badge={count} onPress={() => setCartOpen(true)} />} />}
				onRefresh={load}
				contentStyle={count ? { paddingBottom: 120 } : null}
			>
				<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
				<Field icon={Search} value={query} onChangeText={setQuery} placeholder={tx(L.search)} autoCorrect={false} returnKeyType="search" />
				<Segmented style={{ marginTop: 12, marginBottom: 16 }} value={type} onChange={setType} options={[{ value: 'all', label: tx(L.all) }, { value: 'paid', label: tx(L.paid) }, { value: 'free', label: tx(L.free) }]} />

				{loading ? (
					<View style={{ gap: 14 }}><SkeletonCard /><SkeletonCard /></View>
				) : !filtered.length ? (
					<EmptyState icon={BookOpen} title={tx(L.noBooks)} text={tx(L.tryFilters)} />
				) : (
					filtered.map((book) => {
						const title = pick(book) || book.title;
						const paid = book.book_type === 'paid';
						return (
							<Card key={book.id} padded={false} style={{ marginBottom: 14, overflow: 'hidden' }}>
								<Tap onPress={() => setSelected(book)} scale={0.99} style={{ flexDirection: 'row' }}>
									<View style={{ width: 112 }}><Cover book={book} title={title} height={158} /></View>
									<View style={{ flex: 1, padding: 14, gap: 6 }}>
										<View style={{ flexDirection: 'row' }}><Pill label={tx(paid ? L.paid : L.free)} color={paid ? colors.amber : colors.green} bg={paid ? colors.goldTint : colors.greenSoft} /></View>
										<T v="h3" numberOfLines={2}>{title}</T>
										<T v="small" numberOfLines={3}>{pick(book, 'description') || book.description}</T>
									</View>
								</Tap>
								<View style={styles.cardFoot}>
									<View style={{ flexShrink: 1, minWidth: 92 }}>
										<T v="label" style={{ fontSize: 9.5 }}>{tx(L.price)}</T>
										<T style={styles.price} numberOfLines={1}>{paid ? `${formatMoney(book.price)} UZS` : tx(L.free)}</T>
									</View>
									<View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>{actions(book)}</View>
								</View>
							</Card>
						);
					})
				)}
			</Screen>

			{/* Floating cart bar */}
			{count ? (
				<View style={styles.cartBar} pointerEvents="box-none">
					<Tap onPress={() => setCartOpen(true)} style={styles.cartBarInner}>
						<View style={styles.cartCount}><T style={styles.cartCountText}>{count}</T></View>
						<T v="strong" color="#fff" style={{ flex: 1 }}>{tx(L.cart)}</T>
						<T style={[styles.price, { color: colors.gold }]}>{formatMoney(total)} UZS</T>
					</Tap>
				</View>
			) : null}

			{/* Book details */}
			<Sheet visible={!!selected} onClose={() => setSelected(null)} title="" scroll maxHeight="92%">
				{selected ? (
					<View style={{ gap: 12, paddingBottom: 8 }}>
						<View style={{ alignItems: 'center' }}><View style={{ width: 170, borderRadius: radius.lg, overflow: 'hidden' }}><Cover book={selected} title={pick(selected) || selected.title} height={240} /></View></View>
						<View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
							<Pill label={tx(selected.book_type === 'paid' ? L.paid : L.free)} color={selected.book_type === 'paid' ? colors.amber : colors.green} bg={selected.book_type === 'paid' ? colors.goldTint : colors.greenSoft} />
							{selected.book_type === 'paid' && selected.stock !== null && selected.stock !== undefined ? <Pill label={Number(selected.stock) > 0 ? `${tx(L.inStock)}: ${selected.stock}` : tx(L.outOfStock)} color={Number(selected.stock) > 0 ? colors.green : colors.red} bg={Number(selected.stock) > 0 ? colors.greenSoft : colors.redSoft} /> : null}
						</View>
						<T v="h2">{pick(selected) || selected.title}</T>
						<T v="body">{pick(selected, 'description') || selected.description}</T>
						<View style={[styles.cardFoot, { paddingHorizontal: 0, borderTopWidth: 1 }]}>
							<View style={{ flexShrink: 1, minWidth: 92 }}>
								<T v="label" style={{ fontSize: 9.5 }}>{tx(L.price)}</T>
								<T style={styles.price} numberOfLines={1}>{selected.book_type === 'paid' ? `${formatMoney(selected.price)} UZS` : tx(L.free)}</T>
							</View>
							<View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>{actions(selected, () => setSelected(null))}</View>
						</View>
					</View>
				) : null}
			</Sheet>

			{/* Cart */}
			<Sheet visible={cartOpen} onClose={() => setCartOpen(false)} title={tx(L.cart)} maxHeight="88%">
				{!items.length ? (
					<View style={{ gap: 12, paddingBottom: 8 }}>
						<EmptyState icon={ShoppingBag} title={tx(L.emptyCart)} />
						{isLoggedIn ? <Button size="md" variant="light" icon={Package} title={tx(L.myOrders)} onPress={() => { setCartOpen(false); router.push('/orders'); }} /> : null}
					</View>
				) : (
					<View style={{ gap: 12, paddingBottom: 8 }}>
						<ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
							{items.map(({ book, quantity }) => (
								<View key={book.id} style={styles.cartRow}>
									<View style={{ flex: 1, gap: 2 }}>
										<T v="strong" numberOfLines={2} style={{ fontSize: 14 }}>{pick(book) || book.title}</T>
										<T v="small" style={{ fontFamily: fonts.bold, color: colors.amber }}>{formatMoney(book.price)} UZS</T>
									</View>
									<View style={styles.qty}>
										<Tap onPress={() => cart.setQuantity(book.id, quantity - 1)} disabled={quantity <= 1} style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.4 }]}><Minus size={14} color={colors.ink} /></Tap>
										<T v="strong" style={{ minWidth: 22, textAlign: 'center' }}>{quantity}</T>
										<Tap onPress={() => cart.setQuantity(book.id, quantity + 1)} style={styles.qtyBtn}><Plus size={14} color={colors.ink} /></Tap>
									</View>
									<Tap onPress={() => cart.remove(book.id)} style={[styles.qtyBtn, { backgroundColor: colors.redSoft }]}><Trash2 size={14} color={colors.red} /></Tap>
								</View>
							))}
						</ScrollView>
						<View style={styles.totalRow}>
							<T v="strong" style={{ flex: 1 }}>{tx(L.total)}</T>
							<T style={[styles.price, { fontSize: 20 }]}>{formatMoney(total)} UZS</T>
						</View>
						{isLoggedIn ? (
							<Button icon={Truck} title={tx(L.checkout)} onPress={() => { setCartOpen(false); router.push('/checkout'); }} />
						) : (
							<>
								<T v="small" style={{ textAlign: 'center' }}>{tx(L.loginFirst)}</T>
								<Button variant="dark" title={tx(L.login)} onPress={() => { setCartOpen(false); router.push('/login'); }} />
							</>
						)}
					</View>
				)}
			</Sheet>
		</>
	);
}

const styles = StyleSheet.create({
	cover: { width: '100%', backgroundColor: colors.cardMuted },
	coverFallback: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 10 },
	cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line },
	price: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
	bagBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldTint, borderWidth: 1.5, borderColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
	cartBar: { position: 'absolute', left: 16, right: 16, bottom: 26 },
	cartBarInner: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 60, paddingHorizontal: 16, borderRadius: 30, backgroundColor: colors.navyDeep },
	cartCount: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	cartCountText: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.navyDeep },
	cartRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	qty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	totalRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
});
