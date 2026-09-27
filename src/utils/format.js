const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');
const valid = (s) => {
	if (!s) return null;
	const d = new Date(s);
	return isNaN(d.getTime()) ? null : d;
};

// Hermes' Intl month names are unreliable for uz, so months are spelled out by hand.
export const formatDate = (value, lang = 'uz', { time = true } = {}) => {
	const d = valid(value);
	if (!d) return value || '';
	const hm = time ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
	if (lang === 'uz') return `${d.getFullYear()}-yil ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}${hm}`;
	if (lang === 'ru') return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}${time ? ',' : ''}${hm}`;
	return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}${hm}`;
};

export const formatShortDate = (value, lang = 'uz', { time = true } = {}) => {
	const d = valid(value);
	if (!d) return '';
	const hm = time ? `, ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
	if (lang === 'uz') return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}${hm}`;
	if (lang === 'ru') return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}${hm}`;
	return `${EN_MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}${hm}`;
};

export const formatTime = (value) => {
	const d = valid(value);
	return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
};

export const formatDay = (value) => {
	const d = valid(value);
	return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '';
};

export const formatMoney = (amount) => {
	const n = Number(amount) || 0;
	return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const formatPrice = (price) => (Number(price) > 0 ? `${formatMoney(price)} UZS` : '');

export const formatClock = (seconds) => {
	const s = Math.max(0, Math.floor(seconds || 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

export const gradeLabel = (grade, t) => {
	if (grade === undefined || grade === null || grade === '') return '';
	if (String(grade) === 'KG') return t('kindergarten');
	return `${grade}${t('gradeSuffix')}`;
};

export const initialsOf = (user) => `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

export const getEnglishSubject = (title) => {
	if (!title) return '';
	const lower = title.toLowerCase();
	if (lower.includes('ingliz') || lower.includes('английский') || lower.includes('english')) return 'English Language';
	if (lower.includes('matematika') || lower.includes('математика') || lower.includes('math')) return 'Mathematics';
	if (lower.includes('ona tili') || lower.includes('родной') || lower.includes('native')) return 'Native Language';
	if (lower.includes('kimyo') || lower.includes('химия') || lower.includes('chemistry')) return 'Chemistry';
	if (lower.includes('fizika') || lower.includes('физика') || lower.includes('physics')) return 'Physics';
	if (lower.includes('biologiya') || lower.includes('биология') || lower.includes('biology')) return 'Biology';
	if (lower.includes('tarix') || lower.includes('история') || lower.includes('history')) return 'History';
	if (lower.includes('geografiya') || lower.includes('география') || lower.includes('geography')) return 'Geography';
	if (lower.includes('informatika') || lower.includes('информатика') || lower.includes('computer') || lower.includes('ict')) return 'Informatics & ICT';
	return title;
};

export const sortedSessions = (sub) =>
	(sub?.grade_sessions || [])
		.filter((s) => s.start_datetime && valid(s.start_datetime))
		.sort((a, b) => (parseInt(a.grade, 10) || 0) - (parseInt(b.grade, 10) || 0));
