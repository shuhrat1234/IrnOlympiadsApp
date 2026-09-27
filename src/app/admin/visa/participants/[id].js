import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import {
	AlertTriangle, Calendar, CheckCircle2, Circle, Copy, CreditCard, Download, Edit3, FileText, History, ListChecks, Lock,
	MessageSquare, PhoneCall, Plane, Plus, Save, Search, Trash2, User as UserIcon, Users2,
} from 'lucide-react-native';
import api, { SITE_URL, mediaUrl } from '../../../../api/client';
import E from '../../../../api/endpoints';
import { useLanguage } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { Screen, StackHeader } from '../../../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, ProgressBar, SelectField, Sheet, T, Tap } from '../../../../components/ui';
import { DateTimeField, FormSection, NumberField, TextArea } from '../../../../components/form';
import { STATUS_OPTIONS, apiError, fetchStaff, statusTone, useStatusLabel } from '../../../../components/admin/visa';
import { colors, fonts, radius } from '../../../../theme';
import { formatMoney } from '../../../../utils/format';
import { pickDocument } from '../../../../utils/files';
import { qrSvg } from '../../../../utils/documents';

const DOCUMENT_CATEGORIES = [
	{ value: 'scan', uz: 'Hujjat skani', ru: 'Скан документа', en: 'Document scan' },
	{ value: 'photo', uz: 'Fotosurat', ru: 'Фотография', en: 'Photo' },
	{ value: 'receipt', uz: "To'lov cheki", ru: 'Чек об оплате', en: 'Payment receipt' },
	{ value: 'invitation', uz: 'Taklifnoma', ru: 'Приглашение', en: 'Invitation' },
	{ value: 'questionnaire', uz: 'Anketa', ru: 'Анкета', en: 'Questionnaire' },
	{ value: 'translation', uz: 'Tarjima', ru: 'Перевод', en: 'Translation' },
	{ value: 'appointment_confirmation', uz: 'Navbat tasdiqi', ru: 'Подтверждение записи', en: 'Appointment confirmation' },
	{ value: 'ready_package', uz: "Tayyor hujjatlar to'plami", ru: 'Готовый пакет документов', en: 'Ready document package' },
];
const PASSPORT_LOCATIONS = [
	{ value: 'with_participant', uz: 'Ishtirokchida', ru: 'У участника', en: 'With applicant' },
	{ value: 'office', uz: 'Ofisda', ru: 'В офисе', en: 'At the office' },
	{ value: 'courier', uz: 'Kuryerda', ru: 'У курьера', en: 'With courier' },
	{ value: 'embassy', uz: 'Elchixonada', ru: 'В посольстве', en: 'At the embassy' },
];

