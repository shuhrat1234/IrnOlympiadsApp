import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Clock, GraduationCap, Phone, Send, User, Users, XCircle } from 'lucide-react-native';
import api, { errorMessage } from '../api/client';
import E from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, Field, IconBadge, Pill, Segmented, Sheet, T, Tap } from './ui';
import TeacherSearch from './TeacherSearch';
import { hasStudentGate } from './StudentGates';
import { colors, radius } from '../theme';
import { phoneMask } from '../utils/format';

const L = {
	title: { uz: "O'qituvchingiz kim?", ru: 'Кто твой учитель?', en: 'Who is your teacher?' },
	promo: {
		uz: "Muvaffaqiyatlaringizni kuzatib borishi va IRN o'qituvchilar reytingida qatnashishi uchun fan o'qituvchingizni ko'rsating!",
		ru: 'Укажите вашего школьного учителя по предмету, чтобы он мог следить за вашими успехами и участвовать в рейтинге учителей IRN!',
		en: 'Specify your subject teacher so they can track your results and participate in IRN teacher rankings!',
	},
	specify: { uz: "O'qituvchini ko'rsatish", ru: 'Указать учителя', en: 'Specify teacher' },
	change: { uz: "O'zgartirish", ru: 'Изменить', en: 'Change' },
	math: { uz: 'Matematika', ru: 'Математика', en: 'Mathematics' },
	english: { uz: 'Ingliz tili', ru: 'Английский', en: 'English' },
	current: { uz: 'Hozirgi holat:', ru: 'Текущий выбор:', en: 'Current selection:' },
	self: { uz: 'Mustaqil', ru: 'Занимаюсь сам', en: 'Self-study' },
	none: { uz: 'Tanlanmagan', ru: 'Не выбран', en: 'Not selected' },
	search: { uz: 'Bazadan qidirish', ru: 'Поиск в базе', en: 'Search database' },
	manual: { uz: "Qo'lda kiritish", ru: 'Ввести вручную', en: 'Enter manually' },
	select: { uz: 'Tanlash', ru: 'Выбрать', en: 'Select' },
	manualHint: {
		uz: "Agar o'qituvchingiz hali ro'yxatdan o'tmagan bo'lsa, uning ma'lumotlarini qoldiring. Admin tekshirib biriktiradi.",
		ru: 'Если вашего учителя ещё нет в системе, укажите его данные. Администрация проверит заявку и привяжет его.',
		en: 'If your teacher is not in the system yet, enter their details. Administration will verify and link them.',
	},
	fullName: { uz: "O'qituvchi F.I.SH", ru: 'ФИО учителя', en: 'Teacher full name' },
	phone: { uz: 'Telefon raqami', ru: 'Номер телефона', en: 'Phone number' },
	sendReview: { uz: 'Tekshiruvga yuborish', ru: 'Отправить на проверку', en: 'Send for verification' },
	sentReview: { uz: "Ma'lumotlar tekshiruvga yuborildi", ru: 'Данные отправлены на проверку', en: 'Sent for verification' },
	saved: { uz: 'Saqlandi', ru: 'Сохранено', en: 'Saved' },
	noMath: { uz: "Menda matematika bo'yicha o'qituvchi yo'q (mustaqil)", ru: 'У меня нет учителя по математике (занимаюсь сам)', en: "I don't have a mathematics teacher (self-study)" },
	noEnglish: { uz: "Menda ingliz tili bo'yicha o'qituvchi yo'q (mustaqil)", ru: 'У меня нет учителя по английскому (занимаюсь сам)', en: "I don't have an English teacher (self-study)" },
	noBoth: { uz: "Ikkala fan bo'yicha ham o'qituvchi yo'q", ru: 'У меня нет учителей по обоим предметам', en: "I don't have teachers for both subjects" },
	skip: { uz: "O'tkazib yuborish", ru: 'Пропустить', en: 'Skip' },
	closeIn: { uz: "Yopish tugmasi {s} soniyadan so'ng chiqadi", ru: 'Закрыть можно будет через {s} сек', en: 'You can close this in {s}s' },
	review: { uz: 'Tekshiruvda', ru: 'На проверке', en: 'In review' },
	pending: { uz: 'Tasdiqlash kutilmoqda', ru: 'Ждёт подтверждения', en: 'Awaiting confirmation' },
	confirmed: { uz: 'Tasdiqlangan', ru: 'Подтверждён', en: 'Confirmed' },
	isYours: { uz: "Bu sizning o'qituvchingizmi?", ru: 'Это ваш учитель?', en: 'Is this your teacher?' },
	yes: { uz: 'Ha', ru: 'Да', en: 'Yes' },
	no: { uz: "Yo'q", ru: 'Нет', en: 'No' },
};

const SUBJECTS = ['math', 'english'];
// Auto prompt is shown once per app session (the website keeps this in sessionStorage).
const session = { prompted: false };

const subjectState = (data, subject) => {
	const teacher = data?.[`${subject}_teacher`];
	const self = !!data?.[`has_no_${subject}_teacher`];
	return { teacher, self, done: !!teacher || self };
};

