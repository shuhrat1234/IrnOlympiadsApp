import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Clock, Download, Edit2, Link2, Link2Off, Plus, RotateCcw, Trash2, Users } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, Field, IconButton, Pill, Segmented, Sheet, SelectField, T, Tap } from '../../components/ui';
import { ColumnChart } from '../../components/charts';
import { bufferToBase64, shareFile } from '../../utils/files';
import { colors, fonts, radius } from '../../theme';

const LABELS = {
	uz: {
		title: 'Davomat', subtitle: 'Telegram bot orqali xodimlar ish vaqtini kuzatish',
		addEmployee: "Xodim qo'shish", name: 'F.I.SH', phone: 'Telefon',
		group: 'Guruh', group1: '1-guruh', group2: '2-guruh', allGroups: 'Barchasi',
		switchedToGroup: (g) => `Xodim ${g}-guruhga o'tkazildi`, noEmployeesInGroup: "Ushbu guruhda hozircha xodimlar yo'q",
		telegramId: 'Telegram ID', linked: "Bog'langan", notLinked: "Bog'lanmagan",
		active: 'Faol', inactive: 'Nofaol', edit: 'Tahrirlash', deactivate: 'Faolsizlantirish', activate: 'Faollashtirish',
		save: 'Saqlash', noEmployees: "Xodimlar yo'q",
		telegramIdHint: "Xodim botga tugma bosganda o'z ID sini oladi va sizga yuboradi — shu yerga kiriting.",
		statsTitle: 'Ish vaqti statistikasi', selectEmployee: 'Xodimni tanlang',
		dailyHours: 'Kunlik soatlar', monthlyTotals: 'Oylik jami', hours: 'soat',
		employeeUpdated: 'Xodim yangilandi', employeeCreated: "Xodim qo'shildi", saveError: 'Xatolik yuz berdi',
		calendarTitle: 'Kelish/ketish jadvali', autoClosedLegend: 'Avtomatik yopilgan (chiqish belgilanmagan)',
		weekdays: ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'], selectEmployeeHint: "Kalendar va grafikni ko'rish uchun xodimni tanlang",
		schedule: 'Ish grafigi', scheduleStart: 'Boshlanishi', scheduleEnd: 'Tugashi',
		graceMinutes: 'Kechikish uchun imtiyoz (daq)', workDays: 'Ish kunlari',
		monthlySummary: 'Oylik xulosa', norm: 'Norma', worked: 'Ishlangan', overtime: 'Ortiqcha ish',
		shortfall: 'Yetishmovchilik', lateCount: 'Kechikishlar', lateTotal: 'Kechikish vaqti',
		avgIn: "O'rtacha kelish", avgOut: "O'rtacha ketish", tempExits: 'Vaqtinchalik chiqishlar',
		workedDays: 'Ishlangan kunlar', missedDays: "O'tkazib yuborilgan",
		topWorked: "Eng ko'p ishlagan", topOvertime: "Eng ko'p ortiqcha ish", topLate: 'Kechikishlar reytingi',
		exportExcel: 'Excel', dayDetail: 'Kun tafsiloti', noSessions: "Yozuvlar yo'q",
		leaveType: 'Kun holati', markVacation: "Ta'til", markSick: 'Kasallik', markAbsent: "Sababsiz yo'q",
		clearLeave: 'Oddiy holatga qaytarish', statusWorked: 'Ishladi', statusDayOff: 'Dam olish',
		statusAbsent: "Yo'q edi", statusVacation: "Ta'tilda", statusSick: 'Kasal', in: 'Keldi', out: 'Ketdi',
		months: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
	},
	ru: {
		title: 'Посещаемость', subtitle: 'Учёт рабочего времени сотрудников через Telegram-бота',
		addEmployee: 'Добавить сотрудника', name: 'ФИО', phone: 'Телефон',
		group: 'Группа', group1: '1-группа', group2: '2-группа', allGroups: 'Все',
		switchedToGroup: (g) => `Сотрудник переведен в группу ${g}`, noEmployeesInGroup: 'В этой группе пока нет сотрудников',
		telegramId: 'Telegram ID', linked: 'Привязан', notLinked: 'Не привязан',
		active: 'Активен', inactive: 'Неактивен', edit: 'Редактировать', deactivate: 'Деактивировать', activate: 'Активировать',
		save: 'Сохранить', noEmployees: 'Нет сотрудников',
		telegramIdHint: 'Сотрудник получает свой ID при нажатии кнопки в боте и присылает его вам — введите сюда.',
		statsTitle: 'Статистика рабочего времени', selectEmployee: 'Выберите сотрудника',
		dailyHours: 'Часы по дням', monthlyTotals: 'Итого за месяц', hours: 'ч',
		employeeUpdated: 'Сотрудник обновлён', employeeCreated: 'Сотрудник добавлен', saveError: 'Произошла ошибка',
		calendarTitle: 'Календарь прихода/ухода', autoClosedLegend: 'Закрыто автоматически (выход не отмечен)',
		weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], selectEmployeeHint: 'Выберите сотрудника, чтобы увидеть календарь и график',
		schedule: 'Рабочий график', scheduleStart: 'Начало', scheduleEnd: 'Конец',
		graceMinutes: 'Допустимое опоздание (мин)', workDays: 'Рабочие дни',
		monthlySummary: 'Месячная сводка', norm: 'Норма', worked: 'Отработано', overtime: 'Переработка',
		shortfall: 'Недоработка', lateCount: 'Опозданий', lateTotal: 'Время опозданий',
		avgIn: 'Средний приход', avgOut: 'Средний уход', tempExits: 'Временных выходов',
		workedDays: 'Отработано дней', missedDays: 'Пропущено',
		topWorked: 'Больше всего отработал', topOvertime: 'Больше всего переработок', topLate: 'Опоздания',
		exportExcel: 'Excel', dayDetail: 'Детали дня', noSessions: 'Нет записей',
		leaveType: 'Статус дня', markVacation: 'Отпуск', markSick: 'Больничный', markAbsent: 'Прогул',
		clearLeave: 'Вернуть обычный статус', statusWorked: 'Работал', statusDayOff: 'Выходной',
		statusAbsent: 'Отсутствовал', statusVacation: 'В отпуске', statusSick: 'На больничном', in: 'Пришёл', out: 'Ушёл',
		months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
	},
	en: {
		title: 'Attendance', subtitle: 'Employee working-hours tracking via the Telegram bot',
		addEmployee: 'Add Employee', name: 'Full Name', phone: 'Phone',
		group: 'Group', group1: 'Group 1', group2: 'Group 2', allGroups: 'All',
		switchedToGroup: (g) => `Employee moved to Group ${g}`, noEmployeesInGroup: 'No employees in this group yet',
		telegramId: 'Telegram ID', linked: 'Linked', notLinked: 'Not linked',
		active: 'Active', inactive: 'Inactive', edit: 'Edit', deactivate: 'Deactivate', activate: 'Activate',
		save: 'Save', noEmployees: 'No employees',
		telegramIdHint: 'The employee gets their ID by tapping a button in the bot and sends it to you — enter it here.',
		statsTitle: 'Working-hours stats', selectEmployee: 'Select employee',
		dailyHours: 'Daily hours', monthlyTotals: 'Monthly totals', hours: 'h',
		employeeUpdated: 'Employee updated', employeeCreated: 'Employee added', saveError: 'Something went wrong',
		calendarTitle: 'Arrival/departure calendar', autoClosedLegend: 'Auto-closed (no checkout recorded)',
		weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], selectEmployeeHint: 'Select an employee to see the calendar and chart',
		schedule: 'Work schedule', scheduleStart: 'Start', scheduleEnd: 'End',
		graceMinutes: 'Grace period (min)', workDays: 'Working days',
		monthlySummary: 'Monthly summary', norm: 'Norm', worked: 'Worked', overtime: 'Overtime',
		shortfall: 'Shortfall', lateCount: 'Late count', lateTotal: 'Total late time',
		avgIn: 'Avg arrival', avgOut: 'Avg departure', tempExits: 'Temp exits',
		workedDays: 'Worked days', missedDays: 'Missed',
		topWorked: 'Most hours worked', topOvertime: 'Most overtime', topLate: 'Lateness ranking',
		exportExcel: 'Excel', dayDetail: 'Day detail', noSessions: 'No records',
		leaveType: 'Day status', markVacation: 'Vacation', markSick: 'Sick leave', markAbsent: 'Unexcused absence',
		clearLeave: 'Reset to normal status', statusWorked: 'Worked', statusDayOff: 'Day off',
		statusAbsent: 'Absent', statusVacation: 'On vacation', statusSick: 'On sick leave', in: 'In', out: 'Out',
		months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	},
};

