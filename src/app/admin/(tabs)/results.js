import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import * as XLSX from 'xlsx';
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Award, CheckCircle2, Download, Edit3, FileText, Medal, Plus, Search, SlidersHorizontal, Trash2, Trophy, User } from 'lucide-react-native';
import api, { errorMessage, mediaUrl } from '../../../api/client';
import E from '../../../api/endpoints';
import { useAuth, isCoordinator } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useOlympiad } from '../../../context/OlympiadContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, LargeTitle } from '../../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, SelectField, Sheet, SkeletonCard, T, Tap } from '../../../components/ui';
import { ChipsSelect, NumberField, TextArea } from '../../../components/form';
import { colors, fonts, radius } from '../../../theme';
import { shareFile } from '../../../utils/files';
import { sharePdf } from '../../../utils/documents';

const L = {
	title: { uz: 'Olimpiada natijalari', ru: 'Результаты олимпиад', en: 'Olympiad Results' },
	search: { uz: 'Qidirish (ID yoki ism)...', ru: 'Поиск (ID или имя)...', en: 'Search (ID or name)...' },
	olympiad: { uz: 'Olimpiada', ru: 'Олимпиада', en: 'Olympiad' },
	subject: { uz: 'Fan', ru: 'Предмет', en: 'Subject' },
	grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	school: { uz: 'Maktab', ru: 'Школа', en: 'School' },
	user: { uz: 'Ishtirokchi', ru: 'Участник', en: 'Participant' },
	score: { uz: 'Ball', ru: 'Балл', en: 'Score' },
	top: { uz: 'Eng yuqori', ru: 'Лучший', en: 'Top' },
	avg: { uz: "O'rtacha", ru: 'Средний', en: 'Average' },
	total: { uz: 'Jami', ru: 'Всего', en: 'Total' },
	sortDesc: { uz: 'Yuqoridan past', ru: 'От высшего', en: 'High to low' },
	sortAsc: { uz: 'Pastdan yuqori', ru: 'От низшего', en: 'Low to high' },
	sortNone: { uz: 'Standart', ru: 'По умолчанию', en: 'Default' },
	filters: { uz: 'Filtrlar', ru: 'Фильтры', en: 'Filters' },
	apply: { uz: "Qo'llash", ru: 'Применить', en: 'Apply' },
	clear: { uz: 'Tozalash', ru: 'Сбросить', en: 'Clear' },
	noResults: { uz: 'Natijalar topilmadi', ru: 'Результаты не найдены', en: 'No results found' },
	loadMore: { uz: 'Yana yuklash', ru: 'Загрузить ещё', en: 'Load more' },
	exportOk: { uz: 'Eksport tayyor', ru: 'Данные экспортированы', en: 'Exported' },
	gold: { uz: 'Oltin', ru: 'Золото', en: 'Gold' },
	silver: { uz: 'Kumush', ru: 'Серебро', en: 'Silver' },
	bronze: { uz: 'Bronza', ru: 'Бронза', en: 'Bronze' },
	confirmDelete: { uz: "Natijani o'chirish?", ru: 'Удалить результат?', en: 'Delete result?' },
	deleted: { uz: "Natija muvaffaqiyatli o'chirildi", ru: 'Результат успешно удален', en: 'Result deleted' },
	deleteErr: { uz: "Natijani o'chirishda xatolik", ru: 'Ошибка при удалении результата', en: 'Error deleting result' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	editResult: { uz: 'Natijani tahrirlash', ru: 'Редактировать результат', en: 'Edit result' },
	save: { uz: "O'zgarishlarni saqlash", ru: 'Сохранить изменения', en: 'Save changes' },
	userAnswer: { uz: 'Foydalanuvchi javobi', ru: 'Ответ пользователя', en: 'User answer' },
	correctAnswer: { uz: "To'g'ri javob", ru: 'Правильный ответ', en: 'Correct answer' },
	scoreUpdated: { uz: 'Ball yangilandi:', ru: 'Балл обновлен до', en: 'Score updated to' },
	currentScore: { uz: 'Hozirgi ball', ru: 'Текущий балл', en: 'Current score' },
	newScore: { uz: 'Yangi ball', ru: 'Новый балл', en: 'New score' },
	mistakes: { uz: 'Natijadagi xatolar', ru: 'Ошибки в результате', en: 'Result mistakes' },
	addMistake: { uz: "+ Xato qo'shish", ru: '+ Добавить ошибку', en: '+ Add mistake' },
	noMistakes: { uz: "Xatolar mavjud emas (100 ball).", ru: 'Ошибки отсутствуют (100 баллов).', en: 'No mistakes (100 points).' },
	qNo: { uz: 'Savol #', ru: 'Вопрос #', en: 'Q #' },
	ans: { uz: 'Javob', ru: 'Ответ', en: 'Answer' },
	correct: { uz: "To'g'ri", ru: 'Верный', en: 'Correct' },
	minus: { uz: '-Ball', ru: '-Баллы', en: '-Pts' },
	requestEdit: { uz: "Tahrirlash so'rovi", ru: 'Запрос на правку', en: 'Request edit' },
	reason: { uz: 'Sabab (ixtiyoriy)', ru: 'Причина (необязательно)', en: 'Reason (optional)' },
	submitRequest: { uz: "So'rov yuborish", ru: 'Отправить запрос', en: 'Submit request' },
	requestSent: { uz: "Tahrirlash so'rovi yuborildi!", ru: 'Запрос на изменение отправлен!', en: 'Edit request submitted!' },
	requestErr: { uz: "So'rovni yuborishda xatolik", ru: 'Ошибка при отправке запроса', en: 'Error submitting request' },
	addResult: { uz: "Natija qo'shish", ru: 'Добавить результат', en: 'Add result' },
	step1: { uz: '1. Olimpiadani tanlang', ru: '1. Выберите олимпиаду', en: '1. Select olympiad' },
	step2: { uz: '2. Ishtirokchini tanlang', ru: '2. Выберите участника', en: '2. Select participant' },
	step3: { uz: '3. Natija tafsilotlari', ru: '3. Детали результата', en: '3. Result details' },
	quickSearch: { uz: 'Ishtirokchilar orasidan qidiruv...', ru: 'Поиск среди участников...', en: 'Search participants...' },
	noParticipants: { uz: "Bu olimpiadaga hali ro'yxatdan o'tganlar yo'q", ru: 'На эту олимпиаду пока нет участников', en: 'No participants yet' },
	session: { uz: 'Fan / Sinf', ru: 'Предмет / Класс', en: 'Subject / Grade' },
	autoMatched: { uz: "Ishtirokchi sinfi bo'yicha avtomatik aniqlandi", ru: 'Определено автоматически по классу участника', en: 'Auto-matched by grade' },
	scoreRange: { uz: "Ball 0 va 100 oralig'ida bo'lishi kerak", ru: 'Балл должен быть от 0 до 100', en: 'Score must be 0–100' },
	added: { uz: "Natija muvaffaqiyatli qo'shildi!", ru: 'Результат успешно добавлен!', en: 'Result added!' },
	saveErr: { uz: 'Saqlashda xatolik', ru: 'Ошибка сохранения', en: 'Save error' },
	open: { uz: 'Ochish', ru: 'Открыть', en: 'Open' },
};

const medal = (s) => (s >= 100 ? ['gold', '#B7791F', colors.goldTint] : s >= 95 ? ['silver', '#64748B', '#F1F5F9'] : s >= 90 ? ['bronze', '#C2410C', '#FFEDD5'] : null);
const certUrl = (item) => {
	const title = item.sub_olympiad_title || item.olympiad_title || '';
	const raw = item.completed_at || item.created_at || '';
	const d = raw ? new Date(raw) : null;
	const date = d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : '';
	return `https://irnolympiad.uz/sertifikat?name=${encodeURIComponent(item.user_name || '')}&title=${encodeURIComponent(title)}&oly=${encodeURIComponent(item.olympiad_title || '')}&date=${encodeURIComponent(date)}&score=${encodeURIComponent(item.score ?? '')}`;
};
const cleanGrade = (g) => {
	const m = String(g || '').match(/\d+/);
	return m ? m[0] : String(g || '').trim().toLowerCase();
};
const localScore = (answers, questions) => {
	if (!questions?.length) return 0;
	const ok = questions.filter((q) => String(answers[String(q.id)] || '').trim().toLowerCase() === String(q.correct_option || '').trim().toLowerCase() && answers[String(q.id)]).length;
	return Math.round((ok / questions.length) * 100);
};
const emptyFilters = { olys: [], subjects: [], grades: [], regions: [] };

// Tappable A/B/C/D answer grid (edit answers & edit requests).
const AnswerEditor = ({ data, onChange, tx, pick }) => (
	<View style={{ gap: 10 }}>
		{(data.questions || []).map((q, idx) => {
			const userAns = data.answers[String(q.id)];
			const correctAns = q.correct_option;
			const opts = Object.entries(q.options || {});
			return (
				<View key={q.id} style={styles.qBox}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
						<T v="label" style={{ flex: 1 }}>{`Q${idx + 1}`}</T>
						{userAns === correctAns ? <CheckCircle2 size={16} color={colors.green} /> : <AlertCircle size={16} color={colors.red} />}
					</View>
					<T v="strong" style={{ fontSize: 14, marginTop: 4 }}>{pick(q, 'text')}</T>
					{q.image ? <Image source={{ uri: mediaUrl(q.image) }} style={{ height: 120, marginTop: 8, borderRadius: 10 }} resizeMode="contain" /> : null}
					<View style={{ gap: 6, marginTop: 8 }}>
						{opts.map(([key, val], i) => {
							const text = typeof val === 'object' ? val.text || val.value || JSON.stringify(val) : val;
							const letter = String.fromCharCode(65 + i);
							const n = (s) => String(s || '').trim().toLowerCase();
							const selected = [n(key), n(text), n(letter)].includes(n(userAns)) && !!userAns;
							const isCorrect = [n(key), n(text), n(letter)].includes(n(correctAns)) && !!correctAns;
							const tone = selected && isCorrect ? [colors.greenSoft, colors.green] : selected ? [colors.redSoft, colors.red] : isCorrect ? [colors.goldTint, colors.goldDeep] : [colors.white, colors.line];
							return (
								<Tap key={key} onPress={() => onChange({ ...data, answers: { ...data.answers, [String(q.id)]: letter } })} style={[styles.ans, { backgroundColor: tone[0], borderColor: tone[1] }]}>
									<T v="strong" style={{ fontSize: 13 }}>{letter})</T>
									<T v="body" style={{ flex: 1, fontSize: 13.5, color: colors.ink }}>{text}</T>
									{selected ? <User size={13} color={tone[1]} /> : isCorrect ? <CheckCircle2 size={13} color={tone[1]} /> : null}
								</Tap>
							);
						})}
					</View>
				</View>
			);
		})}
	</View>
);

