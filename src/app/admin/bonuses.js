import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Award, BookOpen, Calendar, Coins, Edit3, Info, Plus, Trash2, X } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { store } from '../../api/storage';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Sheet, T, Tap } from '../../components/ui';
import { DateTimeField } from '../../components/form';
import { colors, fonts, radius } from '../../theme';
import { formatMoney } from '../../utils/format';

const DEFAULT_RECIPIENT_NAME = 'Мамасидиков Жахонгир';
const LOCAL_KEY = 'bonus_local_adjustments';
const PRESETS = [10, 50, 100, 500, -50];

const L = {
	title: { uz: 'Bonuslar tizimi', ru: 'Начисление бонусов', en: 'Bonus System' },
	subtitle: { uz: 'Har bir sotilgan kitob uchun 10 koin', ru: '10 коинов за каждую проданную книгу', en: '10 coins per book sold' },
	addRecipient: { uz: "Xodim qo'shish", ru: 'Добавить человека', en: 'Add person' },
	editRecipient: { uz: 'Nomini tahrirlash', ru: 'Изменить имя', en: 'Edit name' },
	noRecipients: { uz: "Hozircha xodimlar yo'q", ru: 'Пока никто не добавлен', en: 'No one added yet' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	confirmDeleteTitle: { uz: "O'chirish?", ru: 'Удалить?', en: 'Delete?' },
	confirmDeleteText: { uz: "Ushbu xodimni va uning statistikasini ko'rsatishni to'xtatasizmi?", ru: 'Убрать этого человека и перестать показывать его статистику?', en: 'Remove this person and stop showing their stats?' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	nameLabel: { uz: 'Ism familiya', ru: 'Имя Фамилия', en: 'Full name' },
	nameRequired: { uz: 'Ismni kiriting', ru: 'Введите имя', en: 'Enter a name' },
	totalCoins: { uz: "Jami koinlar", ru: 'Всего коинов', en: 'Total coins' },
	totalBooks: { uz: 'Sotilgan kitoblar', ru: 'Продано книг', en: 'Books sold' },
	dailyStats: { uz: 'Kunlik hisobot', ru: 'Статистика по дням', en: 'Daily stats' },
	noStats: { uz: "Hozircha tasdiqlangan sotuvlar yo'q", ru: 'Подтверждённых продаж пока нет', en: 'No confirmed sales yet' },
	saved: { uz: 'Muvaffaqiyatli saqlandi', ru: 'Успешно сохранено', en: 'Saved' },
	saveErr: { uz: 'Saqlashda xatolik', ru: 'Ошибка при сохранении', en: 'Error saving' },
	deleted: { uz: "O'chirildi", ru: 'Удалено', en: 'Deleted' },
	deleteErr: { uz: "O'chirishda xatolik", ru: 'Ошибка при удалении', en: 'Error deleting' },
	fetchErr: { uz: 'Yuklashda xatolik', ru: 'Ошибка загрузки', en: 'Error loading' },
	showMore: { uz: "Barchasini ko'rish", ru: 'Показать больше', en: 'Show more' },
	showLess: { uz: 'Yopish', ru: 'Свернуть', en: 'Show less' },
	ruleInfo: { uz: "Qoida: har bir sotilgan kitob uchun avtomatik 10 koin (12 ta kitob = 120 koin).", ru: 'Правило: за каждую проданную книгу автоматически 10 коинов (12 книг = 120 коинов).', en: 'Rule: 10 coins per book sold, credited automatically (12 books = 120 coins).' },
	addCoins: { uz: "Koin qo'shish", ru: 'Начислить коины', en: 'Add coins' },
	addCoinsTitle: { uz: "Koin qo'shish / yechish", ru: 'Начисление или списание', en: 'Add or deduct coins' },
	coinsAmount: { uz: 'Koin miqdori', ru: 'Количество коинов', en: 'Coins amount' },
	coinsPlaceholder: { uz: 'Masalan: 50 yoki -20', ru: 'Например: 50 или -20', en: 'e.g. 50 or -20' },
	note: { uz: 'Sabab / izoh (ixtiyoriy)', ru: 'Причина / комментарий (необязательно)', en: 'Reason / note (optional)' },
	date: { uz: 'Sana', ru: 'Дата', en: 'Date' },
	manual: { uz: "Qo'lda", ru: 'Вручную', en: 'Manual' },
	coinsAdded: { uz: 'Koinlar saqlandi', ru: 'Коины успешно начислены', en: 'Coins saved' },
	undo: { uz: 'Bekor qilish', ru: 'Отменить', en: 'Delete' },
	coins: { uz: 'koin', ru: 'коинов', en: 'coins' },
	books: { uz: 'ta', ru: 'шт.', en: 'pcs' },
	quick: { uz: 'Tezkor tanlash', ru: 'Быстрый выбор', en: 'Quick select' },
	badAmount: { uz: "Koin miqdorini to'g'ri kiriting", ru: 'Введите корректное количество коинов', en: 'Enter a valid amount' },
	recipientTag: { uz: 'Koin oluvchi', ru: 'Получатель коинов', en: 'Coin recipient' },
	manualAdd: { uz: "Qo'lda qo'shildi", ru: 'Ручное начисление', en: 'Manual credit' },
	manualSub: { uz: "Qo'lda yechildi", ru: 'Ручное списание', en: 'Manual deduction' },
};

const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDay(new Date());
const blank = () => ({ id: 1, name: DEFAULT_RECIPIENT_NAME, total_coins: 0, total_books_sold: 0, daily_stats: [] });

export default function Bonuses() {
	const { tx, lang } = useLanguage();
	const toast = useToast();
	const [recipients, setRecipients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState({});
	const [form, setForm] = useState(null); // { id?, name }
	const [submitting, setSubmitting] = useState(false);
	const [confirmId, setConfirmId] = useState(null);
	const [coins, setCoins] = useState(null); // { recipient, amount, note, date }

	const fetchRecipients = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get(E.BONUS_RECIPIENTS);
			let items = Array.isArray(res.data) ? res.data : res.data.results || [];
			if (!items.length) {
				try {
					const created = await api.post(E.BONUS_RECIPIENTS, { name: DEFAULT_RECIPIENT_NAME });
					items = created.data ? [created.data] : [blank()];
				} catch {
					items = [blank()];
				}
			}
			// Merge adjustments saved locally when the add-coins endpoint was unavailable (website does the same with localStorage).
			const local = await store.get(LOCAL_KEY, []);
			if (local.length) {
				items = items.map((r) => {
					const mine = local.filter((a) => a.recipient_id === r.id);
					const existing = new Set((r.daily_stats || []).map((s) => String(s.id)));
					const add = mine.filter((a) => !existing.has(String(a.id)));
					if (!add.length) return r;
					return {
						...r,
						total_coins: (r.total_coins || 0) + add.reduce((s, a) => s + Number(a.coins || 0), 0),
						daily_stats: [...(r.daily_stats || []), ...add].sort((a, b) => String(b.date).localeCompare(String(a.date))),
					};
				});
			}
			setRecipients(items);
		} catch {
			toast.error(tx(L.fetchErr));
			setRecipients([blank()]);
		}
		setLoading(false);
	}, []);

	useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

	const saveName = async () => {
		if (!form.name.trim()) return toast.error(tx(L.nameRequired));
		setSubmitting(true);
		try {
			if (form.id) await api.patch(E.BONUS_RECIPIENT_DETAIL(form.id), { name: form.name.trim() });
			else await api.post(E.BONUS_RECIPIENTS, { name: form.name.trim() });
			toast.success(tx(L.saved));
			setForm(null);
			fetchRecipients();
		} catch {
			toast.error(tx(L.saveErr));
		}
		setSubmitting(false);
	};

	const remove = async () => {
		const id = confirmId;
		setConfirmId(null);
		try {
			await api.delete(E.BONUS_RECIPIENT_DETAIL(id));
			toast.success(tx(L.deleted));
			fetchRecipients();
		} catch {
			toast.error(tx(L.deleteErr));
		}
	};

	const applyLocal = async (recipientId, payload) => {
		const n = Number(payload.coins) || 0;
		const entry = { id: payload.id || `adj-${Date.now()}`, date: payload.date, books_sold: Math.round(n / 10), coins: payload.coins, note: payload.note, type: 'manual' };
		const saved = await store.get(LOCAL_KEY, []);
		await store.set(LOCAL_KEY, [...saved, { ...entry, recipient_id: recipientId }]);
		setRecipients((prev) => prev.map((r) => (r.id !== recipientId ? r : {
			...r,
			total_coins: (r.total_coins || 0) + n,
			total_books_sold: (r.total_books_sold || 0) + entry.books_sold,
			daily_stats: [entry, ...(r.daily_stats || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))),
		})));
	};

	const removeLocal = async (recipientId, adjId) => {
		const saved = await store.get(LOCAL_KEY, []);
		await store.set(LOCAL_KEY, saved.filter((a) => !(String(a.id) === String(adjId) && a.recipient_id === recipientId)));
		setRecipients((prev) => prev.map((r) => {
			if (r.id !== recipientId) return r;
			const adj = (r.daily_stats || []).find((s) => String(s.id) === String(adjId));
			return { ...r, total_coins: (r.total_coins || 0) - (adj ? Number(adj.coins) : 0), daily_stats: (r.daily_stats || []).filter((s) => String(s.id) !== String(adjId)) };
		}));
	};

	const saveCoins = async () => {
		const num = parseInt(coins.amount, 10);
		if (isNaN(num) || num === 0) return toast.error(tx(L.badAmount));
		const recipient = coins.recipient;
		const payload = { coins: num, note: coins.note.trim() || tx(num > 0 ? L.manualAdd : L.manualSub), date: coins.date || today() };
		setSubmitting(true);
		try {
			const res = await api.post(`${E.BONUS_RECIPIENT_DETAIL(recipient.id)}add-coins/`, payload);
			if (res.data?.recipient) setRecipients((prev) => prev.map((r) => (r.id === recipient.id ? res.data.recipient : r)));
			else await applyLocal(recipient.id, payload);
		} catch {
			await applyLocal(recipient.id, payload);
		}
		toast.success(tx(L.coinsAdded));
		setCoins(null);
		setSubmitting(false);
	};

	const removeAdjustment = async (recipientId, adjId) => {
		try {
			const res = await api.post(`${E.BONUS_RECIPIENT_DETAIL(recipientId)}remove-adjustment/`, { adjustment_id: adjId });
			if (res.data?.recipient) setRecipients((prev) => prev.map((r) => (r.id === recipientId ? res.data.recipient : r)));
			else await removeLocal(recipientId, adjId);
		} catch {
			await removeLocal(recipientId, adjId);
		}
		toast.success(tx(L.deleted));
	};

	const fmtDate = (d) => {
		try { return new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-US'); } catch { return d; }
	};

	return (
		<Screen header={<StackHeader right={<IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={() => setForm({ name: '' })} />} />} onRefresh={fetchRecipients}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<View style={styles.rule}><Info size={16} color={colors.blue} /><T v="small" style={{ flex: 1, color: colors.ink2 }}>{tx(L.ruleInfo)}</T></View>

			{loading && !recipients.length ? <ActivityIndicator color={colors.goldDeep} /> : !recipients.length ? <EmptyState icon={Coins} title={tx(L.noRecipients)} /> : recipients.map((r) => {
				const stats = r.daily_stats || [];
				const shown = expanded[r.id] ? stats : stats.slice(0, 7);
				const computedBooks = stats.reduce((s, row) => s + (typeof row.books_sold === 'number' && row.books_sold >= 0 ? row.books_sold : Math.max(0, Math.round((Number(row.coins) || 0) / 10))), 0);
				const books = computedBooks > 0 ? computedBooks : r.total_books_sold || 0;
				return (
					<Card key={r.id} style={{ marginBottom: 14 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
							<View style={styles.avatar}><T style={{ fontFamily: fonts.extrabold, fontSize: 18, color: colors.navyDeep }}>{r.name?.charAt(0) || 'Ж'}</T></View>
							<View style={{ flex: 1 }}>
								<T v="strong" numberOfLines={2}>{r.name}</T>
								<Pill icon={Award} label={tx(L.recipientTag)} color={colors.amber} bg={colors.goldTint} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
							</View>
							<Tap onPress={() => setForm({ id: r.id, name: r.name || '' })} style={[styles.act, { backgroundColor: colors.blueSoft }]}><Edit3 size={15} color={colors.blue} /></Tap>
							{recipients.length > 1 ? <Tap onPress={() => setConfirmId(r.id)} style={[styles.act, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap> : null}
						</View>

						<View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
							<View style={[styles.stat, { backgroundColor: colors.goldTint }]}>
								<View style={styles.statHead}><Coins size={13} color={colors.amber} /><T v="label" style={{ fontSize: 9.5 }}>{tx(L.totalCoins)}</T></View>
								<T style={styles.statValue}>{formatMoney(r.total_coins || 0)} <T v="small">{tx(L.coins)}</T></T>
							</View>
							<View style={[styles.stat, { backgroundColor: colors.blueSoft }]}>
								<View style={styles.statHead}><BookOpen size={13} color={colors.blue} /><T v="label" style={{ fontSize: 9.5 }}>{tx(L.totalBooks)}</T></View>
								<T style={styles.statValue}>{formatMoney(books)} <T v="small">{tx(L.books)}</T></T>
							</View>
						</View>

						<Button size="md" icon={Plus} title={tx(L.addCoins)} onPress={() => setCoins({ recipient: r, amount: '', note: '', date: today() })} style={{ marginTop: 12 }} />

						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 6 }}>
							<Calendar size={13} color={colors.muted} />
							<T v="label" style={{ flex: 1 }}>{tx(L.dailyStats)}</T>
							{stats.length ? <T v="small" style={{ fontSize: 11 }}>1 = 10</T> : null}
						</View>
						{!stats.length ? <T v="small" style={{ textAlign: 'center', paddingVertical: 10 }}>{tx(L.noStats)}</T> : shown.map((s, i) => {
							const manual = s.type === 'manual';
							const c = Number(s.coins) || 0;
							return (
								<View key={s.id || `${s.date}-${i}`} style={styles.row}>
									<View style={{ flex: 1 }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											<T v="strong" style={{ fontSize: 13.5 }}>{fmtDate(s.date)}</T>
											{manual ? <Pill label={tx(L.manual)} color={colors.purple} bg={colors.purpleSoft} /> : null}
										</View>
										{s.note ? <T v="small" style={{ fontSize: 11.5 }} numberOfLines={2}>{s.note}</T> : null}
									</View>
									<View style={{ alignItems: 'flex-end' }}>
										<T v="strong" color={c < 0 ? colors.red : colors.green}>{c > 0 ? '+' : ''}{c}</T>
										{typeof s.books_sold === 'number' && !manual ? <T v="small" style={{ fontSize: 11 }}>{s.books_sold} {tx(L.books)}</T> : null}
									</View>
									{manual ? <Tap onPress={() => removeAdjustment(r.id, s.id)} style={[styles.act, { backgroundColor: colors.redSoft, width: 28, height: 28, marginLeft: 8 }]}><X size={13} color={colors.red} /></Tap> : null}
								</View>
							);
						})}
						{stats.length > 7 ? (
							<Tap onPress={() => setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))} style={{ alignSelf: 'center', paddingTop: 10 }}>
								<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(expanded[r.id] ? L.showLess : L.showMore)} ({stats.length})</T>
							</Tap>
						) : null}
					</Card>
				);
			})}

			<Sheet visible={!!form} onClose={() => !submitting && setForm(null)} title={tx(form?.id ? L.editRecipient : L.addRecipient)}>
				{form ? (
					<View style={{ gap: 12 }}>
						<Field label={tx(L.nameLabel)} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} autoFocus />
						<Button title={tx(L.save)} loading={submitting} onPress={saveName} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!coins} onClose={() => !submitting && setCoins(null)} title={tx(L.addCoinsTitle)} scroll>
				{coins ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<T v="strong">{coins.recipient.name}</T>
						<Field label={tx(L.coinsAmount)} value={coins.amount} placeholder={tx(L.coinsPlaceholder)} keyboardType="numbers-and-punctuation" onChangeText={(v) => setCoins((c) => ({ ...c, amount: v.replace(/[^\d-]/g, '') }))} />
						<T v="label">{tx(L.quick)}</T>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
							{PRESETS.map((p) => (
								<Tap key={p} onPress={() => setCoins((c) => ({ ...c, amount: String(p) }))} style={[styles.preset, String(p) === coins.amount && styles.presetOn]}>
									<T style={{ fontFamily: fonts.bold, fontSize: 13, color: p < 0 ? colors.red : colors.ink2 }}>{p > 0 ? `+${p}` : p}</T>
								</Tap>
							))}
						</View>
						<Field label={tx(L.note)} value={coins.note} onChangeText={(v) => setCoins((c) => ({ ...c, note: v }))} />
						<DateTimeField mode="date" clearable={false} label={tx(L.date)} value={coins.date} onChange={(v) => setCoins((c) => ({ ...c, date: v ? localDay(new Date(v)) : today() }))} />
						<Button title={tx(L.save)} icon={Coins} loading={submitting} onPress={saveCoins} />
					</View>
				) : null}
			</Sheet>

			<Dialog
				visible={!!confirmId}
				onClose={() => setConfirmId(null)}
				icon={Trash2}
				tone="red"
				title={tx(L.confirmDeleteTitle)}
				message={tx(L.confirmDeleteText)}
				actions={[{ title: tx(L.yesDelete), variant: 'danger', onPress: remove }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirmId(null) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	rule: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.blueSoft, marginBottom: 14 },
	avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	stat: { flex: 1, padding: 12, borderRadius: radius.md, gap: 4 },
	statHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	statValue: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
	preset: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
	presetOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