const STATUS_TONE = {
	worked: [colors.green, colors.greenSoft], day_off: [colors.muted, colors.cardMuted], absent: [colors.red, colors.redSoft],
	vacation: [colors.blue, colors.blueSoft], sick: [colors.purple, colors.purpleSoft],
};
const STATUS_KEY = { worked: 'statusWorked', day_off: 'statusDayOff', absent: 'statusAbsent', vacation: 'statusVacation', sick: 'statusSick' };

const pad2 = (n) => String(n).padStart(2, '0');
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const shiftMonth = (m, delta) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + delta, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const monthRange = (m) => { const [y, mo] = m.split('-').map(Number); return { start: `${m}-01`, end: `${m}-${pad2(new Date(y, mo, 0).getDate())}`, days: new Date(y, mo, 0).getDate(), y, mo }; };
const localDateKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const hhmm = (iso) => { const d = new Date(iso); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const groupOf = (e) => Number(e.group || 1);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function Attendance() {
	const { lang } = useLanguage();
	const l = LABELS[lang] || LABELS.en;
	const toast = useToast();
	const [group, setGroup] = useState('1');
	const [employees, setEmployees] = useState([]);
	const [loadingEmployees, setLoadingEmployees] = useState(true);
	const [month, setMonth] = useState(currentMonth());
	const [stats, setStats] = useState(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [selectedId, setSelectedId] = useState('');
	const [sessions, setSessions] = useState([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [leaveRecords, setLeaveRecords] = useState([]);
	const [switchingId, setSwitchingId] = useState(null);
	const [formModal, setFormModal] = useState(null);
	const [saving, setSaving] = useState(false);
	const [dayModal, setDayModal] = useState(null);
	const [leaveSaving, setLeaveSaving] = useState(false);
	const [exporting, setExporting] = useState(false);

	const fetchEmployees = useCallback(async () => {
		setLoadingEmployees(true);
		try {
			const res = await api.get(E.ATTENDANCE_EMPLOYEES);
			setEmployees(res.data.results || res.data);
		} catch {}
		setLoadingEmployees(false);
	}, []);

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const params = { month };
			if (group !== 'all') params.group = group;
			const res = await api.get(E.ATTENDANCE_STATS, { params });
			setStats(res.data);
		} catch {}
		setLoadingStats(false);
	}, [month, group]);

	const fetchSessions = useCallback(async () => {
		if (!selectedId) return setSessions([]);
		setLoadingSessions(true);
		try {
			const { start, end } = monthRange(month);
			const res = await api.get(E.ATTENDANCE_SESSIONS, { params: { employee: selectedId, start_date: start, end_date: end } });
			setSessions(res.data.results || res.data);
		} catch {}
		setLoadingSessions(false);
	}, [selectedId, month]);

	const fetchLeaveRecords = useCallback(async () => {
		if (!selectedId) return setLeaveRecords([]);
		try {
			const { start, end } = monthRange(month);
			const res = await api.get(E.ATTENDANCE_LEAVE_RECORDS, { params: { employee: selectedId, start_date: start, end_date: end } });
			setLeaveRecords(res.data.results || res.data);
		} catch {}
	}, [selectedId, month]);

	useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => { fetchSessions(); fetchLeaveRecords(); }, [fetchSessions, fetchLeaveRecords]);

	const inGroup = useCallback((e) => group === 'all' || groupOf(e) === Number(group), [group]);
	const filtered = useMemo(() => employees.filter(inGroup), [employees, inGroup]);
	const counts = useMemo(() => ({ 1: employees.filter((e) => groupOf(e) === 1).length, 2: employees.filter((e) => groupOf(e) === 2).length, all: employees.length }), [employees]);

	useEffect(() => {
		if (selectedId && !filtered.some((e) => String(e.id) === String(selectedId))) setSelectedId('');
	}, [filtered, selectedId]);

	const statList = useMemo(() => (stats?.employees || []).filter(inGroup), [stats, inGroup]);
	const monthlyTotals = useMemo(() => [...statList].sort((a, b) => b.total_minutes - a.total_minutes), [statList]);
	const tops = useMemo(() => [
		[l.topWorked, [...statList].sort((a, b) => b.total_worked_minutes - a.total_worked_minutes).slice(0, 3), (e) => formatHours(e.total_worked_minutes), colors.amber],
		[l.topOvertime, statList.filter((e) => e.overtime_minutes > 0).sort((a, b) => b.overtime_minutes - a.overtime_minutes).slice(0, 3), (e) => `+${formatHours(e.overtime_minutes)}`, colors.green],
		[l.topLate, statList.filter((e) => e.late_count > 0).sort((a, b) => b.late_count - a.late_count).slice(0, 3), (e) => `${e.late_count}×`, colors.red],
	], [statList, lang]);
	const selectedStats = useMemo(() => (stats && selectedId ? stats.employees.find((e) => String(e.employee_id) === String(selectedId)) || null : null), [stats, selectedId]);
	const statsByDate = useMemo(() => Object.fromEntries((selectedStats?.daily || []).map((d) => [d.date, d])), [selectedStats]);

	const chartData = useMemo(() => {
		if (!selectedId) return [];
		const { days, y, mo } = monthRange(month);
		return Array.from({ length: days }, (_, i) => {
			const key = `${y}-${pad2(mo)}-${pad2(i + 1)}`;
			return { label: String(i + 1), value: Math.round(((statsByDate[key]?.worked_minutes || 0) / 60) * 10) / 10 };
		});
	}, [statsByDate, selectedId, month]);

	const calendarWeeks = useMemo(() => {
		const { days, y, mo } = monthRange(month);
		const byDay = {};
		sessions.forEach((s) => { (byDay[localDateKey(s.check_in)] = byDay[localDateKey(s.check_in)] || []).push(s); });
		const cells = Array.from({ length: (new Date(y, mo - 1, 1).getDay() + 6) % 7 }, () => null);
		for (let day = 1; day <= days; day++) cells.push({ day, key: `${month}-${pad2(day)}`, sessions: byDay[`${month}-${pad2(day)}`] || [] });
		while (cells.length % 7) cells.push(null);
		const weeks = [];
		for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
		return weeks;
	}, [sessions, month]);

	function formatHours(mins) { return `${Math.round(((mins || 0) / 60) * 10) / 10} ${l.hours}`; }

	const switchGroup = async (emp) => {
		const next = groupOf(emp) === 1 ? 2 : 1;
		setSwitchingId(emp.id);
		try {
			await api.post(E.ATTENDANCE_EMPLOYEE_SWITCH_GROUP(emp.id), { group: next });
			toast.success(l.switchedToGroup(next));
			setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, group: next } : e)));
			fetchStats();
		} catch {
			toast.error(l.saveError);
		}
		setSwitchingId(null);
	};

	const openCreate = () => setFormModal({ mode: 'create', data: { full_name: '', phone: '', telegram_user_id: '', group: group === '2' ? 2 : 1, schedule_start: '09:00', schedule_end: '18:00', grace_minutes: '10', work_days: '1,2,3,4,5' } });
	const openEdit = (emp) => setFormModal({
		mode: 'edit',
		data: { ...emp, group: groupOf(emp), telegram_user_id: emp.telegram_user_id ? String(emp.telegram_user_id) : '', schedule_start: (emp.schedule_start || '09:00').slice(0, 5), schedule_end: (emp.schedule_end || '18:00').slice(0, 5), grace_minutes: String(emp.grace_minutes ?? 10), work_days: emp.work_days || '1,2,3,4,5' },
	});
	const setData = (patch) => setFormModal((m) => ({ ...m, data: { ...m.data, ...patch } }));
	const toggleWorkDay = (iso) => {
		const cur = formModal.data.work_days.split(',').filter(Boolean).map(Number);
		const next = (cur.includes(iso) ? cur.filter((d) => d !== iso) : [...cur, iso]).sort((a, b) => a - b);
		setData({ work_days: next.join(',') });
	};

	const save = async () => {
		const { mode, data } = formModal;
		if (!data.full_name.trim() || !TIME_RE.test(data.schedule_start) || !TIME_RE.test(data.schedule_end)) return toast.error(l.saveError);
		setSaving(true);
		try {
			const payload = {
				full_name: data.full_name, phone: data.phone,
				telegram_user_id: data.telegram_user_id ? parseInt(data.telegram_user_id, 10) : null,
				group: Number(data.group || 1),
				schedule_start: `${data.schedule_start}:00`, schedule_end: `${data.schedule_end}:00`,
				grace_minutes: parseInt(data.grace_minutes, 10) || 0, work_days: data.work_days,
			};
			if (mode === 'create') {
				await api.post(E.ATTENDANCE_EMPLOYEES, payload);
				toast.success(l.employeeCreated);
			} else {
				await api.patch(E.ATTENDANCE_EMPLOYEE_DETAIL(data.id), payload);
				toast.success(l.employeeUpdated);
			}
			setFormModal(null);
			fetchEmployees();
		} catch {
			toast.error(l.saveError);
		}
		setSaving(false);
	};

	const toggleActive = async (emp) => {
		try {
			await api.patch(E.ATTENDANCE_EMPLOYEE_DETAIL(emp.id), { is_active: !emp.is_active });
			fetchEmployees();
		} catch {
			toast.error(l.saveError);
		}
	};

	const dayStats = dayModal ? statsByDate[dayModal] : null;
	const daySessions = dayModal ? sessions.filter((s) => localDateKey(s.check_in) === dayModal).sort((a, b) => new Date(a.check_in) - new Date(b.check_in)) : [];
	const dayLeave = dayModal ? leaveRecords.find((r) => r.date === dayModal) : null;

	const setDayLeave = async (leaveType) => {
		setLeaveSaving(true);
		try {
			if (dayLeave) await api.patch(E.ATTENDANCE_LEAVE_RECORD_DETAIL(dayLeave.id), { leave_type: leaveType });
			else await api.post(E.ATTENDANCE_LEAVE_RECORDS, { employee: selectedId, date: dayModal, leave_type: leaveType });
			await Promise.all([fetchLeaveRecords(), fetchStats()]);
			toast.success(l.employeeUpdated);
		} catch {
			toast.error(l.saveError);
		}
		setLeaveSaving(false);
	};
	const clearDayLeave = async () => {
		if (!dayLeave) return;
		setLeaveSaving(true);
		try {
			await api.delete(E.ATTENDANCE_LEAVE_RECORD_DETAIL(dayLeave.id));
			await Promise.all([fetchLeaveRecords(), fetchStats()]);
			toast.success(l.employeeUpdated);
		} catch {
			toast.error(l.saveError);
		}
		setLeaveSaving(false);
	};

	const exportExcel = async () => {
		setExporting(true);
		try {
			const params = { month };
			if (group !== 'all') params.group = group;
			const res = await api.get(E.ATTENDANCE_EXPORT, { params, responseType: 'arraybuffer' });
			await shareFile(bufferToBase64(res.data), `attendance_${month}${group !== 'all' ? `_group${group}` : ''}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		} catch {
			toast.error(l.saveError);
		}
		setExporting(false);
	};

	const [y, mo] = month.split('-').map(Number);
	const summary = selectedStats ? [
		[l.norm, formatHours(selectedStats.expected_work_minutes)],
		[l.worked, formatHours(selectedStats.total_worked_minutes), colors.amber],
		[l.overtime, selectedStats.overtime_minutes > 0 ? `+${formatHours(selectedStats.overtime_minutes)}` : '—', colors.green],
		[l.shortfall, selectedStats.shortfall_minutes > 0 ? `-${formatHours(selectedStats.shortfall_minutes)}` : '—', colors.red],
		[l.lateCount, `${selectedStats.late_count}`],
		[l.lateTotal, formatHours(selectedStats.total_late_minutes)],
		[l.workedDays, `${selectedStats.worked_days}/${selectedStats.scheduled_workdays}`],
		[l.missedDays, `${selectedStats.missed_days}`],
		[l.avgIn, selectedStats.avg_in || '—'],
		[l.avgOut, selectedStats.avg_out || '—'],
		[l.tempExits, `${selectedStats.temp_exits}`],
	] : [];

	return (
		<Screen header={<StackHeader right={<IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={openCreate} />} />} onRefresh={() => Promise.all([fetchEmployees(), fetchStats(), fetchSessions(), fetchLeaveRecords()])}>
			<LargeTitle title={l.title} subtitle={l.subtitle} />
			<Segmented
				value={group}
				onChange={setGroup}
				style={{ marginBottom: 14 }}
				options={[{ value: '1', label: l.group1, badge: counts[1] || null }, { value: '2', label: l.group2, badge: counts[2] || null }, { value: 'all', label: l.allGroups, badge: counts.all || null }]}
			/>

			{loadingEmployees ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 20 }} /> : !filtered.length ? (
				<EmptyState icon={Users} title={l.noEmployeesInGroup} action={<Button size="md" icon={Plus} title={l.addEmployee} onPress={openCreate} />} />
			) : filtered.map((emp) => (
				<Card key={emp.id} style={{ marginBottom: 10, padding: 14, opacity: emp.is_active ? 1 : 0.6 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<View style={{ flex: 1 }}>
							<T v="strong">{emp.full_name}</T>
							<T v="small" style={{ fontSize: 12 }}>{emp.phone || '—'}</T>
						</View>
						<Tap onPress={() => switchGroup(emp)} disabled={switchingId === emp.id} style={[styles.act, { backgroundColor: groupOf(emp) === 1 ? colors.goldTint : colors.purpleSoft }]}>
							{switchingId === emp.id ? <ActivityIndicator size="small" color={colors.amber} /> : <ArrowLeftRight size={15} color={groupOf(emp) === 1 ? colors.amber : colors.purple} />}
						</Tap>
						<Tap onPress={() => openEdit(emp)} style={[styles.act, { backgroundColor: colors.blueSoft }]}><Edit2 size={15} color={colors.blue} /></Tap>
						<Tap onPress={() => toggleActive(emp)} style={[styles.act, { backgroundColor: emp.is_active ? colors.redSoft : colors.greenSoft }]}>
							{emp.is_active ? <Trash2 size={15} color={colors.red} /> : <RotateCcw size={15} color={colors.green} />}
						</Tap>
					</View>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
						<Pill icon={Users} label={groupOf(emp) === 1 ? l.group1 : l.group2} color={groupOf(emp) === 1 ? colors.amber : colors.purple} bg={groupOf(emp) === 1 ? colors.goldTint : colors.purpleSoft} />
						<Pill icon={emp.is_linked ? Link2 : Link2Off} label={emp.is_linked ? l.linked : l.notLinked} color={emp.is_linked ? colors.blue : colors.muted} bg={emp.is_linked ? colors.blueSoft : colors.cardMuted} />
						<Pill dot label={emp.is_active ? l.active : l.inactive} color={emp.is_active ? colors.green : colors.muted} bg={emp.is_active ? colors.greenSoft : colors.cardMuted} />
						<Pill icon={Clock} label={`${(emp.schedule_start || '09:00').slice(0, 5)}–${(emp.schedule_end || '18:00').slice(0, 5)}`} />
					</View>
				</Card>
			))}

			<T v="h3" style={{ marginTop: 18, marginBottom: 10 }}>{l.statsTitle}</T>
			<Card style={{ marginBottom: 12 }}>
				<View style={styles.monthRow}>
					<Tap onPress={() => setMonth((m) => shiftMonth(m, -1))} style={styles.monthBtn}><ChevronLeft size={18} color={colors.ink} /></Tap>
					<T v="strong" style={{ flex: 1, textAlign: 'center' }}>{l.months[mo - 1]} {y}</T>
					<Tap onPress={() => setMonth((m) => shiftMonth(m, 1))} style={styles.monthBtn}><ChevronRight size={18} color={colors.ink} /></Tap>
				</View>
				<SelectField
					label={l.selectEmployee}
					title={l.selectEmployee}
					value={selectedId}
					placeholder="—"
					options={[{ value: '', label: '—' }, ...filtered.map((e) => ({ value: String(e.id), label: e.full_name }))]}
					onChange={(v) => setSelectedId(v)}
				/>
				<Button size="md" variant="dark" icon={Download} title={l.exportExcel} loading={exporting} onPress={exportExcel} style={{ marginTop: 12 }} />
			</Card>

			{!selectedId ? (
				<T v="small" style={{ textAlign: 'center', marginVertical: 12 }}>{l.selectEmployeeHint}</T>
			) : (
				<>
					<Card style={{ marginBottom: 12 }}>
						<T v="strong" style={{ marginBottom: 4 }}>{l.calendarTitle}</T>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
							<View style={[styles.dot, { backgroundColor: colors.amber }]} />
							<T v="small" style={{ fontSize: 11 }}>{l.autoClosedLegend}</T>
						</View>
						{loadingSessions ? <ActivityIndicator color={colors.goldDeep} /> : (
							<>
								<View style={styles.week}>{l.weekdays.map((wd) => <T key={wd} v="label" style={styles.wd}>{wd}</T>)}</View>
								{calendarWeeks.map((week, wi) => (
									<View key={wi} style={styles.week}>
										{week.map((cell, ci) => {
											if (!cell) return <View key={ci} style={styles.cell} />;
											const ds = statsByDate[cell.key];
											const tone = ds?.leave_type ? STATUS_TONE[ds.leave_type] : ds?.total_worked_minutes > 0 ? STATUS_TONE.worked : ds?.missed ? STATUS_TONE.absent : null;
											return (
												<Tap key={ci} onPress={() => setDayModal(cell.key)} style={[styles.cell, styles.cellOn, tone && { backgroundColor: tone[1] }]}>
													<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
														<T style={styles.dayNum}>{cell.day}</T>
														{ds?.auto_closed ? <View style={[styles.dot, { backgroundColor: colors.amber }]} /> : null}
													</View>
													{cell.sessions[0] ? <T style={styles.cellTime}>{hhmm(cell.sessions[0].check_in)}</T> : null}
													<T style={[styles.cellVal, tone && { color: tone[0] }]} numberOfLines={1}>
														{ds?.leave_type ? ds.leave_type.slice(0, 3) : ds?.total_worked_minutes > 0 ? `${Math.round((ds.total_worked_minutes / 60) * 10) / 10}` : ds?.is_day_off ? '—' : ds?.missed ? '✕' : ''}
													</T>
												</Tap>
											);
										})}
									</View>
								))}
							</>
						)}
					</Card>

					{chartData.length ? (
						<Card style={{ marginBottom: 12 }}>
							<T v="strong" style={{ marginBottom: 8 }}>{l.dailyHours}</T>
							<ColumnChart data={chartData} color={colors.goldDeep} height={170} showValues={false} labelEvery={5} />
						</Card>
					) : null}

					{selectedStats ? (
						<Card style={{ marginBottom: 12 }}>
							<T v="strong" style={{ marginBottom: 10 }}>{l.monthlySummary}</T>
							<View style={styles.grid}>
								{summary.map(([label, value, color]) => (
									<View key={label} style={styles.gridItem}>
										<T v="label" style={{ fontSize: 9.5 }} numberOfLines={1}>{label}</T>
										<T v="strong" style={{ fontSize: 15 }} color={color}>{value}</T>
									</View>
								))}
							</View>
						</Card>
					) : null}
				</>
			)}

			{!loadingStats && stats ? tops.map(([title, list, fmt, color]) => (list.length ? (
				<Card key={title} style={{ marginBottom: 12 }}>
					<T v="strong" style={{ marginBottom: 8 }}>{title}</T>
					{list.map((e, i) => (
						<View key={e.employee_id} style={styles.rankRow}>
							<T v="body" style={{ flex: 1 }} numberOfLines={1}>{i + 1}. {e.full_name}</T>
							<T v="strong" color={color}>{fmt(e)}</T>
						</View>
					))}
				</Card>
			) : null)) : null}

			<Card>
				<T v="strong" style={{ marginBottom: 8 }}>{l.monthlyTotals}</T>
				{loadingStats ? <ActivityIndicator color={colors.goldDeep} /> : !monthlyTotals.length ? <T v="small">{l.noEmployees}</T> : monthlyTotals.map((row) => (
					<View key={row.employee_id} style={styles.rankRow}>
						<View style={{ flex: 1 }}>
							<T v="body" numberOfLines={1}>{row.full_name}</T>
							{row.late_count > 0 || row.overtime_minutes > 0 ? (
								<View style={{ flexDirection: 'row', gap: 8 }}>
									{row.late_count > 0 ? <T v="small" style={{ fontSize: 11.5 }} color={colors.red}>{row.late_count}× {l.lateCount.toLowerCase()}</T> : null}
									{row.overtime_minutes > 0 ? <T v="small" style={{ fontSize: 11.5 }} color={colors.green}>+{formatHours(row.overtime_minutes)}</T> : null}
								</View>
							) : null}
						</View>
						<T v="strong" color={colors.amber}>{formatHours(row.total_minutes)}</T>
					</View>
				))}
			</Card>

			<Sheet visible={!!formModal} onClose={() => !saving && setFormModal(null)} title={formModal?.mode === 'create' ? l.addEmployee : l.edit} scroll maxHeight="92%">
				{formModal ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<T v="label">{l.group}</T>
						<Segmented value={String(formModal.data.group)} onChange={(v) => setData({ group: Number(v) })} options={[{ value: '1', label: l.group1 }, { value: '2', label: l.group2 }]} />
						<Field label={l.name} value={formModal.data.full_name} onChangeText={(v) => setData({ full_name: v })} />
						<Field label={l.phone} value={formModal.data.phone} keyboardType="phone-pad" onChangeText={(v) => setData({ phone: v })} />
						<Field label={l.telegramId} value={formModal.data.telegram_user_id} keyboardType="number-pad" hint={l.telegramIdHint} onChangeText={(v) => setData({ telegram_user_id: v.replace(/\D/g, '') })} />
						<T v="label">{l.schedule}</T>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Field style={{ flex: 1 }} label={l.scheduleStart} value={formModal.data.schedule_start} placeholder="09:00" maxLength={5} keyboardType="numbers-and-punctuation" onChangeText={(v) => setData({ schedule_start: v })} />
							<Field style={{ flex: 1 }} label={l.scheduleEnd} value={formModal.data.schedule_end} placeholder="18:00" maxLength={5} keyboardType="numbers-and-punctuation" onChangeText={(v) => setData({ schedule_end: v })} />
						</View>
						<Field label={l.graceMinutes} value={formModal.data.grace_minutes} keyboardType="number-pad" onChangeText={(v) => setData({ grace_minutes: v.replace(/\D/g, '') })} />
						<T v="label">{l.workDays}</T>
						<View style={{ flexDirection: 'row', gap: 6 }}>
							{l.weekdays.map((wd, i) => {
								const on = formModal.data.work_days.split(',').filter(Boolean).map(Number).includes(i + 1);
								return (
									<Tap key={wd} onPress={() => toggleWorkDay(i + 1)} containerStyle={{ flex: 1 }} style={[styles.dayChip, on && styles.dayChipOn]}>
										<T style={{ fontFamily: fonts.bold, fontSize: 12, color: on ? colors.navyDeep : colors.muted }}>{wd}</T>
									</Tap>
								);
							})}
						</View>
						<Button title={l.save} loading={saving} onPress={save} style={{ marginTop: 6 }} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!dayModal} onClose={() => setDayModal(null)} title={`${l.dayDetail} · ${dayModal || ''}`} scroll>
				<View style={{ gap: 12, paddingBottom: 10 }}>
					{dayStats ? (
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
							<Pill label={l[STATUS_KEY[dayStats.status]] || dayStats.status} color={(STATUS_TONE[dayStats.status] || STATUS_TONE.day_off)[0]} bg={(STATUS_TONE[dayStats.status] || STATUS_TONE.day_off)[1]} />
							{dayStats.late_minutes > 0 ? <Pill label={`${l.lateCount}: ${formatHours(dayStats.late_minutes)}`} color={colors.red} bg={colors.redSoft} /> : null}
							{dayStats.overtime_minutes > 0 ? <Pill label={`${l.overtime}: ${formatHours(dayStats.overtime_minutes)}`} color={colors.green} bg={colors.greenSoft} /> : null}
						</View>
					) : null}
					{!daySessions.length ? <T v="small">{l.noSessions}</T> : daySessions.map((s) => (
						<View key={s.id} style={styles.session}>
							<T v="strong" color={colors.green}>{hhmm(s.check_in)} — {l.in}</T>
							<T v="strong" color={s.check_out ? colors.red : colors.muted}>{s.check_out ? `${hhmm(s.check_out)} — ${l.out}${s.auto_closed ? ' ⚠️' : ''}` : '…'}</T>
						</View>
					))}
					<T v="label">{l.leaveType}</T>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
						<Button size="sm" variant="light" title={l.markVacation} disabled={leaveSaving} onPress={() => setDayLeave('vacation')} />
						<Button size="sm" variant="light" title={l.markSick} disabled={leaveSaving} onPress={() => setDayLeave('sick')} />
						<Button size="sm" variant="light" title={l.markAbsent} disabled={leaveSaving} onPress={() => setDayLeave('absent')} />
					</View>
					<Button size="md" variant="ghost" title={l.clearLeave} disabled={leaveSaving || !dayLeave} loading={leaveSaving} onPress={clearDayLeave} />
				</View>
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
	monthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	week: { flexDirection: 'row', gap: 4, marginBottom: 4 },
	wd: { flex: 1, textAlign: 'center', fontSize: 10 },
	cell: { flex: 1, minHeight: 52, borderRadius: 10, padding: 4 },
	cellOn: { backgroundColor: colors.cardMuted },
	dayNum: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink2 },
	cellTime: { fontFamily: fonts.semibold, fontSize: 8.5, color: colors.muted },
	cellVal: { fontFamily: fonts.extrabold, fontSize: 10.5, color: colors.muted, marginTop: 'auto' },
	dot: { width: 7, height: 7, borderRadius: 4 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	gridItem: { width: '48%', flexGrow: 1, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, gap: 2 },
	rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
	session: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	dayChip: { height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	dayChipOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
