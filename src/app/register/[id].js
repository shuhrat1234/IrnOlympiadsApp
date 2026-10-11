import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, ZoomIn } from 'react-native-reanimated';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, ChevronRight, Copy, Eye, EyeOff, FileText, GraduationCap, Lock, MapPin, Phone, School, User, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Card, Field, Loader, SelectField, T, Tap } from '../../components/ui';
import TeacherSearch from '../../components/TeacherSearch';
import RegionGroupsSheet from '../../components/RegionGroupsSheet';
import { PermissionSheet } from '../../components/DocumentSheets';
import { colors, fonts, gradients, radius } from '../../theme';
import { GRADES } from '../../utils/constants';

const PHONE_RE = /^\+998\d{9}$/;
const LATIN = /[^a-zA-Z'’ʻ\-\s]/g;

const phoneMask = (value) => {
	const v = value.startsWith('+998') ? value : '+998';
	return `+998${v.slice(4).replace(/\D/g, '').slice(0, 9)}`;
};

const dateMask = (value) => {
	const d = value.replace(/\D/g, '').slice(0, 8);
	let out = d.slice(0, 2);
	if (d.length > 2) out += `.${d.slice(2, 4)}`;
	if (d.length > 4) out += `.${d.slice(4, 8)}`;
	return out;
};

const validDate = (s) => {
	if (!/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return false;
	const [d, m, y] = s.split('.').map(Number);
	const dt = new Date(y, m - 1, d);
	return dt.getDate() === d && dt.getMonth() === m - 1 && y > 1900 && dt < new Date();
};

export default function RegisterScreen() {
	const { id } = useLocalSearchParams();
	const { register, regions } = useAuth();
	const { t, pick } = useLanguage();
	const toast = useToast();
	const { getOlympiad, fetchOlympiadById, registerForOlympiad } = useOlympiad();
	const oly = getOlympiad(id);
	const [step, setStep] = useState(0);
	const [form, setForm] = useState({ firstName: '', lastName: '', middleName: '', birthDate: '', regionId: '', school: '', grade: '', phone: '+998', password: '', confirmPassword: '', teacher_name: '', teacher_phone: '+998', teacherId: null });
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [showPass, setShowPass] = useState(false);
	const [showGroups, setShowGroups] = useState(true);
	const [showPermission, setShowPermission] = useState(false);

	useEffect(() => {
		if (!oly) fetchOlympiadById(id);
	}, [id]);

	// Only the regions and grades this olympiad is open for (website RegistrationPage).
	const availableRegions = useMemo(() => {
		const ids = Array.isArray(oly?.region_ids) && oly.region_ids.length ? oly.region_ids.map(Number) : (oly?.regions || []).map((r) => Number(typeof r === 'object' ? r.id : r));
		return ids.length ? regions.filter((r) => ids.includes(Number(r.id))) : regions;
	}, [regions, oly]);
	const availableGrades = useMemo(() => {
		const allowed = (oly?.grades || []).map(String);
		const list = GRADES.filter((g) => allowed.includes(g));
		return list.length ? list : GRADES;
	}, [oly]);

	const set = (key, value) => {
		setForm((p) => ({ ...p, [key]: value }));
		if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
	};

	const validateStep = (s) => {
		const e = {};
		if (s === 0) {
			if (!form.lastName.trim()) e.lastName = t('required');
			if (!form.firstName.trim()) e.firstName = t('required');
			if (!form.middleName.trim()) e.middleName = t('required');
			if (!form.birthDate) e.birthDate = t('required');
			else if (!validDate(form.birthDate)) e.birthDate = t('invalidAge');
		}
		if (s === 1) {
			if (!form.regionId) e.regionId = t('required');
			if (!form.school.trim()) e.school = t('required');
			if (!form.grade) e.grade = t('required');
		}
		if (s === 2) {
			if (!PHONE_RE.test(form.phone)) e.phone = t('invalidPhone');
			if (!form.password) e.password = t('required');
			else if (form.password.length < 6) e.password = t('passTooShort');
			if (!form.confirmPassword) e.confirmPassword = t('required');
			else if (form.confirmPassword !== form.password) e.confirmPassword = t('passMismatch');
		}
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const submit = async () => {
		if (!validateStep(2)) return;
		setLoading(true);
		const res = await register(form);
		const paidOly = Number(oly?.price) > 0;
		if (res.success) {
			const regRes = await registerForOlympiad(id, { teacher_name: form.teacher_name, teacher_phone: form.teacher_phone });
			setLoading(false);
			if (regRes.success) {
				toast.success(t('regDoneMsg'));
				if (paidOly) router.replace({ pathname: `/payment/${id}`, params: { regId: regRes.registration_id || regRes.id } });
				else setResult({ user: res.user, password: form.password, registration: regRes });
			} else if (paidOly && regRes.isAlreadyRegistered) {
				router.replace(`/payment/${id}`);
			} else {
				toast.error(regRes.error || t('registrationFailed'));
			}
			return;
		}
		setLoading(false);
		if (paidOly && /allaqachon|already|зарегистрирован|mavjud/i.test(String(res.error))) {
			router.replace(`/payment/${id}`);
			return;
		}
		const msg = res.error === 'already_registered' ? t('alreadyRegistered') : res.error === 'network' ? t('networkError') : res.error === 'registration_failed' ? t('registrationFailed') : res.error;
		setErrors({ ...(res.fields || {}) });
		toast.error(msg);
	};

	if (!oly) return <Screen header={<StackHeader />}><Loader /></Screen>;

	const copy = async (text) => {
		await Clipboard.setStringAsync(String(text));
		toast.success(t('copied'));
	};

	if (result) {
		return (
			<Screen header={<StackHeader onBack={() => router.replace('/')} />}>
				<Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center' }}>
					<LinearGradient colors={gradients.success} style={styles.doneIcon}><CheckCircle2 size={44} color="#fff" /></LinearGradient>
					<T v="display" style={{ marginTop: 16 }}>{t('regDone')}</T>
					<T v="body" style={{ textAlign: 'center', marginTop: 6 }}>{t('regDoneMsg')}</T>
				</Animated.View>
				<Card style={{ marginTop: 22, gap: 12 }}>
					<T v="small" style={{ textAlign: 'center', fontFamily: fonts.bold, color: colors.amber }}>{t('saveCredentials')}</T>
					<View style={styles.cred}>
						<View style={{ flex: 1 }}>
							<T v="label">{t('yourId')}</T>
							<T v="mono" style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>{result.user.participant_id}</T>
						</View>
						<Tap onPress={() => copy(result.user.participant_id)} style={styles.credBtn}><Copy size={17} color={colors.ink2} /></Tap>
					</View>
					<View style={styles.cred}>
						<View style={{ flex: 1 }}>
							<T v="label">{t('yourPass')}</T>
							<T v="mono" style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>{showPass ? result.password : '••••••••'}</T>
						</View>
						<Tap onPress={() => setShowPass((v) => !v)} style={styles.credBtn}>{showPass ? <EyeOff size={17} color={colors.ink2} /> : <Eye size={17} color={colors.ink2} />}</Tap>
						<Tap onPress={() => copy(result.password)} style={styles.credBtn}><Copy size={17} color={colors.ink2} /></Tap>
					</View>
				</Card>
				<View style={{ gap: 10, marginTop: 18 }}>
					<Button title={t('downloadPermission')} icon={FileText} variant="dark" onPress={() => setShowPermission(true)} />
					<Button title={t('goToDash')} iconRight={ChevronRight} onPress={() => router.replace('/')} />
				</View>
				<RegionGroupsSheet visible={showGroups} onClose={() => setShowGroups(false)} userRegion={result.user?.region} />
				<PermissionSheet visible={showPermission} onClose={() => setShowPermission(false)} reg={result.registration} oly={oly} user={result.user} />
			</Screen>
		);
	}

	const steps = [t('stepPersonal'), t('stepSchool'), t('stepAccount')];

	return (
		<Screen header={<StackHeader title={t('regTitle')} subtitle={pick(oly)} />} keyboard>
			{/* Stepper */}
			<View style={styles.stepper}>
				{steps.map((label, i) => (
					<View key={label} style={{ flex: 1, gap: 6 }}>
						<View style={[styles.stepBar, i <= step && { backgroundColor: colors.gold }]} />
						<T v="small" style={{ fontSize: 11.5, fontFamily: i === step ? fonts.extrabold : fonts.semibold, color: i <= step ? colors.ink : colors.faint }}>{`${i + 1}. ${label}`}</T>
					</View>
				))}
			</View>

			<Animated.View key={step} entering={FadeInRight.springify().damping(20)} style={{ gap: 14, marginTop: 18 }}>
				{step === 0 ? (
					<>
						<Field label={t('lastName')} icon={User} value={form.lastName} onChangeText={(v) => set('lastName', v.replace(LATIN, ''))} error={errors.lastName} hint={t('latinOnly')} autoCapitalize="words" autoCorrect={false} />
						<Field label={t('firstName')} icon={User} value={form.firstName} onChangeText={(v) => set('firstName', v.replace(LATIN, ''))} error={errors.firstName} autoCapitalize="words" autoCorrect={false} />
						<Field label={t('middleName')} icon={User} value={form.middleName} onChangeText={(v) => set('middleName', v.replace(LATIN, ''))} error={errors.middleName} autoCapitalize="words" autoCorrect={false} />
						<Field label={t('birthDate')} icon={Calendar} value={form.birthDate} onChangeText={(v) => set('birthDate', dateMask(v))} placeholder="DD.MM.YYYY" keyboardType="number-pad" error={errors.birthDate} />
					</>
				) : step === 1 ? (
					<>
						<SelectField label={t('region')} icon={MapPin} value={form.regionId} onChange={(v) => set('regionId', v)} placeholder={t('selectRegion')} error={errors.regionId} options={availableRegions.map((r) => ({ value: r.id, label: pick(r, 'name') }))} />
						<Field label={t('school')} icon={School} value={form.school} onChangeText={(v) => set('school', v)} placeholder={t('schoolPlaceholder')} error={errors.school} />
						<SelectField label={t('grade')} icon={GraduationCap} value={form.grade} onChange={(v) => set('grade', v)} placeholder={t('selectGrade')} error={errors.grade} options={availableGrades.map((g) => ({ value: g, label: g === 'KG' ? t('kindergarten') : `${g}${t('gradeSuffix')}` }))} />
						<View>
							<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{t('teacherSearchLabel')} · {t('optional')}</T>
							{form.teacherId ? (
								<View style={styles.teacher}>
									<CheckCircle2 size={18} color={colors.green} />
									<View style={{ flex: 1 }}>
										<T v="small">{t('teacherSelected')}</T>
										<T v="strong">{form.teacher_name}</T>
									</View>
									<Tap onPress={() => setForm((p) => ({ ...p, teacherId: null, teacher_name: '', teacher_phone: '+998' }))} style={styles.credBtn}><X size={16} color={colors.ink2} /></Tap>
								</View>
							) : (
								<TeacherSearch actionLabel={t('confirm')} onSelect={(tch) => setForm((p) => ({ ...p, teacherId: tch.id, teacher_name: tch.full_name, teacher_phone: tch.phone || p.teacher_phone }))} />
							)}
						</View>
					</>
				) : (
					<>
						<Field label={t('phone')} icon={Phone} value={form.phone} onChangeText={(v) => set('phone', phoneMask(v))} keyboardType="phone-pad" error={errors.phone} />
						<Field label={t('password')} icon={Lock} value={form.password} onChangeText={(v) => set('password', v)} secure error={errors.password} autoCapitalize="none" textContentType="newPassword" />
						<Field label={t('confirmPassword')} icon={Lock} value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secure error={errors.confirmPassword} autoCapitalize="none" textContentType="newPassword" />
					</>
				)}
			</Animated.View>

			<View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
				{step > 0 ? <Button title={t('prev')} icon={ArrowLeft} variant="light" size="md" style={{ flex: 1 }} onPress={() => setStep((s) => s - 1)} /> : null}
				{step < 2 ? (
					<Button title={t('next')} iconRight={ArrowRight} size="md" style={{ flex: 1.4 }} onPress={() => validateStep(step) && setStep((s) => s + 1)} />
				) : (
					<Button title={t('register')} iconRight={CheckCircle2} size="md" loading={loading} style={{ flex: 1.4 }} onPress={submit} />
				)}
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	stepper: { flexDirection: 'row', gap: 8, marginTop: 4 },
	stepBar: { height: 5, borderRadius: 3, backgroundColor: colors.bgDeep },
	doneIcon: { width: 92, height: 92, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
	cred: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	credBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	teacher: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.greenSoft },
});
