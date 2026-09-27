import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronDown, ChevronRight, Clock, GraduationCap, ImagePlus, Plus, Save, Settings2, Trash2, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { useWebEngine } from '../../components/WebEngine';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Field, SelectField, T, Tap } from '../../components/ui';
import { ChipsSelect, ChoicePills, DateTimeField, FormSection, NumberField, SwitchRow, TextArea, errorText } from '../../components/form';
import CertificateBuilder, { FULL_DEFAULT_CERT_CONFIG } from '../../components/admin/CertificateBuilder';
import { colors, radius } from '../../theme';
import { mediaUrl } from '../../api/client';
import { pickImage } from '../../utils/files';

const ALL_GRADES = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

const L = {
	createTitle: { ru: 'Создание олимпиады', uz: 'Olimpiada yaratish', en: 'Create Olympiad' },
	editTitle: { ru: 'Редактирование олимпиады', uz: 'Olimpiadani tahrirlash', en: 'Edit Olympiad' },
	save: { ru: 'Сохранить', uz: 'Saqlash', en: 'Save' },
	titles: { ru: 'Названия и описания', uz: 'Nom va tavsiflar', en: 'Titles & Descriptions' },
	settings: { ru: 'Настройки', uz: 'Sozlamalar', en: 'Settings' },
	subjects: { ru: 'Предметы и расписание', uz: 'Fanlar va jadval', en: 'Subjects & Schedule' },
	title: { ru: 'Название', uz: 'Nomi', en: 'Title' },
	desc: { ru: 'Описание', uz: 'Tavsif', en: 'Description' },
	category: { ru: 'Группа/бренд', uz: 'Guruh/brend', en: 'Group/Brand' },
	categoryHint: { ru: 'Олимпиады с одинаковой группой показываются вместе. Пусто — первое слово названия.', uz: "Bir xil guruhdagi olimpiadalar birga ko'rsatiladi. Bo'sh — nomning birinchi so'zi.", en: 'Olympiads sharing a group are shown together. Empty = first word of the title.' },
	banner: { ru: 'Баннер олимпиады', uz: 'Olimpiada banneri', en: 'Olympiad banner' },
	uploadBanner: { ru: 'Загрузить баннер', uz: 'Banner yuklash', en: 'Upload banner' },
	bannerHint: { ru: 'Широкое соотношение, например 1200×400.', uz: 'Keng nisbat, masalan 1200×400.', en: 'Wide ratio, e.g. 1200×400.' },
	type: { ru: 'Тип', uz: 'Turi', en: 'Type' },
	online: { ru: 'Онлайн', uz: 'Onlayn', en: 'Online' },
	offline: { ru: 'Офлайн', uz: 'Oflayn', en: 'Offline' },
	price: { ru: 'Цена (UZS)', uz: 'Narxi (UZS)', en: 'Price (UZS)' },
	free: { ru: 'Бесплатно', uz: 'Bepul', en: 'Free' },
	maxPart: { ru: 'Макс. участников (0 = без лимита)', uz: 'Maks qatnashchilar (0 = cheksiz)', en: 'Max participants (0 = unlimited)' },
	regEnd: { ru: 'Дата окончания регистрации', uz: "Ro'yxat tugash sanasi", en: 'Registration end date' },
	sms: { ru: 'Авто-SMS о неоплаченной регистрации', uz: "To'lanmagan ro'yxat uchun avto-SMS", en: 'Auto-SMS for unpaid registrations' },
	smsHint: { ru: 'Каждые 6 часов SMS тем, кто не оплатил, пока регистрация открыта.', uz: "Registratsiya ochiq bo'lguncha har 6 soatda to'lamaganlarga SMS.", en: 'Every 6 hours to unpaid users while registration is open.' },
	uniqueId: { ru: 'Генерировать уникальный ID', uz: 'Noyob ID yaratish', en: 'Generate unique ID' },
	prefix: { ru: 'Префикс ID (A-Z)', uz: 'ID prefiksi (A-Z)', en: 'ID prefix (A-Z)' },
	regions: { ru: 'Регионы', uz: 'Viloyatlar', en: 'Regions' },
	all: { ru: 'Все', uz: 'Hammasi', en: 'All' },
	none: { ru: 'Убрать все', uz: 'Hammasini olib tashlash', en: 'Deselect all' },
	addSubject: { ru: 'Добавить предмет', uz: "Fan qo'shish", en: 'Add subject' },
	subjectName: { ru: 'Название предмета', uz: 'Fan nomi', en: 'Subject name' },
	noSubjects: { ru: 'Нет предметов. Добавьте хотя бы один предмет с расписанием по классам.', uz: "Fanlar yo'q. Kamida bitta fan qo'shing.", en: 'No subjects yet. Add at least one.' },
	gradeSchedule: { ru: 'Расписание по классам', uz: "Sinf bo'yicha jadval", en: 'Grade schedule' },
	addGrade: { ru: 'Добавить класс', uz: "Sinf qo'shish", en: 'Add grade' },
	allGrades: { ru: 'Все классы', uz: 'Barcha sinflar', en: 'All grades' },
	grade: { ru: 'Класс', uz: 'Sinf', en: 'Grade' },
	start: { ru: 'Время начала', uz: 'Boshlanish vaqti', en: 'Start time' },
	duration: { ru: 'Длительность (мин)', uz: 'Davomiyligi (daq)', en: 'Duration (min)' },
	soon: { ru: 'Скоро (дата не определена)', uz: 'Tez orada (sana aniqlanmagan)', en: 'Soon (date TBD)' },
	noGrades: { ru: 'Добавьте расписание для каждого класса', uz: 'Har bir sinf uchun jadval kiriting', en: 'Add a schedule for each grade' },
	saved: { ru: 'Сохранено!', uz: 'Saqlandi!', en: 'Saved!' },
	error: { ru: 'Ошибка', uz: 'Xatolik', en: 'Error' },
};

