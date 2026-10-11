import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { GraduationCap, Lock, MapPin, Phone, User, UserPlus } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader } from '../components/layout';
import { Button, Card, Field, IconBadge, SelectField, T } from '../components/ui';
import { phoneMask } from '../utils/format';

const L = {
	subtitle: { uz: "O'quvchilaringizni qo'shing, olimpiadalarga ro'yxatdan o'tkazing va tangalar to'plang", ru: 'Добавляйте учеников, регистрируйте их на олимпиады и получайте монеты', en: 'Add your students, register them for olympiads and earn coins' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	selectRegion: { uz: 'Viloyatni tanlang', ru: 'Выберите регион', en: 'Select region' },
	phone: { uz: 'Telefon raqam', ru: 'Номер телефона', en: 'Phone number' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	confirmPassword: { uz: 'Parolni tasdiqlang', ru: 'Подтвердите пароль', en: 'Confirm password' },
	submit: { uz: "Ro'yxatdan o'tish", ru: 'Зарегистрироваться', en: 'Register' },
	required: { uz: 'Majburiy maydon', ru: 'Обязательное поле', en: 'Required field' },
	passMismatch: { uz: 'Parollar mos kelmadi', ru: 'Пароли не совпадают', en: 'Passwords mismatch' },
	passTooShort: { uz: 'Kamida 6 belgi', ru: 'Мин. 6 символов', en: 'Min 6 chars' },
	success: { uz: "Muvaffaqiyatli ro'yxatdan o'tdingiz!", ru: 'Вы успешно зарегистрировались!', en: 'Successfully registered!' },
	failed: { uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' },
};

const PHONE_RE = /^\+998\d{9}$/;
const empty = { firstName: '', lastName: '', middleName: '', regionId: '', phone: '+998', password: '', confirmPassword: '' };

// Website's /register-teacher: the account is created and signed in right away.
export default function RegisterTeacherScreen() {
	const { registerTeacher, regions } = useAuth();
	const { t, tx, pick } = useLanguage();
	const toast = useToast();
	const [form, setForm] = useState(empty);
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const set = (patch) => setForm((f) => ({ ...f, ...patch }));

	const submit = async () => {
		const e = {};
		['firstName', 'lastName', 'middleName'].forEach((k) => { if (!form[k].trim()) e[k] = tx(L.required); });
		if (!form.regionId) e.regionId = tx(L.required);
		if (!PHONE_RE.test(form.phone)) e.phone = t('phoneInvalid');
		if (!form.password) e.password = tx(L.required);
		else if (form.password.length < 6) e.password = tx(L.passTooShort);
		if (!form.confirmPassword) e.confirmPassword = tx(L.required);
		else if (form.confirmPassword !== form.password) e.confirmPassword = tx(L.passMismatch);
		setErrors(e);
		if (Object.keys(e).length) return;

		setLoading(true);
		const res = await registerTeacher({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), middleName: form.middleName.trim() });
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
			<Card style={{ gap: 14, paddingVertical: 18 }}>
				<Field label={`${tx(L.lastName)} *`} icon={User} value={form.lastName} error={errors.lastName} onChangeText={(v) => set({ lastName: v })} autoCapitalize="words" autoCorrect={false} textContentType="familyName" />
				<Field label={`${tx(L.firstName)} *`} icon={User} value={form.firstName} error={errors.firstName} onChangeText={(v) => set({ firstName: v })} autoCapitalize="words" autoCorrect={false} textContentType="givenName" />
				<Field label={`${tx(L.middleName)} *`} icon={User} value={form.middleName} error={errors.middleName} onChangeText={(v) => set({ middleName: v })} autoCapitalize="words" autoCorrect={false} />
				<SelectField label={`${tx(L.region)} *`} icon={MapPin} title={tx(L.region)} value={form.regionId} placeholder={tx(L.selectRegion)} error={errors.regionId} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} onChange={(v) => set({ regionId: v })} />
				<Field label={`${tx(L.phone)} *`} icon={Phone} value={form.phone} error={errors.phone} keyboardType="phone-pad" onChangeText={(v) => set({ phone: phoneMask(v) })} textContentType="telephoneNumber" autoComplete="tel" />
				<Field label={`${tx(L.password)} *`} icon={Lock} secure autoCapitalize="none" autoCorrect={false} value={form.password} error={errors.password} onChangeText={(v) => set({ password: v })} textContentType="newPassword" />
				<Field label={`${tx(L.confirmPassword)} *`} icon={Lock} secure autoCapitalize="none" autoCorrect={false} value={form.confirmPassword} error={errors.confirmPassword} onChangeText={(v) => set({ confirmPassword: v })} textContentType="newPassword" />
			</Card>
			<Button title={tx(L.submit)} icon={UserPlus} loading={loading} onPress={submit} style={{ marginTop: 16 }} />
		</Screen>
	);
}
