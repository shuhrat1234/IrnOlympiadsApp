import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Copy, Filter, Info, MessageSquareMore, Plus, RefreshCw, Search, Send, Trash2, Wallet } from 'lucide-react-native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Segmented, Sheet, T, Tap } from '../../components/ui';
import { ChipsSelect, ChoicePills, NumberField, SwitchRow, TextArea } from '../../components/form';
import { colors, fonts, radius } from '../../theme';
import { formatMoney } from '../../utils/format';

// ---- pricing / phone helpers (same as website SMSManager) ----
const getSMSPartsCount = (text) => {
	if (!text) return 0;
	const unicode = /[^\u0000-\u007F]/.test(text);
	const len = text.length;
	if (unicode) return len <= 70 ? 1 : Math.ceil(len / 67);
	return len <= 160 ? 1 : Math.ceil(len / 153);
};
const OPERATOR_PRICES = {
	service: { beeline: 115, ucell: 160, humans: 95, oq: 115, perfectum: 95, default: 120 },
	advertising: { beeline: 300, ucell: 340, humans: 95, oq: 300, perfectum: 95, default: 295 },
};
const PREFIX_TO_OPERATOR = { 90: 'beeline', 91: 'beeline', 92: 'beeline', 93: 'ucell', 94: 'ucell', 50: 'ucell', 33: 'humans', 20: 'oq', 98: 'perfectum', 80: 'perfectum' };
const getPriceForPhone = (phone, type = 'service') => {
	if (!phone) return OPERATOR_PRICES[type].default;
	const clean = phone.replace(/\D/g, '');
	const prefix = clean.startsWith('998') && clean.length >= 5 ? clean.substring(3, 5) : clean.length >= 2 ? clean.substring(0, 2) : null;
	const op = prefix ? PREFIX_TO_OPERATOR[prefix] : null;
	return op ? OPERATOR_PRICES[type][op] : OPERATOR_PRICES[type].default;
};
export const normalizePhone = (phone) => {
	if (!phone) return '';
	const digits = String(phone).replace(/\D/g, '');
	return digits.length >= 9 ? `998${digits.slice(-9)}` : digits;
};
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MODERATION_EXAMPLES = {
	point1: [
		{ wrong: 'Здравствуйте (STUDENT)! Вы отсутствовали в (TIME) в группе (GROUP) во время урока (COURSE).', correct: 'Здравствуйте Мурод! Вы отсутствовали в 11.00 в группе 789-A во время урока IELTS' },
		{ wrong: 'Уважаемый #NAME#! На вашем счету осталось #CASH# #CASHNAME#. Своевременно пополните счёт.', correct: 'Уважаемый Турсунов Анвар! На вашем счету осталось 32 456.74 сум. Своевременно пополните счёт.' },
		{ wrong: 'Вы сделали заказ на [name]. Номер:# [order_id]. Сумма: [order_total]. Оплата при получение.', correct: 'Вы сделали заказ на Eskiz.uz. Номер: #447-A. Сумма: 143 000 сум. Оплата при получение.' },
	],
	point2: [
		{ wrong: 'Код подтверждения: 0000', correct: 'Код подтверждения для регистрации на сайте Eskiz.uz: 0000' },
		{ wrong: 'Восстановление пароля для: 0000', correct: 'Восстановление пароля для платформы Eskiz Media: 0000' },
		{ wrong: 'Код для мобильного приложения: 0000', correct: 'Код верификации для входа к мобильному приложению Eskiz.uz: 0000' },
		{ wrong: 'Код подтверждения для заказа: 0000', correct: 'Код подтверждения для заказа на сайте Eskiz.uz: 0000' },
	],
};

