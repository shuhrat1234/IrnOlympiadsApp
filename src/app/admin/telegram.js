import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Check, ChevronLeft, ChevronRight, Filter, ImageIcon, Link2, Plus, RefreshCw, Search, Send, Users, Video, X } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { useAdmin } from '../../context/AdminContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, Field, IconButton, Pill, Segmented, Sheet, T, Tap } from '../../components/ui';
import { ChipsSelect, ChoicePills, FormSection, TextArea } from '../../components/form';
import { BookOrdersList } from '../../components/admin/BookOrders';
import { colors, fonts, radius } from '../../theme';

const TEXT_MESSAGE_LIMIT = 4096;
const MEDIA_CAPTION_LIMIT = 1024;
const USERS_PAGE_SIZE = 20;
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const L = {
	title: { uz: 'Telegram Bot', ru: 'Telegram Бот', en: 'Telegram Bot' },
	subtitle: { uz: 'Buyurtmalar, foydalanuvchilar va xabarlar boshqaruvi', ru: 'Управление заказами, пользователями и рассылками', en: 'Orders, users and broadcasts' },
	tabOrders: { uz: 'Buyurtmalar', ru: 'Заказы', en: 'Orders' },
	tabUsers: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' },
	tabBroadcast: { uz: 'Xabar', ru: 'Рассылка', en: 'Broadcast' },
	broadcastLabel: { uz: 'Telegram orqali ommaviy xabar', ru: 'Рассылка через Telegram', en: 'Telegram broadcast' },
	broadcastPlaceholder: { uz: 'Matnni kiriting (HTML: <b>matn</b>, <i>matn</i>)...', ru: 'Введите сообщение (HTML: <b>текст</b>, <i>текст</i>)...', en: 'Enter a message (HTML: <b>text</b>, <i>text</i>)...' },
	broadcastWarning: { uz: 'Diqqat! Xabar quyida tanlangan qabul qiluvchilarga yuboriladi.', ru: 'Внимание! Сообщение будет отправлено получателям, выбранным ниже.', en: 'Attention! The message goes to the recipients selected below.' },
	broadcastSend: { uz: 'Xabarni yuborish', ru: 'Начать рассылку', en: 'Send broadcast' },
	broadcastSuccess: { uz: 'Xabar muvaffaqiyatli yuborildi!', ru: 'Рассылка успешно завершена!', en: 'Broadcast sent!' },
	broadcastLength: { uz: 'Belgilar', ru: 'Символов', en: 'Characters' },
	captionSplit: { uz: 'Matn uzun — media va matn alohida yuboriladi', ru: 'Текст длинный — медиа и текст будут отправлены отдельно', en: 'Long text — media and text will be sent separately' },
	imageLabel: { uz: 'Rasm (ixtiyoriy)', ru: 'Изображение (необязательно)', en: 'Image (optional)' },
	addImage: { uz: 'Rasm biriktirish', ru: 'Прикрепить изображение', en: 'Attach image' },
	videoLabel: { uz: 'Video (ixtiyoriy)', ru: 'Видео (необязательно)', en: 'Video (optional)' },
	addVideo: { uz: 'Video biriktirish', ru: 'Прикрепить видео', en: 'Attach video' },
	buttonsLabel: { uz: 'Havola tugmalari', ru: 'Кнопки-ссылки', en: 'Link buttons' },
	addButton: { uz: "Tugma qo'shish", ru: 'Добавить кнопку', en: 'Add button' },
	buttonText: { uz: 'Tugma matni', ru: 'Текст кнопки', en: 'Button text' },
	recipients: { uz: 'Qabul qiluvchilar', ru: 'Получатели', en: 'Recipients' },
	onlyBot: { uz: 'Faqat Telegram bot foydalanuvchilari', ru: 'Только пользователи Telegram-бота', en: 'Telegram bot users only' },
	willSend: { uz: 'Yuboriladi', ru: 'Будет отправлено', en: 'Will be sent' },
	uniqueTg: { uz: 'noyob Telegram hisob', ru: 'уникальных Telegram', en: 'unique Telegram' },
	clearSelection: { uz: 'Tozalash', ru: 'Очистить', en: 'Clear' },
	selectAllMatching: { uz: 'Filtrga mos hammasini tanlash', ru: 'Выбрать всех по фильтру', en: 'Select all matching' },
	noMatch: { uz: 'Filtrga mos foydalanuvchilar topilmadi', ru: 'Нет пользователей по фильтру', en: 'No users match the filter' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	olympiad: { uz: 'Olimpiada', ru: 'Олимпиада', en: 'Olympiad' },
	payment: { uz: "To'lov", ru: 'Оплата', en: 'Payment' },
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	paid: { uz: "To'langan", ru: 'Оплачено', en: 'Paid' },
	pending: { uz: 'Kutilmoqda', ru: 'В ожидании', en: 'Pending' },
	notPaid: { uz: "To'lanmagan", ru: 'Не оплачено', en: 'Not paid' },
	filters: { uz: 'Filtrlar', ru: 'Фильтры', en: 'Filters' },
	apply: { uz: "Qo'llash", ru: 'Применить', en: 'Apply' },
	reset: { uz: 'Tozalash', ru: 'Сбросить', en: 'Reset' },
	usersSearch: { uz: 'Foydalanuvchilarni qidirish...', ru: 'Поиск пользователей...', en: 'Search users...' },
	usersTotal: { uz: 'Jami', ru: 'Всего', en: 'Total' },
	noUsers: { uz: 'Botga ulangan foydalanuvchilar topilmadi', ru: 'Пользователи бота не найдены', en: 'No bot users found' },
	page: { uz: 'Sahifa', ru: 'Страница', en: 'Page' },
	roles: { superadmin: { uz: 'Superadmin', ru: 'Супер админ', en: 'Superadmin' }, admin: { uz: 'Admin', ru: 'Админ', en: 'Admin' }, coordinator: { uz: 'Koordinator', ru: 'Координатор', en: 'Coordinator' }, teacher: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' }, participant: { uz: 'Ishtirokchi', ru: 'Участник', en: 'Participant' } },
	loadErr: { uz: "Foydalanuvchilarni yuklab bo'lmadi", ru: 'Не удалось загрузить пользователей', en: 'Failed to load users' },
	ordersErr: { uz: "Buyurtmalarni yuklab bo'lmadi", ru: 'Не удалось загрузить заказы', en: 'Failed to load orders' },
	needContent: { uz: 'Xabar matnini kiriting yoki media biriktiring', ru: 'Введите текст или прикрепите медиафайл', en: 'Enter text or attach media' },
	needRecipient: { uz: 'Kamida bitta qabul qiluvchini tanlang', ru: 'Выберите хотя бы одного получателя', en: 'Select at least one recipient' },
	sendErr: { uz: 'Xabar yuborishda xatolik', ru: 'Ошибка при отправке рассылки', en: 'Broadcast failed' },
	videoTooBig: { uz: 'Video hajmi 50 MB dan oshmasligi kerak', ru: 'Размер видео не должен превышать 50 МБ', en: 'Video must be under 50 MB' },
	loadingUsers: { uz: 'Foydalanuvchilar yuklanmoqda', ru: 'Загрузка пользователей', en: 'Loading users' },
};

const FORMAT = [
	{ label: 'B', before: '<b>', after: '</b>', style: { fontFamily: fonts.extrabold } },
	{ label: 'I', before: '<i>', after: '</i>', style: { fontStyle: 'italic' } },
	{ label: 'U', before: '<u>', after: '</u>', style: { textDecorationLine: 'underline' } },
	{ label: 'S', before: '<s>', after: '</s>', style: { textDecorationLine: 'line-through' } },
	{ label: '</>', before: '<code>', after: '</code>' },
	{ label: '🔗', before: "<a href='https://irn.uz'>", after: '</a>' },
	{ label: '▒', before: '<tg-spoiler>', after: '</tg-spoiler>' },
];

const payMatches = (r, f) => {
	if (f === 'paid') return r.payment_status === 'paid' || r.payment_status === 'free';
	if (f === 'pending') return r.payment_status === 'pending';
	if (f === 'not_paid') return r.payment_status !== 'paid' && r.payment_status !== 'free' && r.payment_status !== 'pending';
	return true;
};

export default function TelegramManager() {
	const { tx, pick } = useLanguage();
	const { regions } = useAuth();
	const { olympiads } = useOlympiad();
	const { refreshCounts, pendingBookOrders } = useAdmin();
	const toast = useToast();
	const [tab, setTab] = useState('orders');

	// orders
	const [orders, setOrders] = useState([]);
	const [ordersLoading, setOrdersLoading] = useState(false);
	const [ordersFilter, setOrdersFilter] = useState('all');

	// users table
	const [botUsers, setBotUsers] = useState([]);
	const [botUsersCount, setBotUsersCount] = useState(0);
	const [userSearch, setUserSearch] = useState('');
	const [usersPage, setUsersPage] = useState(1);
	const [usersLoading, setUsersLoading] = useState(false);

	// broadcast
	const [message, setMessage] = useState('');
	const [selection, setSelection] = useState({ start: 0, end: 0 });
	const [image, setImage] = useState(null);
	const [video, setVideo] = useState(null);
	const [buttons, setButtons] = useState([]);
	const [sending, setSending] = useState(false);
	const [allBotUsers, setAllBotUsers] = useState([]);
	const [allLoading, setAllLoading] = useState(false);
	const [bSearch, setBSearch] = useState('');
	const [regionF, setRegionF] = useState([]);
	const [gradeF, setGradeF] = useState([]);
	const [olyF, setOlyF] = useState([]);
	const [payF, setPayF] = useState('all');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState([]);
	const [selectAll, setSelectAll] = useState(false);
	const [visibleCount, setVisibleCount] = useState(60);

	const fetchOrders = useCallback(async () => {
		setOrdersLoading(true);
		try {
			const res = await api.get(E.BOOK_ORDERS);
			setOrders(res.data.results || res.data);
		} catch {
			toast.error(tx(L.ordersErr));
		}
		setOrdersLoading(false);
	}, []);

	const fetchBotUsers = useCallback(async (page, search) => {
		setUsersLoading(true);
		try {
			const res = await api.get(E.TELEGRAM_USERS, { params: { page, page_size: USERS_PAGE_SIZE, search: search || undefined } });
			if (Array.isArray(res.data)) {
				setBotUsers(res.data);
				setBotUsersCount(res.data.length);
			} else {
				setBotUsers(res.data.results || []);
				setBotUsersCount(typeof res.data.count === 'number' ? res.data.count : (res.data.results || []).length);
			}
		} catch {
			toast.error(tx(L.loadErr));
		}
		setUsersLoading(false);
	}, []);

	const fetchAllBotUsers = useCallback(async (force = false) => {
		if ((!force && allBotUsers.length) || allLoading) return;
		setAllLoading(true);
		try {
			let all = [];
			for (let page = 1; page <= 50; page++) {
				const res = await api.get(E.TELEGRAM_USERS, { params: { page, page_size: 100, picker: 'true' }, timeout: 25000 });
				if (Array.isArray(res.data)) { all = res.data; break; }
				const batch = res.data?.results || [];
				if (!batch.length) break;
				all = [...all, ...batch];
				setAllBotUsers([...all]);
				if (!res.data?.next || (typeof res.data.count === 'number' && all.length >= res.data.count)) break;
			}
			setAllBotUsers(all);
		} catch {
			toast.error(tx(L.loadErr));
		}
		setAllLoading(false);
	}, [allBotUsers.length, allLoading]);

	useEffect(() => {
		if (tab === 'orders') fetchOrders();
		else if (tab === 'broadcast') fetchAllBotUsers();
	}, [tab]);

	useEffect(() => { setUsersPage(1); }, [userSearch]);
	useEffect(() => {
		if (tab !== 'users') return;
		const t = setTimeout(() => fetchBotUsers(usersPage, userSearch), 300);
		return () => clearTimeout(t);
	}, [tab, usersPage, userSearch, fetchBotUsers]);

	const filtered = useMemo(() => {
		const q = bSearch.toLowerCase();
		return allBotUsers.filter((u) => {
			const mSearch = !q || `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q) || u.participant_id?.toLowerCase().includes(q);
			const mRegion = !regionF.length || regionF.includes(String(u.region));
			const mGrade = !gradeF.length || gradeF.includes(String(u.grade));
			const mOly = !olyF.length || (u.registrations || []).some((r) => olyF.includes(String(r.olympiad_id || r.olympiad?.id || r.olympiad || '')));
			const mPay = payF === 'all' || (u.registrations || []).some((r) => payMatches(r, payF));
			return mSearch && mRegion && mGrade && mOly && mPay;
		});
	}, [allBotUsers, bSearch, regionF, gradeF, olyF, payF]);

	useEffect(() => {
		if (!selectAll) return;
		const seen = new Set();
		const ids = [];
		filtered.forEach((u) => {
			if (u.telegram_chat_id) {
				if (!seen.has(u.telegram_chat_id)) { seen.add(u.telegram_chat_id); ids.push(u.id); }
			} else ids.push(u.id);
		});
		setSelectedIds(ids);
	}, [selectAll, filtered]);

	const byId = useMemo(() => new Map(allBotUsers.map((u) => [u.id, u])), [allBotUsers]);
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
	const uniqueChats = useMemo(() => new Set(selectedIds.map((id) => byId.get(id)?.telegram_chat_id || `user_${id}`)).size, [selectedIds, byId]);

	const toggleUser = (id) => {
		setSelectAll(false);
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
	};
	const clearSelection = () => { setSelectAll(false); setSelectedIds([]); };

	const insertFormat = ({ before, after }) => {
		const { start, end } = selection;
		const selected = message.slice(start, end) || 'text';
		setMessage(message.slice(0, start) + before + selected + after + message.slice(end));
	};

	const chooseImage = async () => {
		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) return;
		const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
		if (res.canceled || !res.assets?.length) return;
		const a = res.assets[0];
		setVideo(null);
		setImage({ uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
	};
	const chooseVideo = async () => {
		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) return;
		const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
		if (res.canceled || !res.assets?.length) return;
		const a = res.assets[0];
		if (a.fileSize && a.fileSize > 50 * 1024 * 1024) return toast.error(`${tx(L.videoTooBig)} (${(a.fileSize / 1048576).toFixed(1)} MB)`);
		setImage(null);
		setVideo({ uri: a.uri, name: a.fileName || `video_${Date.now()}.mp4`, type: a.mimeType || 'video/mp4', width: a.width, height: a.height, duration: a.duration ? Math.round(a.duration / 1000) : undefined });
	};

	const hasMedia = !!(image || video);
	const captionSplitting = hasMedia && message.length > MEDIA_CAPTION_LIMIT;
	const overLimit = message.length > TEXT_MESSAGE_LIMIT;

	const sendBroadcast = async () => {
		if (!message.trim() && !hasMedia) return toast.info(tx(L.needContent));
		if (overLimit) return toast.info(`${tx(L.broadcastLength)}: ${message.length} / ${TEXT_MESSAGE_LIMIT}`);
		if (!selectedIds.length) return toast.info(tx(L.needRecipient));
		setSending(true);
		try {
			const fd = new FormData();
			fd.append('message', message);
			if (image) fd.append('image', { uri: image.uri, name: image.name, type: image.type });
			if (video) {
				fd.append('video', { uri: video.uri, name: video.name, type: video.type });
				if (video.width) fd.append('video_width', String(video.width));
				if (video.height) fd.append('video_height', String(video.height));
				if (video.duration) fd.append('video_duration', String(video.duration));
			}
			const valid = buttons.filter((b) => b.text.trim() && b.url.trim());
			if (valid.length) fd.append('buttons', JSON.stringify(valid));
			const chatMap = new Map();
			selectedIds.forEach((id) => {
				const chat = byId.get(id)?.telegram_chat_id;
				if (chat) { if (!chatMap.has(chat)) chatMap.set(chat, id); } else chatMap.set(`id_${id}`, id);
			});
			fd.append('user_ids', JSON.stringify(Array.from(chatMap.values())));
			const res = await api.post(E.TELEGRAM_BROADCAST, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
			if (res.data.failed > 0) {
				const sample = (res.data.errors || []).join('; ');
				toast.error(`${res.data.message}${sample ? ` (${sample})` : ''}`);
			} else {
				toast.success(res.data.message || tx(L.broadcastSuccess));
			}
			setMessage('');
			setImage(null);
			setVideo(null);
			setButtons([]);
			clearSelection();
		} catch (err) {
			toast.error(err.response?.data?.error || err.response?.data?.detail || tx(L.sendErr));
		}
		setSending(false);
	};

	const totalPages = Math.max(1, Math.ceil(botUsersCount / USERS_PAGE_SIZE));
	const roleTone = (role) => (role === 'superadmin' ? [colors.red, colors.redSoft] : role === 'admin' ? [colors.amber, colors.goldTint] : role === 'coordinator' ? [colors.blue, colors.blueSoft] : role === 'teacher' ? [colors.purple, colors.purpleSoft] : [colors.muted, colors.cardMuted]);
	const filterCount = regionF.length + gradeF.length + olyF.length + (payF !== 'all' ? 1 : 0);

	return (
		<Screen header={<StackHeader />} onRefresh={() => (tab === 'orders' ? Promise.all([fetchOrders(), refreshCounts()]) : tab === 'users' ? fetchBotUsers(usersPage, userSearch) : fetchAllBotUsers(true))} keyboard>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<Segmented value={tab} onChange={setTab} style={{ marginBottom: 14 }} options={[{ value: 'orders', label: tx(L.tabOrders), badge: pendingBookOrders || null }, { value: 'users', label: tx(L.tabUsers) }, { value: 'broadcast', label: tx(L.tabBroadcast) }]} />

			{tab === 'orders' ? (
				<BookOrdersList orders={orders} loading={ordersLoading} filter={ordersFilter} onFilter={setOrdersFilter} onChanged={(id, status) => { setOrders((p) => p.map((o) => (o.id === id ? { ...o, status } : o))); refreshCounts(); }} />
			) : null}

			{tab === 'users' ? (
				<>
					<Field icon={Search} value={userSearch} onChangeText={setUserSearch} placeholder={tx(L.usersSearch)} style={{ marginBottom: 10 }} />
					<T v="small" style={{ marginBottom: 10 }}>{tx(L.usersTotal)}: <T v="strong">{botUsersCount}</T></T>
					{usersLoading && !botUsers.length ? <ActivityIndicator color={colors.goldDeep} /> : !botUsers.length ? <EmptyState icon={Users} title={tx(L.noUsers)} /> : botUsers.map((u) => {
						const [c, bg] = roleTone(u.role);
						return (
							<Card key={u.id} style={{ marginBottom: 8, padding: 14 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={1}>{u.last_name} {u.first_name}</T>
										<T v="small" style={{ fontSize: 12 }}>{u.participant_id || u.username} · {u.phone || '—'}</T>
									</View>
									<Pill label={tx(L.roles[u.role] || L.roles.participant)} color={c} bg={bg} />
								</View>
								<T v="small" style={{ fontSize: 11.5, marginTop: 6 }} selectable>Chat ID: {u.telegram_chat_id}</T>
							</Card>
						);
					})}
					{totalPages > 1 ? (
						<View style={styles.pager}>
							<IconButton icon={ChevronLeft} onPress={() => setUsersPage((p) => Math.max(1, p - 1))} style={{ opacity: usersPage === 1 ? 0.4 : 1 }} />
							<T v="strong">{tx(L.page)} {usersPage} / {totalPages}</T>
							<IconButton icon={ChevronRight} onPress={() => setUsersPage((p) => Math.min(totalPages, p + 1))} style={{ opacity: usersPage === totalPages ? 0.4 : 1 }} />
						</View>
					) : null}
				</>
			) : null}

			{tab === 'broadcast' ? (
				<>
					<FormSection icon={Send} title={tx(L.broadcastLabel)}>
						<View style={styles.warning}><T v="small" color={colors.amber} style={{ fontFamily: fonts.semibold }}>{tx(L.broadcastWarning)}</T></View>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
							{FORMAT.map((f) => (
								<Tap key={f.label} onPress={() => insertFormat(f)} style={styles.fmt}><T style={[{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink2 }, f.style]}>{f.label}</T></Tap>
							))}
						</View>
						<TextArea rows={7} value={message} onChangeText={setMessage} onSelectionChange={(e) => setSelection(e.nativeEvent.selection)} placeholder={tx(L.broadcastPlaceholder)} autoCapitalize="sentences" />
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
							<T v="small" color={overLimit ? colors.red : colors.muted}>{tx(L.broadcastLength)}: {message.length} / {TEXT_MESSAGE_LIMIT}</T>
							{captionSplitting ? <T v="small" color={colors.amber} style={{ flex: 1, textAlign: 'right' }}>{tx(L.captionSplit)}</T> : null}
						</View>

						{!video ? (
							image ? (
								<View>
									<Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
									<Tap onPress={() => setImage(null)} style={styles.remove}><X size={16} color={colors.white} /></Tap>
								</View>
							) : <Button size="sm" variant="light" icon={ImageIcon} title={tx(L.addImage)} onPress={chooseImage} />
						) : null}
						{!image ? (
							video ? (
								<View style={[styles.preview, styles.videoBox]}>
									<Video size={28} color={colors.white} />
									<T v="small" color={colors.white} numberOfLines={1}>{video.name}{video.duration ? ` · ${video.duration}s` : ''}</T>
									<Tap onPress={() => setVideo(null)} style={styles.remove}><X size={16} color={colors.white} /></Tap>
								</View>
							) : <Button size="sm" variant="light" icon={Video} title={tx(L.addVideo)} onPress={chooseVideo} />
						) : null}
					</FormSection>

					<FormSection icon={Link2} title={tx(L.buttonsLabel)} right={<Tap onPress={() => setButtons((p) => [...p, { text: '', url: '' }])} style={styles.addBtn}><Plus size={14} color={colors.navyDeep} /><T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.navyDeep }}>{tx(L.addButton)}</T></Tap>}>
						{buttons.map((b, idx) => (
							<View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
								<View style={{ flex: 1, gap: 6 }}>
									<Field value={b.text} placeholder={tx(L.buttonText)} onChangeText={(v) => setButtons((p) => p.map((x, i) => (i === idx ? { ...x, text: v } : x)))} />
									<Field value={b.url} placeholder="https://..." autoCapitalize="none" keyboardType="url" onChangeText={(v) => setButtons((p) => p.map((x, i) => (i === idx ? { ...x, url: v } : x)))} />
								</View>
								<Tap onPress={() => setButtons((p) => p.filter((_, i) => i !== idx))} style={[styles.fmt, { backgroundColor: colors.redSoft, marginTop: 8 }]}><X size={15} color={colors.red} /></Tap>
							</View>
						))}
						{buttons.some((b) => b.text.trim()) ? (
							<View style={styles.tgPreview}>
								{buttons.filter((b) => b.text.trim()).map((b, i) => <View key={i} style={styles.tgBtn}><T style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: colors.white }} numberOfLines={1}>{b.text}</T></View>)}
							</View>
						) : null}
					</FormSection>

					<FormSection icon={Users} title={tx(L.recipients)} right={selectedIds.length ? <Tap onPress={clearSelection}><T v="strong" color={colors.red} style={{ fontSize: 13 }}>{tx(L.clearSelection)}</T></Tap> : null}>
						<T v="small">{tx(L.onlyBot)}</T>
						<T v="strong" color={colors.amber}>{tx(L.willSend)}: {selectedIds.length}{uniqueChats !== selectedIds.length ? ` (${uniqueChats} ${tx(L.uniqueTg)})` : ''}</T>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Field style={{ flex: 1 }} icon={Search} value={bSearch} onChangeText={setBSearch} placeholder={tx(L.usersSearch)} />
							<IconButton icon={Filter} size={52} badge={filterCount || null} onPress={() => setFiltersOpen(true)} />
						</View>
						<Tap onPress={() => setSelectAll((v) => !v)} style={[styles.user, selectAll && styles.userOn]}>
							<View style={[styles.box, selectAll && styles.boxOn]}>{selectAll ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
							<T v="strong" style={{ flex: 1 }}>{tx(L.selectAllMatching)} ({filtered.length})</T>
						</Tap>
						{allLoading ? (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color={colors.goldDeep} /><T v="small">{tx(L.loadingUsers)} · {allBotUsers.length}</T></View>
						) : null}
						{!allLoading && !filtered.length ? <T v="small" style={{ textAlign: 'center' }}>{tx(L.noMatch)}</T> : filtered.slice(0, visibleCount).map((u) => {
							const on = selectedSet.has(u.id);
							return (
								<Tap key={u.id} onPress={() => toggleUser(u.id)} style={[styles.user, on && styles.userOn]}>
									<View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={1}>{u.first_name} {u.last_name}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{u.participant_id || '—'} · {u.phone || '—'}</T>
									</View>
								</Tap>
							);
						})}
						{filtered.length > visibleCount ? <Button size="sm" variant="light" title={`+${Math.min(60, filtered.length - visibleCount)}`} onPress={() => setVisibleCount((v) => v + 60)} /> : null}
						<Button size="sm" variant="ghost" icon={RefreshCw} title="Refresh" onPress={() => fetchAllBotUsers(true)} />
					</FormSection>

					<Button title={tx(L.broadcastSend)} icon={Send} loading={sending} disabled={overLimit} onPress={sendBroadcast} />
				</>
			) : null}

			<Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title={tx(L.filters)} scroll maxHeight="90%">
				<View style={{ gap: 18, paddingBottom: 10 }}>
					<View style={{ gap: 8 }}>
						<T v="label">{tx(L.payment)}</T>
						<ChoicePills value={payF} onChange={setPayF} options={[{ value: 'all', label: tx(L.all) }, { value: 'paid', label: tx(L.paid) }, { value: 'pending', label: tx(L.pending) }, { value: 'not_paid', label: tx(L.notPaid) }]} />
					</View>
					<ChipsSelect label={tx(L.region)} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} value={regionF} onChange={(v) => setRegionF(v.map(String))} />
					<ChipsSelect label={tx(L.grade)} options={GRADES.map((g) => ({ value: String(g), label: String(g) }))} value={gradeF} onChange={(v) => setGradeF(v.map(String))} />
					<ChipsSelect label={tx(L.olympiad)} options={olympiads.map((o) => ({ value: String(o.id), label: pick(o, 'title') }))} value={olyF} onChange={(v) => setOlyF(v.map(String))} />
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.reset)} onPress={() => { setRegionF([]); setGradeF([]); setOlyF([]); setPayF('all'); }} />
						<Button style={{ flex: 1.4 }} size="md" title={tx(L.apply)} onPress={() => setFiltersOpen(false)} />
					</View>
				</View>
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
	warning: { padding: 10, borderRadius: radius.md, backgroundColor: colors.goldTint },
	fmt: { minWidth: 38, height: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	preview: { width: '100%', height: 180, borderRadius: radius.lg },
	videoBox: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
	remove: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
	addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: radius.pill, backgroundColor: colors.gold },
	tgPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 10, borderRadius: radius.md, backgroundColor: '#E7EEF6' },
	tgBtn: { width: '48%', flexGrow: 1, height: 36, borderRadius: 8, backgroundColor: '#5B8FC7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
	user: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	userOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
	boxOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
