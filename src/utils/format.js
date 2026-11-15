import { mediaUrl } from '../api/client';

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

export const phoneMask = (value) => cleanUzPhone(value);

export function cleanUzPhone(raw) {
	if (!raw || typeof raw !== 'string' || raw.trim() === '' || raw === '+') return '+998';

	let local = '';
	if (raw.startsWith('+998')) {
		let after = raw.slice(4).replace(/\D/g, '');
		if (after.length > 9 && after.startsWith('998')) {
			after = after.slice(3);
		}
		local = after;
	} else {
		const all = raw.replace(/\D/g, '');
		if (all.startsWith('998') && all.length > 9) {
			local = all.slice(3);
		} else if (all === '998' || all === '99' || all === '9') {
			local = '';
		} else {
			local = all;
		}
	}

	return '+998' + local.slice(0, 9);
}

const CYRILLIC_PATTERN = /[а-яА-ЯёЁўЎғҒқҚҳҲ]/;
const CYRILLIC_VOWELS = new Set('аеёиоуыэюяАЕЁИОУЫЭЮЯaeiouyAEIOUYўЎ');
const MAPPING_MULTI = {
	'ў': "o'", 'Ў': "O'",
	'ғ': "g'", 'Ғ': "G'",
	'ч': 'ch', 'Ч': 'Ch',
	'ш': 'sh', 'Ш': 'Sh',
	'щ': 'shch', 'Щ': 'Shch',
	'ё': 'yo', 'Ё': 'Yo',
	'ю': 'yu', 'Ю': 'Yu',
	'я': 'ya', 'Я': 'Ya',
	'ц': 'ts', 'Ц': 'Ts',
};
const MAPPING_SINGLE = {
	'а': 'a', 'А': 'A',
	'б': 'b', 'Б': 'B',
	'в': 'v', 'В': 'V',
	'г': 'g', 'Г': 'G',
	'д': 'd', 'Д': 'D',
	'ж': 'j', 'Ж': 'J',
	'з': 'z', 'З': 'Z',
	'и': 'i', 'И': 'I',
	'й': 'y', 'Й': 'Y',
	'к': 'k', 'К': 'K',
	'қ': 'q', 'Қ': 'Q',
	'л': 'l', 'Л': 'L',
	'м': 'm', 'М': 'M',
	'н': 'n', 'Н': 'N',
	'о': 'o', 'О': 'O',
	'п': 'p', 'П': 'P',
	'р': 'r', 'Р': 'R',
	'с': 's', 'С': 'S',
	'т': 't', 'Т': 'T',
	'у': 'u', 'У': 'U',
	'ф': 'f', 'Ф': 'F',
	'х': 'x', 'Х': 'X',
	'ҳ': 'h', 'Ҳ': 'H',
	'ы': 'i', 'Ы': 'I',
	'э': 'e', 'Э': 'E',
	'ъ': "'", 'Ъ': "'",
	'ь': '', 'Ь': '',
};

export function cyrillicToLatin(text) {
	if (!text || typeof text !== 'string') return text || '';
	if (!CYRILLIC_PATTERN.test(text)) return text;

	const result = [];
	const n = text.length;

	for (let i = 0; i < n; i++) {
		const char = text[i];
		const prevChar = i > 0 ? text[i - 1] : ' ';
		const nextChar = i + 1 < n ? text[i + 1] : ' ';

		const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
		const isNextUpper = nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase();
		const isPrevUpper = prevChar === prevChar.toUpperCase() && prevChar !== prevChar.toLowerCase();

		if (char === 'е' || char === 'Е') {
			const isWordStart =
				i === 0 ||
				' \t\n\r-,.:;"\'()[]{}«»/\\№'.includes(prevChar) ||
				CYRILLIC_VOWELS.has(prevChar) ||
				"ъьЪЬ'`".includes(prevChar);

			if (isWordStart) {
				if (isUpper) {
					result.push(isNextUpper ? 'YE' : 'Ye');
				} else {
					result.push('ye');
				}
			} else {
				result.push(isUpper ? 'E' : 'e');
			}
			continue;
		}

		if (char in MAPPING_MULTI) {
			let lat = MAPPING_MULTI[char];
			if (isUpper) {
				if (isNextUpper || (i > 0 && isPrevUpper)) {
					lat = lat.toUpperCase();
				} else {
					lat = lat.charAt(0).toUpperCase() + lat.slice(1);
				}
			}
			result.push(lat);
			continue;
		}

		if (char in MAPPING_SINGLE) {
			result.push(MAPPING_SINGLE[char]);
			continue;
		}

		result.push(char);
	}

	return result.join('');
}

const DEFAULT_BYD_BANNER = require('../../assets/illustrations/byd_chazor_banner.jpg');
const DEFAULT_OLYMPIAD_BANNER = require('../../assets/illustrations/olympiad-hero-charcoal-orange.jpg');

export function getOlympiadBannerSource(banner_image, id) {
	if (banner_image) {
		const uri = mediaUrl(banner_image);
		if (uri) return { uri };
	}
	const idStr = String(id || '');
	if (idStr === '43' || idStr === '44') {
		return DEFAULT_BYD_BANNER;
	}
	return DEFAULT_OLYMPIAD_BANNER;
}

