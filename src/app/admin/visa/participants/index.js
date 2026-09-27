import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as XLSX from 'xlsx';
import { AlertTriangle, Check, Clock, FileSpreadsheet, Filter, Plane, Plus, Search, Trash2, UserCheck } from 'lucide-react-native';
import api from '../../../../api/client';
import E from '../../../../api/endpoints';
import { useLanguage } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, SelectField, Sheet, T, Tap } from '../../../../components/ui';
import { NumberField } from '../../../../components/form';
import { STATUS_OPTIONS, VisaBell, VisaNav, apiError, fetchAllApplicants, fetchStaff, statusTone, useStatusLabel } from '../../../../components/admin/visa';
import { colors, fonts, radius } from '../../../../theme';
import { formatMoney } from '../../../../utils/format';
import { shareFile } from '../../../../utils/files';

const L = {
	title: { uz: 'Ishtirokchilar', ru: 'Участники', en: 'Applicants' },
	subtitle: { uz: 'Viza rasmiylashtirishdagi ishtirokchilar hisobi', ru: 'Учёт участников на визовом оформлении', en: 'Applicants going through visa processing' },
	search: { uz: 'Qidirish (ism, telefon, pasport)...', ru: 'Поиск (имя, телефон, паспорт)...', en: 'Search (name, phone, passport)...' },
	allStatuses: { uz: 'Barcha statuslar', ru: 'Все статусы', en: 'All statuses' },
	noResults: { uz: 'Ishtirokchilar topilmadi', ru: 'Участники не найдены', en: 'No applicants found' },
	notAssigned: { uz: 'Tayinlanmagan', ru: 'Не назначен', en: 'Not assigned' },
	newApplicant: { uz: 'Yangi ishtirokchi', ru: 'Новый участник', en: 'New applicant' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	country: { uz: 'Mamlakat', ru: 'Страна', en: 'Country' },
	program: { uz: 'Dastur', ru: 'Программа', en: 'Program' },
	payment: { uz: "Kerakli to'lov (UZS)", ru: 'Требуемая оплата (UZS)', en: 'Payment required (UZS)' },
	assignTo: { uz: "Mas'ul tayinlash", ru: 'Назначить ответственного', en: 'Assign to' },
	none: { uz: "Mas'ulsiz", ru: 'Без ответственного', en: 'Unassigned' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	createErr: { uz: 'Yaratishda xatolik', ru: 'Ошибка при создании', en: 'Error creating applicant' },
	created: { uz: "Ishtirokchi qo'shildi", ru: 'Участник добавлен', en: 'Applicant added' },
	fillRequired: { uz: 'Ism, familiya va mamlakatni kiriting', ru: 'Заполните имя, фамилию и страну', en: 'Fill in first name, last name and country' },
	stale: { uz: "5+ kun aloqa yo'q", ru: 'Не на связи 5+ дней', en: 'No contact 5+ days' },
	selected: { uz: 'Tanlandi', ru: 'Выбрано', en: 'Selected' },
	changeStatus: { uz: "Statusni o'zgartirish", ru: 'Изменить статус', en: 'Change status' },
	assign: { uz: 'Tayinlash', ru: 'Назначить', en: 'Assign' },
	exportSelected: { uz: 'Excel', ru: 'Excel', en: 'Excel' },
	bulkOk: { uz: "O'zgarishlar qo'llandi", ru: 'Изменения применены', en: 'Changes applied' },
	bulkErr: { uz: "O'zgarishlarni qo'llab bo'lmadi", ru: 'Не удалось применить изменения', en: 'Failed to apply changes' },
	delete: { uz: "O'chirish", ru: 'Удалить', en: 'Delete' },
	confirmDelete: { uz: "Tanlangan ishtirokchilarni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.", ru: 'Удалить выбранных участников? Это действие нельзя отменить.', en: 'Delete the selected applicants? This cannot be undone.' },
	deletedOk: { uz: "Ishtirokchilar o'chirildi", ru: 'Участники удалены', en: 'Applicants deleted' },
	deleteErr: { uz: "O'chirib bo'lmadi", ru: 'Не удалось удалить', en: 'Failed to delete' },
	selectAll: { uz: 'Hammasini tanlash', ru: 'Выбрать всех', en: 'Select all' },
	debt: { uz: 'Qarz', ru: 'Долг', en: 'Debt' },
	loadErr: { uz: "Ro'yxatni yuklashda xatolik", ru: 'Не удалось загрузить список', en: 'Failed to load the list' },
	status: { uz: 'Status', ru: 'Статус', en: 'Status' },
};

const emptyForm = { first_name: '', last_name: '', middle_name: '', phone: '', email: '', country: '', program_name: '', payment_required: '0', assigned_to: '' };
const isStale = (a) => !a.last_contact_date || Date.now() - new Date(a.last_contact_date).getTime() > 5 * 86400000;

export default function VisaApplicants() {
	const { tx } = useLanguage();
	const toast = useToast();
	const statusLabel = useStatusLabel();
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [staleOnly, setStaleOnly] = useState(false);
	const [staff, setStaff] = useState([]);
	const [selected, setSelected] = useState([]);
	const [bulk, setBulk] = useState(null); // 'status' | 'assign'
	const [bulkValue, setBulkValue] = useState('');
	const [acting, setActing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [creating, setCreating] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setApplicants(await fetchAllApplicants({ search: search || undefined, status: statusFilter || undefined }));
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, [search, statusFilter]);

	useEffect(() => { fetchStaff().then(setStaff).catch(() => {}); }, []);
	useEffect(() => {
		const t = setTimeout(load, 350);
		return () => clearTimeout(t);
	}, [load]);

	const visible = useMemo(() => (staleOnly ? applicants.filter(isStale) : applicants), [applicants, staleOnly]);
	const staffOptions = [{ value: '', label: tx(L.none) }, ...staff.map((u) => ({ value: String(u.id), label: `${u.last_name} ${u.first_name}` }))];
	const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
	const allSelected = visible.length > 0 && selected.length === visible.length;

	const applyBulk = async () => {
		if (bulk === 'status' && !bulkValue) return;
		setActing(true);
		try {
			if (bulk === 'status') await api.post(E.VISA_APPLICANT_BULK_STATUS, { ids: selected, status: bulkValue });
			else await api.post(E.VISA_APPLICANT_BULK_ASSIGN, { ids: selected, assigned_to: bulkValue || null });
			toast.success(tx(L.bulkOk));
			setSelected([]);
			setBulk(null);
			setBulkValue('');
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.bulkErr)));
		}
		setActing(false);
	};

	const exportSelected = async () => {
		const rows = applicants.filter((a) => selected.includes(a.id));
		if (!rows.length) return;
		const data = rows.map((a) => [a.full_name, a.phone, a.email, a.country, a.program_name, statusLabel(a.status), a.assigned_to_name || '', a.payment_required, a.payment_paid, a.debt, a.embassy_appointment_date ? new Date(a.embassy_appointment_date).toLocaleString() : '']);
		const headers = ['ФИО', 'Телефон', 'Email', 'Страна', 'Программа', 'Статус', 'Ответственный', 'Требуется', 'Оплачено', 'Долг', 'Дата записи'];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...data]), 'Sheet1');
		await shareFile(XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), `visa_selected_${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').catch(() => {});
	};

	const bulkDelete = async () => {
		setActing(true);
		try {
			await Promise.all(selected.map((id) => api.delete(E.VISA_APPLICANT_DETAIL(id))));
			toast.success(tx(L.deletedOk));
			setSelected([]);
			setConfirmDelete(false);
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.deleteErr)));
		}
		setActing(false);
	};

	const create = async () => {
		if (!form.first_name.trim() || !form.last_name.trim() || !form.country.trim()) return toast.error(tx(L.fillRequired));
		setCreating(true);
		try {
			const res = await api.post(E.VISA_APPLICANTS, { ...form, assigned_to: form.assigned_to || null, payment_required: parseInt(form.payment_required, 10) || 0 });
			toast.success(tx(L.created));
			setCreateOpen(false);
			setForm(emptyForm);
			load();
			router.push(`/admin/visa/participants/${res.data.id}`);
		} catch (err) {
			toast.error(apiError(err, tx(L.createErr)));
		}
		setCreating(false);
	};

	const set = (patch) => setForm((f) => ({ ...f, ...patch }));

	return (
		<Screen header={<StackHeader onBack={() => router.back()} right={<View style={{ flexDirection: 'row', gap: 8 }}><VisaBell /><IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={() => setCreateOpen(true)} /></View>} />} onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<VisaNav />

			<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.search)} style={{ marginBottom: 10 }} />
			<View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
				<View style={{ flex: 1 }}>
					<SelectField title={tx(L.status)} icon={Filter} value={statusFilter} placeholder={tx(L.allStatuses)} options={[{ value: '', label: tx(L.allStatuses) }, ...STATUS_OPTIONS.map((s) => ({ value: s.value, label: tx(s) }))]} onChange={setStatusFilter} />
				</View>
				<Tap onPress={() => setStaleOnly((v) => !v)} style={[styles.stale, staleOnly && styles.staleOn]}>
					<Clock size={14} color={staleOnly ? colors.navyDeep : colors.muted} />
					<T style={[styles.staleText, staleOnly && { color: colors.navyDeep }]}>{tx(L.stale)}</T>
				</Tap>
			</View>

			{visible.length ? (
				<View style={styles.selectBar}>
					<Tap onPress={() => setSelected(allSelected ? [] : visible.map((a) => a.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
						<View style={[styles.box, allSelected && styles.boxOn]}>{allSelected ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
						<T v="strong" style={{ fontSize: 13 }}>{tx(L.selectAll)} ({visible.length})</T>
					</Tap>
					{selected.length ? <T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(L.selected)}: {selected.length}</T> : null}
				</View>
			) : null}
			{selected.length ? (
				<View style={styles.bulkRow}>
					<Button style={{ flex: 1 }} size="sm" variant="light" title={tx(L.changeStatus)} onPress={() => { setBulk('status'); setBulkValue(''); }} />
					<Button style={{ flex: 1 }} size="sm" variant="light" icon={UserCheck} title={tx(L.assign)} onPress={() => { setBulk('assign'); setBulkValue(''); }} />
					<IconButton icon={FileSpreadsheet} color={colors.green} size={40} onPress={exportSelected} />
					<IconButton icon={Trash2} color={colors.red} size={40} onPress={() => setConfirmDelete(true)} />
				</View>
			) : null}

			{loading && !applicants.length ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 20 }} /> : !visible.length ? <EmptyState icon={Plane} title={tx(L.noResults)} /> : visible.map((a) => {
				const on = selected.includes(a.id);
				const [c, bg] = statusTone(a.status);
				return (
					<Card key={a.id} onPress={() => router.push(`/admin/visa/participants/${a.id}`)} style={[{ marginBottom: 10, padding: 14 }, on && { borderColor: colors.goldDeep, backgroundColor: colors.goldTint }]}>
						<View style={{ flexDirection: 'row', gap: 10 }}>
							<Tap onPress={() => toggle(a.id)} style={[styles.box, on && styles.boxOn, { marginTop: 2 }]} hitSlop={8}>{on ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</Tap>
							<View style={{ flex: 1, gap: 3 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<T v="strong" style={{ flexShrink: 1 }} numberOfLines={1}>{a.full_name}</T>
									{a.has_expired_documents || a.has_documents_needing_replacement ? <AlertTriangle size={14} color={colors.red} /> : null}
								</View>
								<T v="small" style={{ fontSize: 12 }}>{a.phone}</T>
								<T v="small" style={{ fontSize: 12 }}>{a.country}{a.olympiad_title || a.program_name ? ` · ${a.olympiad_title || a.program_name}` : ''}</T>
							</View>
						</View>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
							<Pill label={statusLabel(a.status)} color={c} bg={bg} />
							{a.debt > 0 ? <Pill label={`${tx(L.debt)}: ${formatMoney(a.debt)} UZS`} color={colors.red} bg={colors.redSoft} /> : null}
							<T v="small" style={{ fontSize: 11.5, marginLeft: 'auto' }}>{a.assigned_to_name || tx(L.notAssigned)}</T>
						</View>
					</Card>
				);
			})}

			<Sheet visible={!!bulk} onClose={() => !acting && setBulk(null)} title={bulk === 'status' ? tx(L.changeStatus) : tx(L.assign)}>
				<View style={{ gap: 12 }}>
					<T v="small">{tx(L.selected)}: {selected.length}</T>
					<SelectField
						title={bulk === 'status' ? tx(L.changeStatus) : tx(L.assignTo)}
						value={bulkValue}
						placeholder={bulk === 'status' ? tx(L.changeStatus) : tx(L.none)}
						options={bulk === 'status' ? STATUS_OPTIONS.map((s) => ({ value: s.value, label: tx(s) })) : staffOptions}
						onChange={setBulkValue}
					/>
					<Button title={tx(L.save)} loading={acting} disabled={bulk === 'status' && !bulkValue} onPress={applyBulk} />
				</View>
			</Sheet>

			<Sheet visible={createOpen} onClose={() => !creating && setCreateOpen(false)} title={tx(L.newApplicant)} scroll maxHeight="94%">
				<View style={{ gap: 12, paddingBottom: 10 }}>
					<Field label={`${tx(L.lastName)} *`} value={form.last_name} onChangeText={(v) => set({ last_name: v })} />
					<Field label={`${tx(L.firstName)} *`} value={form.first_name} onChangeText={(v) => set({ first_name: v })} />
					<Field label={tx(L.middleName)} value={form.middle_name} onChangeText={(v) => set({ middle_name: v })} />
					<Field label={tx(L.phone)} value={form.phone} keyboardType="phone-pad" onChangeText={(v) => set({ phone: v })} />
					<Field label="Email" value={form.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(v) => set({ email: v })} />
					<Field label={`${tx(L.country)} *`} value={form.country} onChangeText={(v) => set({ country: v })} />
					<Field label={tx(L.program)} value={form.program_name} onChangeText={(v) => set({ program_name: v })} />
					<NumberField label={tx(L.payment)} value={form.payment_required} onChange={(v) => set({ payment_required: v })} />
					<SelectField label={tx(L.assignTo)} title={tx(L.assignTo)} value={form.assigned_to} placeholder={tx(L.none)} options={staffOptions} onChange={(v) => set({ assigned_to: v })} />
					<Button title={tx(L.save)} loading={creating} onPress={create} />
				</View>
			</Sheet>

			<Dialog
				visible={confirmDelete}
				onClose={() => !acting && setConfirmDelete(false)}
				icon={Trash2}
				tone="red"
				title={tx(L.delete)}
				message={tx(L.confirmDelete)}
				actions={[{ title: tx(L.delete), variant: 'danger', loading: acting, onPress: bulkDelete }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirmDelete(false) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	stale: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, maxWidth: 150 },
	staleOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	staleText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, flexShrink: 1 },
	selectBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
	bulkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
	box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
	boxOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