const LABELS = {
	uz: {
		title: 'SMS Boshqaruvi', subtitle: 'SMS xabarlar yuborish va shablonlarni boshqarish', sendTab: 'Yuborish', templatesTab: 'Shablonlar', remindersTab: 'Eslatmalar',
		reminderIntervalLabel: 'Necha soatda bir marta', reminderIntervalHint: "Har bir foydalanuvchiga ushbu vaqt oralig'ida bir martadan ko'p yuborilmaydi.",
		reminderPickTemplate: 'Tayyor (tasdiqlangan) shablondan tanlang',
		reminderPickTemplateHint: "Eskiz moderatsiyasi qoidalariga ko'ra, matn faqat tasdiqlangan shablon asosida bo'lishi kerak. Tizim {olympiad} va {time_left} o'zgaruvchilarini avtomatik almashtiradi.",
		reminderSave: 'Saqlash', reminderSaved: 'Sozlamalar saqlandi', reminderNote: "Har bir olimpiada uchun avtomatik eslatmani yoqish/o'chirish olimpiadani tahrirlash sahifasida amalga oshiriladi.",
		addTemplate: 'Yangi shablon', templatePlaceholder: 'SMS matnini kiriting...',
		placeholderHint: "Matnda o'zingizning haqiqiy ismingiz/familiyangiz/ID raqamingizni namuna sifatida yozing (masalan \"Salom Shuhrat!\"), keyin pastda qaysi so'zni namuna sifatida ishlatganingizni ko'rsating. Yuborishda tizim ularni har bir qabul qiluvchining ma'lumotlari bilan almashtiradi.",
		exampleNamePlaceholder: 'Namuna ism (masalan: Shuhrat)', exampleSurnamePlaceholder: 'Namuna familiya (ixtiyoriy)', exampleIdPlaceholder: 'Namuna ID (ixtiyoriy)',
		noTemplates: 'Shablonlar topilmadi', send: 'Yuborish', selectedUsers: 'tanlangan', onModeration: 'Moderatsiyada', inProcess: 'Jarayonda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan',
		instructionTitle: "SMS moderatsiyasi bo'yicha ko'rsatmalar",
		instructionIntro: "Har qanday yangi SMS yuborishdan oldin matnni moderatsiyaga qo'yish uchun «+» tugmasini bosing. Bir xil matnni qayta qo'shish shart emas.",
		point1Title: '1-band', instructionPoint1: "SMS matnini faqat original ko'rinishda kiriting — qabul qiluvchiga aynan qanday yuborilsa, shunday. O'zgaruvchilarni almashtirish faqat moderator tomonidan amalga oshiriladi.",
		point2Title: '2-band', instructionPoint2: "Avtorizatsiya kodlari mavjud barcha SMS larda resurs nomi va kodlardan foydalanish maqsadi ko'rsatilishi shart.",
		examples: 'Misollar', wrong: "Noto'g'ri", correct: "To'g'ri", moderationInfo: "SMS matnlari 1 soatdan 1 kungacha moderatsiyadan o'tadi, dam olish va bayram kunlaridan tashqari.",
		statusesTitle: 'Holatlar',
		statusOnModerationDesc: 'Moderatsiyada — matnlar har 3 soatda (10:00–16:00) tekshiriladi.', statusInProcessDesc: "Jarayonda — matn mobil operatorga yuborildi.",
		statusApprovedDesc: 'Tasdiqlangan — foydalanishga tayyor.', statusRejectedDesc: "Rad etilgan — sababi izohda ko'rsatilgan.",
		note: 'Izoh', templateSent: 'Shablon moderatsiyaga yuborildi', smsSent: 'SMS muvaffaqiyatli yuborildi', error: 'Xatolik yuz berdi',
		minTemplateLengthError: "SMS matni kamida 10 ta belgidan iborat bo'lishi kerak.", balance: 'Hisob balansi', currency: "so'm", searchPlaceholder: 'Qidirish...',
		cancel: 'Bekor qilish', excludeAlreadySent: "Yuborilganlarni chetlab o'tish", chars: 'belgi', parts: 'SMS qism', service: 'Servis', advertising: 'Reklama',
		selectTemplate: 'Shablonni tanlang', noApproved: "Tasdiqlangan shablon yo'q", totalProfiles: 'Jami topildi', uniquePhones: 'Noyob raqamlar', alreadySent: 'Allaqachon yuborilgan', remaining: 'Yuborish uchun qoldi',
		selectAll: 'Barchasini tanlash', unselectAll: 'Barchasini bekor qilish', byBalance: "Balans bo'yicha", unselectBalance: "Balans bo'yicha bekor qilish", firstTemplate: 'Avval shablonni tanlang',
		uniqueNumbers: 'Noyob raqamlar', cost: 'Taxminiy narx', filters: 'Filtrlar', region: 'Viloyat', grade: 'Sinf', olympiad: 'Olimpiada', payment: "To'lov",
		all: 'Barchasi', paid: "To'langan", pending: 'Kutilmoqda', notPaid: "To'lanmagan", apply: "Qo'llash", reset: 'Tozalash', loadMore: 'Yana yuklash',
		confirmSendTitle: 'Yuborishni tasdiqlash', confirmSendMsg: (c, p) => `Siz haqiqatdan ham ${c} ta foydalanuvchiga SMS yubormoqchimisiz? SMS qismlar soni: ${p} ta.`,
		deleteTitle: "Shablonni o'chirish?", deleteMsg: "Haqiqatdan ham ushbu shablonni o'chirmoqchimisiz?", delete: "O'chirish", deleted: "Shablon o'chirildi", copied: 'Nusxalandi',
		notEnough: "Balans yetarli emas", gradeSuffix: '-sinf',
	},
	ru: {
		title: 'SMS Менеджер', subtitle: 'Отправка SMS сообщений и управление шаблонами', sendTab: 'Отправить', templatesTab: 'Шаблоны', remindersTab: 'Напоминания',
		reminderIntervalLabel: 'Раз в сколько часов', reminderIntervalHint: 'Одному пользователю не будет отправлено чаще, чем раз в этот интервал.',
		reminderPickTemplate: 'Выберите готовый (одобренный) шаблон',
		reminderPickTemplateHint: 'По правилам модерации Eskiz текст должен быть основан на одобренном шаблоне. Система подставит {olympiad} и {time_left}, если они есть в тексте.',
		reminderSave: 'Сохранить', reminderSaved: 'Настройки сохранены', reminderNote: 'Включение/выключение напоминания для конкретной олимпиады настраивается на странице редактирования олимпиады.',
		addTemplate: 'Добавить текст', templatePlaceholder: 'Введите текст SMS...',
		placeholderHint: 'В тексте напишите своё настоящее имя/фамилию/ID как пример (например «Здравствуйте, Шухрат!»), а ниже укажите, какое слово использовали как пример. При отправке система заменит его на данные каждого получателя.',
		exampleNamePlaceholder: 'Пример имени (например: Шухрат)', exampleSurnamePlaceholder: 'Пример фамилии (необязательно)', exampleIdPlaceholder: 'Пример ID (необязательно)',
		noTemplates: 'Шаблоны не найдены', send: 'Отправить', selectedUsers: 'выбрано', onModeration: 'На модерации', inProcess: 'В процессе', approved: 'Одобрено', rejected: 'Отказан',
		instructionTitle: 'Инструкция по добавлению текстов для модерации',
		instructionIntro: 'Перед отправкой новых SMS сначала разместите текст на модерацию кнопкой «+». Не требуется добавлять один и тот же текст повторно.',
		point1Title: 'Пункт 1', instructionPoint1: 'Вводите текст только в оригинальном виде — так, как он будет отправлен получателям. Обработка переменных производится только модератором.',
		point2Title: 'Пункт 2', instructionPoint2: 'Во всех SMS с кодами авторизации обязательно указывайте название ресурса и цель использования кода.',
		examples: 'Примеры', wrong: 'Неправильно', correct: 'Правильно', moderationInfo: 'Тексты проходят модерацию от 1 часа до 1 дня, кроме выходных и праздничных дней.',
		statusesTitle: 'Статусы',
		statusOnModerationDesc: 'На модерации — тексты проверяются каждые 3 часа (10:00–16:00).', statusInProcessDesc: 'В процессе — текст передан сотовому оператору.',
		statusApprovedDesc: 'Одобрено — готов к использованию.', statusRejectedDesc: 'Отказан — причина указана в примечании.',
		note: 'Примечание', templateSent: 'Текст отправлен на модерацию', smsSent: 'SMS успешно отправлены', error: 'Произошла ошибка',
		minTemplateLengthError: 'Текст шаблона должен содержать не менее 10 символов.', balance: 'Баланс счета', currency: 'сум', searchPlaceholder: 'Поиск...',
		cancel: 'Отмена', excludeAlreadySent: 'Исключить уже отправленные', chars: 'симв.', parts: 'СМС-часть(и)', service: 'Сервисный', advertising: 'Рекламный',
		selectTemplate: 'Выберите шаблон', noApproved: 'Нет одобренных шаблонов', totalProfiles: 'Всего найдено', uniquePhones: 'Уникальных номеров', alreadySent: 'Уже отправлено', remaining: 'Осталось отправить',
		selectAll: 'Выбрать всех', unselectAll: 'Снять всё', byBalance: 'По балансу', unselectBalance: 'Снять по балансу', firstTemplate: 'Сначала выберите шаблон',
		uniqueNumbers: 'Уникальных номеров', cost: 'Примерная стоимость', filters: 'Фильтры', region: 'Регион', grade: 'Класс', olympiad: 'Олимпиада', payment: 'Оплата',
		all: 'Все', paid: 'Оплачено', pending: 'В ожидании', notPaid: 'Не оплачено', apply: 'Применить', reset: 'Сбросить', loadMore: 'Загрузить ещё',
		confirmSendTitle: 'Подтверждение отправки', confirmSendMsg: (c, p) => `Вы действительно хотите отправить SMS ${c} пользователям? Количество СМС-частей: ${p} шт.`,
		deleteTitle: 'Удалить шаблон?', deleteMsg: 'Вы уверены, что хотите удалить этот шаблон?', delete: 'Удалить', deleted: 'Шаблон удален', copied: 'Скопировано',
		notEnough: 'Недостаточно баланса', gradeSuffix: ' класс',
	},
	en: {
		title: 'SMS Manager', subtitle: 'Send SMS messages and manage templates', sendTab: 'Send', templatesTab: 'Templates', remindersTab: 'Reminders',
		reminderIntervalLabel: 'Repeat every (hours)', reminderIntervalHint: "A given user won't be sent this more than once per interval.",
		reminderPickTemplate: 'Pick a ready (approved) template',
		reminderPickTemplateHint: 'Per Eskiz moderation rules the text must be based on an approved template. {olympiad} and {time_left} are substituted automatically if present.',
		reminderSave: 'Save', reminderSaved: 'Settings saved', reminderNote: "Turning this reminder on/off for a specific olympiad is done on that olympiad's edit page.",
		addTemplate: 'Add Text', templatePlaceholder: 'Enter SMS text...',
		placeholderHint: 'Write your own real name/surname/ID in the text as the example (e.g. "Hello, Shukhrat!"), then say below which word you used. At send time it is swapped for each recipient\'s real data.',
		exampleNamePlaceholder: 'Example name (e.g. Shukhrat)', exampleSurnamePlaceholder: 'Example surname (optional)', exampleIdPlaceholder: 'Example ID (optional)',
		noTemplates: 'No templates found', send: 'Send', selectedUsers: 'selected', onModeration: 'On Moderation', inProcess: 'In Process', approved: 'Approved', rejected: 'Rejected',
		instructionTitle: 'Instructions for adding texts for moderation',
		instructionIntro: 'Before sending any new SMS, submit the text for moderation with the "+" button. You don\'t need to add the same text again.',
		point1Title: 'Point 1', instructionPoint1: 'Enter the text only in its original form — exactly as recipients will get it. Variables are processed only by the moderator.',
		point2Title: 'Point 2', instructionPoint2: 'All SMS with authorization codes must state the resource name and the purpose of the code.',
		examples: 'Examples', wrong: 'Wrong', correct: 'Correct', moderationInfo: 'Texts are moderated within 1 hour to 1 day, excluding weekends and holidays.',
		statusesTitle: 'Statuses',
		statusOnModerationDesc: 'On Moderation — texts are reviewed every 3 hours (10:00–16:00).', statusInProcessDesc: 'In Process — sent to the mobile operator.',
		statusApprovedDesc: 'Approved — ready to use.', statusRejectedDesc: 'Rejected — the reason is in the Note.',
		note: 'Note', templateSent: 'Template sent for moderation', smsSent: 'SMS sent successfully', error: 'An error occurred',
		minTemplateLengthError: 'SMS template text must be at least 10 characters long.', balance: 'Account Balance', currency: 'sum', searchPlaceholder: 'Search...',
		cancel: 'Cancel', excludeAlreadySent: 'Exclude already sent', chars: 'chars', parts: 'SMS part(s)', service: 'Service', advertising: 'Advertising',
		selectTemplate: 'Select a template', noApproved: 'No approved templates', totalProfiles: 'Total found', uniquePhones: 'Unique numbers', alreadySent: 'Already sent', remaining: 'Left to send',
		selectAll: 'Select all', unselectAll: 'Unselect all', byBalance: 'By balance', unselectBalance: 'Unselect by balance', firstTemplate: 'Select a template first',
		uniqueNumbers: 'Unique numbers', cost: 'Estimated cost', filters: 'Filters', region: 'Region', grade: 'Grade', olympiad: 'Olympiad', payment: 'Payment',
		all: 'All', paid: 'Paid', pending: 'Pending', notPaid: 'Not paid', apply: 'Apply', reset: 'Reset', loadMore: 'Load more',
		confirmSendTitle: 'Confirm Sending', confirmSendMsg: (c, p) => `Are you sure you want to send SMS to ${c} users? SMS parts: ${p}.`,
		deleteTitle: 'Delete template?', deleteMsg: 'Are you sure you want to delete this template?', delete: 'Delete', deleted: 'Template deleted', copied: 'Copied',
		notEnough: 'Not enough balance', gradeSuffix: ' grade',
	},
};

