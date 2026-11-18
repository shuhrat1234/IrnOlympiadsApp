import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AlertTriangle, Award, Calculator, CheckCircle2, Clock, FileQuestion, FlaskConical, History, Languages, Medal, Megaphone, MinusCircle, RotateCcw, Search, Share2, ShieldCheck, Sliders, Trophy, UserSearch, Users, Wrench } from 'lucide-react-native';
import api, { errorMessage } from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Button, Card, Field, IconBadge, Pill, Segmented, Sheet, Skeleton, T, Tap } from '../../components/ui';
import { ChoicePills, TextArea } from '../../components/form';
import { colors, fonts, radius } from '../../theme';
import { shareFile } from '../../utils/files';

const L = {
	title: { uz: 'Mening tangalarim', ru: 'Мои монеты', en: 'My coins' },
	subtitle: { uz: "Tasdiqlangan o'qituvchi: 1 tanga, o'quvchi ro'yxati: 1 tanga, oltin: 5, kumush: 4, bronza: 3 tanga", ru: 'Подтверждение учителя: 1 монета, регистрация ученика: 1 монета, золото: 5, серебро: 4, бронза: 3', en: 'Teacher approval: 1 coin, student registration: 1 coin, gold: 5, silver: 4, bronze: 3' },
	total: { uz: 'Jami tanga', ru: 'Всего монет', en: 'Total coins' },
	approval: { uz: 'Tasdiqlash', ru: 'Подтверждение', en: 'Approval' },
	registrations: { uz: "O'quvchi ro'yxati", ru: 'Регистрации', en: 'Registrations' },
	gold: { uz: 'Oltin', ru: 'Золото', en: 'Gold' },
	silver: { uz: 'Kumush', ru: 'Серебро', en: 'Silver' },
	bronze: { uz: 'Bronza', ru: 'Бронза', en: 'Bronze' },
	manual: { uz: 'Admin tuzatishi', ru: 'Корректировка админа', en: 'Admin adjustment' },
	history: { uz: 'Tangalar tarixi', ru: 'История монет', en: 'Coin history' },
	noHistory: { uz: "Hozircha tangalar tarixi yo'q", ru: 'Пока нет истории монет', en: 'No coin history yet' },
	noMatchingHistory: { uz: 'Mos keluvchi yozuvlar topilmadi', ru: 'Записи не найдены', en: 'No matching records' },
	searchHistory: { uz: "O'quvchi yoki olimpiada bo'yicha qidirish...", ru: 'Поиск по ученику или олимпиаде...', en: 'Search by student or olympiad...' },
	records: { uz: 'ta yozuv', ru: 'записей', en: 'records' },
	coin: { uz: 'tanga', ru: 'монет', en: 'coins' },
	breakdown: { uz: "O'quvchilar bo'yicha taqsimot", ru: 'Распределение по ученикам', en: 'Breakdown by student' },
	approvedTitle: { uz: "O'qituvchi akkaunti tasdiqlangan", ru: 'Аккаунт учителя подтверждён', en: 'Teacher account approved' },
	approvedDesc: { uz: "Ro'yxatdan o'tish tasdiqlandi", ru: 'Регистрация одобрена', en: 'Registration approved' },
	regTitle: { uz: "O'quvchilar ro'yxatdan o'tkazildi", ru: 'Регистрации учеников на олимпиаду', en: 'Student olympiad registrations' },
	regDesc: { uz: "ta muvaffaqiyatli ro'yxat", ru: 'регистраций', en: 'registrations' },
	goldTitle: { uz: 'Oltin medal (100+ ball)', ru: 'Золотая медаль (100+)', en: 'Gold medal (100+)' },
	silverTitle: { uz: 'Kumush medal (95+ ball)', ru: 'Серебряная медаль (95+)', en: 'Silver medal (95+)' },
	bronzeTitle: { uz: 'Bronza medal (90+ ball)', ru: 'Бронзовая медаль (90+)', en: 'Bronze medal (90+)' },
	manualDesc: { uz: 'Tangalar miqdori yangilandi', ru: 'Количество монет обновлено', en: 'Coin balance updated' },
	tabAll: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	tabMedals: { uz: 'Medallar', ru: 'Медали', en: 'Medals' },
	tabRegs: { uz: "Ro'yxatlar", ru: 'Регистрации', en: 'Registrations' },
	tabAdj: { uz: 'Tuzatishlar', ru: 'Корректировки', en: 'Adjustments' },
	showAll: { uz: "Barcha yozuvlarni ko'rish", ru: 'Показать все записи', en: 'Show all records' },
	leaderboard: { uz: "O'qituvchilar reytingi", ru: 'Рейтинг учителей', en: 'Teacher leaderboard' },
	maintenance: { uz: "Reyting bo'limida texnik ishlar olib borilmoqda", ru: 'В разделе рейтинга ведутся технические работы', en: 'The rating section is under maintenance' },

	// Coin System v2.1
	newsTitle: { uz: "O'qituvchilar tangalarini hisoblash tizimi yangilanishi", ru: 'Обновление системы начисления учительских коинов', en: 'Teacher coin system update' },
	newsText: {
		uz: "Hurmatli o'qituvchilar! Tangalar hisoblash tizimi yangilandi. Endilikda tangalar faqat sizni o'z shaxsiy kabinetida tasdiqlagan va siz bilan bir shaharda ta'lim oladigan haqiqiy o'quvchilaringiz uchun beriladi. Agar o'quvchi boshqa o'qituvchini tanlasa yoki tasdiqlashni rad etsa, tangalar hisoblanmaydi. Barcha munozarali holatlarni «Yechib olingan tangalar» bo'limi orqali tekshirishga yuborishingiz mumkin — jamoamiz har bir holatni ko'rib chiqadi.",
		ru: 'Уважаемые учителя! Система начисления коинов обновлена. Теперь коины начисляются строго за ваших реальных учеников, подтвердивших вас в личном кабинете, и только в рамках вашего города. Если ученик указал другого учителя или отклонил подтверждение, коины не начисляются. Все спорные ситуации вы можете отправить на проверку через раздел «Снятые коины» — наша команда проверит каждый случай.',
		en: 'Dear teachers! The coin system has been updated. Coins are now awarded strictly for your real students who confirmed you in their account, and only within your city. If a student picked another teacher or declined the confirmation, no coins are awarded. Any disputed case can be sent for review from the “Deducted coins” section — our team checks every case.',
	},
	more: { uz: 'Batafsil', ru: 'Подробнее', en: 'Read more' },
	less: { uz: 'Yopish', ru: 'Свернуть', en: 'Show less' },
	balances: { uz: 'Tangalar balansi', ru: 'Баланс коинов', en: 'Coin balance' },
	balancesSub: { uz: "Fanlar bo'yicha mustaqil hisob-kitob (Matematika, Ingliz tili va Science)", ru: 'Раздельный учёт по предметам (Математика, Английский и Наука)', en: 'Tracked separately per subject (Mathematics, English and Science)' },
	confirmed: { uz: 'Tasdiqlangan', ru: 'Подтверждённые', en: 'Confirmed' },
	confirmedSub: { uz: 'Faol balans', ru: 'Активный баланс', en: 'Active balance' },
	pending: { uz: 'Kutilayotgan', ru: 'Ожидающие', en: 'Pending' },
	pendingSub: { uz: "O'quvchi kutilmoqda", ru: 'Ожидают ученика', en: 'Awaiting student' },
	deducted: { uz: 'Yechib olingan', ru: 'Снятые', en: 'Deducted' },
	deductedSub: { uz: 'Rad etish / nomuvofiqlik', ru: 'Отказ / несовпадение', en: 'Rejected / mismatch' },
	restored: { uz: 'Qayta tiklangan', ru: 'Восстановленные', en: 'Restored' },
	restoredSub: { uz: 'Admin tekshiruvi orqali', ru: 'Одобрено админом', en: 'Approved by admin' },
	mathShort: { uz: 'Mat', ru: 'Мат', en: 'Math' },
	engShort: { uz: 'Ingl', ru: 'Англ', en: 'Eng' },
	scienceShort: { uz: 'Science', ru: 'Наука', en: 'Science' },
	science: { uz: 'Tabiiy fanlar', ru: 'Естественные науки', en: 'Science' },
	stConfirmed: { uz: "Tasdiqlagan o'quvchilar", ru: 'Подтвердили', en: 'Confirmed students' },
	stPending: { uz: 'Kutilmoqda', ru: 'Ожидают', en: 'Pending' },
	stRejected: { uz: 'Rad etgan', ru: 'Отклонили', en: 'Rejected' },
	stReview: { uz: 'Tekshiruvda', ru: 'На проверке', en: 'In review' },
	findStudent: { uz: "O'quvchini ID / telefon orqali topish", ru: 'Найти ученика по ID / тел.', en: 'Find student by ID / phone' },
	requestReview: { uz: 'Tekshirishga ariza', ru: 'Подать заявку на проверку', en: 'Request a review' },
	dedTitle: { uz: "Yechib olingan tangalar va tasdiqlanmagan o'quvchilar", ru: 'Снятые коины и неподтверждённые ученики', en: 'Deducted coins and unconfirmed students' },
	dedSub: { uz: "Yechilgan yoki tasdiq kutayotgan hisoblar ro'yxati, e'tiroz bildirish imkoniyati bilan", ru: 'Список списанных или ожидающих подтверждения начислений с возможностью оспорить', en: 'Deducted or pending accruals, with an option to dispute' },
	fAll: { uz: 'Barchasi', ru: 'Все', en: 'All' },
	fPending: { uz: 'Kutilmoqda', ru: 'Ожидают', en: 'Pending' },
	fDeducted: { uz: 'Yechilgan', ru: 'Сняты', en: 'Deducted' },
	fRestored: { uz: 'Tiklangan', ru: 'Восстановлены', en: 'Restored' },
	dedEmpty: { uz: 'Yechib olingan tangalar mavjud emas', ru: 'Снятых или проблемных коинов нет', en: 'No deducted or disputed coins' },
	dedEmptySub: { uz: "Barcha tangalaringiz to'liq hisoblangan.", ru: 'Все ваши начисления подтверждены или в процессе обработки.', en: 'All your accruals are confirmed or being processed.' },
	dispute: { uz: "E'tiroz bildirish", ru: 'Оспорить', en: 'Dispute' },
	inReview: { uz: 'Tekshiruvda', ru: 'На проверке', en: 'In review' },
	export: { uz: 'CSV eksport', ru: 'Экспорт в CSV', en: 'Export CSV' },
	disputeTitle: { uz: "E'tiroz yoki tekshiruv arizasi", ru: 'Оспорить отказ или подать заявку', en: 'Dispute or review request' },
	disputeSub: { uz: "Ma'muriyat arizangizni 1–3 ish kunida ko'rib chiqadi", ru: 'Администрация рассмотрит заявку в течение 1–3 рабочих дней', en: 'The administration reviews requests within 1–3 business days' },
	subject: { uz: 'Fan', ru: 'Предмет', en: 'Subject' },
	math: { uz: 'Matematika', ru: 'Математика', en: 'Mathematics' },
	english: { uz: 'Ingliz tili', ru: 'Английский язык', en: 'English' },
	studentField: { uz: "O'quvchi (ID, telefon yoki ismi)", ru: 'Ученик (ID, телефон или имя)', en: 'Student (ID, phone or name)' },
	studentPh: { uz: 'Masalan: +998901234567 yoki ID 1245', ru: 'Например: +998901234567 или ID 1245', en: 'E.g. +998901234567 or ID 1245' },
	reason: { uz: 'Murojaat sababi *', ru: 'Причина обращения *', en: 'Reason *' },
	reasonPh: { uz: "Vaziyatni batafsil yozing (masalan: o'quvchi tasodifan rad etish tugmasini bosgan)", ru: 'Подробно опишите ситуацию (например: ученик случайно нажал «Это не мой учитель»)', en: 'Describe the situation (e.g. the student tapped “Not my teacher” by mistake)' },
	evidence: { uz: "Qo'shimcha dalillar / ma'lumot", ru: 'Дополнительные доказательства', en: 'Additional evidence' },
	evidencePh: { uz: 'Dars sanasi, guruh raqami yoki daftar / chat skrinshoti havolasi', ru: 'Дата занятий, номер группы или ссылка на фото тетради / переписки', en: 'Lesson dates, group number or a link to notebook / chat photos' },
	send: { uz: 'Arizani yuborish', ru: 'Отправить заявку', en: 'Send request' },
	needReason: { uz: 'Murojaat sababini kiriting', ru: 'Укажите причину или основание обращения', en: 'Please describe the reason' },
	sent: { uz: 'Arizangiz tekshiruvga yuborildi!', ru: 'Заявка успешно отправлена на проверку!', en: 'Your request was sent for review!' },
	findTitle: { uz: "O'quvchini ID / telefon orqali topish", ru: 'Поиск ученика по ID / номеру', en: 'Find a student by ID / phone' },
	findSub: { uz: 'Moderator orqali biriktirish arizasi', ru: 'Заявка на прикрепление через модератора', en: 'Linking request handled by a moderator' },
	findNote: {
		uz: "Shaxsiy ma'lumotlarni himoya qilish maqsadida butun baza bo'yicha to'g'ridan-to'g'ri qidiruv yopiq. ID yoki telefon raqamini ko'rsating — moderatorlar tekshirib, o'quvchini qo'lda biriktiradi.",
		ru: 'В целях защиты персональных данных прямой поиск по всей базе скрыт. Укажите ID или номер телефона, и модераторы верифицируют и прикрепят ученика вручную.',
		en: 'To protect personal data, direct search across the whole database is hidden. Enter an ID or phone number and moderators will verify and link the student manually.',
	},
	findStudentField: { uz: "O'quvchi ID raqami yoki telefoni *", ru: 'ID ученика или телефон *', en: 'Student ID or phone *' },
	findReason: { uz: 'Qidirish / biriktirish sababi *', ru: 'Причина поиска / прикрепления *', en: 'Reason for the search / linking *' },
	findReasonPh: { uz: "Masalan: doimiy o'quvchim, ro'yxatda ko'rinmayapti", ru: 'Например: мой постоянный ученик, не отображается в списке', en: 'E.g. my regular student, missing from my list' },
	findEvidence: { uz: "Tasdiqlovchi ma'lumotlar", ru: 'Подтверждающие данные', en: 'Supporting details' },
	findEvidencePh: { uz: 'Maktab, sinf yoki tasdiq havolasi', ru: 'Школа, класс или ссылки на фото', en: 'School, grade or photo links' },
	needStudent: { uz: "O'quvchi ID yoki telefon raqamini kiriting", ru: 'Укажите ID или номер телефона ученика', en: 'Enter the student ID or phone number' },
	needFindReason: { uz: 'Qidiruv sababini kiriting', ru: 'Укажите причину поиска', en: 'Enter the reason for the search' },
	submitFind: { uz: 'Ariza berish', ru: 'Подать заявку', en: 'Submit request' },
	disputeReason: { uz: "Olimpiada bo'yicha tanga yechilishiga e'tiroz", ru: 'Оспаривание снятия коина по олимпиаде', en: 'Disputing the coin deduction for olympiad' },
	city: { uz: 'Shahar', ru: 'Город', en: 'City' },
	student: { uz: "O'quvchi", ru: 'Ученик', en: 'Student' },
};

