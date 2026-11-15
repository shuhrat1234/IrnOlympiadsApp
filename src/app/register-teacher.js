import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Check, GraduationCap, Info, Lock, MapPin, Phone, User, UserPlus } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader } from '../components/layout';
import { Button, Card, Field, IconBadge, SelectField, T, Tap } from '../components/ui';
import { colors, fonts, radius } from '../theme';
import { cleanUzPhone, cyrillicToLatin } from '../utils/format';

const L = {
	subtitle: { uz: "O'quvchilaringizni qo'shing, olimpiadalarga ro'yxatdan o'tkazing va tangalar to'plang", ru: 'Добавляйте учеников, регистрируйте их на олимпиады и получайте монеты', en: 'Add your students, register them for olympiads and earn coins' },
	latinNotice: { uz: "F.I.Sh. ma'lumotlarini lotin alifbosida kiriting", ru: 'Введите Ф.И.О. латинскими буквами', en: 'Enter full name using Latin letters' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	firstNamePlaceholder: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	lastNamePlaceholder: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	middleNamePlaceholder: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	selectRegion: { uz: 'Viloyatni tanlang', ru: 'Выберите регион', en: 'Select region' },
	subjectTitle: { uz: 'Fanlar', ru: 'Предметы', en: 'Subjects' },
	subjectRequired: { uz: 'Kamida bitta fanni tanlang', ru: 'Выберите хотя бы один предмет', en: 'Select at least one subject' },
	math: { uz: 'Matematika', ru: 'Математика', en: 'Mathematics' },
	english: { uz: 'Ingliz tili', ru: 'Английский', en: 'English' },
	science: { uz: 'Science', ru: 'Science', en: 'Science' },
	phone: { uz: 'Telefon raqam', ru: 'Номер телефона', en: 'Phone number' },
	phonePlaceholder: { uz: '+998 90 123 45 67', ru: '+998 90 123 45 67', en: '+998 90 123 45 67' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	passwordPlaceholder: { uz: 'Kamida 6 belgi', ru: 'Мин. 6 символов', en: 'Min 6 chars' },
	confirmPassword: { uz: 'Parolni tasdiqlang', ru: 'Подтвердите пароль', en: 'Confirm password' },
	confirmPasswordPlaceholder: { uz: 'Parolni tasdiqlang', ru: 'Повторите пароль', en: 'Confirm password' },
	submit: { uz: "Ro'yxatdan o'tish", ru: 'Зарегистрироваться', en: 'Register' },
	required: { uz: 'Majburiy maydon', ru: 'Обязательное поле', en: 'Required field' },
	passMismatch: { uz: 'Parollar mos kelmadi', ru: 'Пароли не совпадают', en: 'Passwords mismatch' },
	passTooShort: { uz: 'Kamida 6 belgi', ru: 'Мин. 6 символов', en: 'Min 6 chars' },
	success: { uz: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", ru: 'Вы успешно зарегистрировались!', en: 'Successfully registered!' },
	failed: { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' },
};

const PHONE_RE = /^\+998\d{9}$/;
const empty = { firstName: '', lastName: '', middleName: '', regionId: '', phone: '+998', password: '', confirmPassword: '', subjects: ['math'] };

export default function RegisterTeacherScreen() {
	const { registerTeacher, regions } = useAuth();
	const { t, tx, pick } = useLanguage();
	const toast = useToast();
	const [form, setForm] = useState(empty);
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const set = (patch) => setForm((f) => ({ ...f, ...patch }));

	const toggleSubject = (sub) => {
		setForm((prev) => {
			const has = prev.subjects.includes(sub);
			if (has && prev.subjects.length === 1) return prev; // Keep at least one
			const next = has ? prev.subjects.filter((s) => s !== sub) : [...prev.subjects, sub];
			return { ...prev, subjects: next };
		});
		if (errors.subjects) setErrors((prev) => ({ ...prev, subjects: undefined }));
	};

	const submit = async () => {
		const e = {};
		['firstName', 'lastName', 'middleName'].forEach((k) => { if (!form[k].trim()) e[k] = tx(L.required); });
		if (!form.regionId) e.regionId = tx(L.required);
		if (!form.subjects || form.subjects.length === 0) e.subjects = tx(L.subjectRequired);
		if (!PHONE_RE.test(form.phone)) e.phone = t('phoneInvalid');
		if (!form.password) e.password = tx(L.required);
		else if (form.password.length < 6) e.password = tx(L.passTooShort);
		if (!form.confirmPassword) e.confirmPassword = tx(L.required);
		else if (form.confirmPassword !== form.password) e.confirmPassword = tx(L.passMismatch);
		setErrors(e);
		if (Object.keys(e).length) return;

		setLoading(true);
		const res = await registerTeacher({
			...form,
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			middleName: form.middleName.trim(),
			subject_roles: form.subjects,
		});
		setLoading(false);
		if (res.success) {
			toast.success(tx(L.success));
			router.replace(res.loggedIn ? '/teacher' : '/login');
			return;
		}
		// DRF field errors come back as { field: [message] }.
		const f = res.fields;
		const first = f && typeof f === 'object' ? Object.values(f).flat().find((m) => typeof m === 'string') : null;
		toast.error(res.error === 'network' ? t('networkError') : first || tx(L.failed));
	};

	return (
		<Screen header={<StackHeader title={t('teacherSignup')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />} keyboard>
			<View style={{ alignItems: 'center', gap: 10, marginBottom: 18 }}>
				<IconBadge icon={GraduationCap} size={64} />
				<T v="body" style={{ textAlign: 'center', paddingHorizontal: 10 }}>{tx(L.subtitle)}</T>
			</View>
			<Card style={styles.formCard}>
				<View style={styles.latinNotice}>
					<Info size={14} color={colors.amber} />
					<T v="small" style={{ color: colors.ink, fontSize: 11.5, flex: 1, fontFamily: fonts.medium }}>
						{tx(L.latinNotice)}
					</T>
				</View>
				<Field
					label={`${tx(L.lastName)} *`}
					icon={User}
					value={form.lastName}
					placeholder={tx(L.lastNamePlaceholder)}
					error={errors.lastName}
					onChangeText={(v) => set({ lastName: cyrillicToLatin(v) })}
					autoCapitalize="words"
					autoCorrect={false}
					textContentType="familyName"
				/>
				<Field
					label={`${tx(L.firstName)} *`}
					icon={User}
					value={form.firstName}
					placeholder={tx(L.firstNamePlaceholder)}
					error={errors.firstName}
					onChangeText={(v) => set({ firstName: cyrillicToLatin(v) })}
					autoCapitalize="words"
					autoCorrect={false}
					textContentType="givenName"
				/>
				<Field
					label={`${tx(L.middleName)} *`}
					icon={User}
					value={form.middleName}
					placeholder={tx(L.middleNamePlaceholder)}
					error={errors.middleName}
					onChangeText={(v) => set({ middleName: cyrillicToLatin(v) })}
					autoCapitalize="words"
					autoCorrect={false}
				/>
				<SelectField
					label={`${tx(L.region)} *`}
					icon={MapPin}
					title={tx(L.region)}
					value={form.regionId}
					placeholder={tx(L.selectRegion)}
					error={errors.regionId}
					options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))}
					onChange={(v) => set({ regionId: v })}
				/>

				{/* Subjects selection */}
				<View style={{ gap: 6 }}>
					<T v="label" style={{ marginBottom: 2, marginLeft: 2, color: colors.ink2 }}>{tx(L.subjectTitle)} *</T>
					<View style={{ flexDirection: 'row', gap: 8 }}>
						{[
							{ id: 'math', icon: '📐', label: tx(L.math) },
							{ id: 'english', icon: '🇬🇧', label: tx(L.english) },
							{ id: 'science', icon: '🔬', label: tx(L.science) },
						].map((item) => {
							const isSel = form.subjects.includes(item.id);
							return (
								<Tap
									key={item.id}
									onPress={() => toggleSubject(item.id)}
									style={[styles.subjectBtn, isSel && styles.subjectBtnActive]}
								>
									<T style={{ fontSize: 15 }}>{item.icon}</T>
									<T v="strong" numberOfLines={1} style={{ fontSize: 12, flexShrink: 1 }} color={isSel ? colors.navyDeep : colors.ink2}>
										{item.label}
									</T>
									{isSel ? <Check size={14} color={colors.goldDeep} /> : null}
								</Tap>
							);
						})}
					</View>
					{errors.subjects ? <T v="small" color={colors.red}>{errors.subjects}</T> : null}
				</View>

				<Field
					label={`${tx(L.phone)} *`}
					icon={Phone}
					value={form.phone}
					placeholder={tx(L.phonePlaceholder)}
					error={errors.phone}
					keyboardType="phone-pad"
					onChangeText={(v) => set({ phone: cleanUzPhone(v) })}
					textContentType="telephoneNumber"
					autoComplete="tel"
				/>
				<Field
					label={`${tx(L.password)} *`}
					icon={Lock}
					placeholder={tx(L.passwordPlaceholder)}
					secure
					autoCapitalize="none"
					autoCorrect={false}
					value={form.password}
					error={errors.password}
					onChangeText={(v) => set({ password: v })}
					textContentType="newPassword"
				/>
				<Field
					label={`${tx(L.confirmPassword)} *`}
					icon={Lock}
					placeholder={tx(L.confirmPasswordPlaceholder)}
					secure
					autoCapitalize="none"
					autoCorrect={false}
					value={form.confirmPassword}
					error={errors.confirmPassword}
					onChangeText={(v) => set({ confirmPassword: v })}
					textContentType="newPassword"
				/>
			</Card>
			<Button title={tx(L.submit)} icon={UserPlus} loading={loading} onPress={submit} style={{ marginTop: 20 }} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	formCard: {
		gap: 14,
		padding: 18,
		borderRadius: 20,
		backgroundColor: colors.white,
		borderWidth: 1.2,
		borderColor: '#E2E8F0',
	},
	latinNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 9,
		backgroundColor: colors.goldTint,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.goldSoft,
		marginBottom: 4,
	},
	subjectBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingHorizontal: 6,
		paddingVertical: 10,
		borderRadius: radius.md,
		borderWidth: 1.2,
		borderColor: colors.line,
		backgroundColor: colors.white,
	},
	subjectBtnActive: {
		borderColor: colors.gold,
		backgroundColor: colors.goldTint,
	},
});
