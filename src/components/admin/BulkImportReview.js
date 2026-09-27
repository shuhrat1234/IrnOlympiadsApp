import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Edit3, FileSpreadsheet, HelpCircle, Search, ShieldCheck, User, UserPlus, XCircle } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Field, IconButton, Pill, Segmented, Sheet, T, Tap } from '../ui';
import { DateTimeField, TextArea } from '../form';
import { colors, fonts, radius } from '../../theme';

const PAGE_SIZE = 50;
const pad2 = (n) => String(n).padStart(2, '0');
const toDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

const L = {
	search: { uz: "Ism, ID, telefon bo'yicha qidirish...", ru: 'Поиск по имени, ID, телефону...', en: 'Search by name, ID, phone...' },
	matchedUser: { uz: 'Topilgan foydalanuvchi', ru: 'Найденный пользователь', en: 'Matched user' },
	resolve: { uz: "Bog'lash", ru: 'Указать', en: 'Resolve' },
	noMatch: { uz: 'Topilmadi', ru: 'Не найден', en: 'Not found' },
	selected: { uz: 'Tanlandi', ru: 'Выбрано', en: 'Selected' },
	assign: { uz: 'Ruxsat berish', ru: 'Назначить допуск', en: 'Assign permission' },
	assignAll: { uz: 'Barcha topilganlarga ruxsat', ru: 'Допуск ВСЕМ найденным', en: 'Assign to ALL matched' },
	bulkEdit: { uz: "Imtihon ma'lumotlari", ru: 'Данные экзамена', en: 'Exam details' },
	assignDone: { uz: 'ishtirokchiga ruxsat berildi', ru: 'участникам выдан допуск', en: 'participants got permission' },
	assignFailed: { uz: "Ruxsat berib bo'lmadi", ru: 'Не удалось назначить допуск', en: 'Failed to assign permission' },
	granted: { uz: 'Ruxsat berilgan', ru: 'Допуск выдан', en: 'Granted' },
	notGranted: { uz: 'Berilmagan', ru: 'Не выдан', en: 'Not granted' },
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	found: { uz: 'Topildi', ru: 'Найдено', en: 'Found' },
	linked: { uz: "Bog'landi", ru: 'Привязан', en: 'Linked' },
	possible: { uz: 'Ehtimoliy', ru: 'Возможно', en: 'Possible' },
	notFound: { uz: 'Topilmadi', ru: 'Не найдено', en: 'Not found' },
	assigned: { uz: 'Ruxsat berilgan', ru: 'Допуск выдан', en: 'Assigned' },
	selectPage: { uz: 'Sahifani tanlash', ru: 'Выбрать страницу', en: 'Select page' },
	empty: { uz: "Hech qanday ma'lumot topilmadi", ru: 'Ничего не найдено', en: 'Nothing found' },
	total: { uz: 'Jami', ru: 'Всего', en: 'Total' },
	match: { uz: 'moslik', ru: 'совпадение', en: 'match' },
	ball: { uz: 'ball', ru: 'балл', en: 'pts' },
	gradeSuffix: { uz: '-sinf', ru: ' кл.', en: ' gr.' },
	// resolve sheet
	resolveTitle: { uz: 'Ishtirokchini bog\'lash', ru: 'Привязать участника', en: 'Resolve participant' },
	excelData: { uz: "Excel ma'lumotlari", ru: 'Данные из Excel', en: 'Excel data' },
	currentlyLinked: { uz: "Hozirda bog'langan", ru: 'Сейчас привязан к', en: 'Currently linked to' },
	candidates: { uz: 'Topilganlar', ru: 'Совпадения', en: 'Candidates' },
	searchDb: { uz: 'Bazada qidirish', ru: 'Поиск по базе', en: 'Search DB' },
	create: { uz: 'Yangi hisob', ru: 'Создать аккаунт', en: 'Create account' },
	searchPlaceholder: { uz: "F.I.SH, telefon yoki ID...", ru: 'ФИО, телефон или ID...', en: 'Name, phone or ID...' },
	noResults: { uz: 'Ishtirokchilar topilmadi', ru: 'Участники не найдены', en: 'No participants found' },
	min2: { uz: 'Kamida 2 ta harf kiriting...', ru: 'Введите минимум 2 символа...', en: 'Type at least 2 characters...' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	school: { uz: 'Maktab', ru: 'Школа', en: 'School' },
	examDetails: { uz: "Imtihon ma'lumotlari (ixtiyoriy)", ru: 'Данные экзамена (необязательно)', en: 'Exam details (optional)' },
	save: { uz: "Saqlash va bog'lash", ru: 'Сохранить и привязать', en: 'Save & link' },
	pickCandidate: { uz: "Ro'yxatdan foydalanuvchini tanlang", ru: 'Выберите пользователя из списка', en: 'Pick a user from the list' },
	missingFields: { uz: 'Ism va familiyani kiriting', ru: 'Заполните имя и фамилию', en: 'Fill in first and last name' },
	saveFailed: { uz: "Saqlab bo'lmadi", ru: 'Не удалось сохранить', en: 'Failed to save' },
	linkedOk: { uz: "Ishtirokchi bog'landi", ru: 'Участник успешно привязан', en: 'Participant linked' },
	// bulk edit
	bulkTitle: { uz: "Imtihon ma'lumotlarini tahrirlash", ru: 'Массовое редактирование экзамена', en: 'Bulk edit exam details' },
	appliesTo: { uz: "ta ishtirokchiga qo'llanadi", ru: 'участникам будет применено', en: 'selected rows' },
	examDate: { uz: 'Imtihon sanasi', ru: 'Дата экзамена', en: 'Exam date' },
	examTime: { uz: 'Imtihon vaqti (HH:MM)', ru: 'Время экзамена (ЧЧ:ММ)', en: 'Exam time (HH:MM)' },
	venue: { uz: "O'tkazish joyi", ru: 'Место проведения', en: 'Venue' },
	venuePh: { uz: 'Masalan: Toshkent sh., TDPU, Bosh bino', ru: 'Например: г. Ташкент, ТДПУ, Главный корпус', en: 'E.g. Tashkent, Main campus' },
	room: { uz: 'Xona / auditoriya', ru: 'Аудитория / кабинет', en: 'Room' },
	seat: { uz: "O'rin raqami", ru: 'Номер места', en: 'Seat number' },
	score: { uz: 'Ball', ru: 'Балл', en: 'Score' },
	message: { uz: "Qo'shimcha xabar / ko'rsatma", ru: 'Дополнительное сообщение / инструкция', en: 'Additional instructions' },
	messagePh: { uz: "O'zingiz bilan guvohnoma va ruchka olib keling", ru: 'С собой иметь свидетельство о рождении и ручку', en: 'Bring your ID and a pen' },
	apply: { uz: "Tanlanganlarga qo'llash", ru: 'Применить к выбранным', en: 'Apply to selected' },
	noChanges: { uz: "Kamida bitta maydonni to'ldiring", ru: 'Заполните хотя бы одно поле', en: 'Fill in at least one field' },
	updated: { uz: 'qator yangilandi', ru: 'строк обновлено', en: 'rows updated' },
};

const statusMeta = (s, tx) => {
	if (s === 'found' || s === 'manually_linked') return { icon: CheckCircle2, color: colors.green, bg: colors.greenSoft, label: tx(s === 'manually_linked' ? L.linked : L.found) };
	if (s === 'possible') return { icon: HelpCircle, color: colors.blue, bg: colors.blueSoft, label: tx(L.possible) };
	return { icon: XCircle, color: colors.muted, bg: colors.cardMuted, label: tx(L.notFound) };
};

const awardPill = (raw) => {
	if (!raw) return null;
	const s = String(raw).trim();
	if (!s) return null;
	const low = s.toLowerCase();
	const tone = /silver|kumush|серебр/.test(low) ? ['🥈', '#475569', '#F1F5F9'] : /bronze|bronza|бронз/.test(low) ? ['🥉', '#C2410C', '#FFF7ED'] : ['🥇', colors.amber, colors.goldTint];
	return <Pill label={`${tone[0]} ${s}`} color={tone[1]} bg={tone[2]} />;
};

// ---------- Resolve one row: pick candidate / search DB / create user + exam fields ----------
const EXAM_KEYS = ['exam_date', 'exam_time', 'venue', 'room', 'seat_number', 'score', 'custom_message'];
const EXAM_LABEL = { exam_date: L.examDate, exam_time: L.examTime, venue: L.venue, room: L.room, seat_number: L.seat, score: L.score, custom_message: L.message };

export const ResolveRowSheet = ({ row, onClose, onResolved }) => {
	const { tx } = useLanguage();
	const toast = useToast();
	const hasCandidates = row.candidates?.length > 0;
	const [mode, setMode] = useState(hasCandidates ? 'candidates' : 'search');
	const [candidateId, setCandidateId] = useState(row.matched_user_info?.id || (hasCandidates ? row.candidates[0]?.user_id : null));
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [picked, setPicked] = useState(null);
	const parts = String(row.raw_full_name || row.raw_data?.full_name || '').trim().split(/\s+/);
	const [newUser, setNewUser] = useState({
		last_name: parts.length >= 2 ? parts[0] : '',
		first_name: parts.length >= 2 ? parts.slice(1).join(' ') : parts[0] || '',
		phone: String(row.raw_data?.phone || '').replace(/[^\d+]/g, ''),
		grade: String(row.grade || row.raw_data?.grade || ''),
		school: row.raw_data?.school || '',
	});
	const [exam, setExam] = useState({
		exam_date: row.exam_date || '', exam_time: row.exam_time || '', venue: row.venue || '', room: row.room || '',
		seat_number: row.seat_number || '', score: String(row.score ?? row.raw_data?.score ?? ''), custom_message: row.custom_message || '',
	});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (mode !== 'search') return;
		const q = query.trim();
		if (q.length < 2) return setResults([]);
		const t = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await api.get(E.USERS, { params: { search: q, page_size: 10 } });
				setResults(res.data.results || res.data || []);
			} catch {}
			setSearching(false);
		}, 300);
		return () => clearTimeout(t);
	}, [query, mode]);

	const save = async () => {
		let payload;
		if (mode === 'candidates') {
			if (!candidateId) return toast.error(tx(L.pickCandidate));
			payload = { matched_user_id: candidateId };
		} else if (mode === 'search') {
			if (!picked) return toast.error(tx(L.pickCandidate));
			payload = { matched_user_id: picked.id };
		} else {
			if (!newUser.first_name.trim() || !newUser.last_name.trim()) return toast.error(tx(L.missingFields));
			payload = { create_new: newUser };
		}
		setSaving(true);
		try {
			await api.post(E.FINAL_ROUND_ROW_RESOLVE(row.id), payload);
			const clean = Object.fromEntries(Object.entries(exam).filter(([, v]) => v !== '' && v !== null));
			if (Object.keys(clean).length) await api.patch(E.FINAL_ROUND_ROW_DETAIL(row.id), clean);
			toast.success(tx(L.linkedOk));
			onResolved();
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.saveFailed));
		}
		setSaving(false);
	};

	const modes = [
		...(hasCandidates ? [{ value: 'candidates', label: `${tx(L.candidates)} (${row.candidates.length})` }] : []),
		{ value: 'search', label: tx(L.searchDb) },
		{ value: 'create', label: tx(L.create) },
	];

	return (
		<Sheet visible onClose={() => !saving && onClose()} title={tx(L.resolveTitle)} scroll maxHeight="94%">
			<View style={{ gap: 12, paddingBottom: 10 }}>
				<View style={styles.banner}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
						<T v="label" style={{ fontSize: 9.5 }}>{tx(L.excelData)}</T>
						<T v="small" style={{ fontSize: 11.5 }}>{[row.grade, row.subject].filter(Boolean).join(' · ')}</T>
					</View>
					<T v="strong" style={{ fontSize: 15 }}>{row.raw_full_name || row.raw_data?.full_name}</T>
					{row.raw_data?.phone ? <T v="small">Tel: {row.raw_data.phone}{row.raw_data?.school ? ` · ${row.raw_data.school}` : ''}</T> : null}
					{row.matched_user_info ? (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
							<CheckCircle2 size={13} color={colors.green} />
							<T v="small" color={colors.green} style={{ flex: 1 }}>{tx(L.currentlyLinked)}: {row.matched_user_info.full_name} ({row.matched_user_info.participant_id})</T>
						</View>
					) : null}
				</View>

				<Segmented value={mode} onChange={setMode} options={modes} />

				{mode === 'candidates' ? row.candidates.map((c) => {
					const on = candidateId === c.user_id;
					return (
						<Tap key={c.user_id} onPress={() => setCandidateId(c.user_id)} style={[styles.option, on && styles.optionOn]}>
							<View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
							<View style={{ flex: 1 }}>
								<T v="strong">{c.full_name}</T>
								<T v="small" style={{ fontSize: 11.5 }}>{c.grade ? `${c.grade}${tx(L.gradeSuffix)} · ` : ''}{c.phone}</T>
							</View>
							<Pill label={`${c.confidence}%`} color={colors.blue} bg={colors.blueSoft} />
						</Tap>
					);
				}) : null}

				{mode === 'search' ? (
					<>
						<Field icon={Search} value={query} onChangeText={setQuery} placeholder={tx(L.searchPlaceholder)} autoFocus right={searching ? <ActivityIndicator size="small" color={colors.goldDeep} /> : null} />
						{!results.length ? <T v="small" style={{ textAlign: 'center' }}>{query.trim().length >= 2 && !searching ? tx(L.noResults) : tx(L.min2)}</T> : results.map((u) => {
							const on = picked?.id === u.id;
							return (
								<Tap key={u.id} onPress={() => setPicked(u)} style={[styles.option, on && styles.optionOn]}>
									<User size={16} color={on ? colors.amber : colors.muted} />
									<View style={{ flex: 1 }}>
										<T v="strong">{`${u.last_name || ''} ${u.first_name || ''}`.trim() || u.username}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{u.participant_id ? `${u.participant_id} · ` : ''}{u.grade ? `${u.grade}${tx(L.gradeSuffix)} · ` : ''}{u.phone}</T>
									</View>
									{on ? <CheckCircle2 size={17} color={colors.amber} /> : null}
								</Tap>
							);
						})}
					</>
				) : null}

				{mode === 'create' ? (
					<>
						<Field label={`${tx(L.lastName)} *`} value={newUser.last_name} onChangeText={(v) => setNewUser((p) => ({ ...p, last_name: v }))} />
						<Field label={`${tx(L.firstName)} *`} value={newUser.first_name} onChangeText={(v) => setNewUser((p) => ({ ...p, first_name: v }))} />
						<Field label={tx(L.phone)} value={newUser.phone} placeholder="+998901234567" keyboardType="phone-pad" onChangeText={(v) => setNewUser((p) => ({ ...p, phone: v }))} />
						<Field label={tx(L.grade)} value={newUser.grade} placeholder="5" keyboardType="number-pad" onChangeText={(v) => setNewUser((p) => ({ ...p, grade: v }))} />
						<Field label={tx(L.school)} value={newUser.school} onChangeText={(v) => setNewUser((p) => ({ ...p, school: v }))} />
					</>
				) : null}

				<T v="label" style={{ marginTop: 6 }}>{tx(L.examDetails)}</T>
				{EXAM_KEYS.map((k) => (k === 'exam_date' ? (
					<DateTimeField key={k} mode="date" label={tx(EXAM_LABEL[k])} value={exam.exam_date} onChange={(v) => setExam((p) => ({ ...p, exam_date: v ? toDay(v) : '' }))} />
				) : k === 'custom_message' ? (
					<TextArea key={k} rows={2} label={tx(EXAM_LABEL[k])} value={exam[k]} onChangeText={(v) => setExam((p) => ({ ...p, [k]: v }))} />
				) : (
					<Field key={k} label={tx(EXAM_LABEL[k])} value={exam[k]} placeholder={k === 'exam_time' ? '10:00' : undefined} keyboardType={k === 'score' ? 'decimal-pad' : k === 'exam_time' ? 'numbers-and-punctuation' : 'default'} onChangeText={(v) => setExam((p) => ({ ...p, [k]: v }))} />
				)))}
				<Button title={tx(L.save)} loading={saving} onPress={save} />
			</View>
		</Sheet>
	);
};