const MEDAL = { gold: ['🥇', colors.amber, colors.goldTint], silver: ['🥈', '#64748B', '#F1F5F9'], bronze: ['🥉', '#C2410C', '#FFF7ED'] };
const TYPE = {
	teacher_approval: [CheckCircle2, colors.blue, colors.blueSoft],
	student_registration: [Users, colors.purple, colors.purpleSoft],
	medal_result: [Trophy, colors.amber, colors.goldTint],
	manual_adjustment: [Sliders, colors.navy, colors.navySoft],
};
const HISTORY_TABS = { all: () => true, medals: (i) => i.type === 'medal_result', registrations: (i) => i.type === 'student_registration', adjustments: (i) => i.type === 'manual_adjustment' || i.type === 'teacher_approval' };
const STATUS_TONE = { pending: [colors.amber, colors.goldTint], deducted: [colors.red, colors.redSoft], restored: [colors.blue, colors.blueSoft], confirmed: [colors.green, colors.greenSoft] };
const PREVIEW = 8;
const fmtDate = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d.getTime()) ? String(s) : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
const emptyTicket = { student_query: '', subject: 'math', reason: '', evidence_info: '' };

export default function TeacherCoins() {
	const { tx, lang } = useLanguage();
	const { currentUser } = useAuth();
	const toast = useToast();
	const [coins, setCoins] = useState(null);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [maintenance, setMaintenance] = useState(null); // message while the rating is being recalculated
	const [historyTab, setHistoryTab] = useState('all');
	const [historySearch, setHistorySearch] = useState('');
	const [historyAll, setHistoryAll] = useState(false);

	const [balances, setBalances] = useState(null);
	const [newsOpen, setNewsOpen] = useState(false);
	const [deducted, setDeducted] = useState([]);
	const [dedLoading, setDedLoading] = useState(true);
	const [dedSubject, setDedSubject] = useState('all');
	const [dedStatus, setDedStatus] = useState('all');
	const [dispute, setDispute] = useState(null); // ticket form | null
	const [find, setFind] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const load = useCallback(async () => {
		const [c, h, b, st] = await Promise.allSettled([
			api.get(E.TEACHER_MY_COINS, { params: { lang } }),
			currentUser?.id ? api.get(E.TEACHER_COIN_HISTORY(currentUser.id), { params: { lang } }) : Promise.reject(),
			api.get(E.TEACHER_BALANCES_OVERVIEW),
			api.get(E.TEACHER_RATING_STATUS, { params: { _t: Date.now() } }),
		]);
		if (c.status === 'fulfilled') setCoins(c.value.data);
		if (h.status === 'fulfilled' && Array.isArray(h.value.data?.history)) setHistory(h.value.data.history);
		if (b.status === 'fulfilled') setBalances(b.value.data);
		const under = [c, h, st].some((r) => r.status === 'fulfilled' && r.value.data?.is_under_maintenance === true);
		const message = [st, c, h].map((r) => (r.status === 'fulfilled' ? r.value.data?.message : null)).find(Boolean);
		setMaintenance(under ? message || tx(L.maintenance) : null);
		setLoading(false);
	}, [lang, currentUser?.id]);
	// Students are added / registered on the other tab — refresh the numbers whenever this one is opened.
	useFocusEffect(useCallback(() => { load(); }, [load]));

	const loadDeducted = useCallback(async () => {
		setDedLoading(true);
		try {
			const params = {};
			if (dedSubject !== 'all') params.subject = dedSubject;
			if (dedStatus !== 'all') params.status = dedStatus;
			const res = await api.get(E.TEACHER_DEDUCTED_HISTORY, { params });
			setDeducted(Array.isArray(res.data) ? res.data : res.data?.results || []);
		} catch {}
		setDedLoading(false);
	}, [dedSubject, dedStatus]);
	useEffect(() => { loadDeducted(); }, [loadDeducted]);

	// Website fallback: synthesize history from the coin summary when the history endpoint is empty.
	const items = useMemo(() => {
		if (history.length) return history;
		if (!coins) return [];
		const list = [];
		if (coins.registration_coins > 0) list.push({ type: 'teacher_approval', title: tx(L.approvedTitle), description: tx(L.approvedDesc), coins: coins.registration_coins, date: currentUser?.date_joined });
		if (coins.student_reg_coins > 0) list.push({ type: 'student_registration', title: tx(L.regTitle), description: `${coins.student_reg_coins} ${tx(L.regDesc)}`, coins: coins.student_reg_coins });
		(coins.entries || []).forEach((e) => list.push({ type: 'medal_result', title: tx(e.medal === 'gold' ? L.goldTitle : e.medal === 'silver' ? L.silverTitle : L.bronzeTitle), description: `${e.student_name} · ${e.olympiad_title}${e.score ? ` · ${e.score}` : ''}`, coins: e.coins }));
		if (coins.manual_adjustment) list.push({ type: 'manual_adjustment', title: tx(L.manual), description: tx(L.manualDesc), coins: coins.manual_adjustment });
		return list;
	}, [history, coins, tx, currentUser]);

	const shownHistory = useMemo(() => {
		const q = historySearch.toLowerCase().trim();
		return items.filter(HISTORY_TABS[historyTab]).filter((i) => !q || [i.title, i.description, i.student_name, i.olympiad_title].some((v) => v && String(v).toLowerCase().includes(q)));
	}, [items, historyTab, historySearch]);
	const tabCount = (key) => items.filter(HISTORY_TABS[key]).length;

	const stats = coins ? [
		[L.approval, `+${coins.registration_coins || 0}`, colors.blue],
		[L.registrations, `+${coins.student_reg_coins || 0}`, colors.purple],
		[L.gold, coins.gold || 0, colors.amber, '🥇'],
		[L.silver, coins.silver || 0, '#64748B', '🥈'],
		[L.bronze, coins.bronze || 0, '#C2410C', '🥉'],
	] : [];

	const bd = balances?.breakdown || {};
	const counters = [
		{ key: 'confirmed', icon: ShieldCheck, tone: ['#047857', '#F0FDF4', '#BBF7D0'], value: balances?.confirmed_coins || coins?.total_coins || 0, math: bd.math?.confirmed ?? balances?.math_confirmed_coins, eng: bd.english?.confirmed ?? balances?.english_confirmed_coins, sci: bd.science?.confirmed ?? balances?.science_confirmed_coins },
		{ key: 'pending', icon: Clock, tone: ['#B45309', '#FFFBEB', '#FDE68A'], value: balances?.pending_coins ?? 0, math: bd.math?.pending, eng: bd.english?.pending, sci: bd.science?.pending },
		{ key: 'deducted', icon: MinusCircle, tone: ['#BE123C', '#FFF1F2', '#FECDD3'], value: balances?.deducted_coins ?? 0, math: bd.math?.deducted, eng: bd.english?.deducted, sci: bd.science?.deducted },
		{ key: 'restored', icon: RotateCcw, tone: ['#0369A1', '#F0F9FF', '#BAE6FD'], value: balances?.restored_coins ?? 0, math: bd.math?.restored, eng: bd.english?.restored, sci: bd.science?.restored },
	];
	const ss = balances?.students_stats || {};
	const studentStats = [
		[L.stConfirmed, ss.confirmed_count ?? balances?.confirmed_students_count ?? 0, colors.green, colors.greenSoft],
		[L.stPending, ss.pending_count ?? balances?.pending_students_count ?? 0, colors.amber, colors.goldTint],
		[L.stRejected, ss.rejected_count ?? balances?.rejected_students_count ?? 0, colors.red, colors.redSoft],
		[L.stReview, ss.in_review_count ?? balances?.in_review_students_count ?? 0, colors.blue, colors.blueSoft],
	];

	const submitTicket = async (form, requestType, close) => {
		if (requestType === 'student_search' && !form.student_query.trim()) return toast.error(tx(L.needStudent));
		if (!form.reason.trim()) return toast.error(tx(requestType === 'student_search' ? L.needFindReason : L.needReason));
		setSubmitting(true);
		try {
			const res = await api.post(E.TEACHER_CREATE_DISPUTE_TICKET, {
				student_query: form.student_query.trim(),
				subject: form.subject,
				request_type: requestType,
				reason: form.reason.trim(),
				evidence_info: form.evidence_info.trim(),
			});
			toast.success(res.data?.message || tx(L.sent));
			close();
			load();
			loadDeducted();
		} catch (err) {
			toast.error(errorMessage(err, tx({ uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' })));
		}
		setSubmitting(false);
	};

	const exportCsv = async () => {
		if (!deducted.length) return;
		const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const head = [tx(L.student), 'ID', tx(L.subject), tx(L.city), 'Olympiad', tx(L.coin), 'Status', 'Reason', 'Date'];
		const rows = deducted.map((d) => [d.student_name, d.student_participant_id, d.subject, d.city, d.olympiad_title, d.amount, d.status, d.reason, d.date].map(cell).join(','));
		try {
			await shareFile(`﻿${[head.map(cell).join(','), ...rows].join('\n')}`, `irn_deducted_coins_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv', { encoding: 'utf8' });
		} catch {
			toast.error(tx({ uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' }));
		}
	};

	const subjectOptions = [
		{ value: 'math', label: tx(L.math), icon: Calculator },
		{ value: 'english', label: tx(L.english), icon: Languages },
		{ value: 'science', label: tx(L.science), icon: FlaskConical },
	];

	return (
		<Screen tabBar onRefresh={() => Promise.all([load(), loadDeducted()])}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />

			{/* Official announcement about the coin system update */}
			<Card style={styles.news}>
				<View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
					<IconBadge icon={Megaphone} size={36} color={colors.blue} bg={colors.white} />
					<T v="strong" style={{ flex: 1, fontSize: 13.5, color: colors.navyDeep }}>{tx(L.newsTitle)}</T>
				</View>
				<T v="small" style={{ marginTop: 8, color: '#1E3A8A', lineHeight: 18 }} numberOfLines={newsOpen ? undefined : 3}>{tx(L.newsText)}</T>
				<Tap onPress={() => setNewsOpen((v) => !v)} hitSlop={8} style={{ marginTop: 6 }}><T v="strong" color={colors.blue} style={{ fontSize: 12.5 }}>{tx(newsOpen ? L.less : L.more)}</T></Tap>
			</Card>

			{/* Four transparent counters */}
			<View style={styles.sectionHead}>
				<View style={{ flex: 1 }}>
					<T v="h3">{tx(L.balances)}</T>
					<T v="small" style={{ fontSize: 12 }}>{tx(L.balancesSub)}</T>
				</View>
			</View>
			<View style={styles.grid}>
				{counters.map((c) => (
					<View key={c.key} style={[styles.counter, { backgroundColor: c.tone[1], borderColor: c.tone[2] }]}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
							<T v="label" style={{ flex: 1, fontSize: 10, color: c.tone[0], textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>{tx(L[c.key])}</T>
							<IconBadge icon={c.icon} size={28} color={c.tone[0]} bg="rgba(255,255,255,0.7)" />
						</View>
						{loading ? <Skeleton height={28} width={50} style={{ marginTop: 8 }} /> : <T style={[styles.counterValue, { color: c.tone[0] }]}>{c.value}</T>}
						<T v="small" style={{ fontSize: 11, color: c.tone[0], opacity: 0.85 }} numberOfLines={1}>{tx(L[`${c.key}Sub`])}</T>
						<View style={[styles.counterDivider, { borderTopColor: c.tone[2], flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }]}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
								<Calculator size={11} color={c.tone[0]} />
								<T v="small" style={{ fontSize: 10.5, color: c.tone[0] }}>{tx(L.mathShort)}: {c.math ?? 0}</T>
							</View>
							<T v="small" style={{ fontSize: 10, color: c.tone[0], opacity: 0.6 }}>·</T>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
								<Languages size={11} color={c.tone[0]} />
								<T v="small" style={{ fontSize: 10.5, color: c.tone[0] }}>{tx(L.engShort)}: {c.eng ?? 0}</T>
							</View>
							<T v="small" style={{ fontSize: 10, color: c.tone[0], opacity: 0.6 }}>·</T>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
								<FlaskConical size={11} color={c.tone[0]} />
								<T v="small" style={{ fontSize: 10.5, color: c.tone[0] }}>{tx(L.scienceShort)}: {c.sci ?? 0}</T>
							</View>
						</View>
					</View>
				))}
			</View>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
				{studentStats.map(([label, value, color, bg]) => <Pill key={label.en} label={`${tx(label)}: ${value}`} color={color} bg={bg} />)}
			</View>
			<View style={{ gap: 8, marginTop: 14 }}>
				<Button size="md" variant="light" icon={UserSearch} title={tx(L.findStudent)} onPress={() => setFind({ ...emptyTicket })} />
				<Button size="md" variant="dark" icon={FileQuestion} title={tx(L.requestReview)} onPress={() => setDispute({ ...emptyTicket })} />
			</View>

			{/* Deducted & pending accruals */}
			<View style={styles.sectionHead}>
				<View style={{ flex: 1 }}>
					<T v="h3">{tx(L.dedTitle)}</T>
					<T v="small" style={{ fontSize: 12 }}>{tx(L.dedSub)}</T>
				</View>
				{deducted.length ? <Tap onPress={exportCsv} hitSlop={8} style={styles.exportBtn} accessibilityLabel={tx(L.export)}><Share2 size={16} color={colors.ink2} /></Tap> : null}
			</View>
			<View style={{ gap: 12, marginBottom: 14 }}>
				<View style={{ gap: 6 }}>
					<T v="label" numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>{tx(L.subject)}:</T>
					<ChoicePills value={dedSubject} onChange={setDedSubject} options={[{ value: 'all', label: tx(L.fAll) }, { value: 'math', label: tx(L.mathShort), icon: Calculator }, { value: 'english', label: tx(L.engShort), icon: Languages }, { value: 'science', label: tx(L.scienceShort), icon: FlaskConical }]} />
				</View>
				<View style={{ gap: 6 }}>
					<T v="label" numberOfLines={1} style={{ fontSize: 11, color: colors.muted }}>{tx({ uz: 'Holat', ru: 'Статус', en: 'Status' })}:</T>
					<ChoicePills value={dedStatus} onChange={setDedStatus} options={[{ value: 'all', label: tx(L.fAll) }, { value: 'pending', label: tx(L.fPending) }, { value: 'deducted', label: tx(L.fDeducted) }, { value: 'restored', label: tx(L.fRestored) }]} />
				</View>
			</View>
			{dedLoading ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 16 }} /> : !deducted.length ? (
				<Card style={{ alignItems: 'center', gap: 4 }}>
					<IconBadge icon={CheckCircle2} color={colors.green} bg={colors.greenSoft} />
					<T v="strong" style={{ textAlign: 'center', marginTop: 6 }}>{tx(L.dedEmpty)}</T>
					<T v="small" style={{ textAlign: 'center' }}>{tx(L.dedEmptySub)}</T>
				</Card>
			) : deducted.map((d) => {
				const code = d.subject_code || (d.subject === 'science' || d.subject === 'Наука' || d.subject === 'Tabiiy fanlar' ? 'science' : d.subject === 'english' ? 'english' : 'math');
				const tone = STATUS_TONE[d.status] || STATUS_TONE.deducted;
				return (
					<Card key={d.id} style={{ marginBottom: 8, padding: 14 }}>
						<View style={{ flexDirection: 'row', gap: 10 }}>
							<View style={{ flex: 1, gap: 2 }}>
								<T v="strong" style={{ fontSize: 14 }}>{d.student_name}</T>
								<T v="small" style={{ fontSize: 12 }}>{[d.student_participant_id, d.city].filter((v) => v && v !== '—').join(' · ')}</T>
							</View>
							<T style={{ fontFamily: fonts.extrabold, fontSize: 17, color: d.amount > 0 ? colors.green : d.amount < 0 ? colors.red : colors.muted }}>{d.amount > 0 ? `+${d.amount}` : d.amount}</T>
						</View>
						{d.olympiad_title ? <T v="small" style={{ marginTop: 6 }} numberOfLines={2}>{d.olympiad_title}</T> : null}
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
							<Pill
								icon={code === 'science' ? FlaskConical : code === 'english' ? Languages : Calculator}
								label={code === 'science' ? tx(L.scienceShort) : code === 'english' ? tx(L.engShort) : tx(L.mathShort)}
								color={code === 'science' ? colors.green : code === 'english' ? colors.blue : colors.amber}
								bg={code === 'science' ? colors.greenSoft : code === 'english' ? colors.blueSoft : colors.goldTint}
							/>
							{d.reason ? <Pill label={d.reason} color={tone[0]} bg={tone[1]} /> : null}
							{d.date ? <T v="small" style={{ fontSize: 11 }}>{d.date}</T> : null}
						</View>
						{d.ticket_number ? (
							<Pill icon={Clock} label={`${tx(L.inReview)} · #${d.ticket_number}`} color={colors.blue} bg={colors.blueSoft} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
						) : d.status !== 'restored' ? (
							<Button
								size="sm"
								variant="soft"
								icon={AlertTriangle}
								title={tx(L.dispute)}
								style={{ marginTop: 10 }}
								onPress={() => setDispute({ student_query: d.student_participant_id && d.student_participant_id !== '—' ? d.student_participant_id : d.student_name || '', subject: code, reason: `${tx(L.disputeReason)}: ${d.olympiad_title || ''}`, evidence_info: `${tx(L.city)}: ${d.city || '—'}. ${tx(L.student)}: ${d.student_name || ''}` })}
							/>
						) : null}
					</Card>
				);
			})}

			{/* Classic coin summary */}
			<View style={styles.sectionHead}>
				<T v="h3" style={{ flex: 1 }}>{tx(L.total)}</T>
				<Tap onPress={() => router.push('/teacher/rating')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
					<Trophy size={14} color={colors.amber} />
					<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(L.leaderboard)}</T>
				</Tap>
			</View>
			{maintenance ? (
				<Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.goldTint, borderColor: colors.goldSoft }}>
					<IconBadge icon={Wrench} bg={colors.white} />
					<T v="small" style={{ flex: 1, color: colors.ink2 }}>{maintenance}</T>
				</Card>
			) : loading ? <Skeleton height={160} radiusSize={26} /> : coins ? (
				<>
					<View style={styles.hero}>
						<View style={styles.heroIcon}><Award size={26} color={colors.navyDeep} /></View>
						<T v="label" color="rgba(255,255,255,0.6)" style={{ marginTop: 12 }}>{tx(L.total)}</T>
						<T style={styles.total}>{coins.total_coins || 0}</T>
						{coins.manual_adjustment ? <Pill label={`${tx(L.manual)}: ${coins.manual_adjustment > 0 ? '+' : ''}${coins.manual_adjustment}`} color={colors.navyDeep} bg={colors.gold} /> : null}
					</View>
					<View style={styles.grid}>
						{stats.map(([k, v, c, emoji]) => (
							<Card key={k.en} style={styles.stat}>
								<T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: c }}>{emoji ? `${emoji} ` : ''}{v}</T>
								<T v="small" style={{ fontSize: 11.5 }} numberOfLines={1}>{tx(k)}</T>
							</Card>
						))}
					</View>
				</>
			) : null}

			{maintenance ? null : (
				<>
					<View style={styles.sectionHead}>
						<History size={16} color={colors.ink2} />
						<T v="h3" style={{ flex: 1 }}>{tx(L.history)}</T>
						<T v="small">{shownHistory.length} {tx(L.records)}</T>
					</View>
					{items.length > 3 ? (
						<View style={{ gap: 8, marginBottom: 10 }}>
							<Field icon={Search} value={historySearch} onChangeText={setHistorySearch} placeholder={tx(L.searchHistory)} autoCorrect={false} autoCapitalize="none" />
							<ChoicePills
								value={historyTab}
								onChange={(v) => { setHistoryTab(v); setHistoryAll(false); }}
								options={[['all', L.tabAll], ['medals', L.tabMedals], ['registrations', L.tabRegs], ['adjustments', L.tabAdj]].map(([value, label]) => ({ value, label: `${tx(label)} ${tabCount(value)}` }))}
							/>
						</View>
					) : null}
					{!shownHistory.length && !loading ? <T v="small">{tx(items.length ? L.noMatchingHistory : L.noHistory)}</T> : (historyAll ? shownHistory : shownHistory.slice(0, PREVIEW)).map((item, i) => {
						const [Icon, c, bg] = TYPE[item.type] || TYPE.manual_adjustment;
						return (
							<Card key={item.id ?? i} style={{ marginBottom: 8, padding: 14, flexDirection: 'row', gap: 12 }}>
								<IconBadge icon={Icon} color={c} bg={bg} size={40} />
								<View style={{ flex: 1, gap: 2 }}>
									<View style={{ flexDirection: 'row', gap: 8 }}>
										<T v="strong" style={{ flex: 1, fontSize: 14 }}>{item.title}</T>
										<T v="strong" style={{ fontSize: 14 }} color={item.coins < 0 ? colors.red : colors.green}>{item.coins > 0 ? '+' : ''}{item.coins} {tx(L.coin)}</T>
									</View>
									{item.description ? <T v="small" style={{ fontSize: 12 }}>{item.description}</T> : null}
									{item.date ? <T v="small" style={{ fontSize: 11 }}>{fmtDate(item.date)}</T> : null}
								</View>
							</Card>
						);
					})}
					{!historyAll && shownHistory.length > PREVIEW ? <Button size="sm" variant="light" title={`${tx(L.showAll)} (${shownHistory.length})`} onPress={() => setHistoryAll(true)} /> : null}

					{coins?.entries?.length ? (
						<>
							<View style={styles.sectionHead}>
								<Medal size={16} color={colors.ink2} />
								<T v="h3">{tx(L.breakdown)}</T>
							</View>
							{coins.entries.map((e, i) => {
								const [emoji, c, bg] = MEDAL[e.medal] || MEDAL.bronze;
								return (
									<View key={`${e.student_id}-${e.olympiad_id}-${i}`} style={styles.entry}>
										<View style={{ flex: 1 }}>
											<T v="strong" style={{ fontSize: 14 }}>{e.student_name}</T>
											<T v="small" style={{ fontSize: 12 }} numberOfLines={1}>{e.olympiad_title}</T>
										</View>
										<Pill label={`${emoji} ${tx(L[e.medal] || L.bronze)}`} color={c} bg={bg} />
										<T v="strong" color={colors.green}>+{e.coins}</T>
									</View>
								);
							})}
						</>
					) : null}
				</>
			)}

			{/* Dispute a rejection / ask for a review */}
			<Sheet visible={!!dispute} onClose={() => !submitting && setDispute(null)} title={tx(L.disputeTitle)} scroll maxHeight="94%">
				{dispute ? (
					<View style={{ gap: 12, paddingBottom: 8 }}>
						<T v="small">{tx(L.disputeSub)}</T>
						<View><T v="label" style={styles.label}>{tx(L.subject)}</T><Segmented value={dispute.subject} onChange={(v) => setDispute((d) => ({ ...d, subject: v }))} options={subjectOptions} /></View>
						<Field label={tx(L.studentField)} value={dispute.student_query} onChangeText={(v) => setDispute((d) => ({ ...d, student_query: v }))} placeholder={tx(L.studentPh)} autoCorrect={false} />
						<TextArea label={tx(L.reason)} value={dispute.reason} onChangeText={(v) => setDispute((d) => ({ ...d, reason: v }))} placeholder={tx(L.reasonPh)} />
						<TextArea rows={3} label={tx(L.evidence)} value={dispute.evidence_info} onChangeText={(v) => setDispute((d) => ({ ...d, evidence_info: v }))} placeholder={tx(L.evidencePh)} />
						<Button title={tx(L.send)} loading={submitting} onPress={() => submitTicket(dispute, 'dispute_rejection', () => setDispute(null))} />
					</View>
				) : null}
			</Sheet>

			{/* Ask a moderator to find & link a student */}
			<Sheet visible={!!find} onClose={() => !submitting && setFind(null)} title={tx(L.findTitle)} scroll maxHeight="94%">
				{find ? (
					<View style={{ gap: 12, paddingBottom: 8 }}>
						<T v="strong" style={{ fontSize: 13 }} color={colors.amber}>{tx(L.findSub)}</T>
						<T v="small">{tx(L.findNote)}</T>
						<View><T v="label" style={styles.label}>{tx(L.subject)}</T><Segmented value={find.subject} onChange={(v) => setFind((d) => ({ ...d, subject: v }))} options={subjectOptions} /></View>
						<Field label={tx(L.findStudentField)} value={find.student_query} onChangeText={(v) => setFind((d) => ({ ...d, student_query: v }))} placeholder={tx(L.studentPh)} autoCorrect={false} />
						<TextArea rows={3} label={tx(L.findReason)} value={find.reason} onChangeText={(v) => setFind((d) => ({ ...d, reason: v }))} placeholder={tx(L.findReasonPh)} />
						<TextArea rows={2} label={tx(L.findEvidence)} value={find.evidence_info} onChangeText={(v) => setFind((d) => ({ ...d, evidence_info: v }))} placeholder={tx(L.findEvidencePh)} />
						<Button title={tx(L.submitFind)} loading={submitting} onPress={() => submitTicket(find, 'student_search', () => setFind(null))} />
					</View>
				) : null}
			</Sheet>
		</Screen>
	);
}

const styles = StyleSheet.create({
	news: { backgroundColor: colors.blueSoft, borderColor: '#CFE0FD', padding: 14 },
	sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 },
	counter: { width: '48%', borderRadius: radius.xl, borderWidth: 1, padding: 13, marginBottom: 8 },
	counterValue: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, marginTop: 6 },
	counterDivider: { borderTopWidth: 1, marginTop: 8, paddingTop: 6 },
	exportBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	label: { marginBottom: 8, marginLeft: 4 },
	hero: { backgroundColor: colors.navyDeep, alignItems: 'center', padding: 22, borderRadius: 26, marginBottom: 12 },
	heroIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	total: { fontFamily: fonts.extrabold, fontSize: 44, color: colors.white, marginBottom: 8 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	stat: { width: '31%', flexGrow: 1, padding: 12, alignItems: 'center', gap: 2 },
	entry: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
});
