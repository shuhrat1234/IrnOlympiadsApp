import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Clock, Copy, Eye, EyeOff, KeyRound, Lock, Phone, Search, Send, UserPlus, Users, Wallet, XCircle } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Avatar, Button, Card, EmptyState, Field, IconBadge, Pill, SelectField, Sheet, T, Tap } from '../../components/ui';
import { DateTimeField } from '../../components/form';
import GroupPaySheet from '../../components/GroupPaySheet';

import { colors, fonts, radius } from '../../theme';
import { GRADES } from '../../utils/constants';
import { initialsOf, phoneMask } from '../../utils/format';

const L = {
	title: { uz: "Mening o'quvchilarim", ru: 'Мои ученики', en: 'My students' },
	subtitle: { uz: "Qo'shgan va ro'yxatdan o'tkazgan o'quvchilaringiz", ru: 'Добавленные и зарегистрированные вами ученики', en: "Students you've added and registered" },
	addStudent: { uz: "O'quvchi qo'shish", ru: 'Добавить ученика', en: 'Add student' },
	invite: { uz: 'Taklif qilish', ru: 'Пригласить', en: 'Invite' },
	inviteStudent: { uz: "O'quvchi taklif qilish", ru: 'Пригласить ученика', en: 'Invite student' },
	inviteSearch: { uz: "Ism yoki telefon bo'yicha qidirish...", ru: 'Поиск по имени или телефону...', en: 'Search by name or phone...' },
	invited: { uz: 'Taklif yuborildi', ru: 'Приглашение отправлено', en: 'Invite sent' },
	alreadyLinked: { uz: "Sizning o'quvchingiz", ru: 'Уже ваш ученик', en: 'Already your student' },
	noResults: { uz: 'Topilmadi', ru: 'Не найдено', en: 'No results' },
	noStudents: { uz: "Hali o'quvchi yo'q", ru: 'Пока нет учеников', en: 'No students yet' },
	olympiads: { uz: 'olimpiada', ru: 'олимпиад', en: 'olympiads' },
	register: { uz: "Ro'yxatdan o'tkazish", ru: 'Зарегистрировать', en: 'Register' },
	selectOlympiad: { uz: 'Olimpiadani tanlang', ru: 'Выберите олимпиаду', en: 'Select olympiad' },
	registerSuccess: { uz: "Muvaffaqiyatli ro'yxatdan o'tkazildi", ru: 'Успешно зарегистрирован', en: 'Registered successfully' },
	error: { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' },
	required: { uz: 'Majburiy maydon', ru: 'Обязательное поле', en: 'Required field' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	birthDate: { uz: "Tug'ilgan sana", ru: 'Дата рождения', en: 'Birth date' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	selectRegion: { uz: 'Viloyatni tanlang', ru: 'Выберите регион', en: 'Select region' },
	school: { uz: 'Maktab', ru: 'Школа', en: 'School' },
	grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	selectGrade: { uz: 'Sinfni tanlang', ru: 'Выберите класс', en: 'Select grade' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	confirmPassword: { uz: 'Parolni tasdiqlang', ru: 'Подтвердите пароль', en: 'Confirm password' },
	passMismatch: { uz: 'Parollar mos kelmadi', ru: 'Пароли не совпадают', en: 'Passwords mismatch' },
	passTooShort: { uz: 'Kamida 6 belgi', ru: 'Мин. 6 символов', en: 'Min 6 chars' },
	submit: { uz: "Qo'shish", ru: 'Добавить', en: 'Add' },
	credsTitle: { uz: "O'quvchi qo'shildi!", ru: 'Ученик добавлен!', en: 'Student added!' },
	credsText: { uz: "Ushbu login bilan o'quvchi kirishi mumkin:", ru: 'Ученик может войти с этим логином:', en: 'The student can log in with this login:' },
	login: { uz: 'Login', ru: 'Логин', en: 'Login' },
	copy: { uz: 'Nusxalash', ru: 'Копировать', en: 'Copy' },
	copied: { uz: 'Nusxalandi', ru: 'Скопировано', en: 'Copied' },
	close: { uz: 'Yopish', ru: 'Закрыть', en: 'Close' },
	resetPassword: { uz: 'Parolni yangilash', ru: 'Сбросить пароль', en: 'Reset password' },
	newPassword: { uz: 'Yangi parol', ru: 'Новый пароль', en: 'New password' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	resetOk: { uz: 'Parol yangilandi', ru: 'Пароль обновлён', en: 'Password updated' },
	pending: { uz: "Kutilayotgan so'rovlar", ru: 'Ожидающие запросы', en: 'Pending requests' },
	pendingSub: { uz: "O'quvchilar sizni o'qituvchi sifatida tanladi", ru: 'Ученики выбрали вас своим учителем', en: 'Students who picked you as their teacher' },
	accept: { uz: 'Qabul qilish', ru: 'Принять', en: 'Accept' },
	reject: { uz: 'Rad etish', ru: 'Отклонить', en: 'Reject' },
	searchStudents: { uz: "O'quvchini qidirish (F.I.SH, telefon, sinf)...", ru: 'Поиск ученика (ФИО, телефон, класс)...', en: 'Search student (name, phone, grade)...' },
	results: { uz: 'Natijalar:', ru: 'Результаты:', en: 'Results:' },
	noMatch: { uz: "So'rovingiz bo'yicha o'quvchilar topilmadi", ru: 'Ученики по вашему запросу не найдены', en: 'No students found matching your search' },
	groupPayment: { uz: "Guruhli to'lov", ru: 'Групповая оплата', en: 'Group payment' },
	paySelected: { uz: "Tanlanganlar uchun to'lash", ru: 'Оплатить за выбранных', en: 'Pay for selected' },
	selected: { uz: 'Tanlandi', ru: 'Выбрано', en: 'Selected' },
	totalStudents: { uz: "Jami o'quvchilar", ru: 'Всего учеников', en: 'Total students' },
	selectAll: { uz: 'Barchasini tanlash', ru: 'Выбрать всех', en: 'Select all' },
	clearSelection: { uz: 'Bekor qilish', ru: 'Сбросить', en: 'Clear' },
	accepted: { uz: 'Qabul qilindi', ru: 'Принято', en: 'Accepted' },
	rejected: { uz: 'Rad etildi', ru: 'Отклонено', en: 'Rejected' },
};

const emptyAdd = { first_name: '', last_name: '', middle_name: '', birth_date: '', region: '', school: '', grade: '', phone: '+998', password: '', confirmPassword: '' };
const pad2 = (n) => String(n).padStart(2, '0');
const toDay = (v) => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

export default function TeacherStudents() {
	const { tx, pick } = useLanguage();
	const { olympiads } = useOlympiad();
	const { regions, fetchMe } = useAuth();
	const toast = useToast();
	const [students, setStudents] = useState([]);
	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState([]);
	const [responding, setResponding] = useState(null);
	const [revealed, setRevealed] = useState(() => new Set());
	const [addOpen, setAddOpen] = useState(false);
	const [add, setAdd] = useState(emptyAdd);
	const [addErrors, setAddErrors] = useState({});
	const [adding, setAdding] = useState(false);
	const [creds, setCreds] = useState(null);
	const [reg, setReg] = useState(null); // { student, olympiadId }
	const [registering, setRegistering] = useState(false);
	const [reset, setReset] = useState(null); // { student, password, confirmPassword }
	const [resetErrors, setResetErrors] = useState({});
	const [resetting, setResetting] = useState(false);
	const [inviteOpen, setInviteOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [invitingId, setInvitingId] = useState(null);
	const debounce = useRef(null);
	const [tableSearch, setTableSearch] = useState('');
	const [selected, setSelected] = useState(() => new Set());
	const [payOpen, setPayOpen] = useState(false);
	const [payKey, setPayKey] = useState(0);

	const filtered = useMemo(() => {
		const words = tableSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
		if (!words.length) return students;
		return students.filter((s) => {
			const hay = `${s.first_name || ''} ${s.last_name || ''} ${s.middle_name || ''} ${s.phone || ''} ${s.school || ''} ${s.grade || ''}`.toLowerCase();
			return words.every((w) => hay.includes(w));
		});
	}, [students, tableSearch]);
	const toggleSelect = (id) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
	const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

	const fetchStudents = useCallback(async () => {
		try {
			const res = await api.get(E.TEACHER_STUDENTS);
			setStudents(res.data.results || res.data || []);
		} catch {}
		setLoading(false);
	}, []);
	const fetchRequests = useCallback(async () => {
		try {
			const res = await api.get(E.TEACHER_LINK_REQUESTS_INCOMING);
			setRequests(res.data.results || res.data || []);
		} catch {}
	}, []);

	useEffect(() => { fetchMe?.(); fetchStudents(); fetchRequests(); }, []);

	const respond = async (r, action) => {
		setResponding(r.id);
		try {
			await api.post(action === 'accept' ? E.TEACHER_LINK_REQUEST_ACCEPT(r.id) : E.TEACHER_LINK_REQUEST_REJECT(r.id));
			toast.success(tx(action === 'accept' ? L.accepted : L.rejected));
			setRequests((p) => p.filter((x) => x.id !== r.id));
			if (action === 'accept') fetchStudents();
		} catch (err) {
			toast.error(err.response?.data?.error || tx(L.error));
		}
		setResponding(null);
	};

	const onQuery = (v) => {
		setQuery(v);
		clearTimeout(debounce.current);
		if (v.trim().length < 2) { setResults([]); setSearching(false); return; }
		setSearching(true);
		debounce.current = setTimeout(() => {
			api.get(E.TEACHER_STUDENT_SEARCH, { params: { search: v.trim() } })
				.then((res) => setResults(res.data || []))
				.catch(() => setResults([]))
				.finally(() => setSearching(false));
		}, 350);
	};

	const inviteStudent = async (s) => {
		setInvitingId(s.id);
		try {
			await api.post(E.TEACHER_LINK_REQUEST_INVITE_STUDENT, { student: s.id });
			toast.success(tx(L.invited));
			setResults((p) => p.map((x) => (x.id === s.id ? { ...x, invited: true } : x)));
			fetchStudents();
		} catch (err) {
			toast.error(err.response?.data?.error || tx(L.error));
		}
		setInvitingId(null);
	};

	const addStudent = async () => {
		const errs = {};
		['first_name', 'last_name', 'middle_name', 'birth_date', 'region', 'school', 'grade'].forEach((f) => { if (!add[f]) errs[f] = tx(L.required); });
		if (!add.phone || add.phone === '+998') errs.phone = tx(L.required);
		if (!add.password) errs.password = tx(L.required);
		else if (add.password.length < 6) errs.password = tx(L.passTooShort);
		if (!add.confirmPassword) errs.confirmPassword = tx(L.required);
		else if (add.confirmPassword !== add.password) errs.confirmPassword = tx(L.passMismatch);
		setAddErrors(errs);
		if (Object.keys(errs).length) return;
		setAdding(true);
		try {
			const { confirmPassword: _c, ...payload } = add;
			const res = await api.post(E.TEACHER_ADD_STUDENT, payload);
			setCreds({ login: res.data.participant_id || res.data.username });
			setAdd(emptyAdd);
			fetchStudents();
		} catch (err) {
			const d = err.response?.data;
			toast.error(d?.phone?.[0] || d?.password?.[0] || d?.error || tx(L.error));
		}
		setAdding(false);
	};

	const register = async () => {
		if (!reg?.olympiadId) return;
		setRegistering(true);
		try {
			await api.post(E.REGISTER_FOR_OLYMPIAD(reg.olympiadId), { user_id: reg.student.id });
			toast.success(tx(L.registerSuccess));
			setReg(null);
			fetchStudents();
		} catch (err) {
			toast.error(err.response?.data?.error || tx(L.error));
		}
		setRegistering(false);
	};

	const resetPassword = async () => {
		const errs = {};
		if (!reset.password) errs.password = tx(L.required);
		else if (reset.password.length < 6) errs.password = tx(L.passTooShort);
		if (!reset.confirmPassword) errs.confirmPassword = tx(L.required);
		else if (reset.confirmPassword !== reset.password) errs.confirmPassword = tx(L.passMismatch);
		setResetErrors(errs);
		if (Object.keys(errs).length) return;
		setResetting(true);
		try {
			await api.post(E.TEACHER_RESET_STUDENT_PASSWORD(reset.student.id), { password: reset.password });
			toast.success(tx(L.resetOk));
			setReset(null);
			fetchStudents();
		} catch (err) {
			toast.error(err.response?.data?.error || tx(L.error));
		}
		setResetting(false);
	};

	const toggleReveal = (id) => setRevealed((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
	const setA = (patch) => setAdd((f) => ({ ...f, ...patch }));

	return (
		<Screen tabBar onRefresh={() => Promise.all([fetchStudents(), fetchRequests()])} keyboard>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
				<Button style={{ flex: 1 }} size="md" icon={UserPlus} title={tx(L.addStudent)} onPress={() => { setCreds(null); setAddErrors({}); setAddOpen(true); }} />
				<Button style={{ flex: 1 }} size="md" variant="dark" icon={Search} title={tx(L.invite)} onPress={() => { setQuery(''); setResults([]); setInviteOpen(true); }} />
			</View>

			{requests.length ? (
				<Card style={{ marginBottom: 16, backgroundColor: colors.goldTint, borderColor: colors.gold }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={16} color={colors.amber} /><T v="strong">{tx(L.pending)}</T></View>
					<T v="small" style={{ marginBottom: 10 }}>{tx(L.pendingSub)}</T>
					{requests.map((r) => (
						<View key={r.id} style={styles.request}>
							<View style={{ flex: 1 }}>
								<T v="strong" style={{ fontSize: 14 }}>{r.student_name}</T>
								<T v="small" style={{ fontSize: 12 }}>{r.student_phone}{r.student_grade ? ` · ${r.student_grade}` : ''}</T>
							</View>
							<Tap onPress={() => respond(r, 'reject')} disabled={responding === r.id} style={[styles.round, { backgroundColor: colors.redSoft }]}><XCircle size={16} color={colors.red} /></Tap>
							<Tap onPress={() => respond(r, 'accept')} disabled={responding === r.id} style={[styles.round, { backgroundColor: colors.green }]}>
								{responding === r.id ? <ActivityIndicator size="small" color={colors.white} /> : <Check size={16} color={colors.white} />}
							</Tap>
						</View>
					))}
				</Card>
			) : null}

			{!loading && students.length ? (
				<View style={{ gap: 10, marginBottom: 12 }}>
					<Button size="md" variant="soft" icon={Wallet} title={selected.size ? `${tx(L.paySelected)} (${selected.size})` : tx(L.groupPayment)} onPress={() => { setPayKey((k) => k + 1); setPayOpen(true); }} />
					<Field icon={Search} value={tableSearch} onChangeText={setTableSearch} placeholder={tx(L.searchStudents)} autoCorrect={false} autoCapitalize="none" />
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<T v="small" style={{ flex: 1 }}>{tableSearch.trim() ? `${tx(L.results)} ${filtered.length} / ${students.length}` : selected.size ? `${tx(L.selected)}: ${selected.size}` : `${tx(L.totalStudents)}: ${students.length}`}</T>
						{filtered.length ? (
							<Tap hitSlop={8} onPress={() => setSelected(allSelected ? new Set() : new Set(filtered.map((s) => s.id)))}>
								<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(allSelected ? L.clearSelection : L.selectAll)}</T>
							</Tap>
						) : null}
					</View>
				</View>
			) : null}

			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 20 }} /> : !students.length ? <EmptyState icon={Users} title={tx(L.noStudents)} /> : !filtered.length ? <EmptyState icon={Search} title={tx(L.noMatch)} /> : filtered.map((s) => (
				<Card key={s.id} style={[{ marginBottom: 10, padding: 14 }, selected.has(s.id) && { borderColor: colors.goldDeep, backgroundColor: '#FFFCF1' }]}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<Tap onPress={() => toggleSelect(s.id)} hitSlop={8} style={[styles.check, selected.has(s.id) && styles.checkOn]}>{selected.has(s.id) ? <Check size={14} color={colors.navyDeep} strokeWidth={3} /> : null}</Tap>
						<Avatar initials={initialsOf(s)} size={44} />
						<View style={{ flex: 1 }}>
							<T v="strong" numberOfLines={1}>{s.last_name} {s.first_name}</T>
							<T v="small" style={{ fontSize: 12 }}>{s.phone}</T>
						</View>
						<Tap onPress={() => { setResetErrors({}); setReset({ student: s, password: '', confirmPassword: '' }); }} style={[styles.round, { backgroundColor: colors.cardMuted }]}><KeyRound size={16} color={colors.ink2} /></Tap>
					</View>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
						{s.grade ? <Pill label={`${s.grade}`} color={colors.blue} bg={colors.blueSoft} /> : null}
						<Pill label={`${s.registrations_count ?? (s.registrations || []).length} ${tx(L.olympiads)}`} color={colors.amber} bg={colors.goldTint} />
						{s.password_text ? (
							<Tap onPress={() => toggleReveal(s.id)} style={styles.pass}>
								<Lock size={12} color={colors.muted} />
								<T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.ink2 }}>{revealed.has(s.id) ? s.password_text : '••••••'}</T>
								{revealed.has(s.id) ? <EyeOff size={12} color={colors.muted} /> : <Eye size={12} color={colors.muted} />}
							</Tap>
						) : null}
					</View>
					<Button size="sm" icon={Send} title={tx(L.register)} onPress={() => setReg({ student: s, olympiadId: '' })} style={{ marginTop: 12 }} />
				</Card>
			))}

			<GroupPaySheet key={payKey} visible={payOpen} onClose={() => setPayOpen(false)} students={students} preselected={selected} onPaid={() => { setSelected(new Set()); fetchStudents(); }} />

			<Sheet visible={addOpen} onClose={() => !adding && setAddOpen(false)} title={creds ? '' : tx(L.addStudent)} scroll maxHeight="94%">
				{creds ? (
					<View style={{ alignItems: 'center', gap: 12, paddingBottom: 10 }}>
						<IconBadge icon={Check} color={colors.green} bg={colors.greenSoft} size={64} />
						<T v="h2">{tx(L.credsTitle)}</T>
						<T v="small" style={{ textAlign: 'center' }}>{tx(L.credsText)}</T>
						<View style={styles.creds}>
							<T v="label">{tx(L.login)}</T>
							<T style={{ fontFamily: fonts.extrabold, fontSize: 22, color: colors.ink }} selectable>{creds.login}</T>
						</View>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' }}>
							<Button style={{ flex: 1 }} size="md" variant="light" icon={Copy} title={tx(L.copy)} onPress={async () => { await Clipboard.setStringAsync(String(creds.login)); toast.info(tx(L.copied)); }} />
							<Button style={{ flex: 1 }} size="md" title={tx(L.close)} onPress={() => { setCreds(null); setAddOpen(false); }} />
						</View>
					</View>
				) : (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<Field label={`${tx(L.firstName)} *`} value={add.first_name} error={addErrors.first_name} onChangeText={(v) => setA({ first_name: v })} />
						<Field label={`${tx(L.lastName)} *`} value={add.last_name} error={addErrors.last_name} onChangeText={(v) => setA({ last_name: v })} />
						<Field label={`${tx(L.middleName)} *`} value={add.middle_name} error={addErrors.middle_name} onChangeText={(v) => setA({ middle_name: v })} />
						<DateTimeField mode="date" label={`${tx(L.birthDate)} *`} value={add.birth_date} error={addErrors.birth_date} onChange={(v) => setA({ birth_date: toDay(v) })} />
						<SelectField label={`${tx(L.region)} *`} title={tx(L.region)} value={add.region} placeholder={tx(L.selectRegion)} error={addErrors.region} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} onChange={(v) => setA({ region: v })} />
						<Field label={`${tx(L.school)} *`} value={add.school} error={addErrors.school} onChangeText={(v) => setA({ school: v })} />
						<SelectField label={`${tx(L.grade)} *`} title={tx(L.grade)} value={add.grade} placeholder={tx(L.selectGrade)} error={addErrors.grade} options={GRADES.map((g) => ({ value: g, label: g }))} onChange={(v) => setA({ grade: v })} />
						<Field label={`${tx(L.phone)} *`} icon={Phone} value={add.phone} error={addErrors.phone} keyboardType="phone-pad" onChangeText={(v) => setA({ phone: phoneMask(v) })} />
						<Field label={`${tx(L.password)} *`} icon={Lock} secure autoCapitalize="none" value={add.password} error={addErrors.password} onChangeText={(v) => setA({ password: v })} />
						<Field label={`${tx(L.confirmPassword)} *`} icon={Lock} secure autoCapitalize="none" value={add.confirmPassword} error={addErrors.confirmPassword} onChangeText={(v) => setA({ confirmPassword: v })} />
						<Button icon={UserPlus} title={tx(L.submit)} loading={adding} onPress={addStudent} />
					</View>
				)}
			</Sheet>

			<Sheet visible={!!reg} onClose={() => !registering && setReg(null)} title={tx(L.register)}>
				{reg ? (
					<View style={{ gap: 12 }}>
						<T v="strong">{reg.student.last_name} {reg.student.first_name}</T>
						<SelectField title={tx(L.selectOlympiad)} value={reg.olympiadId} placeholder={tx(L.selectOlympiad)} options={olympiads.filter((o) => o.is_active).map((o) => ({ value: String(o.id), label: pick(o, 'title') }))} onChange={(v) => setReg((r) => ({ ...r, olympiadId: v }))} />
						<Button icon={Send} title={tx(L.register)} loading={registering} disabled={!reg.olympiadId} onPress={register} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!reset} onClose={() => !resetting && setReset(null)} title={tx(L.resetPassword)}>
				{reset ? (
					<View style={{ gap: 12 }}>
						<T v="strong">{reset.student.last_name} {reset.student.first_name}</T>
						<Field label={tx(L.newPassword)} icon={Lock} secure autoCapitalize="none" value={reset.password} error={resetErrors.password} onChangeText={(v) => setReset((r) => ({ ...r, password: v }))} />
						<Field label={tx(L.confirmPassword)} icon={Lock} secure autoCapitalize="none" value={reset.confirmPassword} error={resetErrors.confirmPassword} onChangeText={(v) => setReset((r) => ({ ...r, confirmPassword: v }))} />
						<Button title={tx(L.save)} loading={resetting} onPress={resetPassword} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)} title={tx(L.inviteStudent)} scroll maxHeight="90%">
				<View style={{ gap: 10, paddingBottom: 10 }}>
					<Field icon={Search} value={query} onChangeText={onQuery} placeholder={tx(L.inviteSearch)} autoFocus right={searching ? <ActivityIndicator size="small" color={colors.goldDeep} /> : null} />
					{query.trim().length >= 2 && !searching && !results.length ? <T v="small" style={{ textAlign: 'center' }}>{tx(L.noResults)}</T> : null}
					{results.map((s) => (
						<View key={s.id} style={styles.result}>
							<View style={{ flex: 1 }}>
								<T v="strong" style={{ fontSize: 14 }}>{s.full_name}</T>
								<T v="small" style={{ fontSize: 12 }}>{s.phone}{s.grade ? ` · ${s.grade}` : ''}{s.region_name ? ` · ${s.region_name}` : ''}</T>
							</View>
							{s.already_linked ? <Pill label={tx(L.alreadyLinked)} color={colors.green} bg={colors.greenSoft} /> : s.invited ? <Pill label={tx(L.invited)} color={colors.blue} bg={colors.blueSoft} /> : (
								<Button size="sm" icon={UserPlus} title={tx(L.invite)} loading={invitingId === s.id} onPress={() => inviteStudent(s)} />
							)}
						</View>
					))}
				</View>
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	request: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.white, marginTop: 6 },
	check: { width: 26, height: 26, borderRadius: 9, borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	checkOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
	pass: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: colors.cardMuted },
	creds: { alignSelf: 'stretch', alignItems: 'center', padding: 16, borderRadius: radius.lg, backgroundColor: colors.goldTint, gap: 4 },
	result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
});