// ---------- Bulk edit exam details for selected rows ----------
export const BulkEditSheet = ({ selectedIds, onClose, onSaved }) => {
	const { tx } = useLanguage();
	const toast = useToast();
	const [form, setForm] = useState({ exam_date: '', exam_time: '', venue: '', room: '', seat_number: '', custom_message: '' });
	const [saving, setSaving] = useState(false);
	const set = (patch) => setForm((f) => ({ ...f, ...patch }));

	const save = async () => {
		const fields = {};
		if (form.exam_date) fields.exam_date = form.exam_date;
		if (form.exam_time) fields.exam_time = form.exam_time;
		['venue', 'room', 'seat_number', 'custom_message'].forEach((k) => { if (form[k].trim()) fields[k] = form[k].trim(); });
		if (!Object.keys(fields).length) return toast.error(tx(L.noChanges));
		setSaving(true);
		try {
			const res = await api.post(E.FINAL_ROUND_ROWS_BULK_EDIT, { ids: selectedIds, fields });
			toast.success(`${res.data?.updated ?? selectedIds.length} ${tx(L.updated)}`);
			onSaved();
			onClose();
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.saveFailed));
		}
		setSaving(false);
	};

	return (
		<Sheet visible onClose={() => !saving && onClose()} title={tx(L.bulkTitle)} scroll maxHeight="92%">
			<View style={{ gap: 12, paddingBottom: 10 }}>
				<T v="small">{selectedIds.length} {tx(L.appliesTo)}</T>
				<DateTimeField mode="date" label={tx(L.examDate)} value={form.exam_date} onChange={(v) => set({ exam_date: v ? toDay(v) : '' })} />
				<Field label={tx(L.examTime)} value={form.exam_time} placeholder="10:00" keyboardType="numbers-and-punctuation" onChangeText={(v) => set({ exam_time: v })} />
				<Field label={tx(L.venue)} value={form.venue} placeholder={tx(L.venuePh)} onChangeText={(v) => set({ venue: v })} />
				<View style={{ flexDirection: 'row', gap: 8 }}>
					<Field style={{ flex: 1 }} label={tx(L.room)} value={form.room} placeholder="204" onChangeText={(v) => set({ room: v })} />
					<Field style={{ flex: 1 }} label={tx(L.seat)} value={form.seat_number} placeholder="12" onChangeText={(v) => set({ seat_number: v })} />
				</View>
				<TextArea rows={2} label={tx(L.message)} value={form.custom_message} placeholder={tx(L.messagePh)} onChangeText={(v) => set({ custom_message: v })} />
				<Button title={tx(L.apply)} icon={Edit3} loading={saving} onPress={save} />
			</View>
		</Sheet>
	);
};