const MistakesEditor = ({ mistakes, onChange, tx }) => {
	const update = (list) => onChange(list, Math.max(0, 100 - list.reduce((a, m) => a + (parseInt(m.minus_points, 10) || 0), 0)));
	return (
		<View style={{ gap: 8 }}>
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
				<T v="h3" style={{ flexGrow: 1, flexShrink: 1, flexBasis: 140 }}>{tx(L.mistakes)}</T>
				<Button size="sm" variant="soft" title={tx(L.addMistake)} onPress={() => update([...(mistakes || []), { question_number: '', user_answer: '', correct_answer: '', minus_points: '' }])} />
			</View>
			{!mistakes?.length ? <T v="small">{tx(L.noMistakes)}</T> : null}
			{(mistakes || []).map((m, idx) => (
				<View key={idx} style={styles.mistake}>
					{[['question_number', L.qNo], ['user_answer', L.ans], ['correct_answer', L.correct], ['minus_points', L.minus]].map(([k, lab]) => (
						<Field key={k} style={{ flex: 1 }} inputStyle={{ paddingVertical: 10, fontSize: 14 }} value={String(m[k] ?? '')} placeholder={tx(lab)} keyboardType={k === 'minus_points' ? 'number-pad' : 'default'} onChangeText={(v) => update(mistakes.map((x, i) => (i === idx ? { ...x, [k]: v } : x)))} />
					))}
					<Tap onPress={() => update(mistakes.filter((_, i) => i !== idx))} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap>
				</View>
			))}
		</View>
	);
};