const key = () => Math.random().toString(36).slice(2);
const emptySession = (grade = '') => ({ _key: key(), grade, start_datetime: '', duration_minutes: 60, is_tbd: false });
const emptySubject = () => ({ _key: key(), title_ru: '', title_uz: '', title_en: '', grade_sessions: [] });
const safeISO = (d) => {
	if (!d) return null;
	const p = new Date(d);
	return isNaN(p.getTime()) ? null : p.toISOString();
};
const numId = (k) => (k !== undefined && k !== null && !isNaN(k) ? parseInt(k, 10) : undefined);
const testId = (t) => (t?.id ? parseInt(t.id, 10) : typeof t === 'number' ? t : typeof t === 'string' && !isNaN(t) ? parseInt(t, 10) : undefined);

const emptyForm = () => ({
	title_ru: '', title_uz: '', title_en: '', category: '',
	banner_image: undefined, bannerPreview: '',
	certificate_image: undefined, certificatePreview: '',
	certificate_config: FULL_DEFAULT_CERT_CONFIG,
	description_ru: '', description_uz: '', description_en: '',
	type: 'online', price: 0, is_free: false, registration_end_date: '',
	payment_reminder_sms_enabled: false, max_participants: 0,
	generate_unique_id: false, unique_id_prefix: '', region_ids: [], subs: [],
});