// "Who is your teacher?" from the website's student dashboard: one teacher per
// subject (math / english), picked from the database, entered manually for admin
// review, or marked as self-study. `banner` is the home promo that also auto-opens
// the sheet once per session; `section` is the always-visible block on the profile.
export default function SubjectTeachers({ variant = 'banner', style }) {
	const { currentUser, fetchMe } = useAuth();
	const { tx } = useLanguage();
	const toast = useToast();
	const [data, setData] = useState(null);
	const [open, setOpen] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const [subject, setSubject] = useState('math');
	const [mode, setMode] = useState('search');
	const [busyId, setBusyId] = useState(null);
	const [manual, setManual] = useState({ name: '', phone: '+998' });
	const [sending, setSending] = useState(false);
	const [responding, setResponding] = useState(null);

	const load = useCallback(async () => {
		try {
			const res = await api.get(E.STUDENT_MY_TEACHERS);
			setData(res.data);
			return res.data;
		} catch {
			return null;
		}
	}, []);

	const gated = hasStudentGate(currentUser);
	useEffect(() => {
		load().then((d) => {
			if (variant !== 'banner' || gated || !d?.must_prompt_modal || session.prompted) return;
			session.prompted = true;
			setCountdown(7);
			setOpen(true);
		});
	}, [load, variant, gated]);

	// The auto prompt can't be dismissed for the first seconds, like on the website.
	useEffect(() => {
		if (!open || countdown <= 0) return;
		const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [open, countdown]);

	if (currentUser?.role !== 'participant' || !data) return null;

	const canClose = countdown <= 0;
	const close = () => { if (canClose) setOpen(false); };
	const openFor = (s) => { setSubject(s); setMode('search'); setCountdown(0); setOpen(true); };

	// After a subject is settled: move on to the other one if it's still empty, else close.
	const advance = (fresh, settled) => {
		const other = settled === 'math' ? 'english' : 'math';
		if (settled !== 'both' && fresh && !subjectState(fresh, other).done) {
			setSubject(other);
			setMode('search');
		} else {
			setCountdown(0);
			setOpen(false);
		}
	};
	const refresh = async (settled) => {
		const fresh = await load();
		fetchMe?.();
		if (settled) advance(fresh, settled);
	};

	const pickTeacher = async (teacher) => {
		setBusyId(teacher.id);
		try {
			await api.post(E.STUDENT_CHANGE_SUBJECT_TEACHER, { subject, teacher_id: teacher.id, change_type: 'real_change' });
			toast.success(tx(L.saved));
			await refresh(subject);
		} catch (err) {
			toast.error(errorMessage(err, tx({ uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' })));
		}
		setBusyId(null);
	};

	const setNoTeacher = async (which) => {
		try {
			await api.post(E.STUDENT_SET_NO_TEACHER, { subject: which });
			await refresh(which);
		} catch (err) {
			toast.error(errorMessage(err));
		}
	};

	const submitManual = async () => {
		if (!manual.name.trim() || sending) return;
		setSending(true);
		try {
			await api.post(E.STUDENT_MANUAL_SUBJECT_TEACHER, { subject, teacher_name: manual.name.trim(), teacher_phone: manual.phone.trim() });
			setManual({ name: '', phone: '+998' });
			toast.success(tx(L.sentReview));
			await refresh(subject);
		} catch (err) {
			toast.error(errorMessage(err));
		}
		setSending(false);
	};

	// A teacher who linked the student themselves stays "pending" until the student answers.
	const respond = async (s, action) => {
		setResponding(`${s}-${action}`);
		try {
			const res = await api.post(E.STUDENT_CONFIRM_SUBJECT_TEACHER, { subject: s, action });
			if (res.data?.success === false) toast.error(res.data.message || errorMessage(null));
			await refresh();
		} catch (err) {
			toast.error(errorMessage(err));
		}
		setResponding(null);
	};

	const label = (s) => {
		const st = subjectState(data, s);
		return st.teacher?.name || tx(st.self ? L.self : L.none);
	};
	const statusPill = (s) => {
		const status = subjectState(data, s).teacher?.status;
		if (status === 'confirmed') return <Pill label={tx(L.confirmed)} color={colors.green} bg={colors.greenSoft} />;
		if (status === 'manual_review') return <Pill label={tx(L.review)} color={colors.blue} bg={colors.blueSoft} />;
		if (status === 'pending') return <Pill label={tx(L.pending)} color={colors.amber} bg={colors.goldTint} />;
		return null;
	};

	const sheet = (
		<Sheet visible={open} onClose={close} title={tx(L.title)} dismissable={canClose} scroll maxHeight="92%">
			<View style={{ gap: 12, paddingBottom: 8 }}>
				<Segmented
					value={subject}
					onChange={(s) => { setSubject(s); setMode('search'); }}
					options={SUBJECTS.map((s) => ({ value: s, label: `${s === 'math' ? '📐' : '🇬🇧'} ${tx(L[s])}${subjectState(data, s).teacher ? ' ✓' : subjectState(data, s).self ? ' ∅' : ''}` }))}
				/>
				<View style={styles.current}>
					<T v="small">{tx(L.current)}</T>
					<T v="strong" style={{ flex: 1, textAlign: 'right', fontSize: 14 }} numberOfLines={1}>{label(subject)}</T>
				</View>
				<Segmented value={mode} onChange={setMode} options={[{ value: 'search', label: tx(L.search) }, { value: 'manual', label: tx(L.manual) }]} />

				{mode === 'search' ? (
					<TeacherSearch actionLabel={tx(L.select)} busyId={busyId} onSelect={pickTeacher} />
				) : (
					<View style={{ gap: 10 }}>
						<T v="small">{tx(L.manualHint)}</T>
						<Field label={tx(L.fullName)} icon={User} value={manual.name} onChangeText={(v) => setManual((m) => ({ ...m, name: v }))} placeholder="Karimov Alisher Rustamovich" autoCapitalize="words" autoCorrect={false} />
						<Field label={tx(L.phone)} icon={Phone} value={manual.phone} onChangeText={(v) => setManual((m) => ({ ...m, phone: phoneMask(v) }))} keyboardType="phone-pad" placeholder="+998901234567" />
						<Button size="md" icon={Send} title={tx(L.sendReview)} loading={sending} disabled={!manual.name.trim()} onPress={submitManual} />
					</View>
				)}

				<Tap onPress={() => setNoTeacher(subject)} style={styles.noTeacher}>
					<T v="strong" style={{ fontSize: 13, textAlign: 'center' }} color={colors.ink2}>{tx(subject === 'math' ? L.noMath : L.noEnglish)}</T>
				</Tap>

				{canClose ? (
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
						<View style={{ flexGrow: 2, flexBasis: 200 }}><Button size="sm" variant="light" title={tx(L.noBoth)} onPress={() => setNoTeacher('both')} /></View>
						<View style={{ flexGrow: 1, flexBasis: 100 }}><Button size="sm" variant="ghost" title={tx(L.skip)} onPress={close} /></View>
					</View>
				) : (
					<View style={styles.wait}>
						<Clock size={14} color={colors.muted} />
						<T v="small">{tx(L.closeIn).replace('{s}', countdown)}</T>
					</View>
				)}
			</View>
		</Sheet>
	);

	if (variant === 'banner') {
		// Nothing to nag about once both subjects are settled — the profile keeps the full block.
		if (!data.must_prompt_modal) return sheet;
		return (
			<>
				<Card style={[styles.banner, style]}>
					<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
						<IconBadge icon={GraduationCap} />
						<View style={{ flex: 1 }}>
							<T v="strong">{tx(L.title)}</T>
							<T v="small" style={{ marginTop: 2 }}>{tx(L.promo)}</T>
						</View>
					</View>
					<Button size="md" icon={Users} title={tx(L.specify)} style={{ marginTop: 12 }} onPress={() => openFor(subjectState(data, 'math').done ? 'english' : 'math')} />
				</Card>
				{sheet}
			</>
		);
	}

	return (
		<View style={style}>
			{SUBJECTS.map((s) => {
				const st = subjectState(data, s);
				const pending = st.teacher?.status === 'pending';
				return (
					<Card key={s} style={{ marginBottom: 10, padding: 14 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
							<View style={[styles.emoji, { backgroundColor: s === 'math' ? colors.goldTint : colors.blueSoft }]}><T style={{ fontSize: 18 }}>{s === 'math' ? '📐' : '🇬🇧'}</T></View>
							<View style={{ flex: 1, gap: 3 }}>
								<T v="label" style={{ fontSize: 10 }}>{tx(L[s])}</T>
								<T v="strong" numberOfLines={1}>{label(s)}</T>
								{st.teacher?.phone ? <T v="small" style={{ fontSize: 12 }}>{st.teacher.phone}</T> : null}
								{statusPill(s) ? <View style={{ flexDirection: 'row' }}>{statusPill(s)}</View> : null}
							</View>
							<Button size="sm" variant="light" title={tx(st.done ? L.change : L.select)} onPress={() => openFor(s)} />
						</View>
						{pending ? (
							<View style={styles.confirm}>
								<T v="small" style={{ flex: 1 }}>{tx(L.isYours)}</T>
								<Button size="sm" variant="success" icon={Check} title={tx(L.yes)} loading={responding === `${s}-confirm`} disabled={!!responding} onPress={() => respond(s, 'confirm')} />
								<Button size="sm" variant="light" icon={XCircle} title={tx(L.no)} loading={responding === `${s}-reject`} disabled={!!responding} onPress={() => respond(s, 'reject')} />
							</View>
						) : null}
					</Card>
				);
			})}
			{sheet}
		</View>
	);
}

const styles = StyleSheet.create({
	banner: { borderColor: colors.goldSoft, backgroundColor: '#FFFCF1' },
	current: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	noTeacher: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	wait: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
	emoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
});