const statusMeta = (status, l) => ({
	approved: { icon: CheckCircle2, color: colors.green, bg: colors.greenSoft, label: l.approved },
	moderation: { icon: Clock, color: colors.blue, bg: colors.blueSoft, label: l.onModeration },
	process: { icon: RefreshCw, color: colors.amber, bg: colors.goldTint, label: l.inProcess },
	rejected: { icon: AlertCircle, color: colors.red, bg: colors.redSoft, label: l.rejected },
}[status] || { icon: Info, color: colors.muted, bg: colors.cardMuted, label: status });

const payMatches = (r, payFilter) => {
	if (payFilter === 'paid') return r.payment_status === 'paid' || r.payment_status === 'free';
	if (payFilter === 'pending') return r.payment_status === 'pending';
	if (payFilter === 'not_paid') return r.payment_status !== 'paid' && r.payment_status !== 'free' && r.payment_status !== 'pending';
	return true;
};

export default function SMSManager() {
	const { lang, pick } = useLanguage();
	const l = LABELS[lang] || LABELS.ru;
	const { regions } = useAuth();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const [tab, setTab] = useState('templates');
	const [templates, setTemplates] = useState([]);
	const [loading, setLoading] = useState(false);
	const [balance, setBalance] = useState(0);
	const [balanceLoaded, setBalanceLoaded] = useState(false);
	const [balanceLoading, setBalanceLoading] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [newTemplate, setNewTemplate] = useState({ text: '', example_name: '', example_surname: '', example_id: '' });
	const [showGuide, setShowGuide] = useState(false);
	const [confirm, setConfirm] = useState(null);

	const [selectedTemplate, setSelectedTemplate] = useState(null);
	const [targetUsers, setTargetUsers] = useState([]);
	const [search, setSearch] = useState('');
	const [regionFilters, setRegionFilters] = useState([]);
	const [gradeFilters, setGradeFilters] = useState([]);
	const [olympiadFilters, setOlympiadFilters] = useState([]);
	const [payFilter, setPayFilter] = useState('all');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [sending, setSending] = useState(false);
	const [userPhoneMap, setUserPhoneMap] = useState({});
	const [allUsers, setAllUsers] = useState([]);
	const [usersPage, setUsersPage] = useState(1);
	const [hasMoreUsers, setHasMoreUsers] = useState(false);
	const [usersLoading, setUsersLoading] = useState(false);
	const [selectAllMatching, setSelectAllMatching] = useState(false);
	const [excludeAlreadySent, setExcludeAlreadySent] = useState(true);
	const [affordableActive, setAffordableActive] = useState(false);
	const [selectingAffordable, setSelectingAffordable] = useState(false);
	const [smsType, setSmsType] = useState('service');
	const [sentHistory, setSentHistory] = useState({});
	const [stats, setStats] = useState({ total_profiles: 0, total_unique_phones: 0, already_sent_phones: 0, already_sent_users: 0 });
	const [statsLoading, setStatsLoading] = useState(false);

	const [reminder, setReminder] = useState({ interval_hours: 6, message_template: '' });
	const [reminderLoading, setReminderLoading] = useState(false);
	const [reminderSaving, setReminderSaving] = useState(false);

	const cleanSearch = search.startsWith('+') ? search.substring(1) : search;
	const filterParams = useMemo(() => ({
		search: cleanSearch || undefined,
		region: regionFilters.length ? regionFilters : undefined,
		grade: gradeFilters.length ? gradeFilters : undefined,
		registrations__olympiad: olympiadFilters.length ? olympiadFilters : undefined,
		payment_status: payFilter !== 'all' ? payFilter : undefined,
	}), [cleanSearch, regionFilters, gradeFilters, olympiadFilters, payFilter]);

	const fetchTemplates = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get('sms/templates/');
			setTemplates(Array.isArray(res.data) ? res.data : res.data.data || []);
		} catch {}
		setLoading(false);
	}, []);

	const fetchBalance = useCallback(async () => {
		setBalanceLoading(true);
		const parse = (d) => (d?.balance !== undefined ? parseFloat(d.balance) : d?.data?.balance !== undefined ? parseFloat(d.data.balance) : typeof d === 'number' ? d : null);
		try {
			let res;
			try { res = await api.get('sms/balance/'); } catch { res = await api.get('sms/balance'); }
			const val = parse(res.data);
			if (val !== null && !isNaN(val)) { setBalance(val); setBalanceLoaded(true); } else setBalanceLoaded(false);
		} catch {
			setBalanceLoaded(false);
		}
		setBalanceLoading(false);
	}, []);

	useEffect(() => { fetchTemplates(); fetchBalance(); }, [fetchTemplates, fetchBalance]);

	// reminders
	useEffect(() => {
		if (tab !== 'reminders') return;
		let active = true;
		setReminderLoading(true);
		api.get('sms/reminder-settings/')
			.then((res) => active && setReminder(res.data))
			.catch(() => active && toast.error(l.error))
			.finally(() => active && setReminderLoading(false));
		return () => { active = false; };
	}, [tab]);

	const saveReminder = async () => {
		setReminderSaving(true);
		try {
			const res = await api.patch('sms/reminder-settings/', { interval_hours: reminder.interval_hours, message_template: reminder.message_template });
			setReminder(res.data);
			toast.success(l.reminderSaved);
		} catch {
			toast.error(l.error);
		}
		setReminderSaving(false);
	};

	// sent history per template
	useEffect(() => {
		if (!selectedTemplate) return;
		let active = true;
		api.get('sms/sent-history/', { params: { template_id: String(selectedTemplate.id) } }).then((res) => {
			if (active) setSentHistory((p) => ({ ...p, [String(selectedTemplate.id)]: { user_ids: res.data.user_ids || [], phones: res.data.phones || [] } }));
		}).catch(() => {});
		return () => { active = false; };
	}, [selectedTemplate]);

	// backend stats
	useEffect(() => {
		let active = true;
		const timer = setTimeout(async () => {
			setStatsLoading(true);
			try {
				const res = await api.get('users/sms-stats/', { params: { ...filterParams, template_id: selectedTemplate ? String(selectedTemplate.id) : undefined } });
				if (active) setStats(res.data);
			} catch {}
			if (active) setStatsLoading(false);
		}, 300);
		return () => { active = false; clearTimeout(timer); };
	}, [filterParams, selectedTemplate, sentHistory]);

	// users list
	const fetchUsersPage = useCallback(async (page, append) => {
		setUsersLoading(true);
		try {
			const res = await api.get('users/', { params: { page, page_size: 100, ...filterParams } });
			const results = res.data.results || res.data || [];
			setAllUsers((prev) => {
				if (!append) return results;
				const ids = new Set(prev.map((u) => u.id));
				return [...prev, ...results.filter((u) => !ids.has(u.id))];
			});
			setUserPhoneMap((prev) => {
				const next = { ...prev };
				results.forEach((u) => { if (u.id && u.phone) next[u.id] = u.phone.trim(); });
				return next;
			});
			setHasMoreUsers(!!res.data.next);
			setUsersPage(page);
		} catch {}
		setUsersLoading(false);
	}, [filterParams]);

	useEffect(() => {
		const timer = setTimeout(() => fetchUsersPage(1, false), 300);
		return () => clearTimeout(timer);
	}, [fetchUsersPage]);

	const tplKey = selectedTemplate ? String(selectedTemplate.id) : null;
	const alreadySentSet = useMemo(() => new Set((tplKey ? sentHistory[tplKey]?.user_ids || [] : []).filter((x) => x != null).map(Number)), [tplKey, sentHistory]);
	const alreadySentPhonesSet = useMemo(() => new Set((tplKey ? sentHistory[tplKey]?.phones || [] : []).map(normalizePhone).filter(Boolean)), [tplKey, sentHistory]);
	const isSent = (id, phone) => alreadySentSet.has(Number(id)) || (phone && alreadySentPhonesSet.has(normalizePhone(phone)));

	const filteredUsers = useMemo(() => allUsers.filter((u) => {
		const q = search.toLowerCase();
		const mSearch = !search || u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.middle_name?.toLowerCase().includes(q) || u.phone?.includes(search) || u.participant_id?.includes(search);
		const mRegion = !regionFilters.length || regionFilters.includes(String(u.region));
		const mGrade = !gradeFilters.length || gradeFilters.includes(String(u.grade));
		const mOly = !olympiadFilters.length || (u.registrations || []).some((r) => olympiadFilters.includes(String(r.olympiad)));
		const regs = u.registrations || [];
		const mPay = payFilter === 'all' || (olympiadFilters.length ? regs.some((r) => olympiadFilters.includes(String(r.olympiad)) && payMatches(r, payFilter)) : regs.some((r) => payMatches(r, payFilter)));
		return mSearch && mRegion && mGrade && mOly && mPay;
	}), [allUsers, search, regionFilters, gradeFilters, olympiadFilters, payFilter]);

	const parts = selectedTemplate ? getSMSPartsCount(selectedTemplate.text) : 0;

	const uniqueSelectedCount = useMemo(() => {
		if (selectAllMatching) return selectedTemplate ? Math.max(0, stats.total_unique_phones - stats.already_sent_phones) : stats.total_unique_phones;
		const seen = new Set();
		targetUsers.forEach((id) => {
			const phone = userPhoneMap[id];
			if (!phone) return;
			if (selectedTemplate && isSent(id, phone)) return;
			seen.add(normalizePhone(phone));
		});
		return seen.size;
	}, [targetUsers, userPhoneMap, selectAllMatching, stats, selectedTemplate, alreadySentSet, alreadySentPhonesSet]);

	const totalCost = useMemo(() => {
		if (!parts || !uniqueSelectedCount) return 0;
		if (selectAllMatching) {
			let total = 0; let known = 0;
			Object.entries(userPhoneMap).forEach(([id, phone]) => { if (isSent(id, phone)) return; total += getPriceForPhone(phone, smsType); known++; });
			return parts * uniqueSelectedCount * (known ? Math.round(total / known) : OPERATOR_PRICES[smsType].default);
		}
		let cost = 0;
		const seen = new Set();
		targetUsers.forEach((id) => {
			const phone = userPhoneMap[id];
			if (!phone) return;
			if (selectedTemplate && isSent(id, phone)) return;
			const norm = normalizePhone(phone);
			if (!seen.has(norm)) { seen.add(norm); cost += parts * getPriceForPhone(phone, smsType); }
		});
		return cost;
	}, [parts, uniqueSelectedCount, selectAllMatching, targetUsers, userPhoneMap, smsType, selectedTemplate, alreadySentSet, alreadySentPhonesSet]);

	const affordableCount = parts ? Math.max(0, Math.floor(balance / (parts * OPERATOR_PRICES[smsType].default))) : 0;

	const fetchAllMatchingUserIds = async ({ limit } = {}) => {
		const ids = [];
		const phoneMap = {};
		const seen = new Set();
		let page = 1;
		for (;;) {
			const res = await api.get('users/', { params: { page, page_size: 100, ...filterParams } });
			const results = res.data.results || res.data || [];
			for (const u of results) {
				if (limit && ids.length >= limit) break;
				if (!u.id) continue;
				const norm = normalizePhone(u.phone);
				if (u.phone) phoneMap[u.id] = u.phone;
				if (excludeAlreadySent && isSent(u.id, u.phone)) continue;
				if (norm) {
					if (!seen.has(norm)) { seen.add(norm); ids.push(u.id); }
				} else ids.push(u.id);
			}
			if (!res.data.next || (limit && ids.length >= limit) || page >= 50) break;
			page += 1;
		}
		return { ids, phoneMap };
	};

	const toggleSelectAll = () => {
		setAffordableActive(false);
		if (selectAllMatching) {
			setSelectAllMatching(false);
			setTargetUsers([]);
		} else {
			setSelectAllMatching(true);
			setTargetUsers(filteredUsers.filter((u) => !excludeAlreadySent || !isSent(u.id, u.phone?.trim())).map((u) => u.id));
		}
	};

	const toggleAffordable = async () => {
		if (affordableActive) {
			setTargetUsers([]);
			setSelectAllMatching(false);
			setAffordableActive(false);
			return;
		}
		if (affordableCount <= 0) return toast.error(l.notEnough);
		setSelectingAffordable(true);
		try {
			const { ids, phoneMap } = await fetchAllMatchingUserIds({ limit: affordableCount });
			setUserPhoneMap((p) => ({ ...p, ...phoneMap }));
			setSelectAllMatching(false);
			setTargetUsers(ids);
			setAffordableActive(true);
		} catch {
			toast.error(l.error);
		}
		setSelectingAffordable(false);
	};

	const sendSMS = async () => {
		setSending(true);
		try {
			let ids = [];
			if (selectAllMatching) {
				ids = (await fetchAllMatchingUserIds()).ids;
			} else {
				const seen = new Set();
				for (const id of targetUsers) {
					const phone = userPhoneMap[id] || allUsers.find((x) => x.id === id)?.phone;
					if (excludeAlreadySent && alreadySentSet.has(Number(id))) continue;
					if (phone) {
						const norm = normalizePhone(phone);
						if (excludeAlreadySent && alreadySentPhonesSet.has(norm)) continue;
						if (!seen.has(norm)) { seen.add(norm); ids.push(id); }
					} else ids.push(id);
				}
			}
			await api.post('sms/send/', { message: selectedTemplate.text, template_id: String(selectedTemplate.id), user_ids: ids, allow_resend: !excludeAlreadySent });
			const key = String(selectedTemplate.id);
			const newPhones = ids.map((id) => userPhoneMap[id] || allUsers.find((x) => x.id === id)?.phone).filter(Boolean).map(normalizePhone);
			setSentHistory((p) => ({
				...p,
				[key]: { user_ids: Array.from(new Set([...(p[key]?.user_ids || []), ...ids])), phones: Array.from(new Set([...(p[key]?.phones || []), ...newPhones])) },
			}));
			toast.success(l.smsSent);
			setTargetUsers([]);
			setSelectAllMatching(false);
			setAffordableActive(false);
			fetchBalance();
		} catch {
			toast.error(l.error);
		}
		setSending(false);
	};

	const createTemplate = async () => {
		const text = newTemplate.text.trim();
		if (!text) return;
		if (text.length < 10) return toast.error(l.minTemplateLengthError);
		setLoading(true);
		try {
			const res = await api.post('sms/templates/', {
				text: newTemplate.text,
				example_name: newTemplate.example_name.trim(),
				example_surname: newTemplate.example_surname.trim(),
				example_id: newTemplate.example_id.trim(),
			});
			if (res.data.status === 'error' || res.data.message?.includes?.('error')) {
				toast.error(res.data.message || l.error);
			} else {
				toast.success(l.templateSent);
				setCreateOpen(false);
				setNewTemplate({ text: '', example_name: '', example_surname: '', example_id: '' });
				fetchTemplates();
			}
		} catch (err) {
			toast.error(err.response?.data?.message || err.response?.data?.error || l.error);
		}
		setLoading(false);
	};

	const deleteTemplate = (id) => setConfirm({
		icon: Trash2, tone: 'red', title: l.deleteTitle, message: l.deleteMsg, confirmText: l.delete, variant: 'danger',
		onConfirm: async () => {
			try {
				await api.delete('sms/templates/', { params: { id } });
				toast.success(l.deleted);
				if (selectedTemplate?.id === id) setSelectedTemplate(null);
				fetchTemplates();
			} catch {
				toast.error(l.error);
			}
		},
	});

	const approved = templates.filter((t) => t.status === 'approved');
	const typePill = (tpl) => (tpl.type ? <Pill label={tpl.type === 'advertising' ? l.advertising : l.service} color={tpl.type === 'advertising' ? colors.amber : colors.green} bg={tpl.type === 'advertising' ? colors.goldTint : colors.greenSoft} /> : null);
	const metaLine = (text) => <T v="small" style={{ fontSize: 11.5 }}>{text.length} {l.chars} · {getSMSPartsCount(text)} {l.parts}</T>;
	const activeFilterCount = regionFilters.length + gradeFilters.length + olympiadFilters.length + (payFilter !== 'all' ? 1 : 0);
	const selectedCount = selectAllMatching ? stats.total_profiles - stats.already_sent_users : targetUsers.length;
	const targetSet = useMemo(() => new Set(targetUsers), [targetUsers]);

	return (
		<Screen
			header={<StackHeader right={tab === 'templates' ? <IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={() => setCreateOpen(true)} /> : null} />}
			onRefresh={() => Promise.all([fetchTemplates(), fetchBalance(), fetchUsersPage(1, false)])}
			keyboard
		>
			<LargeTitle title={l.title} subtitle={l.subtitle} />

			<Card style={styles.balance}>
				<View style={styles.balanceIcon}><Wallet size={20} color={colors.gold} /></View>
				<View style={{ flex: 1 }}>
					<T v="label" color="rgba(255,255,255,0.6)">{l.balance}</T>
					{balanceLoading ? <ActivityIndicator color={colors.gold} style={{ alignSelf: 'flex-start', marginTop: 4 }} /> : (
						<T style={{ fontFamily: fonts.extrabold, fontSize: 22, color: colors.white }}>{balanceLoaded ? `${formatMoney(balance)} ${l.currency}` : '—'}</T>
					)}
				</View>
				<Tap onPress={fetchBalance} style={styles.refresh}><RefreshCw size={16} color={colors.white} /></Tap>
			</Card>

			<Segmented value={tab} onChange={setTab} style={{ marginBottom: 14 }} options={[{ value: 'templates', label: l.templatesTab }, { value: 'send', label: l.sendTab }, { value: 'reminders', label: l.remindersTab }]} />

			{tab === 'templates' ? (
				<>
					<Card style={{ marginBottom: 12 }}>
						<Tap onPress={() => setShowGuide((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
							<Info size={18} color={colors.blue} />
							<T v="strong" style={{ flex: 1 }}>{l.instructionTitle}</T>
							{showGuide ? <ChevronUp size={18} color={colors.muted} /> : <ChevronDown size={18} color={colors.muted} />}
						</Tap>
						{showGuide ? (
							<View style={{ gap: 10, marginTop: 12 }}>
								<T v="body" style={{ fontSize: 13.5 }}>{l.instructionIntro}</T>
								{[['point1', l.point1Title, l.instructionPoint1], ['point2', l.point2Title, l.instructionPoint2]].map(([key, head, text]) => (
									<View key={key} style={{ gap: 6 }}>
										<T v="strong">{head}</T>
										<T v="small">{text}</T>
										<T v="label" style={{ marginTop: 4 }}>{l.examples}</T>
										{MODERATION_EXAMPLES[key].map((ex) => (
											<View key={ex.wrong} style={styles.example}>
												<T v="small" color={colors.red}>✕ {ex.wrong}</T>
												<T v="small" color={colors.green}>✓ {ex.correct}</T>
											</View>
										))}
									</View>
								))}
								<View style={[styles.example, { backgroundColor: colors.goldTint }]}><T v="small" color={colors.ink2}>{l.moderationInfo}</T></View>
								<T v="strong">{l.statusesTitle}</T>
								{[l.statusOnModerationDesc, l.statusInProcessDesc, l.statusApprovedDesc, l.statusRejectedDesc].map((s) => <T key={s} v="small">• {s}</T>)}
							</View>
						) : null}
					</Card>

					{loading && !templates.length ? <ActivityIndicator color={colors.goldDeep} /> : !templates.length ? <EmptyState icon={MessageSquareMore} title={l.noTemplates} /> : templates.map((tpl) => {
						const st = statusMeta(tpl.status, l);
						return (
							<Card key={tpl.id} style={{ marginBottom: 10 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
									<Pill icon={st.icon} label={st.label} color={st.color} bg={st.bg} />
									{tpl.status === 'approved' ? typePill(tpl) : null}
									<T v="small" style={{ marginLeft: 'auto', fontSize: 11.5 }}>{tpl.created_at ? new Date(tpl.created_at).toLocaleDateString() : ''}</T>
								</View>
								<T v="body" style={{ marginTop: 10 }} selectable>{tpl.text}</T>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
									<View style={{ flex: 1 }}>{metaLine(tpl.text)}</View>
									<Tap onPress={async () => { await Clipboard.setStringAsync(tpl.text); toast.info(l.copied); }} style={[styles.act, { backgroundColor: colors.cardMuted }]}><Copy size={15} color={colors.ink2} /></Tap>
									<Tap onPress={() => deleteTemplate(tpl.id)} style={[styles.act, { backgroundColor: colors.redSoft, marginLeft: 8 }]}><Trash2 size={15} color={colors.red} /></Tap>
								</View>
								{tpl.status === 'rejected' && tpl.note ? <View style={[styles.example, { backgroundColor: colors.redSoft, marginTop: 8 }]}><T v="small" color={colors.red}>{l.note}: {tpl.note}</T></View> : null}
							</Card>
						);
					})}
				</>
			) : null}

			{tab === 'send' ? (
				<>
					<T v="h3" style={{ marginBottom: 10 }}>{l.selectTemplate}</T>
					{!approved.length ? <T v="small" style={{ marginBottom: 12 }}>{l.noApproved}</T> : approved.map((tpl) => {
						const on = selectedTemplate?.id === tpl.id;
						return (
							<Tap key={tpl.id} onPress={() => { setSelectedTemplate(on ? null : tpl); if (!on && tpl.type) setSmsType(tpl.type); setTargetUsers([]); setSelectAllMatching(false); setAffordableActive(false); }} style={[styles.tpl, on && styles.tplOn]}>
								<View style={{ flex: 1, gap: 6 }}>
									<T v="body" numberOfLines={on ? undefined : 3} style={{ fontSize: 13.5 }}>{tpl.text}</T>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{metaLine(tpl.text)}{typePill(tpl)}</View>
								</View>
								{on ? <View style={styles.check}><Check size={14} color={colors.navyDeep} strokeWidth={3} /></View> : null}
							</Tap>
						);
					})}

					<View style={styles.statsGrid}>
						{[[l.totalProfiles, stats.total_profiles], [l.uniquePhones, stats.total_unique_phones], [l.alreadySent, stats.already_sent_phones, colors.amber], [l.remaining, Math.max(0, stats.total_unique_phones - stats.already_sent_phones), colors.green]].map(([label, value, color]) => (
							<View key={label} style={styles.stat}>
								<T v="label" style={{ fontSize: 9.5 }} numberOfLines={1}>{label}</T>
								{statsLoading ? <ActivityIndicator size="small" color={colors.goldDeep} style={{ alignSelf: 'flex-start' }} /> : <T style={{ fontFamily: fonts.extrabold, fontSize: 19, color: color || colors.ink }}>{formatMoney(value || 0)}</T>}
							</View>
						))}
					</View>

					<Card style={{ marginBottom: 12, gap: 12 }}>
						{selectedTemplate ? <SwitchRow label={l.excludeAlreadySent} value={excludeAlreadySent} onChange={(v) => { setExcludeAlreadySent(v); setTargetUsers([]); setSelectAllMatching(false); setAffordableActive(false); }} /> : null}
						<Segmented value={smsType} onChange={setSmsType} options={[{ value: 'service', label: l.service }, { value: 'advertising', label: l.advertising }]} />
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Button style={{ flex: 1 }} size="sm" variant="light" title={statsLoading ? '…' : selectAllMatching ? l.unselectAll : `${l.selectAll} (${Math.max(0, stats.total_profiles - stats.already_sent_users)})`} disabled={statsLoading} onPress={toggleSelectAll} />
							<Button style={{ flex: 1 }} size="sm" variant={affordableActive ? 'danger' : 'success'} icon={Wallet} loading={selectingAffordable} disabled={!selectedTemplate || statsLoading} title={!selectedTemplate ? l.byBalance : affordableActive ? l.unselectBalance : `${l.byBalance} (≤${affordableCount})`} onPress={toggleAffordable} />
						</View>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
							<T v="strong" color={colors.amber}>{selectedCount} {l.selectedUsers}</T>
							{uniqueSelectedCount > 0 ? <T v="small">{uniqueSelectedCount} {l.uniqueNumbers}</T> : null}
						</View>
						{selectedTemplate && uniqueSelectedCount > 0 ? (
							<View style={[styles.example, { backgroundColor: totalCost > balance ? colors.redSoft : colors.greenSoft, flexDirection: 'row', justifyContent: 'space-between' }]}>
								<T v="small" color={colors.ink2}>{l.cost} · {parts} {l.parts}</T>
								<T v="strong" color={totalCost > balance ? colors.red : colors.green}>≈ {formatMoney(totalCost)} {l.currency}</T>
							</View>
						) : null}
						<Button title={l.send} icon={Send} loading={sending} disabled={!selectedTemplate || (!selectAllMatching && !targetUsers.length)} onPress={() => setConfirm({ icon: Send, title: l.confirmSendTitle, message: l.confirmSendMsg(uniqueSelectedCount, parts), confirmText: l.send, onConfirm: sendSMS })} />
					</Card>

					<View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
						<Field style={{ flex: 1 }} icon={Search} value={search} onChangeText={setSearch} placeholder={l.searchPlaceholder} />
						<IconButton icon={Filter} size={52} badge={activeFilterCount || null} onPress={() => setFiltersOpen(true)} />
					</View>

					{filteredUsers.map((u) => {
						const on = selectAllMatching || targetSet.has(u.id);
						const sent = selectedTemplate && isSent(u.id, u.phone);
						return (
							<Tap key={u.id} onPress={() => { setSelectAllMatching(false); setAffordableActive(false); setTargetUsers((prev) => (prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])); }} style={[styles.user, on && styles.tplOn, sent && { opacity: 0.55 }]}>
								<View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
								<View style={{ flex: 1 }}>
									<T v="strong" numberOfLines={1}>{u.last_name} {u.first_name}</T>
									<T v="small" style={{ fontSize: 11.5 }}>{u.phone || '—'} · {u.participant_id || u.id}</T>
								</View>
								{sent ? <Pill label="✓" color={colors.green} bg={colors.greenSoft} /> : null}
							</Tap>
						);
					})}
					{usersLoading ? <ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 12 }} /> : hasMoreUsers ? <Button size="md" variant="light" title={l.loadMore} onPress={() => fetchUsersPage(usersPage + 1, true)} /> : null}
				</>
			) : null}

			{tab === 'reminders' ? (
				reminderLoading ? <ActivityIndicator color={colors.goldDeep} /> : (
					<Card style={{ gap: 14 }}>
						<NumberField label={l.reminderIntervalLabel} hint={l.reminderIntervalHint} value={reminder.interval_hours} onChange={(v) => setReminder((p) => ({ ...p, interval_hours: parseInt(v, 10) || 1 }))} />
						<View style={{ gap: 8 }}>
							<T v="label">{l.reminderPickTemplate}</T>
							{!approved.length ? <T v="small">{l.noApproved}</T> : approved.map((tpl) => {
								const on = tpl.text === reminder.message_template;
								return (
									<Tap key={tpl.id} onPress={() => setReminder((p) => ({ ...p, message_template: tpl.text }))} style={[styles.tpl, on && styles.tplOn]}>
										<T v="body" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={on ? undefined : 2}>{tpl.text}</T>
										{on ? <View style={styles.check}><Check size={14} color={colors.navyDeep} strokeWidth={3} /></View> : null}
									</Tap>
								);
							})}
							<T v="small">{l.reminderPickTemplateHint}</T>
						</View>
						<View style={[styles.example, { backgroundColor: colors.blueSoft }]}><T v="small" color={colors.ink2}>{l.reminderNote}</T></View>
						<Button title={l.reminderSave} loading={reminderSaving} onPress={saveReminder} />
					</Card>
				)
			) : null}

			<Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title={l.addTemplate} scroll maxHeight="92%">
				<View style={{ gap: 12, paddingBottom: 10 }}>
					<TextArea rows={5} value={newTemplate.text} placeholder={l.templatePlaceholder} onChangeText={(v) => setNewTemplate((p) => ({ ...p, text: v }))} />
					{newTemplate.text ? metaLine(newTemplate.text) : null}
					<T v="small">{l.placeholderHint}</T>
					<Field value={newTemplate.example_name} placeholder={l.exampleNamePlaceholder} onChangeText={(v) => setNewTemplate((p) => ({ ...p, example_name: v }))} />
					<Field value={newTemplate.example_surname} placeholder={l.exampleSurnamePlaceholder} onChangeText={(v) => setNewTemplate((p) => ({ ...p, example_surname: v }))} />
					<Field value={newTemplate.example_id} placeholder={l.exampleIdPlaceholder} onChangeText={(v) => setNewTemplate((p) => ({ ...p, example_id: v }))} />
					<Button title={l.addTemplate} icon={Plus} loading={loading} disabled={!newTemplate.text.trim()} onPress={createTemplate} />
				</View>
			</Sheet>

			<Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title={l.filters} scroll maxHeight="90%">
				<View style={{ gap: 18, paddingBottom: 10 }}>
					<View style={{ gap: 8 }}>
						<T v="label">{l.payment}</T>
						<ChoicePills value={payFilter} onChange={setPayFilter} options={[{ value: 'all', label: l.all }, { value: 'paid', label: l.paid }, { value: 'pending', label: l.pending }, { value: 'not_paid', label: l.notPaid }]} />
					</View>
					<ChipsSelect label={l.region} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} value={regionFilters} onChange={(v) => setRegionFilters(v.map(String))} />
					<ChipsSelect label={l.grade} options={GRADES.map((g) => ({ value: String(g), label: `${g}${l.gradeSuffix}` }))} value={gradeFilters} onChange={(v) => setGradeFilters(v.map(String))} />
					<ChipsSelect label={l.olympiad} options={olympiads.map((o) => ({ value: String(o.id), label: pick(o, 'title') }))} value={olympiadFilters} onChange={(v) => setOlympiadFilters(v.map(String))} />
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Button style={{ flex: 1 }} size="md" variant="light" title={l.reset} onPress={() => { setRegionFilters([]); setGradeFilters([]); setOlympiadFilters([]); setPayFilter('all'); }} />
						<Button style={{ flex: 1.4 }} size="md" title={l.apply} onPress={() => setFiltersOpen(false)} />
					</View>
				</View>
			</Sheet>

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={confirm?.icon}
				tone={confirm?.tone || 'gold'}
				title={confirm?.title}
				message={confirm?.message}
				actions={[
					{ title: confirm?.confirmText, variant: confirm?.variant || 'primary', onPress: () => { const c = confirm; setConfirm(null); c.onConfirm(); } },
					{ title: l.cancel, variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	balance: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navy, marginBottom: 14, borderWidth: 0 },
	balanceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(253,200,0,0.15)', alignItems: 'center', justifyContent: 'center' },
	refresh: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	example: { padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, gap: 4 },
	tpl: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, marginBottom: 8 },
	tplOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	check: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
	stat: { width: '48%', flexGrow: 1, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 4 },
	user: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, marginBottom: 6 },
	box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
	boxOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