export default function OlympiadForm() {
	const { id } = useLocalSearchParams();
	const { tx, lang, pick } = useLanguage();
	const { regions } = useAuth();
	const toast = useToast();
	const engine = useWebEngine();
	const { olympiads, createOlympiad, updateOlympiad } = useOlympiad();
	const [form, setForm] = useState(emptyForm());
	const [open, setOpen] = useState({});
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!id) return;
		const oly = olympiads.find((o) => String(o.id) === String(id));
		if (!oly) return;
		setForm({
			...emptyForm(),
			title_ru: oly.title_ru || '', title_uz: oly.title_uz || '', title_en: oly.title_en || '',
			category: oly.category || '',
			bannerPreview: oly.banner_image ? mediaUrl(oly.banner_image) : '',
			certificatePreview: oly.certificate_image ? mediaUrl(oly.certificate_image) : '',
			certificate_config: oly.certificate_config && Object.keys(oly.certificate_config).length ? oly.certificate_config : FULL_DEFAULT_CERT_CONFIG,
			description_ru: oly.description_ru || '', description_uz: oly.description_uz || '', description_en: oly.description_en || '',
			type: oly.olympiad_type || 'online', price: oly.price || 0, is_free: oly.is_free || false,
			registration_end_date: oly.registration_end_date || '',
			payment_reminder_sms_enabled: oly.payment_reminder_sms_enabled || false,
			max_participants: oly.max_participants || 0,
			generate_unique_id: oly.generate_unique_id || false, unique_id_prefix: oly.unique_id_prefix || '',
			region_ids: oly.region_ids || [],
			subs: (oly.subs || []).map((sub) => ({ ...sub, _key: sub.id, grade_sessions: (sub.grade_sessions || []).map((gs) => ({ ...gs, _key: gs.id, start_datetime: gs.start_datetime || '', is_tbd: !gs.start_datetime })) })),
		});
		setOpen((oly.subs || []).reduce((a, s) => ({ ...a, [s.id]: true }), {}));
	}, [id, olympiads.length]);

	const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
	const updSub = (k, field, v) => setForm((p) => ({ ...p, subs: p.subs.map((s) => (s._key === k ? { ...s, [field]: v } : s)) }));
	const updSession = (sk, gk, patch) => setForm((p) => ({ ...p, subs: p.subs.map((s) => (s._key === sk ? { ...s, grade_sessions: s.grade_sessions.map((g) => (g._key === gk ? { ...g, ...patch } : g)) } : s)) }));
	const addSessions = (sk, grades) => setForm((p) => ({ ...p, subs: p.subs.map((s) => (s._key === sk ? { ...s, grade_sessions: [...s.grade_sessions, ...grades.map(emptySession)] } : s)) }));
	const removeSession = (sk, gk) => setForm((p) => ({ ...p, subs: p.subs.map((s) => (s._key === sk ? { ...s, grade_sessions: s.grade_sessions.filter((g) => g._key !== gk) } : s)) }));

	const uploadBanner = async () => {
		try {
			const img = await pickImage({ base64: true, quality: 0.9 });
			if (!img) return;
			const res = await engine.compressImage(`data:${img.mimeType};base64,${img.base64}`, 1600, 0.85);
			setForm((p) => ({ ...p, banner_image: res.dataUrl, bannerPreview: res.dataUrl }));
		} catch {
			toast.error(tx(L.error));
		}
	};

	const save = async () => {
		setSaving(true);
		const { bannerPreview, certificatePreview, certificate_image: certImg, ...rest } = form;
		const payload = {
			...rest,
			certificate_config: form.certificate_config,
			olympiad_type: form.type || 'online',
			registration_end_date: safeISO(form.registration_end_date),
			subs: form.subs.map((sub) => ({
				id: numId(sub._key),
				title_ru: sub.title_ru,
				title_uz: sub.title_uz,
				title_en: sub.title_en,
				test: testId(sub.test),
				grade_sessions: sub.grade_sessions
					.filter((gs) => gs.grade && (gs.start_datetime || gs.is_tbd))
					.map((gs) => ({ id: numId(gs._key), grade: String(gs.grade), start_datetime: gs.start_datetime ? safeISO(gs.start_datetime) : null, duration_minutes: parseInt(gs.duration_minutes, 10) || 60, test: testId(gs.test) })),
			})),
		};
		if (form.banner_image === undefined) delete payload.banner_image;
		if (typeof certImg === 'string' && !certImg.startsWith('data:')) payload.certificate_image = certImg;
		else if (certImg === null) payload.certificate_image = null;
		const res = id ? await updateOlympiad(id, payload) : await createOlympiad(payload);
		setSaving(false);
		if (res.success) {
			toast.success(tx(L.saved));
			router.back();
		} else {
			toast.error(`${tx(L.error)}: ${errorText(res.raw || res.error)}`);
		}
	};

	const gradeLabel = (g) => (g === 'KG' ? (lang === 'ru' ? 'Детский сад' : lang === 'uz' ? "Bog'cha" : 'Kindergarten') : `${g} ${lang === 'ru' ? 'кл.' : lang === 'uz' ? '-sinf' : 'gr.'}`);

	return (
		<Screen header={<StackHeader title={tx(id ? L.editTitle : L.createTitle)} right={<Button size="sm" icon={Save} title={tx(L.save)} loading={saving} onPress={save} />} />} keyboard>
			<FormSection icon={BookOpen} title={tx(L.titles)}>
				{['uz', 'ru', 'en'].map((lk) => (
					<Field key={lk} label={`${tx(L.title)} (${lk.toUpperCase()})`} value={form[`title_${lk}`]} onChangeText={(v) => set(`title_${lk}`, v)} />
				))}
				<Field label={tx(L.category)} value={form.category} onChangeText={(v) => set('category', v)} placeholder="MOCK, XPERTSTEM..." hint={tx(L.categoryHint)} autoCapitalize="characters" />
				<View>
					<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.banner)}</T>
					{form.bannerPreview ? <Image source={{ uri: form.bannerPreview }} style={styles.banner} resizeMode="cover" /> : null}
					<View style={{ flexDirection: 'row', gap: 8, marginTop: form.bannerPreview ? 10 : 0 }}>
						<Button style={{ flex: 1 }} size="sm" variant="light" icon={ImagePlus} title={tx(L.uploadBanner)} onPress={uploadBanner} />
						{form.bannerPreview ? <Button size="sm" variant="danger" icon={Trash2} title="" onPress={() => setForm((p) => ({ ...p, banner_image: null, bannerPreview: '' }))} /> : null}
					</View>
					<T v="small" style={{ marginTop: 6, marginLeft: 4 }}>{tx(L.bannerHint)}</T>
				</View>
				{['uz', 'ru', 'en'].map((lk) => (
					<TextArea key={lk} label={`${tx(L.desc)} (${lk.toUpperCase()})`} value={form[`description_${lk}`]} onChangeText={(v) => set(`description_${lk}`, v)} />
				))}
			</FormSection>

			<FormSection icon={Settings2} title={tx(L.settings)}>
				<View>
					<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.type)}</T>
					<ChoicePills value={form.type} onChange={(v) => set('type', v)} options={[{ value: 'online', label: tx(L.online) }, { value: 'offline', label: tx(L.offline) }]} />
				</View>
				<SwitchRow label={tx(L.free)} value={form.is_free} onChange={(v) => setForm((p) => ({ ...p, is_free: v, price: v ? 0 : p.price }))} />
				{!form.is_free ? <NumberField label={tx(L.price)} value={form.price} onChange={(v) => set('price', parseInt(v, 10) || 0)} placeholder="50000" /> : null}
				<NumberField label={tx(L.maxPart)} value={form.max_participants} onChange={(v) => set('max_participants', parseInt(v, 10) || 0)} />
				<DateTimeField label={tx(L.regEnd)} value={form.registration_end_date} onChange={(v) => set('registration_end_date', v)} />
				<SwitchRow label={tx(L.sms)} hint={tx(L.smsHint)} value={form.payment_reminder_sms_enabled} onChange={(v) => set('payment_reminder_sms_enabled', v)} />
				<SwitchRow label={tx(L.uniqueId)} value={form.generate_unique_id} onChange={(v) => set('generate_unique_id', v)} />
				{form.generate_unique_id ? <Field label={tx(L.prefix)} value={form.unique_id_prefix} onChangeText={(v) => set('unique_id_prefix', v.replace(/[^a-zA-Z]/g, '').toUpperCase())} placeholder="TALANT" autoCapitalize="characters" /> : null}
				<ChipsSelect label={tx(L.regions)} allLabel={tx(L.all)} noneLabel={tx(L.none)} value={form.region_ids} onChange={(v) => set('region_ids', v)} options={regions.map((r) => ({ value: r.id, label: pick(r, 'name') }))} />
			</FormSection>

			<FormSection icon={GraduationCap} title={tx(L.subjects)} right={<Button size="sm" variant="soft" icon={Plus} title={tx(L.addSubject)} onPress={() => { const s = emptySubject(); setForm((p) => ({ ...p, subs: [...p.subs, s] })); setOpen((o) => ({ ...o, [s._key]: true })); }} />}>
				{!form.subs.length ? <T v="small">{tx(L.noSubjects)}</T> : null}
				{form.subs.map((sub) => {
					const expanded = open[sub._key];
					const existing = sub.grade_sessions.map((g) => String(g.grade));
					return (
						<View key={sub._key} style={styles.sub}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<Tap onPress={() => setOpen((o) => ({ ...o, [sub._key]: !o[sub._key] }))} style={styles.iconBtn}>{expanded ? <ChevronDown size={18} color={colors.ink} /> : <ChevronRight size={18} color={colors.ink} />}</Tap>
								<T v="strong" style={{ flex: 1 }} numberOfLines={1}>{sub.title_uz || sub.title_ru || sub.title_en || tx(L.subjectName)}</T>
								<Tap onPress={() => setForm((p) => ({ ...p, subs: p.subs.filter((s) => s._key !== sub._key) }))} style={[styles.iconBtn, { backgroundColor: colors.redSoft }]}><X size={16} color={colors.red} /></Tap>
							</View>
							{expanded ? (
								<View style={{ gap: 10, marginTop: 12 }}>
									{['uz', 'ru', 'en'].map((lk) => (
										<Field key={lk} value={sub[`title_${lk}`]} onChangeText={(v) => updSub(sub._key, `title_${lk}`, v)} placeholder={`${tx(L.subjectName)} (${lk.toUpperCase()})`} />
									))}
									<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
										<T v="label">{tx(L.gradeSchedule)}</T>
										<View style={{ flexDirection: 'row', gap: 6 }}>
											<Button size="sm" variant="light" title={tx(L.allGrades)} onPress={() => addSessions(sub._key, ALL_GRADES.filter((g) => !existing.includes(g)))} />
											<Button size="sm" variant="soft" icon={Plus} title={tx(L.addGrade)} onPress={() => addSessions(sub._key, [''])} />
										</View>
									</View>
									{!sub.grade_sessions.length ? <T v="small">{tx(L.noGrades)}</T> : null}
									{[...sub.grade_sessions].sort((a, b) => (parseInt(a.grade, 10) || 0) - (parseInt(b.grade, 10) || 0)).map((gs) => (
										<View key={gs._key} style={styles.session}>
											<View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
												<View style={{ flex: 1.2 }}>
													<SelectField label={tx(L.grade)} value={gs.grade} onChange={(v) => updSession(sub._key, gs._key, { grade: v })} placeholder="—" options={ALL_GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))} />
												</View>
												<View style={{ flex: 1 }}>
													<NumberField label={tx(L.duration)} value={gs.duration_minutes} onChange={(v) => updSession(sub._key, gs._key, { duration_minutes: v })} />
												</View>
												<Tap onPress={() => removeSession(sub._key, gs._key)} style={[styles.iconBtn, { backgroundColor: colors.redSoft, marginBottom: 8 }]}><X size={16} color={colors.red} /></Tap>
											</View>
											{gs.is_tbd ? (
												<Tap onPress={() => updSession(sub._key, gs._key, { is_tbd: false })} style={styles.tbd}>
													<Clock size={15} color={colors.amber} />
													<T v="strong" color={colors.amber} style={{ fontSize: 13.5 }}>{tx(L.soon)}</T>
												</Tap>
											) : (
												<View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
													<View style={{ flex: 1 }}>
														<DateTimeField label={tx(L.start)} value={gs.start_datetime} onChange={(v) => updSession(sub._key, gs._key, { start_datetime: v })} clearable={false} />
													</View>
													<Tap onPress={() => updSession(sub._key, gs._key, { is_tbd: true, start_datetime: '' })} style={[styles.iconBtn, { marginBottom: 9, backgroundColor: colors.goldTint }]}><Clock size={16} color={colors.amber} /></Tap>
												</View>
											)}
										</View>
									))}
								</View>
							) : null}
						</View>
					);
				})}
			</FormSection>

			<CertificateBuilder
				certificatePreview={form.certificatePreview}
				config={form.certificate_config}
				onChange={(cfg) => set('certificate_config', cfg)}
				onImageChange={(img) => set('certificatePreview', img)}
				olympiadId={id}
				olympiadTitle={form.title_uz || form.title_ru || form.title_en}
			/>

			<Button title={tx(L.save)} icon={Save} loading={saving} onPress={save} style={{ marginTop: 4 }} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	banner: { width: '100%', height: 110, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	sub: { padding: 12, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	session: { gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	tbd: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.goldTint, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold },
});