export default function AdminResults() {
	const { tx, lang, pick } = useLanguage();
	const { currentUser } = useAuth();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const coordinator = isCoordinator(currentUser);

	const [search, setSearch] = useState('');
	const [query, setQuery] = useState('');
	const [filters, setFilters] = useState(emptyFilters);
	const [draft, setDraft] = useState(emptyFilters);
	const [filterOpen, setFilterOpen] = useState(false);
	const [sort, setSort] = useState('none');
	const [options, setOptions] = useState({ olympiads: [], subjects: [], grades: [], regions: [] });
	const [items, setItems] = useState([]);
	const [stats, setStats] = useState({ top: 0, avg: 0, total: 0 });
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [more, setMore] = useState(false);
	const [exporting, setExporting] = useState(null);
	const [toDelete, setToDelete] = useState(null);
	const [edit, setEdit] = useState(null); // { result, data, loading, request, reason }
	const [add, setAdd] = useState(null);
	const req = useRef(0);

	useEffect(() => {
		const t = setTimeout(() => setQuery(search.trim()), 400);
		return () => clearTimeout(t);
	}, [search]);

	useEffect(() => {
		api.get(E.ALL_RESULTS, { params: { get_filters: 'true', lang } }).then((r) => setOptions(r.data || {})).catch(() => {});
	}, [lang]);

	const params = useCallback(
		(p, size = 20, sortOverride) => ({
			lang,
			page: p,
			page_size: size,
			search: query || undefined,
			olympiad: filters.olys.length ? filters.olys : undefined,
			subject: filters.subjects.length ? filters.subjects : undefined,
			grade: filters.grades.length ? filters.grades : undefined,
			region: filters.regions.length ? filters.regions : undefined,
			score_sort: sortOverride || (sort !== 'none' ? sort : undefined),
		}),
		[lang, query, filters, sort]
	);

	const load = useCallback(
		async (p = 1) => {
			const id = ++req.current;
			if (p === 1) setLoading(true);
			else setMore(true);
			try {
				const res = await api.get(E.ALL_RESULTS, { params: params(p) });
				if (id !== req.current) return;
				const data = res.data.results || [];
				setItems((prev) => (p === 1 ? data : [...prev, ...data]));
				setStats({ top: res.data.top_score || 0, avg: res.data.avg_score || 0, total: res.data.count || data.length });
				setHasMore(!!res.data.next);
				setPage(p);
			} catch {
			} finally {
				if (id === req.current) {
					setLoading(false);
					setMore(false);
				}
			}
		},
		[params]
	);

	useEffect(() => {
		load(1);
	}, [load]);

	const fetchAll = async () => {
		const out = [];
		for (let p = 1; p <= 1000; p++) {
			const res = await api.get(E.ALL_RESULTS, { params: params(p, 100, 'desc') });
			const batch = res.data.results || [];
			out.push(...batch);
			if (!res.data.next || !batch.length || (typeof res.data.count === 'number' && out.length >= res.data.count)) break;
		}
		return out;
	};

	const exportExcel = async () => {
		setExporting('xlsx');
		try {
			const all = await fetchAll();
			const headers = ['#', tx(L.user), 'ID', tx(L.region), tx(L.school), tx(L.grade), tx(L.subject), tx(L.score), 'Sertifikat'];
			const ws = XLSX.utils.aoa_to_sheet([headers, ...all.map((it, i) => [i + 1, it.user_name, it.participant_id || '-', it.region_name || '-', it.school || '-', it.grade || '-', it.sub_olympiad_title || it.olympiad_title || '-', it.score, 'Yuklab olish'])]);
			all.forEach((it, i) => {
				const ref = XLSX.utils.encode_cell({ c: 8, r: i + 1 });
				if (ws[ref]) ws[ref].l = { Target: certUrl(it), Tooltip: 'Sertifikatni yuklab olish' };
			});
			ws['!cols'] = [5, 30, 15, 20, 30, 10, 30, 10, 18].map((wch) => ({ wch }));
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Results');
			await shareFile(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), `results_export_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			toast.success(tx(L.exportOk));
		} catch {
			toast.error(tx(L.noResults));
		}
		setExporting(null);
	};

	// Landscape A4 table with a clickable certificate link per row (website jsPDF export).
	const exportPdf = async () => {
		setExporting('pdf');
		try {
			const all = await fetchAll();
			if (!all.length) throw new Error('empty');
			const esc = (s) => String(s ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
			const rows = all.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.user_name)}</td><td>${esc(it.participant_id)}</td><td>${esc(it.region_name)}</td><td>${esc(it.school)}</td><td>${esc(it.grade)}</td><td>${esc(it.sub_olympiad_title || it.olympiad_title)}</td><td><b>${esc(it.score)}</b></td><td><a href="${certUrl(it)}">${tx(L.open)}</a></td></tr>`).join('');
			const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:842px 595px;margin:22px}body{font-family:Helvetica,Arial;color:#1f2937}h1{font-size:14px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:8.5px}th{background:#f3f4f6;text-align:left;padding:5px}td{padding:4px 5px;border-bottom:1px solid #e5e7eb}tr:nth-child(even) td{background:#fafafb}a{color:#2563eb}</style></head><body><h1>IRN Olympiads — ${esc(tx(L.title))}</h1><table><thead><tr><th>#</th><th>${tx(L.user)}</th><th>ID</th><th>${tx(L.region)}</th><th>${tx(L.school)}</th><th>${tx(L.grade)}</th><th>${tx(L.subject)}</th><th>${tx(L.score)}</th><th>Sertifikat</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
			await sharePdf(html, { width: 842, height: 595, fileName: `results_${new Date().toISOString().slice(0, 10)}` });
			toast.success(tx(L.exportOk));
		} catch {
			toast.error(tx(L.noResults));
		}
		setExporting(null);
	};

	const deleteResult = async () => {
		const r = toDelete;
		setToDelete(null);
		const endpoints = [
			['delete', `results/${r.id}/`], ['post', `results/${r.id}/reset/`], ['delete', `exams/all-results/${r.id}/`], ['post', `exams/all-results/${r.id}/reset/`],
			['delete', `registrations/${r.id}/`], ['post', `registrations/${r.id}/reset/`], ['post', `registrations/${r.id}/reset_exam/`], ['delete', `exams/results/${r.id}/`],
			['post', `exams/results/${r.id}/reset/`], ['post', `exams/all-results/${r.id}/reset_result/`], ['delete', `registrations/result/${r.id}/`],
			...(r.olympiad_id ? [['delete', `exams/${r.olympiad_id}/results/${r.id}/`], ['post', `exams/${r.olympiad_id}/results/${r.id}/reset/`]] : []),
			...(r.grade_session_id ? [['delete', `exams/grade-session/${r.grade_session_id}/results/${r.id}/`]] : []),
		];
		// Same fallback chain as the website — the delete route moved between backend versions.
		for (const [method, url] of endpoints) {
			try {
				const res = await api({ method, url });
				if ([200, 201, 204].includes(res.status) || res.data?.success) {
					toast.success(tx(L.deleted));
					setItems((prev) => prev.filter((x) => x.id !== r.id));
					return;
				}
			} catch {}
		}
		toast.error(tx(L.deleteErr));
	};

	const openEdit = async (r, request) => {
		setEdit({ result: r, data: null, loading: true, request, reason: '' });
		try {
			const res = await api.get(`results/${r.id}/edit_answers/`);
			setEdit((e) => ({ ...e, data: res.data, loading: false }));
		} catch {
			toast.error(tx(L.noResults));
			setEdit(null);
		}
	};

	const saveEdit = async () => {
		setEdit((e) => ({ ...e, loading: true }));
		const { result, data, request, reason } = edit;
		try {
			if (request) {
				const proposed = { answers_json: data.answers };
				if (reason) proposed._reason = reason;
				await api.post('edit-requests/', { target_type: 'result', target_id: result.id, target_display: `${result.user_name} — ${result.sub_olympiad_title || result.olympiad_title} (${result.score}pts)`, proposed_changes: proposed, current_data: { answers_json: data.answers } });
				toast.success(tx(L.requestSent));
			} else {
				const res = await api.post(`results/${result.id}/edit_answers/`, data.has_test ? { answers: data.answers } : { mistakes: data.mistakes || [] });
				if (res.data.success) {
					toast.success(`${tx(L.scoreUpdated)} ${res.data.score}`);
					setItems((prev) => prev.map((x) => (x.id === result.id ? { ...x, score: res.data.score } : x)));
				}
			}
			setEdit(null);
		} catch {
			toast.error(tx(request ? L.requestErr : L.saveErr));
			setEdit((e) => ({ ...e, loading: false }));
		}
	};

	// ——— Add result ———
	const [regUsers, setRegUsers] = useState([]);
	const [regLoading, setRegLoading] = useState(false);
	useEffect(() => {
		if (!add?.olympiad) return;
		const t = setTimeout(async () => {
			setRegLoading(true);
			try {
				const res = await api.get(E.USERS, { params: { registrations__olympiad: add.olympiad, role: 'participant', page_size: 100, ...(add.search?.trim() ? { search: add.search.trim() } : {}) } });
				setRegUsers(res.data.results || []);
			} catch {
				setRegUsers([]);
			}
			setRegLoading(false);
		}, 300);
		return () => clearTimeout(t);
	}, [add?.olympiad, add?.search]);

	const sessionsFor = (olyId) => {
		const oly = olympiads.find((o) => String(o.id) === String(olyId));
		return (oly?.subs || []).flatMap((sub) => (sub.grade_sessions || []).map((gs) => ({ id: gs.id, subId: sub.id, grade: gs.grade, label: `${pick(sub)} (${gs.grade}${lang === 'uz' ? '-sinf' : lang === 'ru' ? '-класс' : ' grade'})` })));
	};

	const submitAdd = async () => {
		const s = parseInt(add.score, 10);
		if (isNaN(s) || s < 0 || s > 100) return toast.error(tx(L.scoreRange));
		setAdd((a) => ({ ...a, loading: true }));
		const session = sessionsFor(add.olympiad).find((x) => String(x.id) === String(add.session));
		try {
			const now = new Date().toISOString();
			await api.post('results/', { user: add.user.id, olympiad: parseInt(add.olympiad, 10), sub_olympiad_grade: parseInt(add.session, 10), sub_olympiad: session?.subId || null, score: s, start_time: now, completed_at: now, mistakes: add.mistakes || [] });
			toast.success(tx(L.added));
			setAdd(null);
			load(1);
		} catch (err) {
			const d = err.response?.data;
			toast.error(`${tx(L.saveErr)}: ${d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ') : errorMessage(err)}`);
			setAdd((a) => ({ ...a, loading: false }));
		}
	};

	const active = filters.olys.length + filters.subjects.length + filters.grades.length + filters.regions.length;
	const SortIcon = sort === 'desc' ? ArrowDown : sort === 'asc' ? ArrowUp : ArrowUpDown;

	return (
		<Screen tabBar onRefresh={() => load(1)}>
			<LargeTitle
				title={tx(L.title)}
				right={
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<IconButton icon={FileText} color={colors.red} onPress={exportPdf} />
						<IconButton icon={Download} color={colors.green} onPress={exportExcel} />
						{!coordinator ? <IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={() => setAdd({ olympiad: '', user: null, session: '', score: '', mistakes: [], search: '' })} /> : null}
					</View>
				}
			/>
			{exporting ? <View style={styles.exporting}><ActivityIndicator color={colors.green} /><T v="small" color={colors.green}>{exporting.toUpperCase()}…</T></View> : null}

			<View style={styles.stats}>
				{[
					{ icon: Award, label: L.total, value: stats.total, tint: [colors.goldTint, colors.amber] },
					{ icon: Trophy, label: L.top, value: stats.top, tint: [colors.greenSoft, colors.green] },
					{ icon: ArrowUpDown, label: L.avg, value: stats.avg, tint: [colors.blueSoft, colors.blue] },
				].map((s, i) => (
					<View key={i} style={[styles.stat, { backgroundColor: s.tint[0] }]}>
						<s.icon size={16} color={s.tint[1]} />
						<T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, marginTop: 6 }}>{typeof s.value === 'number' ? Math.round(s.value * 10) / 10 : s.value}</T>
						<T v="small" style={{ fontSize: 11.5 }}>{tx(s.label)}</T>
					</View>
				))}
			</View>

			<View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
				<Field style={{ flex: 1 }} icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.search)} autoCapitalize="none" autoCorrect={false} />
				<Tap onPress={() => setSort((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'))} style={[styles.sq, sort !== 'none' && styles.sqOn]}><SortIcon size={20} color={colors.navyDeep} /></Tap>
				<Tap onPress={() => { setDraft(filters); setFilterOpen(true); }} style={[styles.sq, active && styles.sqOn]}>
					<SlidersHorizontal size={20} color={colors.navyDeep} />
					{active ? <View style={styles.badge}><T style={styles.badgeText}>{active}</T></View> : null}
				</Tap>
			</View>
			{sort !== 'none' ? <Pill label={tx(sort === 'desc' ? L.sortDesc : L.sortAsc)} color={colors.navyDeep} bg={colors.goldSoft} style={{ marginBottom: 10 }} /> : null}

			{loading ? (
				<View style={{ gap: 10 }}><SkeletonCard /><SkeletonCard /></View>
			) : !items.length ? (
				<EmptyState icon={Trophy} title={tx(L.noResults)} />
			) : (
				items.map((r) => {
					const m = medal(r.score);
					return (
						<Card key={r.id} style={{ marginBottom: 10, padding: 14 }}>
							<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
								<View style={[styles.medal, { backgroundColor: m ? m[2] : colors.cardMuted }]}>{m ? <Medal size={20} color={m[1]} /> : <User size={20} color={colors.muted} />}</View>
								<View style={{ flex: 1 }}>
									<T v="strong" numberOfLines={1}>{r.user_name}</T>
									<T v="small" style={{ fontSize: 11.5 }}>ID: {r.participant_id || '-'}</T>
								</View>
								<View style={{ alignItems: 'flex-end' }}>
									<T style={{ fontFamily: fonts.extrabold, fontSize: 22, color: m ? m[1] : colors.ink }}>{r.score}</T>
									{m ? <T v="label" style={{ fontSize: 9 }} color={m[1]}>{tx(L[m[0]])}</T> : null}
								</View>
							</View>
							<T v="small" numberOfLines={2} style={{ marginTop: 8 }}>{r.olympiad_title}</T>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
								{r.sub_olympiad_title ? <Pill label={r.sub_olympiad_title} color={colors.navy} bg={colors.navySoft} /> : null}
								{r.grade ? <Pill label={`${r.grade}${lang === 'uz' ? '-sinf' : lang === 'ru' ? '-класс' : ' gr.'}`} color={colors.navyDeep} bg={colors.goldSoft} /> : null}
								{r.region_name ? <Pill label={r.region_name} /> : null}
							</View>
							<View style={styles.actions}>
								{coordinator ? (
									<Button size="sm" variant="soft" icon={Edit3} title={tx(L.requestEdit)} onPress={() => openEdit(r, true)} />
								) : (
									<>
										<Button size="sm" variant="light" icon={Edit3} title={tx(L.editResult)} onPress={() => openEdit(r, false)} />
										<Tap onPress={() => setToDelete(r)} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap>
									</>
								)}
							</View>
						</Card>
					);
				})
			)}
			{hasMore && !loading ? <Button title={tx(L.loadMore)} variant="light" size="md" loading={more} onPress={() => load(page + 1)} /> : null}

			<Sheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={tx(L.filters)} scroll>
				<View style={{ gap: 18, paddingBottom: 8 }}>
					<ChipsSelect label={tx(L.olympiad)} options={(options.olympiads || []).map((o) => ({ value: String(o.id), label: o.title }))} value={draft.olys} onChange={(v) => setDraft((d) => ({ ...d, olys: v }))} />
					<ChipsSelect label={tx(L.subject)} options={(options.subjects || []).map((s) => ({ value: s, label: s }))} value={draft.subjects} onChange={(v) => setDraft((d) => ({ ...d, subjects: v }))} />
					<ChipsSelect label={tx(L.grade)} options={(options.grades || []).map((g) => ({ value: String(g), label: String(g) }))} value={draft.grades} onChange={(v) => setDraft((d) => ({ ...d, grades: v }))} />
					<ChipsSelect label={tx(L.region)} options={(options.regions || []).map((r) => ({ value: r, label: r }))} value={draft.regions} onChange={(v) => setDraft((d) => ({ ...d, regions: v }))} />
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.clear)} onPress={() => { setDraft(emptyFilters); setFilters(emptyFilters); setFilterOpen(false); }} />
						<Button style={{ flex: 1.4 }} size="md" title={tx(L.apply)} onPress={() => { setFilters(draft); setFilterOpen(false); }} />
					</View>
				</View>
			</Sheet>

			<Sheet visible={!!edit} onClose={() => !edit?.loading && setEdit(null)} title={edit?.request ? tx(L.requestEdit) : tx(L.editResult)} scroll maxHeight="94%">
				{edit ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<T v="strong">{edit.result.user_name}</T>
						{!edit.data ? (
							<ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 30 }} />
						) : edit.data.has_test || edit.request ? (
							<AnswerEditor data={edit.data} tx={tx} pick={pick} onChange={(data) => setEdit((e) => ({ ...e, data }))} />
						) : (
							<MistakesEditor tx={tx} mistakes={edit.data.mistakes} onChange={(mistakes, score) => setEdit((e) => ({ ...e, data: { ...e.data, mistakes, score } }))} />
						)}
						{edit.data ? (
							<View style={styles.scoreRow}>
								<T v="strong">{tx(L.currentScore)}: {edit.request ? edit.result.score : edit.data.score}%</T>
								{edit.request ? <T v="strong" color={colors.amber}>{tx(L.newScore)}: {localScore(edit.data.answers, edit.data.questions)}%</T> : null}
							</View>
						) : null}
						{edit.request ? <TextArea rows={3} label={tx(L.reason)} value={edit.reason} onChangeText={(v) => setEdit((e) => ({ ...e, reason: v }))} /> : null}
						<Button title={tx(edit.request ? L.submitRequest : L.save)} loading={edit.loading && !!edit.data} disabled={!edit.data} onPress={saveEdit} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!add} onClose={() => !add?.loading && setAdd(null)} title={tx(L.addResult)} scroll maxHeight="94%">
				{add ? (
					<View style={{ gap: 14, paddingBottom: 10 }}>
						<SelectField label={tx(L.step1)} value={add.olympiad} onChange={(v) => { setRegUsers([]); setAdd((a) => ({ ...a, olympiad: v, user: null, session: '', mistakes: [], search: '' })); }} options={olympiads.map((o) => ({ value: String(o.id), label: pick(o) }))} placeholder={tx(L.olympiad)} />
						{add.olympiad ? (
							<View>
								<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.step2)}</T>
								<Field icon={Search} value={add.search} onChangeText={(v) => setAdd((a) => ({ ...a, search: v }))} placeholder={tx(L.quickSearch)} autoCorrect={false} />
								<ScrollView style={{ maxHeight: 240, marginTop: 8 }} nestedScrollEnabled>
									{regLoading ? <ActivityIndicator color={colors.goldDeep} style={{ margin: 16 }} /> : !regUsers.length ? <T v="small" style={{ padding: 12 }}>{tx(L.noParticipants)}</T> : regUsers.map((u) => {
										const selected = add.user?.id === u.id;
										return (
											<Tap key={u.id} onPress={() => {
												const match = sessionsFor(add.olympiad).find((s) => cleanGrade(s.grade) === cleanGrade(u.grade));
												setAdd((a) => ({ ...a, user: u, session: match ? String(match.id) : '' }));
											}} style={[styles.userRow, selected && { backgroundColor: colors.goldTint, borderColor: colors.gold }]}>
												<T v="strong" style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1}>{u.last_name} {u.first_name}</T>
												<T v="small">{u.grade}</T>
											</Tap>
										);
									})}
								</ScrollView>
							</View>
						) : null}
						{add.user ? (
							<>
								<T v="label" style={{ marginLeft: 4 }}>{tx(L.step3)}</T>
								<View style={styles.selected}>
									<T v="strong">{add.user.last_name} {add.user.first_name}</T>
									<T v="small">ID: {add.user.participant_id} | {add.user.phone} · {add.user.grade}</T>
								</View>
								<SelectField label={tx(L.session)} value={add.session} onChange={(v) => setAdd((a) => ({ ...a, session: v }))} options={sessionsFor(add.olympiad).map((s) => ({ value: String(s.id), label: s.label }))} placeholder="—" />
								{add.session && sessionsFor(add.olympiad).find((s) => cleanGrade(s.grade) === cleanGrade(add.user.grade) && String(s.id) === String(add.session)) ? <T v="small" color={colors.green}>✓ {tx(L.autoMatched)}</T> : null}
								<NumberField label={`${tx(L.score)} (0 - 100)`} value={add.score} onChange={(v) => setAdd((a) => ({ ...a, score: v }))} />
								<MistakesEditor tx={tx} mistakes={add.mistakes} onChange={(mistakes, score) => setAdd((a) => ({ ...a, mistakes, score: String(score) }))} />
								<Button title={tx(L.addResult)} icon={Plus} loading={add.loading} disabled={!add.session || add.score === ''} onPress={submitAdd} />
							</>
						) : null}
					</View>
				) : null}
			</Sheet>

			<Dialog
				visible={!!toDelete}
				onClose={() => setToDelete(null)}
				icon={Trash2}
				tone="red"
				title={tx(L.confirmDelete)}
				message={toDelete ? `${toDelete.user_name} · ${toDelete.score}` : ''}
				actions={[
					{ title: tx(L.yesDelete), variant: 'danger', onPress: deleteResult },
					{ title: tx(L.cancel), variant: 'ghost', onPress: () => setToDelete(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	exporting: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.greenSoft, marginBottom: 12 },
	stats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
	stat: { flex: 1, borderRadius: radius.lg, padding: 12 },
	sq: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	sqOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	badge: { position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.navyDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
	badgeText: { color: colors.gold, fontFamily: fonts.extrabold, fontSize: 9.5 },
	medal: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
	actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, justifyContent: 'flex-end' },
	del: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
	qBox: { padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	ans: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1.5 },
	mistake: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	scoreRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 6 },
	selected: { padding: 12, borderRadius: radius.md, backgroundColor: colors.greenSoft, gap: 2 },
});