// ---------- Review list with tabs, search, selection, assign permission ----------
export const RowReview = ({ batch, onBatchUpdate }) => {
	const { tx } = useLanguage();
	const toast = useToast();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [count, setCount] = useState(0);
	const [tab, setTab] = useState('all');
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState([]);
	const [resolving, setResolving] = useState(null);
	const [bulkOpen, setBulkOpen] = useState(false);
	const [assigning, setAssigning] = useState(null);

	const fetchRows = useCallback(async () => {
		setLoading(true);
		try {
			const params = { batch: batch.id, page, page_size: PAGE_SIZE };
			if (tab === 'found' || tab === 'possible' || tab === 'not_found') params.match_status = tab;
			else if (tab === 'assigned') params.has_permission = 'true';
			if (search.trim()) params.search = search.trim();
			const res = await api.get(E.FINAL_ROUND_ROWS, { params });
			const list = res.data.results || res.data || [];
			setRows(list);
			setCount(res.data.count ?? list.length);
		} catch {}
		setLoading(false);
	}, [batch.id, page, tab, search]);

	useEffect(() => {
		const t = setTimeout(fetchRows, search ? 300 : 0);
		return () => clearTimeout(t);
	}, [fetchRows]);
	useEffect(() => { setPage(1); }, [tab, search]);

	const refreshStats = async () => {
		try {
			const res = await api.get(E.FINAL_ROUND_BATCH_DETAIL(batch.id));
			onBatchUpdate(res.data);
		} catch {}
	};

	const assign = async (all) => {
		setAssigning(all ? 'all' : 'selected');
		try {
			const res = await api.post(E.FINAL_ROUND_BATCH_ASSIGN(batch.id), all ? { all_matched: true } : { ids: selectedIds });
			toast.success(`${(res.data.assigned || []).length} ${tx(L.assignDone)}`);
			setSelectedIds([]);
			await refreshStats();
			await fetchRows();
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.assignFailed));
		}
		setAssigning(null);
	};

	const toggle = (id) => setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
	const pageIds = rows.map((r) => r.id);
	const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
	const togglePage = () => setSelectedIds(allOnPage ? selectedIds.filter((id) => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])]);
	const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

	const TABS = [
		['all', L.all, batch.total_rows], ['found', L.found, batch.found_count], ['possible', L.possible, batch.possible_count],
		['not_found', L.notFound, batch.not_found_count], ['assigned', L.assigned, batch.permission_assigned_count],
	];

	return (
		<View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
				{TABS.map(([key, label, n]) => {
					const on = tab === key;
					return (
						<Tap key={key} onPress={() => setTab(key)} style={[styles.chip, on && styles.chipOn]}>
							<T style={[styles.chipText, on && { color: colors.navyDeep }]}>{tx(label)} ({n || 0})</T>
						</Tap>
					);
				})}
			</ScrollView>

			{(batch.found_count || 0) > 0 ? <Button size="md" variant="success" icon={ShieldCheck} title={`${tx(L.assignAll)} (${batch.found_count})`} loading={assigning === 'all'} disabled={!!assigning} onPress={() => assign(true)} style={{ marginBottom: 12 }} /> : null}

			<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.search)} style={{ marginBottom: 10 }} />

			<View style={styles.toolbar}>
				<Tap onPress={togglePage} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					<View style={[styles.box, allOnPage && styles.boxOn]}>{allOnPage ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
					<T v="strong" style={{ fontSize: 13 }}>{tx(L.selectPage)} ({rows.length})</T>
				</Tap>
				{selectedIds.length ? <T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(L.selected)}: {selectedIds.length}</T> : null}
			</View>
			{selectedIds.length ? (
				<View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
					<Button style={{ flex: 1 }} size="sm" variant="light" icon={Edit3} title={tx(L.bulkEdit)} onPress={() => setBulkOpen(true)} />
					<Button style={{ flex: 1 }} size="sm" variant="dark" icon={ShieldCheck} title={tx(L.assign)} loading={assigning === 'selected'} disabled={!!assigning} onPress={() => assign(false)} />
				</View>
			) : null}

			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 20 }} /> : !rows.length ? <T v="small" style={{ textAlign: 'center', marginVertical: 20 }}>{tx(L.empty)}</T> : rows.map((row) => {
				const st = statusMeta(row.match_status, tx);
				const on = selectedIds.includes(row.id);
				const score = row.score ?? row.raw_data?.score;
				const award = row.raw_data?.award || (/(gold|silver|bronze|oltin|kumush|bronza)/i.test(row.raw_data?.status || '') ? row.raw_data.status : null);
				const info = row.matched_user_info;
				return (
					<Card key={row.id} style={[{ marginBottom: 10, padding: 14 }, on && { borderColor: colors.goldDeep, backgroundColor: colors.goldTint }]}>
						<View style={{ flexDirection: 'row', gap: 10 }}>
							<Tap onPress={() => toggle(row.id)} style={[styles.box, on && styles.boxOn, { marginTop: 2 }]}>{on ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</Tap>
							<View style={{ flex: 1, gap: 4 }}>
								<T v="strong">{row.raw_full_name || row.raw_data?.full_name || '—'}</T>
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
									{awardPill(award)}
									{score != null && score !== '' ? <Pill label={`${score} ${tx(L.ball)}`} color={colors.purple} bg={colors.purpleSoft} /> : null}
									{row.raw_data?.student_id ? <Pill label={String(row.raw_data.student_id)} /> : null}
								</View>
								<T v="small" style={{ fontSize: 11.5 }}>
									{row.grade ? `${row.grade}${tx(L.gradeSuffix)} · ` : ''}{row.subject || '—'}{row.raw_data?.phone ? ` · ${row.raw_data.phone}` : ''}{row.raw_data?.school ? ` · ${row.raw_data.school}` : ''}
								</T>
								{row.raw_data?._file ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><FileSpreadsheet size={11} color={colors.muted} /><T v="small" style={{ fontSize: 10.5 }} numberOfLines={1}>{row.raw_data._file}</T></View> : null}
							</View>
						</View>
						<View style={styles.matched}>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
								<T v="label" style={{ fontSize: 9.5 }}>{tx(L.matchedUser)}</T>
								{row.match_confidence > 0 ? <T v="small" style={{ fontSize: 11, fontFamily: fonts.bold }} color={colors.blue}>{row.match_confidence}% {tx(L.match)}</T> : null}
							</View>
							{info ? (
								<>
									<T v="strong" style={{ fontSize: 13.5 }}>{info.full_name}</T>
									<T v="small" style={{ fontSize: 11.5 }}>{[info.participant_id, info.grade ? `${info.grade}${tx(L.gradeSuffix)}` : null, info.phone].filter(Boolean).join(' · ')}</T>
								</>
							) : <T v="small" color={colors.muted}>{tx(L.noMatch)}</T>}
						</View>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
							<Pill icon={st.icon} label={st.label} color={st.color} bg={st.bg} />
							<Pill icon={row.has_permission ? ShieldCheck : undefined} label={tx(row.has_permission ? L.granted : L.notGranted)} color={row.has_permission ? colors.amber : colors.muted} bg={row.has_permission ? colors.goldTint : colors.cardMuted} />
							<View style={{ flex: 1 }} />
							<Button size="sm" variant="light" icon={UserPlus} title={tx(L.resolve)} onPress={() => setResolving(row)} />
						</View>
					</Card>
				);
			})}

			{totalPages > 1 ? (
				<View style={styles.pager}>
					<IconButton icon={ChevronLeft} onPress={() => setPage((p) => Math.max(1, p - 1))} style={{ opacity: page <= 1 ? 0.4 : 1 }} />
					<T v="strong">{page} / {totalPages} · {tx(L.total)}: {count}</T>
					<IconButton icon={ChevronRight} onPress={() => setPage((p) => Math.min(totalPages, p + 1))} style={{ opacity: page >= totalPages ? 0.4 : 1 }} />
				</View>
			) : null}

			{resolving ? <ResolveRowSheet row={resolving} onClose={() => setResolving(null)} onResolved={async () => { setResolving(null); await refreshStats(); await fetchRows(); }} /> : null}
			{bulkOpen ? <BulkEditSheet selectedIds={selectedIds} onClose={() => setBulkOpen(false)} onSaved={() => { setSelectedIds([]); fetchRows(); }} /> : null}
		</View>
	);
};

const styles = StyleSheet.create({
	chip: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
	chipOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	chipText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.ink2 },
	toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
	box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
	boxOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	matched: { marginTop: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, gap: 2 },
	pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
	banner: { padding: 12, borderRadius: radius.md, backgroundColor: colors.goldTint, gap: 3 },
	option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
	optionOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
	radioOn: { borderColor: colors.goldDeep },
	radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.goldDeep },
});