const L = {
	edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	personal: { uz: "Shaxsiy ma'lumotlar va aloqa", ru: 'Личные данные и контакты', en: 'Personal details and contacts' },
	passport: { uz: "Pasport ma'lumotlari", ru: 'Паспортные данные', en: 'Passport details' },
	countryProgram: { uz: "Mamlakat, dastur va to'lov", ru: 'Страна, программа и оплата', en: 'Country, program and payment' },
	documents: { uz: 'Hujjatlar', ru: 'Документы', en: 'Documents' },
	notes: { uz: 'Izohlar', ru: 'Заметки', en: 'Notes' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	birthDate: { uz: "Tug'ilgan sana", ru: 'Дата рождения', en: 'Birth date' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	address: { uz: 'Manzil', ru: 'Адрес', en: 'Address' },
	passportNumber: { uz: 'Pasport raqami', ru: 'Номер паспорта', en: 'Passport number' },
	passportIssue: { uz: 'Berilgan sana', ru: 'Дата выдачи', en: 'Issue date' },
	passportExpiry: { uz: 'Amal qilish muddati', ru: 'Срок действия', en: 'Expiry date' },
	passportAuthority: { uz: 'Kim tomonidan berilgan', ru: 'Кем выдан', en: 'Issuing authority' },
	country: { uz: 'Sayohat mamlakati', ru: 'Страна поездки', en: 'Travel country' },
	program: { uz: 'Dastur', ru: 'Программа', en: 'Program' },
	assignedTo: { uz: "Mas'ul xodim", ru: 'Ответственный сотрудник', en: 'Assigned staff' },
	none: { uz: 'Tayinlanmagan', ru: 'Не назначен', en: 'Not assigned' },
	paymentRequired: { uz: "To'lash kerak (UZS)", ru: 'Требуется оплатить (UZS)', en: 'Payment required (UZS)' },
	paymentPaid: { uz: "To'langan (UZS)", ru: 'Уже оплачено (UZS)', en: 'Amount paid (UZS)' },
	debt: { uz: 'Qarz', ru: 'Долг', en: 'Debt' },
	embassyDate: { uz: 'Elchixonaga yozilish', ru: 'Запись в посольство', en: 'Embassy appointment' },
	status: { uz: 'Status', ru: 'Статус', en: 'Status' },
	expiryDate: { uz: 'Amal qilish muddati', ru: 'Срок годности', en: 'Expiry date' },
	needsReplacement: { uz: 'Almashtirish kerak', ru: 'Требует замены', en: 'Needs replacement' },
	expired: { uz: "Muddati o'tgan", ru: 'Просрочен', en: 'Expired' },
	category: { uz: 'Toifa', ru: 'Категория', en: 'Category' },
	upload: { uz: 'Yuklash', ru: 'Загрузить', en: 'Upload' },
	noDocuments: { uz: 'Hujjatlar hali yuklanmagan', ru: 'Документы пока не загружены', en: 'No documents uploaded yet' },
	noNotes: { uz: "Izohlar hali yo'q", ru: 'Заметок пока нет', en: 'No notes yet' },
	addNote: { uz: "Izoh qo'shish", ru: 'Добавить заметку', en: 'Add note' },
	notePlaceholder: { uz: 'Izohni kiriting...', ru: 'Введите заметку...', en: 'Enter a note...' },
	notFound: { uz: 'Ishtirokchi topilmadi', ru: 'Участник не найден', en: 'Applicant not found' },
	savedOk: { uz: "O'zgarishlar saqlandi", ru: 'Изменения сохранены', en: 'Changes saved' },
	saveErr: { uz: 'Saqlashda xatolik', ru: 'Ошибка при сохранении', en: 'Error saving changes' },
	docUploaded: { uz: 'Hujjat yuklandi', ru: 'Документ загружен', en: 'Document uploaded' },
	docUploadErr: { uz: 'Hujjatni yuklashda xatolik', ru: 'Ошибка загрузки документа', en: 'Error uploading document' },
	docDeleted: { uz: "Hujjat o'chirildi", ru: 'Документ удалён', en: 'Document deleted' },
	noteAdded: { uz: "Izoh qo'shildi", ru: 'Заметка добавлена', en: 'Note added' },
	chooseFile: { uz: 'Faylni tanlang', ru: 'Выберите файл', en: 'Choose file' },
	delete: { uz: "O'chirish", ru: 'Удалить', en: 'Delete' },
	confirmDeleteDoc: { uz: "Ushbu hujjatni o'chirasizmi?", ru: 'Удалить этот документ?', en: 'Delete this document?' },
	readiness: { uz: 'Tayyorlik', ru: 'Готовность', en: 'Readiness' },
	alertsTitle: { uz: "E'tibor talab qiladi", ru: 'Требует внимания', en: 'Requires attention' },
	alertExpired: { uz: "Muddati o'tgan hujjatlar mavjud", ru: 'Есть просроченные документы', en: 'There are expired documents' },
	alertReplacement: { uz: "Almashtirish kerak bo'lgan hujjatlar mavjud", ru: 'Есть документы, требующие замены', en: 'There are documents requiring replacement' },
	alertDuplicate: { uz: 'Ehtimol dublikat (telefon yoki pasport mos keladi)', ru: 'Возможен дубликат (совпадает телефон или паспорт)', en: 'Possible duplicate (matching phone or passport)' },
	followUp: { uz: 'Kuzatuv', ru: 'Сопровождение', en: 'Follow-up' },
	passportLocation: { uz: 'Pasport qayerda', ru: 'Где находится паспорт', en: 'Passport location' },
	lastContact: { uz: 'Oxirgi aloqa', ru: 'Последний контакт', en: 'Last contact' },
	markContacted: { uz: "Bugun bog'lanildi", ru: 'Связались сегодня', en: 'Contacted today' },
	neverContacted: { uz: "Hali bog'lanilmagan", ru: 'Ещё не связывались', en: 'Not yet contacted' },
	staleContact: { uz: "3 kundan ortiq aloqa yo'q", ru: 'Нет контакта более 3 дней', en: 'No contact for more than 3 days' },
	docsVerified: { uz: 'Hujjatlar tekshirildi', ru: 'Документы проверены', en: 'Documents verified' },
	readyForSubmission: { uz: 'Topshirishga tayyor', ru: 'Готов к подаче', en: 'Ready for submission' },
	tasks: { uz: 'Vazifalar', ru: 'Задачи', en: 'Tasks' },
	noTasks: { uz: "Vazifalar hali yo'q", ru: 'Задач пока нет', en: 'No tasks yet' },
	taskTitle: { uz: 'Vazifa nomi', ru: 'Название задачи', en: 'Task title' },
	dueDate: { uz: 'Muddat', ru: 'Срок', en: 'Due' },
	history: { uz: 'Amallar tarixi', ru: 'История действий', en: 'Action history' },
	noHistory: { uz: "Hali amallar yo'q", ru: 'Пока нет действий', en: 'No actions yet' },
	family: { uz: "Oila a'zolari", ru: 'Члены семьи', en: 'Family members' },
	noFamily: { uz: "Oila a'zolari biriktirilmagan", ru: 'Члены семьи не привязаны', en: 'No family members linked' },
	searchFamily: { uz: "Ism yoki telefon bo'yicha qidirish...", ru: 'Поиск по имени или телефону...', en: 'Search by name or phone...' },
	add: { uz: "Qo'shish", ru: 'Добавить', en: 'Add' },
	duplicateBtn: { uz: 'Boshqa mamlakat uchun nusxalash', ru: 'Дублировать для другой страны', en: 'Duplicate for another country' },
	duplicateTitle: { uz: 'Ishtirokchini nusxalash', ru: 'Дублировать участника', en: 'Duplicate applicant' },
	duplicateDesc: { uz: "Shaxsiy va pasport ma'lumotlari yangi arizaga ko'chiriladi", ru: 'Личные и паспортные данные будут скопированы в новую заявку', en: 'Personal and passport details will be copied into a new application' },
	newCountry: { uz: 'Yangi mamlakat', ru: 'Новая страна', en: 'New country' },
	newProgram: { uz: 'Yangi dastur', ru: 'Новая программа', en: 'New program' },
	duplicateErr: { uz: "Nusxalab bo'lmadi", ru: 'Не удалось дублировать', en: 'Failed to duplicate' },
	duplicated: { uz: 'Ishtirokchi nusxalandi', ru: 'Участник дублирован', en: 'Applicant duplicated' },
	lockedField: { uz: "To'liq raqamga ruxsat yo'q", ru: 'Нет доступа к полному номеру', en: 'No access to the full number' },
	deleteApplicant: { uz: "Ishtirokchini o'chirish", ru: 'Удалить участника', en: 'Delete applicant' },
	confirmDeleteApplicant: { uz: "Bu ishtirokchini o'chirasizmi? Bu amalni qaytarib bo'lmaydi.", ru: 'Удалить этого участника? Это действие нельзя отменить.', en: 'Delete this applicant? This cannot be undone.' },
	applicantDeleted: { uz: "Ishtirokchi o'chirildi", ru: 'Участник удалён', en: 'Applicant deleted' },
	loadErr: { uz: "Ishtirokchini yuklab bo'lmadi", ru: 'Не удалось загрузить участника', en: 'Failed to load applicant' },
	qr: { uz: 'Karta QR-kodi', ru: 'QR-код карточки', en: 'Card QR code' },
};

const pad2 = (n) => String(n).padStart(2, '0');
const toDay = (v) => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const Row = ({ label, value, icon: Icon }) => (
	<View style={styles.row}>
		<T v="label" style={{ fontSize: 9.5 }}>{label}</T>
		<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
			{Icon ? <Icon size={13} color={colors.muted} /> : null}
			<T v="strong" style={{ fontSize: 14, flexShrink: 1 }} selectable>{value || '—'}</T>
		</View>
	</View>
);

export default function VisaApplicantCard() {
	const { id } = useLocalSearchParams();
	const { tx } = useLanguage();
	const toast = useToast();
	const statusLabel = useStatusLabel();
	const [a, setA] = useState(null);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);
	const [staff, setStaff] = useState([]);
	const [noteText, setNoteText] = useState('');
	const [busy, setBusy] = useState(null);
	const [docCategory, setDocCategory] = useState('scan');
	const [docExpiry, setDocExpiry] = useState('');
	const [docFile, setDocFile] = useState(null);
	const [confirm, setConfirm] = useState(null); // { kind: 'doc', id } | { kind: 'applicant' }
	const [taskTitle, setTaskTitle] = useState('');
	const [taskDue, setTaskDue] = useState('');
	const [qr, setQr] = useState('');
	const [dup, setDup] = useState(null); // { country, program }
	const [familySearch, setFamilySearch] = useState('');
	const [familyResults, setFamilyResults] = useState([]);
	const [searchingFamily, setSearchingFamily] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await api.get(E.VISA_APPLICANT_DETAIL(id));
			setA(res.data);
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, [id]);

	useEffect(() => { load(); fetchStaff().then(setStaff).catch(() => {}); }, [load]);
	useEffect(() => { qrSvg(`${SITE_URL}/admin/visa/participants/${id}`).then(setQr).catch(() => {}); }, [id]);

	const patch = async (data, okMsg = true) => {
		try {
			const res = await api.patch(E.VISA_APPLICANT_DETAIL(id), data);
			setA(res.data);
			if (okMsg) toast.success(tx(L.savedOk));
			return true;
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
			return false;
		}
	};

	const startEditing = () => {
		setForm({
			first_name: a.first_name || '', last_name: a.last_name || '', middle_name: a.middle_name || '', birth_date: a.birth_date || '',
			phone: a.phone || '', email: a.email || '', address: a.address || '',
			passport_number: a.can_view_full_passport ? a.passport_number || '' : '',
			passport_issue_date: a.passport_issue_date || '', passport_expiry_date: a.passport_expiry_date || '', passport_issuing_authority: a.passport_issuing_authority || '',
			country: a.country || '', program_name: a.program_name || '',
			payment_required: String(a.payment_required || 0), payment_paid: String(a.payment_paid || 0),
			embassy_appointment_date: a.embassy_appointment_date || '', status: a.status,
			assigned_to: a.assigned_to ? String(a.assigned_to) : '', passport_original_location: a.passport_original_location || '',
		});
		setEditing(true);
	};

	const save = async () => {
		setSaving(true);
		const payload = {
			...form,
			payment_required: parseInt(form.payment_required, 10) || 0,
			payment_paid: parseInt(form.payment_paid, 10) || 0,
			assigned_to: form.assigned_to || null,
			embassy_appointment_date: form.embassy_appointment_date || null,
			passport_original_location: form.passport_original_location || null,
			birth_date: form.birth_date || null,
			passport_issue_date: form.passport_issue_date || null,
			passport_expiry_date: form.passport_expiry_date || null,
		};
		if (!a.can_view_full_passport) delete payload.passport_number;
		if (await patch(payload)) setEditing(false);
		setSaving(false);
	};

	const chooseFile = async () => {
		const f = await pickDocument();
		if (f) setDocFile(f);
	};
	const uploadDoc = async () => {
		if (!docFile) return;
		setBusy('doc');
		try {
			const fd = new FormData();
			fd.append('applicant', String(id));
			fd.append('category', docCategory);
			fd.append('file', { uri: docFile.uri, name: docFile.name, type: docFile.mimeType || 'application/octet-stream' });
			if (docExpiry) fd.append('expiry_date', docExpiry);
			await api.post(E.VISA_DOCUMENTS, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success(tx(L.docUploaded));
			setDocFile(null);
			setDocExpiry('');
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.docUploadErr)));
		}
		setBusy(null);
	};

	const runConfirm = async () => {
		const c = confirm;
		setConfirm(null);
		try {
			if (c.kind === 'doc') {
				await api.delete(E.VISA_DOCUMENT_DETAIL(c.id));
				toast.success(tx(L.docDeleted));
				load();
			} else {
				await api.delete(E.VISA_APPLICANT_DETAIL(id));
				toast.success(tx(L.applicantDeleted));
				router.replace('/admin/visa/participants');
			}
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
		}
	};

	const addNote = async () => {
		if (!noteText.trim()) return;
		setBusy('note');
		try {
			await api.post(E.VISA_NOTES, { applicant: id, text: noteText.trim() });
			toast.success(tx(L.noteAdded));
			setNoteText('');
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
		}
		setBusy(null);
	};

	const addTask = async () => {
		if (!taskTitle.trim()) return;
		setBusy('task');
		try {
			await api.post(E.VISA_TASKS, { applicant: id, title: taskTitle.trim(), due_date: taskDue || null });
			setTaskTitle('');
			setTaskDue('');
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
		}
		setBusy(null);
	};

	const toggleTask = async (task) => {
		try {
			await api.patch(E.VISA_TASK_DETAIL(task.id), { done: !task.done });
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
		}
	};

	const duplicate = async () => {
		if (!dup.country.trim()) return;
		setBusy('dup');
		try {
			const res = await api.post(E.VISA_APPLICANTS, {
				first_name: a.first_name, last_name: a.last_name, middle_name: a.middle_name, birth_date: a.birth_date, phone: a.phone, email: a.email, address: a.address,
				passport_issue_date: a.passport_issue_date, passport_expiry_date: a.passport_expiry_date, passport_issuing_authority: a.passport_issuing_authority,
				country: dup.country.trim(), program_name: dup.program.trim(),
			});
			toast.success(tx(L.duplicated));
			setDup(null);
			router.push(`/admin/visa/participants/${res.data.id}`);
		} catch (err) {
			toast.error(apiError(err, tx(L.duplicateErr)));
		}
		setBusy(null);
	};

	useEffect(() => {
		const q = familySearch.trim();
		if (!q) return setFamilyResults([]);
		const t = setTimeout(async () => {
			setSearchingFamily(true);
			try {
				const res = await api.get(E.VISA_APPLICANTS, { params: { search: q, page_size: 10 } });
				setFamilyResults((res.data.results || res.data || []).filter((x) => String(x.id) !== String(id)));
			} catch {}
			setSearchingFamily(false);
		}, 300);
		return () => clearTimeout(t);
	}, [familySearch, id]);

	const addFamily = async (memberId) => {
		try {
			await api.patch(E.VISA_APPLICANT_DETAIL(memberId), { family_head: a.family_head || a.id });
			setFamilySearch('');
			setFamilyResults([]);
			load();
		} catch (err) {
			toast.error(apiError(err, tx(L.saveErr)));
		}
	};

	if (loading) return <Screen header={<StackHeader />}><ActivityIndicator color={colors.goldDeep} style={{ marginTop: 40 }} /></Screen>;
	if (!a) return <Screen header={<StackHeader />}><EmptyState icon={UserIcon} title={tx(L.notFound)} /></Screen>;

	const f = editing ? form : a;
	const set = (p) => setForm((x) => ({ ...x, ...p }));
	const staffOptions = [{ value: '', label: tx(L.none) }, ...staff.map((u) => ({ value: String(u.id), label: `${u.last_name} ${u.first_name}` }))];
	const [sc, sbg] = statusTone(a.status);
	const docs = (a.documents || []).filter((d) => !d.superseded);
	const staleContact = a.last_contact_date && Date.now() - new Date(a.last_contact_date).getTime() > 3 * 86400000;
	const input = (key, label, props = {}) => (editing
		? <Field label={label} value={String(f[key] ?? '')} onChangeText={(v) => set({ [key]: v })} {...props} />
		: <Row label={label} value={a[key]} />);
	const dateInput = (key, label) => (editing
		? <DateTimeField mode="date" label={label} value={f[key] || ''} onChange={(v) => set({ [key]: toDay(v) })} />
		: <Row label={label} value={a[key]} icon={Calendar} />);

	return (
		<Screen
			header={
				<StackHeader
					title={a.full_name}
					subtitle={a.phone}
					right={editing ? (
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<IconButton icon={Save} bg={colors.gold} color={colors.navyDeep} onPress={save} />
						</View>
					) : (
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<IconButton icon={Trash2} color={colors.red} onPress={() => setConfirm({ kind: 'applicant' })} />
							<IconButton icon={Edit3} bg={colors.gold} color={colors.navyDeep} onPress={startEditing} />
						</View>
					)}
				/>
			}
			onRefresh={load}
			keyboard
		>
			{editing ? (
				<View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
					<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.cancel)} onPress={() => setEditing(false)} disabled={saving} />
					<Button style={{ flex: 1.4 }} size="md" icon={Save} title={tx(L.save)} loading={saving} onPress={save} />
				</View>
			) : null}

			{a.has_expired_documents || a.has_documents_needing_replacement || a.duplicate_warning ? (
				<View style={styles.alert}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} color={colors.red} /><T v="strong" color={colors.red} style={{ fontSize: 13 }}>{tx(L.alertsTitle)}</T></View>
					{a.has_expired_documents ? <T v="small" color={colors.red}>• {tx(L.alertExpired)}</T> : null}
					{a.has_documents_needing_replacement ? <T v="small" color={colors.red}>• {tx(L.alertReplacement)}</T> : null}
					{a.duplicate_warning ? <T v="small" color={colors.red}>• {tx(L.alertDuplicate)}</T> : null}
				</View>
			) : null}

			<Card style={{ marginBottom: 14, gap: 12 }}>
				<View style={{ flexDirection: 'row', gap: 14 }}>
					<View style={{ flex: 1, gap: 8 }}>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
							<T v="label">{tx(L.readiness)}</T>
							<T style={{ fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink }}>{a.readiness_score ?? 0}%</T>
						</View>
						<ProgressBar value={a.readiness_score || 0} color={(a.readiness_score || 0) >= 80 ? colors.green : colors.gold} height={8} />
						<Tap onPress={() => patch({ documents_verified: !a.documents_verified }, false)} style={styles.flag}>
							{a.documents_verified ? <CheckCircle2 size={16} color={colors.green} /> : <Circle size={16} color={colors.muted} />}
							<T v="strong" style={{ fontSize: 13 }}>{tx(L.docsVerified)}</T>
						</Tap>
						<Tap onPress={() => patch({ ready_for_submission: !a.ready_for_submission }, false)} style={styles.flag}>
							{a.ready_for_submission ? <CheckCircle2 size={16} color={colors.green} /> : <Circle size={16} color={colors.muted} />}
							<T v="strong" style={{ fontSize: 13 }}>{tx(L.readyForSubmission)}</T>
						</Tap>
					</View>
					{qr ? <View style={styles.qr}><SvgXml xml={qr} width={84} height={84} /></View> : null}
				</View>
				<Button size="sm" variant="light" icon={Copy} title={tx(L.duplicateBtn)} onPress={() => setDup({ country: '', program: '' })} />
			</Card>

			<Card style={{ marginBottom: 14, gap: 12 }}>
				<SelectField label={tx(L.status)} title={tx(L.status)} value={a.status} options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: tx(s) }))} onChange={(v) => v !== a.status && patch({ status: v })} />
				<Pill label={statusLabel(a.status)} color={sc} bg={sbg} style={{ alignSelf: 'flex-start' }} />
				{editing ? (
					<>
						<SelectField label={tx(L.assignedTo)} title={tx(L.assignedTo)} value={form.assigned_to} placeholder={tx(L.none)} options={staffOptions} onChange={(v) => set({ assigned_to: v })} />
						<DateTimeField label={tx(L.embassyDate)} value={form.embassy_appointment_date} onChange={(v) => set({ embassy_appointment_date: v })} />
					</>
				) : (
					<>
						<Row label={tx(L.assignedTo)} value={a.assigned_to_name || tx(L.none)} />
						<Row label={tx(L.embassyDate)} value={a.embassy_appointment_date ? new Date(a.embassy_appointment_date).toLocaleString() : ''} icon={Calendar} />
					</>
				)}
			</Card>

			<FormSection icon={UserIcon} title={tx(L.personal)}>
				{input('last_name', tx(L.lastName))}
				{input('first_name', tx(L.firstName))}
				{input('middle_name', tx(L.middleName))}
				{dateInput('birth_date', tx(L.birthDate))}
				{editing ? input('phone', tx(L.phone), { keyboardType: 'phone-pad' }) : (
					<Tap onPress={() => a.phone && Linking.openURL(`tel:${a.phone}`)}><Row label={tx(L.phone)} value={a.phone} icon={PhoneCall} /></Tap>
				)}
				{input('email', 'Email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
				{editing ? <TextArea rows={2} label={tx(L.address)} value={f.address} onChangeText={(v) => set({ address: v })} /> : <Row label={tx(L.address)} value={a.address} />}
			</FormSection>

			<FormSection icon={CreditCard} title={tx(L.passport)}>
				{a.can_view_full_passport ? input('passport_number', tx(L.passportNumber), { autoCapitalize: 'characters' }) : (
					<View style={styles.row}>
						<T v="label" style={{ fontSize: 9.5 }}>{tx(L.passportNumber)}</T>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Lock size={13} color={colors.muted} /><T v="strong">{a.passport_number || '—'}</T></View>
						<T v="small" style={{ fontSize: 11 }}>{tx(L.lockedField)}</T>
					</View>
				)}
				{dateInput('passport_issue_date', tx(L.passportIssue))}
				{dateInput('passport_expiry_date', tx(L.passportExpiry))}
				{input('passport_issuing_authority', tx(L.passportAuthority))}
				{editing ? (
					<SelectField label={tx(L.passportLocation)} title={tx(L.passportLocation)} value={form.passport_original_location} placeholder="—" options={[{ value: '', label: '—' }, ...PASSPORT_LOCATIONS.map((p) => ({ value: p.value, label: tx(p) }))]} onChange={(v) => set({ passport_original_location: v })} />
				) : <Row label={tx(L.passportLocation)} value={tx(PASSPORT_LOCATIONS.find((p) => p.value === a.passport_original_location)) || ''} />}
			</FormSection>

			<FormSection icon={Plane} title={tx(L.countryProgram)}>
				{input('country', tx(L.country))}
				{input('program_name', tx(L.program))}
				{a.olympiad_title ? <Pill label={a.olympiad_title} color={colors.amber} bg={colors.goldTint} style={{ alignSelf: 'flex-start' }} /> : null}
				{editing ? (
					<>
						<NumberField label={tx(L.paymentRequired)} value={form.payment_required} onChange={(v) => set({ payment_required: v })} />
						<NumberField label={tx(L.paymentPaid)} value={form.payment_paid} onChange={(v) => set({ payment_paid: v })} />
					</>
				) : (
					<>
						<Row label={tx(L.paymentRequired)} value={`${formatMoney(a.payment_required || 0)} UZS`} />
						<Row label={tx(L.paymentPaid)} value={`${formatMoney(a.payment_paid || 0)} UZS`} />
					</>
				)}
				<View style={[styles.debt, { backgroundColor: a.debt > 0 ? colors.redSoft : colors.greenSoft }]}>
					<T v="strong" style={{ fontSize: 13 }}>{tx(L.debt)}</T>
					<T style={{ fontFamily: fonts.extrabold, fontSize: 16, color: a.debt > 0 ? colors.red : colors.green }}>{formatMoney(a.debt || 0)} UZS</T>
				</View>
			</FormSection>

			<FormSection icon={FileText} title={tx(L.documents)}>
				{!docs.length ? <T v="small">{tx(L.noDocuments)}</T> : docs.map((doc) => {
					const versions = (a.documents || []).filter((d) => d.category === doc.category).length;
					return (
						<View key={doc.id} style={styles.doc}>
							<View style={{ flex: 1, gap: 4 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<T v="strong" style={{ fontSize: 13.5 }}>{doc.category_display}</T>
									{versions > 1 ? <Pill label={`v${versions}`} /> : null}
								</View>
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
									{doc.expiry_date ? <T v="small" style={{ fontSize: 11.5 }}>{tx(L.expiryDate)}: {doc.expiry_date}</T> : null}
									{doc.is_expired ? <Pill icon={AlertTriangle} label={tx(L.expired)} color={colors.red} bg={colors.redSoft} /> : null}
									{doc.needs_replacement ? <Pill label={tx(L.needsReplacement)} color={colors.amber} bg={colors.goldTint} /> : null}
								</View>
							</View>
							<Tap onPress={() => Linking.openURL(mediaUrl(doc.file))} style={[styles.act, { backgroundColor: colors.blueSoft }]}><Download size={15} color={colors.blue} /></Tap>
							<Tap onPress={() => setConfirm({ kind: 'doc', id: doc.id })} style={[styles.act, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap>
						</View>
					);
				})}
				<View style={styles.uploadBox}>
					<SelectField label={tx(L.category)} title={tx(L.category)} value={docCategory} options={DOCUMENT_CATEGORIES.map((c) => ({ value: c.value, label: tx(c) }))} onChange={setDocCategory} />
					<DateTimeField mode="date" label={tx(L.expiryDate)} value={docExpiry} onChange={(v) => setDocExpiry(toDay(v))} />
					<Tap onPress={chooseFile} style={styles.filePick}>
						<FileText size={16} color={docFile ? colors.amber : colors.muted} />
						<T v="strong" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1} color={docFile ? colors.ink : colors.muted}>{docFile ? docFile.name : tx(L.chooseFile)}</T>
					</Tap>
					<Button size="md" icon={Plus} title={tx(L.upload)} loading={busy === 'doc'} disabled={!docFile} onPress={uploadDoc} />
				</View>
			</FormSection>

			<FormSection icon={MessageSquare} title={tx(L.notes)}>
				{!(a.notes || []).length ? <T v="small">{tx(L.noNotes)}</T> : a.notes.map((n) => (
					<View key={n.id} style={styles.note}>
						<T v="body" style={{ fontSize: 14 }}>{n.text}</T>
						<T v="small" style={{ fontSize: 11 }}>{n.author_name || '—'} · {new Date(n.created_at).toLocaleString()}</T>
					</View>
				))}
				<TextArea rows={2} value={noteText} placeholder={tx(L.notePlaceholder)} onChangeText={setNoteText} />
				<Button size="md" variant="dark" icon={Plus} title={tx(L.addNote)} loading={busy === 'note'} disabled={!noteText.trim()} onPress={addNote} />
			</FormSection>

			<FormSection icon={PhoneCall} title={tx(L.followUp)}>
				<Row label={tx(L.lastContact)} value={a.last_contact_date ? new Date(a.last_contact_date).toLocaleDateString() : tx(L.neverContacted)} />
				{staleContact ? <Pill icon={AlertTriangle} label={tx(L.staleContact)} color={colors.amber} bg={colors.goldTint} style={{ alignSelf: 'flex-start' }} /> : null}
				<Button size="md" variant="success" icon={PhoneCall} title={tx(L.markContacted)} onPress={() => patch({ last_contact_date: toDay(new Date()) })} />
			</FormSection>

			<FormSection icon={Users2} title={tx(L.family)}>
				{!(a.family_members || []).length ? <T v="small">{tx(L.noFamily)}</T> : a.family_members.map((m) => (
					<Tap key={m.id} onPress={() => router.push(`/admin/visa/participants/${m.id}`)} style={styles.doc}>
						<T v="strong" style={{ flex: 1, fontSize: 13.5 }}>{m.full_name}</T>
						<T v="small" style={{ fontSize: 11.5 }}>{m.status_display}</T>
					</Tap>
				))}
				<Field icon={Search} value={familySearch} onChangeText={setFamilySearch} placeholder={tx(L.searchFamily)} right={searchingFamily ? <ActivityIndicator size="small" color={colors.goldDeep} /> : null} />
				{familySearch.trim() ? (familyResults.length ? familyResults.map((r) => (
					<Tap key={r.id} onPress={() => addFamily(r.id)} style={styles.doc}>
						<T v="strong" style={{ flex: 1, fontSize: 13.5 }}>{r.full_name}</T>
						<T v="strong" color={colors.amber} style={{ fontSize: 12.5 }}>+ {tx(L.add)}</T>
					</Tap>
				)) : !searchingFamily ? <T v="small">—</T> : null) : null}
			</FormSection>

			<FormSection icon={ListChecks} title={tx(L.tasks)}>
				{!(a.tasks || []).length ? <T v="small">{tx(L.noTasks)}</T> : a.tasks.map((task) => (
					<Tap key={task.id} onPress={() => toggleTask(task)} style={styles.task}>
						{task.done ? <CheckCircle2 size={19} color={colors.green} /> : <Circle size={19} color={colors.muted} />}
						<View style={{ flex: 1 }}>
							<T v="strong" style={[{ fontSize: 14 }, task.done && { textDecorationLine: 'line-through', color: colors.muted }]}>{task.title}</T>
							{task.due_date ? <T v="small" style={{ fontSize: 11.5 }}>{tx(L.dueDate)}: {task.due_date}</T> : null}
						</View>
					</Tap>
				))}
				<Field value={taskTitle} placeholder={tx(L.taskTitle)} onChangeText={setTaskTitle} />
				<DateTimeField mode="date" label={tx(L.dueDate)} value={taskDue} onChange={(v) => setTaskDue(toDay(v))} />
				<Button size="md" variant="dark" icon={Plus} title={tx(L.add)} loading={busy === 'task'} disabled={!taskTitle.trim()} onPress={addTask} />
			</FormSection>

			<FormSection icon={History} title={tx(L.history)}>
				{!(a.audit_logs || []).length ? <T v="small">{tx(L.noHistory)}</T> : a.audit_logs.map((log) => (
					<View key={log.id} style={styles.log}>
						<View style={styles.logDot} />
						<View style={{ flex: 1 }}>
							<T v="body" style={{ fontSize: 13.5 }}><T v="strong" style={{ fontSize: 13.5 }}>{log.action_display}</T>{log.detail ? ` — ${log.detail}` : ''}</T>
							<T v="small" style={{ fontSize: 11 }}>{log.actor_name || '—'} · {new Date(log.created_at).toLocaleString()}</T>
						</View>
					</View>
				))}
			</FormSection>

			<Sheet visible={!!dup} onClose={() => busy !== 'dup' && setDup(null)} title={tx(L.duplicateTitle)}>
				{dup ? (
					<View style={{ gap: 12 }}>
						<T v="small">{tx(L.duplicateDesc)}</T>
						<Field label={`${tx(L.newCountry)} *`} value={dup.country} onChangeText={(v) => setDup((d) => ({ ...d, country: v }))} />
						<Field label={tx(L.newProgram)} value={dup.program} onChangeText={(v) => setDup((d) => ({ ...d, program: v }))} />
						<Button icon={Copy} title={tx(L.duplicateTitle)} loading={busy === 'dup'} disabled={!dup.country.trim()} onPress={duplicate} />
					</View>
				) : null}
			</Sheet>

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={Trash2}
				tone="red"
				title={tx(confirm?.kind === 'applicant' ? L.deleteApplicant : L.delete)}
				message={tx(confirm?.kind === 'applicant' ? L.confirmDeleteApplicant : L.confirmDeleteDoc)}
				actions={[{ title: tx(L.delete), variant: 'danger', onPress: runConfirm }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirm(null) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	alert: { padding: 12, borderRadius: radius.md, backgroundColor: colors.redSoft, gap: 4, marginBottom: 14 },
	flag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
	qr: { padding: 6, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
	row: { gap: 3, paddingVertical: 4 },
	debt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: radius.md },
	doc: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	uploadBox: { gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong },
	filePick: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted },
	note: { padding: 12, borderRadius: radius.md, backgroundColor: colors.goldTint, gap: 4 },
	task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
	log: { flexDirection: 'row', gap: 10 },
	logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 },
});
