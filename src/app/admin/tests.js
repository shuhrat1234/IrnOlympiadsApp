import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, CheckCircle2, ClipboardList, Edit3, GraduationCap, ImageIcon, ImagePlus, Plus, Save, Trash2, Wifi, X } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, Pill, Sheet, T, Tap } from '../../components/ui';
import { ChoicePills, TextArea } from '../../components/form';
import { colors, radius } from '../../theme';
import { mediaUrl } from '../../api/client';
import { pickImage } from '../../utils/files';

const L = {
	title: { ru: 'Управление тестами', uz: 'Testlarni boshqarish', en: 'Test Manager' },
	subtitle: { ru: 'Вопросы и тесты для каждой олимпиады', uz: 'Har bir olimpiada uchun savollar va testlar', en: 'Questions and tests for each olympiad' },
	noTest: { ru: 'Тест не создан', uz: 'Test yaratilmagan', en: 'No test created' },
	createTest: { ru: 'Создать тест', uz: 'Test yaratish', en: 'Create Test' },
	addQuestion: { ru: 'Добавить вопрос', uz: "Savol qo'shish", en: 'Add Question' },
	editQuestion: { ru: 'Редактировать вопрос', uz: 'Savolni tahrirlash', en: 'Edit question' },
	question: { ru: 'Вопрос', uz: 'Savol', en: 'Question' },
	option: { ru: 'Вариант', uz: 'Variant', en: 'Option' },
	correctHint: { ru: 'Нажмите на букву, чтобы отметить правильный ответ', uz: "To'g'ri javobni belgilash uchun harfni bosing", en: 'Tap a letter to mark the correct answer' },
	image: { ru: 'Изображение', uz: 'Rasm', en: 'Image' },
	upload: { ru: 'Загрузить', uz: 'Yuklash', en: 'Upload' },
	save: { ru: 'Сохранить', uz: 'Saqlash', en: 'Save' },
	cancel: { ru: 'Отмена', uz: 'Bekor qilish', en: 'Cancel' },
	noQuestions: { ru: 'Нет вопросов', uz: "Savollar yo'q", en: 'No questions' },
	questions: { ru: 'вопросов', uz: 'ta savol', en: 'questions' },
	offline: { ru: 'Офлайн олимпиады не поддерживают онлайн-тестирование.', uz: 'Oflayn olimpiadalar uchun onlayn testlar mavjud emas.', en: 'Online testing is not available for offline olympiads.' },
	selectSub: { ru: 'Выберите предмет', uz: 'Fan tanlang', en: 'Select a subject' },
	selectGrade: { ru: 'Выберите класс', uz: 'Sinf tanlang', en: 'Select a grade' },
	grade: { ru: 'кл.', uz: '-sinf', en: 'gr.' },
	back: { ru: 'К списку', uz: "Ro'yxatga", en: 'Back to list' },
	subjects: { ru: 'предм.', uz: 'fan', en: 'subjects' },
	saved: { ru: 'Сохранено', uz: 'Saqlandi', en: 'Saved' },
	saveErr: { ru: 'Ошибка при сохранении', uz: 'Saqlashda xatolik', en: 'Error saving' },
	created: { ru: 'Тест создан', uz: 'Test yaratildi', en: 'Test created' },
	createErr: { ru: 'Ошибка при создании теста', uz: 'Test yaratishda xatolik', en: 'Error creating test' },
	deleted: { ru: 'Удалено', uz: "O'chirildi", en: 'Deleted' },
	confirmDelete: { ru: 'Удалить вопрос?', uz: "Savolni o'chirish?", en: 'Delete question?' },
	confirmDeleteText: { ru: 'Это действие необратимо.', uz: 'Bu amalni ortga qaytarib bo‘lmaydi.', en: 'This action cannot be undone.' },
	yesDelete: { ru: 'Да, удалить', uz: "Ha, o'chirish", en: 'Yes, delete' },
};

const blankQ = () => ({ text_uz: '', text_ru: '', text_en: '', image: null, newImage: null, removeImage: false, options: ['A', 'B', 'C', 'D'].map((id) => ({ id, text: '' })), correct_option: 'A' });

