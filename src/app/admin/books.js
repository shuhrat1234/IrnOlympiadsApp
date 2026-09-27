import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Edit3, Eye, EyeOff, FileText, ImageIcon, Plus, RefreshCw, Trash2, X } from 'lucide-react-native';
import api, { mediaUrl } from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAdmin } from '../../context/AdminContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Segmented, SelectField, Sheet, T, Tap } from '../../components/ui';
import { FormSection, NumberField, SwitchRow, TextArea } from '../../components/form';
import { BookOrdersList } from '../../components/admin/BookOrders';
import { colors, fonts, radius } from '../../theme';
import { formatMoney } from '../../utils/format';
import { pickDocument, pickImage } from '../../utils/files';

const L = {
	title: { uz: 'Kitoblar va Buyurtmalar', ru: 'Книги и Заказы', en: 'Books & Orders' },
	subtitle: { uz: "Kitoblar do'koni va buyurtmalarni boshqarish", ru: 'Каталог книг и заказы с доставкой BTS', en: 'Manage books and BTS delivery orders' },
	booksTab: { uz: 'Kitoblar', ru: 'Каталог', en: 'Books' },
	ordersTab: { uz: 'Buyurtmalar', ru: 'Заказы', en: 'Orders' },
	addBook: { uz: 'Yangi kitob', ru: 'Добавить книгу', en: 'Add book' },
	editBook: { uz: 'Kitobni tahrirlash', ru: 'Редактировать книгу', en: 'Edit book' },
	noBooks: { uz: 'Kitoblar topilmadi', ru: 'Книги не найдены', en: 'No books found' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	active: { uz: 'Faol', ru: 'Активна', en: 'Active' },
	inactive: { uz: 'Nofaol', ru: 'Неактивна', en: 'Inactive' },
	confirmDeleteTitle: { uz: "Kitobni o'chirish?", ru: 'Удалить книгу?', en: 'Delete book?' },
	confirmDeleteText: { uz: "Bu amalni ortga qaytarib bo'lmaydi.", ru: 'Это действие необратимо.', en: 'This action cannot be undone.' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	titlesLabel: { uz: 'Sarlavhalar', ru: 'Названия', en: 'Titles' },
	descriptionsLabel: { uz: 'Tavsiflar', ru: 'Описания', en: 'Descriptions' },
	coverImageLabel: { uz: 'Muqova surati', ru: 'Обложка книги', en: 'Cover image' },
	uploadCover: { uz: 'Muqovani yuklash', ru: 'Загрузить обложку', en: 'Upload cover' },
	pdfDocumentLabel: { uz: 'PDF hujjat', ru: 'PDF-документ', en: 'PDF document' },
	uploadPdf: { uz: 'PDF-ni yuklash', ru: 'Загрузить PDF', en: 'Upload PDF' },
	noPdf: { uz: "PDF yo'q", ru: 'Нет PDF', en: 'No PDF' },
	type: { uz: 'Turi', ru: 'Тип', en: 'Type' },
	paidType: { uz: 'Pullik', ru: 'Платно', en: 'Paid' },
	freeType: { uz: 'Tekin', ru: 'Бесплатно', en: 'Free' },
	price: { uz: 'Narxi (UZS)', ru: 'Цена (UZS)', en: 'Price (UZS)' },
	stockLabel: { uz: 'Skladdagi soni', ru: 'Количество на складе', en: 'Stock' },
	stockHint: { uz: "Foydalanuvchilar jami shu sondan ortiq buyurtma bera olmaydi.", ru: 'Пользователи не смогут заказать больше этого количества.', en: 'Users cannot order more than this in total.' },
	bonusRecipientLabel: { uz: 'Bonus oluvchisi', ru: 'Получатель бонуса', en: 'Bonus recipient' },
	none: { uz: 'Tanlanmagan', ru: 'Не выбран', en: 'Not selected' },
	visibility: { uz: "Saytda ko'rinadi", ru: 'Видна на сайте', en: 'Visible on site' },
	remaining: { uz: 'qoldi', ru: 'осталось', en: 'left' },
	saved: { uz: 'Muvaffaqiyatli saqlandi', ru: 'Успешно сохранено', en: 'Saved' },
	saveErr: { uz: 'Saqlashda xatolik', ru: 'Ошибка при сохранении', en: 'Error saving' },
	deleted: { uz: "O'chirildi", ru: 'Удалено', en: 'Deleted' },
	deleteErr: { uz: "O'chirishda xatolik", ru: 'Ошибка при удалении', en: 'Error deleting' },
	fetchErr: { uz: 'Yuklashda xatolik', ru: 'Ошибка загрузки данных', en: 'Failed to load' },
	noTitle: { uz: 'Kamida bitta tilda sarlavha kiriting', ru: 'Введите название хотя бы на одном языке', en: 'Enter a title in at least one language' },
};

const emptyForm = {
	title_uz: '', title_ru: '', title_en: '', description_uz: '', description_ru: '', description_en: '',
	book_type: 'free', price: 0, stock: 0, is_active: true, bonus_recipient: '',
	cover: null, cover_preview: null, pdf: null, pdf_name: '',
};

const Cover = ({ uri, title, paid }) => {
	const [failed, setFailed] = useState(false);
	if (!uri || failed) {
		return (
			<LinearGradient colors={paid ? ['#F59E0B', '#EA580C'] : ['#3B82F6', '#4F46E5']} style={styles.cover}>
				<T style={{ fontFamily: fonts.extrabold, fontSize: 8, color: colors.white }}>IRN</T>
				<BookOpen size={14} color={colors.white} />
				<T style={{ fontFamily: fonts.bold, fontSize: 7, color: colors.white }} numberOfLines={2}>{title}</T>
			</LinearGradient>
		);
	}
	return <Image source={{ uri }} style={styles.cover} onError={() => setFailed(true)} />;
};

export default function Books() {
	const { tx, pick } = useLanguage();
	const toast = useToast();
	const { refreshCounts, pendingBookOrders } = useAdmin();
	const [tab, setTab] = useState('books');
	const [books, setBooks] = useState([]);
	const [orders, setOrders] = useState([]);
	const [recipients, setRecipients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [ordersLoading, setOrdersLoading] = useState(false);
	const [ordersFilter, setOrdersFilter] = useState('all');
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [formOpen, setFormOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [confirmId, setConfirmId] = useState(null);

	const fetchBooks = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get(E.BOOKS);
			setBooks(Array.isArray(res.data) ? res.data : res.data.results || []);
		} catch {
			toast.error(tx(L.fetchErr));
		}
		setLoading(false);
	}, []);

	const fetchOrders = useCallback(async () => {
		setOrdersLoading(true);
		try {
			const res = await api.get(E.BOOK_ORDERS);
			setOrders(Array.isArray(res.data) ? res.data : res.data.results || []);
		} catch {}
		setOrdersLoading(false);
	}, []);

	useEffect(() => {
		fetchBooks();
		fetchOrders();
		api.get(E.BONUS_RECIPIENTS).then((res) => setRecipients(Array.isArray(res.data) ? res.data : res.data.results || [])).catch(() => {});
	}, [fetchBooks, fetchOrders]);

	const set = (patch) => setForm((f) => ({ ...f, ...patch }));
	const openCreate = () => { setForm(emptyForm); setEditingId(null); setFormOpen(true); };
	const openEdit = (book) => {
		setForm({
			title_uz: book.title_uz || '', title_ru: book.title_ru || '', title_en: book.title_en || '',
			description_uz: book.description_uz || '', description_ru: book.description_ru || '', description_en: book.description_en || '',
			book_type: book.book_type || 'free', price: book.price || 0, stock: book.stock ?? 0,
			is_active: book.is_active !== undefined ? book.is_active : true, bonus_recipient: book.bonus_recipient ? String(book.bonus_recipient) : '',
			cover: null, cover_preview: book.cover_image ? mediaUrl(book.cover_image) : null, pdf: null, pdf_name: book.pdf_file ? book.pdf_file.split('/').pop() : '',
		});
		setEditingId(book.id);
		setFormOpen(true);
	};

	const chooseCover = async () => {
		try {
			const img = await pickImage({ quality: 0.85 });
			if (img) set({ cover: img, cover_preview: img.uri });
		} catch {}
	};
	const choosePdf = async () => {
		const doc = await pickDocument('application/pdf');
		if (doc) set({ pdf: doc, pdf_name: doc.name });
	};

	const save = async () => {
		if (!form.title_uz && !form.title_ru && !form.title_en) return toast.error(tx(L.noTitle));
		setSubmitting(true);
		try {
			const fd = new FormData();
			['title_uz', 'title_ru', 'title_en', 'description_uz', 'description_ru', 'description_en', 'book_type'].forEach((k) => fd.append(k, form[k]));
			fd.append('price', String(form.book_type === 'paid' ? form.price || 0 : 0));
			fd.append('stock', String(form.book_type === 'paid' ? form.stock || 0 : 0));
			fd.append('is_active', String(form.is_active));
			fd.append('bonus_recipient', form.bonus_recipient || '');
			if (form.cover) fd.append('cover_image', { uri: form.cover.uri, name: form.cover.name, type: form.cover.mimeType });
			if (form.book_type === 'free' && form.pdf) fd.append('pdf_file', { uri: form.pdf.uri, name: form.pdf.name, type: form.pdf.mimeType || 'application/pdf' });
			const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
			if (editingId) await api.patch(E.BOOK_DETAIL(editingId), fd, cfg);
			else await api.post(E.BOOKS, fd, cfg);
			toast.success(tx(L.saved));
			setFormOpen(false);
			fetchBooks();
		} catch {
			toast.error(tx(L.saveErr));
		}
		setSubmitting(false);
	};

	const remove = async () => {
		const id = confirmId;
		setConfirmId(null);
		try {
			await api.delete(E.BOOK_DETAIL(id));
			toast.success(tx(L.deleted));
			fetchBooks();
		} catch {
			toast.error(tx(L.deleteErr));
		}
	};

	return (
		<Screen
			header={<StackHeader right={tab === 'books' ? <IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={openCreate} /> : <IconButton icon={RefreshCw} onPress={fetchOrders} />} />}
			onRefresh={() => Promise.all([fetchBooks(), fetchOrders(), refreshCounts()])}
		>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<Segmented value={tab} onChange={setTab} style={{ marginBottom: 14 }} options={[{ value: 'books', label: tx(L.booksTab), icon: BookOpen }, { value: 'orders', label: tx(L.ordersTab), badge: pendingBookOrders || null }]} />

			{tab === 'books' ? (
				loading && !books.length ? <ActivityIndicator color={colors.goldDeep} /> : !books.length ? <EmptyState icon={BookOpen} title={tx(L.noBooks)} action={<Button size="md" icon={Plus} title={tx(L.addBook)} onPress={openCreate} />} /> : books.map((book) => {
					const paid = book.book_type === 'paid';
					const title = pick(book, 'title') || `Book #${book.id}`;
					return (
						<Card key={book.id} onPress={() => openEdit(book)} style={{ marginBottom: 10, padding: 12 }}>
							<View style={{ flexDirection: 'row', gap: 12 }}>
								<Cover uri={book.cover_image ? mediaUrl(book.cover_image) : null} title={title} paid={paid} />
								<View style={{ flex: 1, gap: 4 }}>
									<T v="strong" numberOfLines={2}>{title}</T>
									{pick(book, 'description') ? <T v="small" numberOfLines={2} style={{ fontSize: 12 }}>{pick(book, 'description')}</T> : null}
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
										<Pill label={paid ? `${formatMoney(book.price)} UZS` : tx(L.freeType)} color={paid ? colors.amber : colors.blue} bg={paid ? colors.goldTint : colors.blueSoft} />
										{paid ? <Pill label={`${book.remaining_stock ?? book.stock} ${tx(L.remaining)}`} /> : null}
										<Pill icon={book.is_active ? Eye : EyeOff} label={tx(book.is_active ? L.active : L.inactive)} color={book.is_active ? colors.green : colors.muted} bg={book.is_active ? colors.greenSoft : colors.cardMuted} />
									</View>
									{book.bonus_recipient_name ? <T v="small" style={{ fontSize: 11.5 }}>🎁 {book.bonus_recipient_name}</T> : null}
								</View>
								<View style={{ gap: 8 }}>
									<Tap onPress={() => openEdit(book)} style={[styles.act, { backgroundColor: colors.blueSoft }]}><Edit3 size={15} color={colors.blue} /></Tap>
									<Tap onPress={() => setConfirmId(book.id)} style={[styles.act, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap>
								</View>
							</View>
						</Card>
					);
				})
			) : (
				<BookOrdersList
					orders={orders}
					loading={ordersLoading}
					filter={ordersFilter}
					onFilter={setOrdersFilter}
					onChanged={() => { fetchOrders(); fetchBooks(); refreshCounts(); }}
				/>
			)}

			<Sheet visible={formOpen} onClose={() => !submitting && setFormOpen(false)} title={tx(editingId ? L.editBook : L.addBook)} scroll maxHeight="94%">
				<View style={{ paddingBottom: 10 }}>
					<FormSection title={tx(L.titlesLabel)}>
						{['uz', 'ru', 'en'].map((c) => <Field key={c} label={c.toUpperCase()} value={form[`title_${c}`]} onChangeText={(v) => set({ [`title_${c}`]: v })} />)}
					</FormSection>
					<FormSection title={tx(L.descriptionsLabel)}>
						{['uz', 'ru', 'en'].map((c) => <TextArea key={c} rows={3} label={c.toUpperCase()} value={form[`description_${c}`]} onChangeText={(v) => set({ [`description_${c}`]: v })} />)}
					</FormSection>
					<FormSection title={tx(L.coverImageLabel)}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
							{form.cover_preview ? <Image source={{ uri: form.cover_preview }} style={[styles.cover, { width: 72, height: 96 }]} /> : <View style={[styles.cover, styles.coverEmpty, { width: 72, height: 96 }]}><ImageIcon size={22} color={colors.muted} /></View>}
							<View style={{ flex: 1, gap: 8 }}>
								<Button size="sm" variant="light" icon={ImageIcon} title={tx(L.uploadCover)} onPress={chooseCover} />
								{form.cover ? <Button size="sm" variant="ghost" icon={X} title={tx(L.cancel)} onPress={() => set({ cover: null, cover_preview: null })} /> : null}
							</View>
						</View>
					</FormSection>
					<FormSection title={tx(L.type)}>
						<Segmented value={form.book_type} onChange={(v) => set({ book_type: v })} options={[{ value: 'free', label: tx(L.freeType) }, { value: 'paid', label: tx(L.paidType) }]} />
						{form.book_type === 'paid' ? (
							<>
								<NumberField label={tx(L.price)} value={form.price} onChange={(v) => set({ price: v })} />
								<NumberField label={tx(L.stockLabel)} hint={tx(L.stockHint)} value={form.stock} onChange={(v) => set({ stock: v })} />
								<SelectField
									label={tx(L.bonusRecipientLabel)}
									title={tx(L.bonusRecipientLabel)}
									value={form.bonus_recipient}
									options={[{ value: '', label: tx(L.none) }, ...recipients.map((r) => ({ value: String(r.id), label: r.name }))]}
									onChange={(v) => set({ bonus_recipient: v })}
								/>
							</>
						) : (
							<View style={{ gap: 8 }}>
								<T v="label">{tx(L.pdfDocumentLabel)}</T>
								<View style={styles.pdfRow}>
									<FileText size={18} color={form.pdf_name ? colors.red : colors.muted} />
									<T v="body" style={{ flex: 1 }} numberOfLines={1}>{form.pdf_name || tx(L.noPdf)}</T>
								</View>
								<Button size="sm" variant="light" icon={FileText} title={tx(L.uploadPdf)} onPress={choosePdf} />
							</View>
						)}
					</FormSection>
					<SwitchRow label={tx(L.visibility)} value={form.is_active} onChange={(v) => set({ is_active: v })} />
					<Button title={tx(L.save)} loading={submitting} onPress={save} style={{ marginTop: 16 }} />
				</View>
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
	cover: { width: 54, height: 72, borderRadius: 10, padding: 5, justifyContent: 'space-between', overflow: 'hidden' },
	coverEmpty: { backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	pdfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
});
