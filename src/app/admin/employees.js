import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Check, Edit2, Eye, EyeOff, Key, Lock, Phone, Search, ShieldAlert, Trash2, User, UserPlus, X } from 'lucide-react-native';
import api, { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAdmin } from '../../context/AdminContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Segmented, Sheet, SkeletonCard, T, Tap } from '../../components/ui';
import { TextArea } from '../../components/form';
import { phoneMask } from '../../components/admin/userShared';
import { colors, radius } from '../../theme';
import { formatShortDate } from '../../utils/format';

const L = {
	title: { uz: 'Xodimlar', ru: 'Сотрудники', en: 'Employees' },
	subtitle: { uz: 'Koordinatorlarni boshqarish', ru: 'Управление координаторами', en: 'Manage coordinators' },
	requests: { uz: "Tahrirlash so'rovlari", ru: 'Запросы на правку', en: 'Edit requests' },
	requestsSub: { uz: "Ma'lumotlarni o'zgartirish so'rovlarini ko'rib chiqish", ru: 'Рассмотрение запросов на изменение данных', en: 'Review data modification requests' },
	pending: { uz: 'Kutilmoqda', ru: 'Ожидают', en: 'Pending' },
	all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	approved: { uz: 'Tasdiqlangan', ru: 'Одобрено', en: 'Approved' },
	rejected: { uz: 'Rad etilgan', ru: 'Отклонено', en: 'Rejected' },
	approve: { uz: 'Tasdiqlash', ru: 'Одобрить', en: 'Approve' },
	reject: { uz: 'Rad etish', ru: 'Отклонить', en: 'Reject' },
	proposedBy: { uz: 'Taklif qildi', ru: 'Предложил', en: 'Proposed by' },
	field: { uz: 'Maydon', ru: 'Поле', en: 'Field' },
	coordinatorNote: { uz: 'Koordinator izohi', ru: 'Комментарий координатора', en: 'Coordinator note' },
	adminNote: { uz: 'Admin izohi', ru: 'Комментарий администратора', en: 'Admin note' },
	note: { uz: 'Izoh (ixtiyoriy)', ru: 'Комментарий (необязательно)', en: 'Note (optional)' },
	noRequests: { uz: "So'rovlar yo'q", ru: 'Запросов нет', en: 'No requests' },
	deleteRequest: { uz: "Tahrirlash so'rovini o'chirish?", ru: 'Удалить запрос на правку?', en: 'Delete edit request?' },
	requestDeleted: { uz: "So'rov o'chirildi", ru: 'Запрос удален', en: 'Request deleted' },
	done: { uz: 'Bajarildi', ru: 'Выполнено', en: 'Done' },
	error: { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
	search: { uz: 'Qidirish...', ru: 'Поиск...', en: 'Search...' },
	noEmployees: { uz: 'Xodimlar topilmadi', ru: 'Сотрудники не найдены', en: 'No employees found' },
	addEmployee: { uz: "Xodim qo'shish", ru: 'Добавить сотрудника', en: 'Add employee' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	confirmPassword: { uz: 'Parolni tasdiqlang', ru: 'Подтвердите пароль', en: 'Confirm password' },
	required: { uz: 'Majburiy', ru: 'Обязательно', en: 'Required' },
	passShort: { uz: 'Parol juda qisqa', ru: 'Пароль слишком короткий', en: 'Password too short' },
	passMismatch: { uz: 'Parollar mos kelmadi', ru: 'Пароли не совпадают', en: 'Passwords mismatch' },
	fillAll: { uz: "Barcha maydonlarni to'ldiring", ru: 'Заполните все обязательные поля', en: 'Fill all required fields' },
	created: { uz: "Xodim qo'shildi", ru: 'Сотрудник добавлен', en: 'Employee added' },
	updated: { uz: 'Xodim yangilandi', ru: 'Сотрудник обновлен', en: 'Employee updated' },
	deleted: { uz: "Xodim o'chirildi", ru: 'Сотрудник удален', en: 'Employee deleted' },
	deleteTitle: { uz: "Xodimni o'chirish?", ru: 'Удалить сотрудника?', en: 'Delete employee?' },
	resetPass: { uz: 'Parolni yangilash', ru: 'Сброс пароля', en: 'Reset password' },
	newPass: { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New password' },
	passResetOk: { uz: "Parol o'zgartirildi", ru: 'Пароль изменен', en: 'Password changed' },
	edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	loadMore: { uz: 'Yana yuklash', ru: 'Загрузить ещё', en: 'Load more' },
	coordinator: { uz: 'Koordinator', ru: 'Координатор', en: 'Coordinator' },
};

const FIELD_LABELS = {
	first_name: { uz: 'Ism', ru: 'Имя', en: 'First Name' }, last_name: { uz: 'Familiya', ru: 'Фамилия', en: 'Last Name' }, middle_name: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle Name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' }, school: { uz: 'Maktab', ru: 'Школа', en: 'School' }, grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	birth_date: { uz: "Tug'ilgan sana", ru: 'Дата рождения', en: 'Birth Date' }, region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	teacher_name: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher Name' }, teacher_phone: { uz: "O'qituvchi telefoni", ru: 'Телефон учителя', en: 'Teacher Phone' },
	score: { uz: 'Ball', ru: 'Балл', en: 'Score' }, teachers: { uz: "O'qituvchilar", ru: 'Учителя', en: 'Teachers' }, new_password: { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New Password' },
	answers_json: { uz: 'Javoblar', ru: 'Ответы', en: 'Answers' }, payment_status: { uz: "To'lov holati", ru: 'Статус оплаты', en: 'Payment Status' },
	register_olympiad_title: { uz: "Olimpiadaga ro'yxatdan o'tish", ru: 'Регистрация на олимпиаду', en: 'Olympiad Registration' },
};
const PAY = { paid: { uz: "To'langan", ru: 'Оплачено', en: 'Paid' }, pending: { uz: 'Kutilmoqda', ru: 'Ожидание', en: 'Pending' }, free: { uz: 'Bepul', ru: 'Бесплатно', en: 'Free' }, expired: { uz: "Muddati o'tgan", ru: 'Истекло', en: 'Expired' } };

const emptyCreate = { role: 'coordinator', first_name: '', last_name: '', middle_name: '', phone: '+998', password: '', confirmPassword: '' };

export default function Employees() {
	const { tx, lang, pick } = useLanguage();
	const { regions } = useAuth();
	const toast = useToast();
	const { refreshCounts } = useAdmin();
	const [tab, setTab] = useState('employees');
	const [search, setSearch] = useState('');
	const [list, setList] = useState([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState([]);
	const [reqLoading, setReqLoading] = useState(false);
	const [reqFilter, setReqFilter] = useState('pending');
	const [decision, setDecision] = useState(null); // { id, kind, note, loading }
	const [confirm, setConfirm] = useState(null);
	const [selected, setSelected] = useState(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [errors, setErrors] = useState({});
	const [showPass, setShowPass] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPass, setNewPass] = useState('');
	const [createOpen, setCreateOpen] = useState(false);
	const [create, setCreate] = useState(emptyCreate);
	const [busy, setBusy] = useState(null);

	const load = useCallback(async (p = 1) => {
		setLoading(p === 1);
		try {
			const res = await api.get('users/', { params: { role: 'coordinator', search: search.trim() || undefined, page: p, page_size: 20 } });
			const items = res.data.results || [];
			setList((prev) => (p === 1 ? items : [...prev, ...items]));
			setCount(res.data.count || 0);
			setHasMore(!!res.data.next);
			setPage(p);
		} catch {
			toast.error(tx(L.noEmployees));
		}
		setLoading(false);
	}, [search]);

	useEffect(() => {
		const t = setTimeout(() => load(1), 350);
		return () => clearTimeout(t);
	}, [load]);

	const loadRequests = useCallback(async () => {
		setReqLoading(true);
		try {
			const res = await api.get('edit-requests/');
			setRequests(res.data.results || res.data || []);
			refreshCounts();
		} catch {
			toast.error(tx(L.error));
		}
		setReqLoading(false);
	}, []);

	useEffect(() => {
		loadRequests();
	}, [loadRequests]);

	const regName = (id) => pick(regions.find((r) => r.id === parseInt(id, 10)), 'name') || id;
	const fmt = (key, val) => {
		if (val === null || val === undefined || val === '') return '—';
		if (key === 'region') return regName(val);
		if (key === 'teachers') return Array.isArray(val) && val.length ? val.map((t) => `${t.name || '—'} (${t.phone || '—'})`).join('; ') : '—';
		if (key === 'answers_json') return val && typeof val === 'object' ? Object.entries(val).map(([q, a]) => `Q${q}: ${a}`).join(', ') : '—';
		if (key === 'new_password') return '••••••';
		if (key === 'payment_status') return PAY[val] ? tx(PAY[val]) : val;
		return String(val);
	};

	const decide = async () => {
		setDecision((d) => ({ ...d, loading: true }));
		try {
			await api.post(`edit-requests/${decision.id}/${decision.kind}/`, { admin_note: decision.note });
			toast.success(tx(L.done));
			setDecision(null);
			loadRequests();
			if (decision.kind === 'approve') load(1);
		} catch {
			toast.error(tx(L.error));
			setDecision((d) => ({ ...d, loading: false }));
		}
	};

	const saveEdit = async () => {
		const e = {};
		['last_name', 'first_name', 'middle_name'].forEach((k) => { if (!form[k]) e[k] = tx(L.required); });
		if (!form.phone || form.phone === '+998') e.phone = tx(L.required);
		setErrors(e);
		if (Object.keys(e).length) return toast.error(tx(L.fillAll));
		setBusy('save');
		try {
			const res = await api.patch(`users/${selected.id}/`, { first_name: form.first_name, last_name: form.last_name, middle_name: form.middle_name, phone: form.phone });
			toast.success(tx(L.updated));
			setSelected(res.data);
			setEditing(false);
			load(1);
		} catch (err) {
			toast.error(errorMessage(err));
		}
		setBusy(null);
	};

	const resetPassword = async () => {
		if (!newPass || newPass.length < 6) return toast.error(tx(L.passShort));
		setBusy('reset');
		try {
			const res = await api.post(`users/${selected.id}/reset_password/`, { new_password: newPass });
			if (res.data.success) {
				toast.success(tx(L.passResetOk));
				setSelected((s) => ({ ...s, password_text: newPass }));
				setResetOpen(false);
				setNewPass('');
			}
		} catch (err) {
			toast.error(errorMessage(err));
		}
		setBusy(null);
	};

	const createEmployee = async () => {
		const e = {};
		['last_name', 'first_name', 'middle_name'].forEach((k) => { if (!create[k]) e[k] = tx(L.required); });
		if (!create.phone || create.phone === '+998') e.phone = tx(L.required);
		if (!create.password) e.password = tx(L.required);
		else if (create.password.length < 6) e.password = tx(L.passShort);
		if (!create.confirmPassword) e.confirmPassword = tx(L.required);
		else if (create.password !== create.confirmPassword) e.confirmPassword = tx(L.passMismatch);
		setErrors(e);
		if (Object.keys(e).length) return toast.error(tx(L.fillAll));
		setBusy('create');
		try {
			await api.post('users/', { ...create, username: `${create.phone.replace(/\D/g, '')}_${Math.random().toString(36).substring(2, 7)}` });
			toast.success(tx(L.created));
			setCreateOpen(false);
			setCreate(emptyCreate);
			load(1);
		} catch (err) {
			toast.error(errorMessage(err));
		}
		setBusy(null);
	};

	const pendingCount = requests.filter((r) => r.status === 'pending').length;
	const shownRequests = requests.filter((r) => reqFilter === 'all' || r.status === 'pending');

	return (
		<Screen header={<StackHeader right={tab === 'employees' ? <IconButton icon={UserPlus} bg={colors.gold} color={colors.navyDeep} onPress={() => { setErrors({}); setCreateOpen(true); }} /> : null} />} onRefresh={() => (tab === 'employees' ? load(1) : loadRequests())}>
			<LargeTitle title={tx(tab === 'employees' ? L.title : L.requests)} subtitle={tab === 'employees' ? `${count} · ${tx(L.subtitle)}` : tx(L.requestsSub)} />
			<Segmented value={tab} onChange={setTab} style={{ marginBottom: 14 }} options={[{ value: 'employees', label: tx(L.title) }, { value: 'requests', label: tx(L.requests), badge: pendingCount || null }]} />

			{tab === 'employees' ? (
				<>
					<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.search)} style={{ marginBottom: 12 }} />
					{loading ? <SkeletonCard /> : !list.length ? <EmptyState icon={User} title={tx(L.noEmployees)} /> : list.map((emp) => (
						<Card key={emp.id} onPress={() => { setSelected(emp); setEditing(false); setShowPass(false); }} style={{ marginBottom: 10, padding: 14 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
								<View style={styles.avatar}><ShieldAlert size={18} color={colors.navy} /></View>
								<View style={{ flex: 1 }}>
									<T v="strong">{emp.last_name} {emp.first_name}</T>
									<T v="small" style={{ fontSize: 12 }}>{emp.phone} · ID: {emp.participant_id || emp.id}</T>
								</View>
								<Tap onPress={() => setConfirm({ title: tx(L.deleteTitle), message: `${emp.first_name} ${emp.last_name}`, onConfirm: async () => { try { await api.delete(`users/${emp.id}/`); toast.success(tx(L.deleted)); load(1); } catch (err) { toast.error(errorMessage(err)); } } })} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap>
							</View>
						</Card>
					))}
					{hasMore && !loading ? <Button size="md" variant="light" title={tx(L.loadMore)} onPress={() => load(page + 1)} /> : null}
				</>
			) : (
				<>
					<Segmented value={reqFilter} onChange={setReqFilter} style={{ marginBottom: 12 }} options={[{ value: 'pending', label: tx(L.pending) }, { value: 'all', label: tx(L.all) }]} />
					{reqLoading ? <ActivityIndicator color={colors.goldDeep} /> : !shownRequests.length ? <EmptyState icon={Check} title={tx(L.noRequests)} /> : shownRequests.map((req) => {
						const changes = Object.entries(req.proposed_changes || {}).filter(([k]) => !k.startsWith('_'));
						const [who, ...rest] = String(req.target_display || '').split('—');
						const tone = req.status === 'approved' ? [colors.green, colors.greenSoft] : req.status === 'rejected' ? [colors.red, colors.redSoft] : [colors.amber, colors.goldTint];
						return (
							<Card key={req.id} style={{ marginBottom: 12 }}>
								<View style={{ flexDirection: 'row', gap: 10 }}>
									<View style={{ flex: 1 }}>
										<T v="strong">{who.trim()}</T>
										{rest.length ? <T v="small" style={{ fontSize: 12.5 }}>{rest.join('—').trim()}</T> : null}
										<T v="small" style={{ fontSize: 11.5, marginTop: 2 }}>{tx(L.proposedBy)}: {req.coordinator_name} · {formatShortDate(req.created_at, lang)}</T>
									</View>
									<Pill label={tx(req.status === 'approved' ? L.approved : req.status === 'rejected' ? L.rejected : L.pending)} color={tone[0]} bg={tone[1]} />
								</View>
								<View style={{ gap: 6, marginTop: 12 }}>
									{changes.map(([key, val]) => (
										<View key={key} style={styles.change}>
											<T v="label" style={{ fontSize: 9.5 }}>{FIELD_LABELS[key] ? tx(FIELD_LABELS[key]) : key}</T>
											<T v="small" style={{ textDecorationLine: 'line-through', color: colors.red }}>{fmt(key, req.current_data?.[key])}</T>
											<T v="strong" style={{ fontSize: 13.5 }} color={colors.green}>{fmt(key, val)}</T>
										</View>
									))}
								</View>
								{req.proposed_changes?._reason ? <View style={[styles.note, { backgroundColor: colors.blueSoft }]}><T v="label" style={{ fontSize: 9.5 }}>{tx(L.coordinatorNote)}</T><T v="small" style={{ color: colors.ink2 }}>{req.proposed_changes._reason}</T></View> : null}
								{req.admin_note ? <View style={[styles.note, { backgroundColor: colors.cardMuted }]}><T v="label" style={{ fontSize: 9.5 }}>{tx(L.adminNote)}</T><T v="small" style={{ color: colors.ink2 }}>{req.admin_note}</T></View> : null}
								<View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
									{req.status === 'pending' ? (
										<>
											<Button style={{ flex: 1 }} size="sm" variant="light" icon={X} title={tx(L.reject)} onPress={() => setDecision({ id: req.id, kind: 'reject', note: '' })} />
											<Button style={{ flex: 1 }} size="sm" variant="success" icon={Check} title={tx(L.approve)} onPress={() => setDecision({ id: req.id, kind: 'approve', note: '' })} />
										</>
									) : <View style={{ flex: 1 }} />}
									<Tap onPress={() => setConfirm({ title: tx(L.deleteRequest), message: req.coordinator_name, onConfirm: async () => { try { await api.delete(`edit-requests/${req.id}/`); toast.success(tx(L.requestDeleted)); loadRequests(); } catch (err) { toast.error(errorMessage(err)); } } })} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap>
								</View>
							</Card>
						);
					})}
				</>
			)}

			<Sheet visible={!!decision} onClose={() => !decision?.loading && setDecision(null)} title={decision ? tx(decision.kind === 'approve' ? L.approve : L.reject) : ''}>
				{decision ? (
					<View style={{ gap: 12 }}>
						<TextArea rows={3} label={tx(L.note)} value={decision.note} onChangeText={(v) => setDecision((d) => ({ ...d, note: v }))} />
						<Button title={tx(decision.kind === 'approve' ? L.approve : L.reject)} variant={decision.kind === 'approve' ? 'success' : 'danger'} loading={decision.loading} onPress={decide} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.last_name} ${selected.first_name}` : ''} scroll maxHeight="92%">
				{selected ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<Pill label={tx(L.coordinator)} color={colors.navy} bg={colors.navySoft} />
						{editing ? (
							<>
								{['last_name', 'first_name', 'middle_name'].map((k) => (
									<Field key={k} label={tx(L[{ last_name: 'lastName', first_name: 'firstName', middle_name: 'middleName' }[k]])} value={form[k] || ''} error={errors[k]} onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))} />
								))}
								<Field label={tx(L.phone)} icon={Phone} value={form.phone || '+998'} error={errors.phone} keyboardType="phone-pad" onChangeText={(v) => setForm((f) => ({ ...f, phone: phoneMask(v) }))} />
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.cancel)} onPress={() => setEditing(false)} />
									<Button style={{ flex: 1.4 }} size="md" title={tx(L.save)} loading={busy === 'save'} onPress={saveEdit} />
								</View>
							</>
						) : (
							<>
								{[['lastName', selected.last_name], ['firstName', selected.first_name], ['middleName', selected.middle_name], ['phone', selected.phone]].map(([k, v]) => (
									<View key={k} style={styles.row}><T v="small" style={{ width: 120 }}>{tx(L[k])}</T><T v="strong" style={{ flex: 1 }} selectable>{v || '—'}</T></View>
								))}
								<View style={styles.row}>
									<T v="small" style={{ width: 120 }}>{tx(L.password)}</T>
									<T v="strong" style={{ flex: 1 }} selectable>{showPass ? selected.password_text || '—' : '••••••••'}</T>
									{selected.password_text ? <Tap onPress={() => setShowPass((v) => !v)}>{showPass ? <EyeOff size={17} color={colors.muted} /> : <Eye size={17} color={colors.muted} />}</Tap> : null}
								</View>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<Button style={{ flex: 1 }} size="md" variant="light" icon={Edit2} title={tx(L.edit)} onPress={() => { setForm({ ...selected }); setErrors({}); setEditing(true); }} />
									<Button style={{ flex: 1 }} size="md" variant="dark" icon={Key} title={tx(L.resetPass)} onPress={() => setResetOpen(true)} />
								</View>
								{resetOpen ? (
									<View style={{ gap: 10 }}>
										<Field label={tx(L.newPass)} icon={Lock} value={newPass} onChangeText={setNewPass} autoCapitalize="none" />
										<Button size="md" title={tx(L.resetPass)} loading={busy === 'reset'} disabled={!newPass} onPress={resetPassword} />
									</View>
								) : null}
							</>
						)}
					</View>
				) : null}
			</Sheet>

			<Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title={tx(L.addEmployee)} scroll maxHeight="92%">
				<View style={{ gap: 12, paddingBottom: 10 }}>
					{['first_name', 'last_name', 'middle_name'].map((k) => (
						<Field key={k} label={`${tx(L[{ last_name: 'lastName', first_name: 'firstName', middle_name: 'middleName' }[k]])} *`} value={create[k]} error={errors[k]} onChangeText={(v) => setCreate((f) => ({ ...f, [k]: v }))} />
					))}
					<Field label={`${tx(L.phone)} *`} icon={Phone} value={create.phone} error={errors.phone} keyboardType="phone-pad" onChangeText={(v) => setCreate((f) => ({ ...f, phone: phoneMask(v) }))} />
					<Field label={`${tx(L.password)} *`} icon={Lock} secure value={create.password} error={errors.password} autoCapitalize="none" onChangeText={(v) => setCreate((f) => ({ ...f, password: v }))} />
					<Field label={`${tx(L.confirmPassword)} *`} icon={Lock} secure value={create.confirmPassword} error={errors.confirmPassword} autoCapitalize="none" onChangeText={(v) => setCreate((f) => ({ ...f, confirmPassword: v }))} />
					<Button title={tx(L.addEmployee)} icon={UserPlus} loading={busy === 'create'} onPress={createEmployee} />
				</View>
			</Sheet>

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={Trash2}
				tone="red"
				title={confirm?.title}
				message={confirm?.message}
				actions={[
					{ title: tx(L.yesDelete), variant: 'danger', onPress: () => { const c = confirm; setConfirm(null); c.onConfirm(); } },
					{ title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
	del: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
	change: { padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, gap: 2 },
	note: { padding: 10, borderRadius: radius.md, marginTop: 8, gap: 2 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