export default function TestsScreen() {
	const params = useLocalSearchParams();
	const { tx, pick } = useLanguage();
	const toast = useToast();
	const { olympiads, fetchOlympiads, createTest, saveQuestion, deleteQuestion } = useOlympiad();
	const [olyId, setOlyId] = useState(params.olyId || '');
	const [subId, setSubId] = useState('');
	const [sessionId, setSessionId] = useState('');
	const [form, setForm] = useState(null);
	const [editingId, setEditingId] = useState(null);
	const [saving, setSaving] = useState(false);
	const [toDelete, setToDelete] = useState(null);

	useEffect(() => {
		fetchOlympiads(true);
	}, []);

	const all = [...olympiads].sort((a, b) => b.id - a.id);
	const oly = all.find((o) => String(o.id) === String(olyId));
	const hasSubs = oly?.subs?.length > 0;
	const sub = oly?.subs?.find((s) => String(s.id) === String(subId));
	const session = sub?.grade_sessions?.find((g) => String(g.id) === String(sessionId));
	const test = session ? session.test : !hasSubs ? oly?.test : null;
	const questions = test?.questions ? [...test.questions].sort((a, b) => a.id - b.id) : [];

	const openForm = (q) => {
		if (q) {
			setForm({ ...blankQ(), text_uz: q.text_uz || '', text_ru: q.text_ru || '', text_en: q.text_en || '', image: q.image || null, options: q.options || blankQ().options, correct_option: q.correct_option || 'A' });
			setEditingId(q.id);
		} else {
			setForm(blankQ());
			setEditingId(null);
		}
	};

	const submit = async () => {
		setSaving(true);
		const res = await saveQuestion(test.id, editingId, form);
		setSaving(false);
		if (res.success) {
			toast.success(tx(L.saved));
			setForm(null);
		} else toast.error(tx(L.saveErr));
	};

	const newTest = async () => {
		const res = await createTest({ olympiad: olyId, sub_olympiad: subId, sub_olympiad_grade: sessionId });
		if (res.success) toast.success(tx(L.created));
		else toast.error(tx(L.createErr));
	};

	const attach = async () => {
		try {
			const img = await pickImage({ quality: 0.85 });
			if (img) setForm((p) => ({ ...p, newImage: img, image: img.uri, removeImage: false }));
		} catch {}
	};

	return (
		<Screen header={<StackHeader title={tx(L.title)} />} onRefresh={() => fetchOlympiads(true)}>
			{!oly ? (
				<>
					<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
					{all.map((o) => {
						const online = o.olympiad_type === 'online';
						const subs = o.subs?.length || 0;
						return (
							<Card key={o.id} onPress={() => { setOlyId(o.id); setSubId(''); setSessionId(''); }} style={{ marginBottom: 10, padding: 14 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
									<View style={[styles.typeIcon, { backgroundColor: online ? colors.goldTint : colors.navySoft }]}>{online ? <Wifi size={18} color={colors.amber} /> : <Building2 size={18} color={colors.navy} />}</View>
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={2}>{pick(o)}</T>
										{subs ? <T v="small" style={{ fontSize: 11.5 }}>{subs} {tx(L.subjects)}</T> : null}
									</View>
									{!online ? <Pill label="Offline" /> : subs ? <Pill label="Multi" color={colors.blue} bg={colors.blueSoft} /> : o.test ? <Pill icon={CheckCircle2} label={`${o.test.questions?.length || 0}`} color={colors.green} bg={colors.greenSoft} /> : <Pill label="—" />}
								</View>
							</Card>
						);
					})}
				</>
			) : (
				<>
					<Tap onPress={() => setOlyId('')} style={styles.back}>
						<ArrowLeft size={16} color={colors.ink2} />
						<T v="strong" style={{ fontSize: 13.5 }}>{tx(L.back)}</T>
					</Tap>
					<T v="h2" style={{ marginBottom: 14 }}>{pick(oly)}</T>
					{oly.olympiad_type === 'offline' ? <T v="small" style={{ marginBottom: 12 }}>{tx(L.offline)}</T> : null}
					{hasSubs ? (
						<View style={{ gap: 12, marginBottom: 16 }}>
							<ChoicePills value={subId} onChange={(v) => { setSubId(v); setSessionId(''); }} options={oly.subs.map((s) => ({ value: s.id, label: pick(s) }))} />
							{sub?.grade_sessions?.length ? (
								<ChoicePills value={sessionId} onChange={setSessionId} options={[...sub.grade_sessions].sort((a, b) => parseInt(a.grade, 10) - parseInt(b.grade, 10)).map((g) => ({ value: g.id, label: `${g.grade} ${tx(L.grade)}${g.test?.questions?.length ? ` · ${g.test.questions.length}` : ''}` }))} />
							) : null}
						</View>
					) : null}

					{hasSubs && !subId ? (
						<EmptyState icon={ClipboardList} title={tx(L.selectSub)} />
					) : hasSubs && !sessionId ? (
						<EmptyState icon={GraduationCap} title={tx(L.selectGrade)} />
					) : !test ? (
						<EmptyState icon={ClipboardList} title={tx(L.noTest)} action={<Button title={tx(L.createTest)} icon={Plus} onPress={newTest} />} />
					) : (
						<>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
								<T v="strong" style={{ flexGrow: 1, flexShrink: 1 }}>{questions.length} {tx(L.questions)}</T>
								<Button size="sm" icon={Plus} title={tx(L.addQuestion)} onPress={() => openForm(null)} />
							</View>
							{!questions.length ? <EmptyState icon={ClipboardList} title={tx(L.noQuestions)} /> : null}
							{questions.map((q, i) => (
								<Card key={q.id} style={{ marginBottom: 10 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
										<Pill label={`#${i + 1}`} color={colors.navyDeep} bg={colors.goldSoft} />
										{q.image ? <ImageIcon size={15} color={colors.muted} /> : null}
										<View style={{ flex: 1 }} />
										<Tap onPress={() => openForm(q)} style={styles.icon}><Edit3 size={16} color={colors.blue} /></Tap>
										<Tap onPress={() => setToDelete(q.id)} style={[styles.icon, { backgroundColor: colors.redSoft }]}><Trash2 size={16} color={colors.red} /></Tap>
									</View>
									<T v="strong" style={{ lineHeight: 21 }}>{pick(q, 'text')}</T>
									{q.image ? <Image source={{ uri: mediaUrl(q.image) }} style={styles.qImg} resizeMode="contain" /> : null}
									<View style={{ gap: 6, marginTop: 10 }}>
										{(q.options || []).map((o) => {
											const ok = o.id === q.correct_option;
											return (
												<View key={o.id} style={[styles.opt, ok && { backgroundColor: colors.goldTint, borderColor: colors.gold }]}>
													<View style={[styles.letter, ok && { backgroundColor: colors.gold }]}><T v="strong" style={{ fontSize: 12 }}>{o.id}</T></View>
													<T v="body" style={{ flex: 1, fontSize: 14, color: colors.ink }}>{o.text}</T>
													{ok ? <CheckCircle2 size={16} color={colors.goldDeep} /> : null}
												</View>
											);
										})}
									</View>
								</Card>
							))}
						</>
					)}
				</>
			)}

			<Sheet visible={!!form} onClose={() => setForm(null)} title={tx(editingId ? L.editQuestion : L.addQuestion)} scroll maxHeight="94%">
				{form ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						{['uz', 'ru', 'en'].map((lk) => (
							<TextArea key={lk} rows={3} label={`${tx(L.question)} (${lk.toUpperCase()})`} value={form[`text_${lk}`]} onChangeText={(v) => setForm((p) => ({ ...p, [`text_${lk}`]: v }))} />
						))}
						<View>
							<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.image)}</T>
							{form.image ? <Image source={{ uri: form.newImage ? form.image : mediaUrl(form.image) }} style={styles.qImg} resizeMode="contain" /> : null}
							<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
								<Button style={{ flex: 1 }} size="sm" variant="light" icon={ImagePlus} title={tx(L.upload)} onPress={attach} />
								{form.image ? <Button size="sm" variant="danger" icon={X} title="" onPress={() => setForm((p) => ({ ...p, image: null, newImage: null, removeImage: true }))} /> : null}
							</View>
						</View>
						<T v="label" style={{ marginLeft: 4 }}>{tx(L.option)} · {tx(L.correctHint)}</T>
						{form.options.map((o, idx) => (
							<View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<Tap onPress={() => setForm((p) => ({ ...p, correct_option: o.id }))} style={[styles.letterBig, form.correct_option === o.id && { backgroundColor: colors.gold, borderColor: colors.goldDeep }]}>
									<T v="strong">{o.id}</T>
								</Tap>
								<Field style={{ flex: 1 }} value={o.text} placeholder={`${tx(L.option)} ${o.id}...`} onChangeText={(v) => setForm((p) => ({ ...p, options: p.options.map((x, i) => (i === idx ? { ...x, text: v } : x)) }))} />
							</View>
						))}
						<View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
							<Button style={{ flex: 1 }} variant="light" size="md" title={tx(L.cancel)} onPress={() => setForm(null)} />
							<Button style={{ flex: 1.4 }} size="md" icon={Save} title={tx(L.save)} loading={saving} onPress={submit} />
						</View>
					</View>
				) : null}
			</Sheet>

			<Dialog
				visible={!!toDelete}
				onClose={() => setToDelete(null)}
				icon={Trash2}
				tone="red"
				title={tx(L.confirmDelete)}
				message={tx(L.confirmDeleteText)}
				actions={[
					{ title: tx(L.yesDelete), variant: 'danger', onPress: async () => { const id = toDelete; setToDelete(null); const r = await deleteQuestion(id); if (r.success) toast.success(tx(L.deleted)); else toast.error(r.error); } },
					{ title: tx(L.cancel), variant: 'ghost', onPress: () => setToDelete(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	typeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
	back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 12 },
	icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
	qImg: { width: '100%', height: 170, borderRadius: radius.md, backgroundColor: colors.cardMuted, marginTop: 10 },
	opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	letter: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	letterBig: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
});
