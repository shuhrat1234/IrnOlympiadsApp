import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';
import {
	ArrowLeft,
	ArrowRight,
	Calculator,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Copy,
	Eye,
	EyeOff,
	FileText,
	FlaskConical,
	GraduationCap,
	Info,
	Languages,
	Laptop,
	Lock,
	MapPin,
	Phone,
	School,
	Star,
	Trophy,
	User,
	X
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Card, Field, Loader, SelectField, T, Tap } from '../../components/ui';
import TeacherSearch from '../../components/TeacherSearch';
import RegionGroupsSheet from '../../components/RegionGroupsSheet';
import { PermissionSheet } from '../../components/DocumentSheets';
import OlympiadBanner from '../../components/OlympiadBanner';
import { colors, fonts, radius } from '../../theme';
import { GRADES } from '../../utils/constants';
import { cleanUzPhone, cyrillicToLatin, formatMoney, getOlympiadBannerSource } from '../../utils/format';

const PHONE_RE = /^\+998\d{9}$/;
const LATIN_CLEAN = /[^a-zA-Z'’ʻ\-\s]/g;
const toLatinName = (v) => cyrillicToLatin(v).replace(LATIN_CLEAN, '');

const phoneMask = (value) => cleanUzPhone(value);

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
	const { currentUser, register, regions } = useAuth();
	const { t, pick } = useLanguage();
	const toast = useToast();
	const { olympiads, getOlympiad, fetchOlympiadById, registerForOlympiad } = useOlympiad();

	// Primary and companion subject state (website 1:1 parity)
	const [primaryOlyId, setPrimaryOlyId] = useState(Number(id));
	const [selectedCompanionIds, setSelectedCompanionIds] = useState([]);

	const effectivePrimaryId = primaryOlyId || Number(id);
	const oly = getOlympiad(effectivePrimaryId) || getOlympiad(id);

	const [step, setStep] = useState(0);
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		middleName: '',
		birthDate: '',
		regionId: '',
		school: '',
		grade: '',
		phone: '+998',
		password: '',
		confirmPassword: '',
		teacher_name: '',
		teacher_phone: '+998',
		teacherId: null
	});
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [showPass, setShowPass] = useState(false);
	const [showGroups, setShowGroups] = useState(true);
	const [showPermission, setShowPermission] = useState(false);

	useEffect(() => {
		if (!oly) fetchOlympiadById(effectivePrimaryId || id);
	}, [effectivePrimaryId, id]);

	// Prefill if student is already logged in
	useEffect(() => {
		if (currentUser) {
			setForm((p) => ({
				...p,
				firstName: p.firstName || currentUser.first_name || '',
				lastName: p.lastName || currentUser.last_name || '',
				middleName: p.middleName || currentUser.middle_name || '',
				birthDate: p.birthDate || (currentUser.birth_date ? currentUser.birth_date.split('-').reverse().join('.') : ''),
				regionId: p.regionId || (currentUser.region?.id ? currentUser.region.id : currentUser.region || ''),
				school: p.school || currentUser.school || '',
				grade: p.grade || (currentUser.grade ? String(currentUser.grade) : ''),
				phone: p.phone && p.phone !== '+998' ? p.phone : currentUser.phone || '+998'
			}));
		}
	}, [currentUser]);

	// Cohort olympiads: matching category or type to allow picking companion subjects
	const cohortOlympiads = useMemo(() => {
		const baseOly = oly || getOlympiad(effectivePrimaryId);
		if (!baseOly || !olympiads || olympiads.length === 0) {
			return baseOly ? [baseOly] : [];
		}
		return olympiads.filter((o) => {
			if (o.is_active === false) return false;
			if (baseOly.category && o.category) {
				return o.category.toLowerCase().trim() === baseOly.category.toLowerCase().trim();
			}
			return (o.olympiad_type || o.type) === (baseOly.olympiad_type || baseOly.type);
		});
	}, [oly, effectivePrimaryId, olympiads, getOlympiad]);

	// Total registration price including selected companions
	const totalRegistrationPrice = useMemo(() => {
		const base = Number(oly?.price) || 0;
		const companions = (cohortOlympiads || [])
			.filter((c) => selectedCompanionIds.includes(Number(c.id)) && Number(c.id) !== Number(effectivePrimaryId))
			.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
		return base + companions;
	}, [oly, cohortOlympiads, selectedCompanionIds, effectivePrimaryId]);

	const handleSetPrimary = (targetOly) => {
		if (!targetOly) return;
		const targetId = Number(targetOly.id);
		setPrimaryOlyId(targetId);
		setSelectedCompanionIds((prev) => prev.filter((cid) => Number(cid) !== targetId));
	};

	const handleToggleCompanion = (targetOly) => {
		if (!targetOly) return;
		const targetId = Number(targetOly.id);
		setSelectedCompanionIds((prev) => {
			if (prev.includes(targetId)) {
				return prev.filter((cid) => Number(cid) !== targetId);
			} else {
				return [...prev, targetId];
			}
		});
	};

	const handleMakeCompanionPrimary = (targetOly) => {
		if (!targetOly) return;
		const targetId = Number(targetOly.id);
		const oldPrimaryId = Number(effectivePrimaryId);
		setPrimaryOlyId(targetId);
		setSelectedCompanionIds((prev) => {
			const withoutTarget = prev.filter((cid) => Number(cid) !== targetId);
			if (oldPrimaryId && oldPrimaryId !== targetId && !withoutTarget.includes(oldPrimaryId)) {
				return [...withoutTarget, oldPrimaryId];
			}
			return withoutTarget;
		});
	};

	const renderSubjectIcon = (title = '') => {
		const s = String(title).toLowerCase();
		if (s.includes('ingliz') || s.includes('english') || s.includes('англ')) {
			return <Languages size={17} color="#2563EB" />;
		}
		if (s.includes('matematika') || s.includes('math') || s.includes('мат')) {
			return <Calculator size={17} color={colors.amber} />;
		}
		if (s.includes('tabiiy') || s.includes('science') || s.includes('наука') || s.includes('естествознание')) {
			return <FlaskConical size={17} color="#059669" />;
		}
		if (s.includes('it') || s.includes('coding') || s.includes('информатика') || s.includes('программир')) {
			return <Laptop size={17} color="#0891B2" />;
		}
		return <Trophy size={17} color={colors.gold} />;
	};

	// Only the regions and grades this olympiad is open for
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
		if (s === 2 && !currentUser) {
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
		const lastStep = currentUser ? 1 : 2;
		if (!validateStep(lastStep)) return;
		setLoading(true);

		const cleanCompanionIds = selectedCompanionIds.filter((cid) => Number(cid) !== Number(effectivePrimaryId));
		const teacherPayload = {
			teacher_name: form.teacher_name,
			teacher_phone: form.teacher_phone,
			additional_olympiad_ids: cleanCompanionIds
		};
		const isPaid = totalRegistrationPrice > 0;

		// 1. Logged in student
		if (currentUser) {
			const regRes = await registerForOlympiad(effectivePrimaryId, teacherPayload);
			setLoading(false);
			if (regRes.success) {
				toast.success(t('regDoneMsg'));
				if (regRes.group_payment_id) {
					router.replace({ pathname: `/payment/${effectivePrimaryId}`, params: { group_id: regRes.group_payment_id, total: regRes.total_price } });
				} else if (isPaid) {
					router.replace({ pathname: `/payment/${effectivePrimaryId}`, params: { regId: regRes.registration_id || regRes.id } });
				} else {
					setResult({ user: currentUser, password: '••••••••', registration: regRes });
				}
			} else if (isPaid && regRes.isAlreadyRegistered) {
				router.replace(`/payment/${effectivePrimaryId}`);
			} else {
				toast.error(regRes.error || t('registrationFailed'));
			}
			return;
		}

		// 2. Guest student registration
		const res = await register(form);
		if (res.success) {
			const regRes = await registerForOlympiad(effectivePrimaryId, teacherPayload);
			setLoading(false);
			if (regRes.success) {
				toast.success(t('regDoneMsg'));
				if (regRes.group_payment_id) {
					router.replace({ pathname: `/payment/${effectivePrimaryId}`, params: { group_id: regRes.group_payment_id, total: regRes.total_price } });
				} else if (isPaid) {
					router.replace({ pathname: `/payment/${effectivePrimaryId}`, params: { regId: regRes.registration_id || regRes.id } });
				} else {
					setResult({ user: res.user, password: form.password, registration: regRes });
				}
			} else if (isPaid && regRes.isAlreadyRegistered) {
				router.replace(`/payment/${effectivePrimaryId}`);
			} else {
				toast.error(regRes.error || t('registrationFailed'));
			}
			return;
		}

		setLoading(false);
		if (isPaid && /allaqachon|already|зарегистрирован|mavjud/i.test(String(res.error))) {
			router.replace(`/payment/${effectivePrimaryId}`);
			return;
		}
		const msg = res.error === 'already_registered' ? t('alreadyRegistered') : res.error === 'network' ? t('networkError') : res.error === 'registration_failed' ? t('registrationFailed') : res.error;
		setErrors({ ...(res.fields || {}) });
		toast.error(msg);
	};

	if (!oly) {
		return (
			<Screen header={<StackHeader />}>
				<Loader />
			</Screen>
		);
	}

	const copy = async (text) => {
		await Clipboard.setStringAsync(String(text));
		toast.success(t('copied'));
	};

	if (result) {
		return (
			<Screen header={<StackHeader onBack={() => router.replace('/')} />}>
				<Animated.View entering={FadeIn.duration(200)} style={{ alignItems: 'center' }}>
					<View style={styles.doneIcon}>
						<CheckCircle2 size={44} color="#fff" />
					</View>
					<T v="display" style={{ marginTop: 16 }}>
						{t('regDone')}
					</T>
					<T v="body" style={{ textAlign: 'center', marginTop: 6 }}>
						{t('regDoneMsg')}
					</T>
				</Animated.View>
				<Card style={{ marginTop: 22, gap: 12 }}>
					<T v="small" style={{ textAlign: 'center', fontFamily: fonts.bold, color: colors.amber }}>
						{t('saveCredentials')}
					</T>
					<View style={styles.cred}>
						<View style={{ flex: 1 }}>
							<T v="label">{t('yourId')}</T>
							<T v="mono" style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>
								{result.user.participant_id}
							</T>
						</View>
						<Tap onPress={() => copy(result.user.participant_id)} style={styles.credBtn}>
							<Copy size={17} color={colors.ink2} />
						</Tap>
					</View>
					<View style={styles.cred}>
						<View style={{ flex: 1 }}>
							<T v="label">{t('yourPass')}</T>
							<T v="mono" style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>
								{showPass ? result.password : '••••••••'}
							</T>
						</View>
						<Tap onPress={() => setShowPass((v) => !v)} style={styles.credBtn}>
							{showPass ? <EyeOff size={17} color={colors.ink2} /> : <Eye size={17} color={colors.ink2} />}
						</Tap>
						<Tap onPress={() => copy(result.password)} style={styles.credBtn}>
							<Copy size={17} color={colors.ink2} />
						</Tap>
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

	const steps = currentUser ? [t('stepPersonal'), t('stepSchool')] : [t('stepPersonal'), t('stepSchool'), t('stepAccount')];
	const isLastStep = step === steps.length - 1;

	return (
		<Screen header={<StackHeader title={t('regTitle')} subtitle={pick(oly)} />} keyboard>
			{/* Olympiad Banner */}
			<OlympiadBanner source={getOlympiadBannerSource(oly.banner_image, oly.id)} borderRadius={12} style={{ marginBottom: 14 }} />

			{/* Companion Subject Selection Card (Parity with Website) */}
			{cohortOlympiads && cohortOlympiads.length > 1 ? (
				<View style={styles.subjectCard}>
					<View style={styles.subjectCardHeader}>
						<Trophy size={18} color={colors.goldDeep} />
						<T v="strong" style={{ fontSize: 14.5, color: colors.ink, flex: 1 }}>
							{t('selectSubjectsTitle')}
						</T>
					</View>
					<T v="small" style={{ fontSize: 11.5, color: colors.ink2, marginBottom: 12, lineHeight: 16 }}>
						{t('selectSubjectsSubtitle')}
					</T>

					<View style={{ gap: 10 }}>
						{cohortOlympiads.map((item) => {
							const isPrimary = Number(item.id) === Number(effectivePrimaryId);
							const isCompanion = selectedCompanionIds.includes(Number(item.id)) && !isPrimary;
							const isSelected = isPrimary || isCompanion;
							const titleText = pick(item);
							const priceNum = Number(item.price) || 0;

							return (
								<Tap
									key={item.id}
									activeOpacity={0.88}
									onPress={() => {
										if (isPrimary) {
											if (selectedCompanionIds.length > 0) {
												const nextId = selectedCompanionIds[0];
												const nextOly = cohortOlympiads.find((o) => Number(o.id) === Number(nextId));
												if (nextOly) handleSetPrimary(nextOly);
											}
										} else if (isCompanion) {
											handleToggleCompanion(item);
										} else {
											if (selectedCompanionIds.length === 0) {
												handleSetPrimary(item);
											} else {
												handleToggleCompanion(item);
											}
										}
									}}
									style={[styles.subjectItem, isPrimary && styles.subjectItemPrimary, isCompanion && styles.subjectItemCompanion]}
								>
									{/* Top Row: Checkbox + Icon + Title */}
									<View style={styles.subjectTopRow}>
										<View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
											{isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
										</View>
										<View style={{ marginTop: 1 }}>{renderSubjectIcon(titleText)}</View>
										<T v="strong" style={{ flex: 1, fontSize: 13, color: colors.ink, lineHeight: 18 }}>
											{titleText}
										</T>
									</View>

									{/* Bottom row: Price + Badges / Buttons */}
									<View style={styles.subjectBottomRow}>
										<T v="strong" style={{ fontSize: 13, color: colors.goldDeep, fontWeight: '800' }}>
											{priceNum > 0 ? `${formatMoney(priceNum)} UZS` : t('freeSubject')}
										</T>

										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											{isPrimary && (
												<View style={styles.primaryBadge}>
													<Star size={11} color="#fff" fill="#fff" />
													<T v="strong" style={{ fontSize: 10, color: '#fff', textTransform: 'uppercase' }}>
														{t('mainSubject')}
													</T>
												</View>
											)}

											{isCompanion && (
												<>
													<Tap onPress={() => handleMakeCompanionPrimary(item)} style={styles.makeMainBtn}>
														<T v="strong" style={{ fontSize: 10.5, color: colors.amber }}>
															{t('makeMain')}
														</T>
													</Tap>
													<Tap onPress={() => handleToggleCompanion(item)} style={styles.addedBadge}>
														<T v="strong" style={{ fontSize: 10, color: '#fff', textTransform: 'uppercase' }}>
															{t('addedSubject')}
														</T>
													</Tap>
												</>
											)}

											{!isSelected && (
												<>
													<Tap onPress={() => handleSetPrimary(item)} style={styles.chooseBtn}>
														<T v="strong" style={{ fontSize: 11, color: colors.amber }}>
															{t('chooseSubject')}
														</T>
													</Tap>
													<Tap onPress={() => handleToggleCompanion(item)} style={styles.addBtn}>
														<T v="strong" style={{ fontSize: 10, color: colors.ink, textTransform: 'uppercase' }}>
															{t('addSubject')}
														</T>
													</Tap>
												</>
											)}
										</View>
									</View>
								</Tap>
							);
						})}
					</View>

					{selectedCompanionIds.length > 0 && (
						<View style={styles.totalRow}>
							<T v="small" style={{ fontSize: 12, fontWeight: '700', color: colors.ink2 }}>
								{t('totalToPay')}
							</T>
							<T v="h3" style={{ fontSize: 15, color: colors.goldDeep, fontWeight: '900' }}>
								{formatMoney(totalRegistrationPrice)} UZS
							</T>
						</View>
					)}
				</View>
			) : null}

			{/* Stepper Card */}
			<View style={styles.stepperCard}>
				<View style={styles.stepperBars}>
					{steps.map((label, i) => (
						<View key={label} style={[styles.stepBar, i <= step ? styles.stepBarActive : styles.stepBarInactive]} />
					))}
				</View>
				<View style={styles.stepInfoRow}>
					<View style={styles.stepBadge}>
						<T v="strong" style={{ fontSize: 11, color: colors.navyDeep }}>
							{t('stepCount', { step: step + 1 })}
						</T>
					</View>
					<T v="strong" style={{ fontSize: 13, color: colors.ink }}>
						{steps[step]}
					</T>
				</View>
			</View>

			<Animated.View key={step} entering={FadeIn.duration(200)} style={{ marginTop: 14 }}>
				<Card style={styles.formCard}>
					{step === 0 ? (
						<View style={{ gap: 13 }}>
							<View style={styles.latinNotice}>
								<Info size={14} color={colors.amber} />
								<T v="small" style={{ color: colors.ink, fontSize: 11.5, flex: 1, fontFamily: fonts.medium }}>
									{t('latinNotice')}
								</T>
							</View>
							<Field
								label={t('lastName')}
								icon={User}
								value={form.lastName}
								onChangeText={(v) => set('lastName', toLatinName(v))}
								placeholder={t('lastNamePlaceholder')}
								error={errors.lastName}
								autoCapitalize="words"
								autoCorrect={false}
							/>
							<Field
								label={t('firstName')}
								icon={User}
								value={form.firstName}
								onChangeText={(v) => set('firstName', toLatinName(v))}
								placeholder={t('firstNamePlaceholder')}
								error={errors.firstName}
								autoCapitalize="words"
								autoCorrect={false}
							/>
							<Field
								label={t('middleName')}
								icon={User}
								value={form.middleName}
								onChangeText={(v) => set('middleName', toLatinName(v))}
								placeholder={t('middleNamePlaceholder')}
								error={errors.middleName}
								autoCapitalize="words"
								autoCorrect={false}
							/>
							<Field
								label={t('birthDate')}
								icon={Calendar}
								value={form.birthDate}
								onChangeText={(v) => set('birthDate', dateMask(v))}
								placeholder={t('birthDatePlaceholder')}
								keyboardType="number-pad"
								error={errors.birthDate}
							/>
						</View>
					) : step === 1 ? (
						<View style={{ gap: 13 }}>
							<SelectField
								label={t('region')}
								icon={MapPin}
								value={form.regionId}
								onChange={(v) => set('regionId', v)}
								placeholder={t('selectRegion')}
								error={errors.regionId}
								options={availableRegions.map((r) => ({ value: r.id, label: pick(r, 'name') }))}
							/>
							<Field label={t('school')} icon={School} value={form.school} onChangeText={(v) => set('school', v)} placeholder={t('schoolPlaceholder')} error={errors.school} />
							<SelectField
								label={t('grade')}
								icon={GraduationCap}
								value={form.grade}
								onChange={(v) => set('grade', v)}
								placeholder={t('selectGrade')}
								error={errors.grade}
								options={availableGrades.map((g) => ({ value: g, label: g === 'KG' ? t('kindergarten') : `${g}${t('gradeSuffix')}` }))}
							/>
							<View>
								<T v="label" style={{ marginBottom: 7, marginLeft: 2, color: colors.ink2 }}>
									{t('teacherSearchLabel')} · {t('optional')}
								</T>
								{form.teacherId ? (
									<View style={styles.teacher}>
										<CheckCircle2 size={18} color={colors.green} />
										<View style={{ flex: 1 }}>
											<T v="small">{t('teacherSelected')}</T>
											<T v="strong">{form.teacher_name}</T>
										</View>
										<Tap onPress={() => setForm((p) => ({ ...p, teacherId: null, teacher_name: '', teacher_phone: '+998' }))} style={styles.credBtn}>
											<X size={16} color={colors.ink2} />
										</Tap>
									</View>
								) : (
									<TeacherSearch
										actionLabel={t('confirm')}
										onSelect={(tch) => setForm((p) => ({ ...p, teacherId: tch.id, teacher_name: tch.full_name, teacher_phone: tch.phone || p.teacher_phone }))}
									/>
								)}
							</View>
						</View>
					) : (
						<View style={{ gap: 13 }}>
							<Field
								label={t('phone')}
								icon={Phone}
								value={form.phone}
								onChangeText={(v) => set('phone', phoneMask(v))}
								placeholder={t('phonePlaceholder')}
								keyboardType="phone-pad"
								error={errors.phone}
							/>
							<Field
								label={t('password')}
								icon={Lock}
								value={form.password}
								onChangeText={(v) => set('password', v)}
								placeholder={t('passwordPlaceholder')}
								secure
								error={errors.password}
								autoCapitalize="none"
								textContentType="newPassword"
							/>
							<Field
								label={t('confirmPassword')}
								icon={Lock}
								value={form.confirmPassword}
								onChangeText={(v) => set('confirmPassword', v)}
								placeholder={t('confirmPasswordPlaceholder')}
								secure
								error={errors.confirmPassword}
								autoCapitalize="none"
								textContentType="newPassword"
							/>
						</View>
					)}
				</Card>
			</Animated.View>

			<View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
				{step > 0 ? <Button title={t('prev')} icon={ArrowLeft} variant="light" size="md" style={{ flex: 1 }} onPress={() => setStep((s) => s - 1)} /> : null}
				{!isLastStep ? (
					<Button title={t('next')} iconRight={ArrowRight} size="md" style={{ flex: 1.4 }} onPress={() => validateStep(step) && setStep((s) => s + 1)} />
				) : (
					<Button title={t('register')} iconRight={CheckCircle2} size="md" loading={loading} style={{ flex: 1.4 }} onPress={submit} />
				)}
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	subjectCard: {
		backgroundColor: '#FFFDF5',
		borderRadius: 18,
		padding: 14,
		borderWidth: 1.8,
		borderColor: '#FDE68A',
		marginBottom: 14,
		gap: 6
	},
	subjectCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4
	},
	subjectItem: {
		backgroundColor: colors.white,
		borderRadius: 14,
		padding: 12,
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		gap: 9
	},
	subjectItemPrimary: {
		backgroundColor: '#FFFBEB',
		borderColor: colors.goldDeep
	},
	subjectItemCompanion: {
		backgroundColor: '#FEF9C3',
		borderColor: colors.gold
	},
	subjectTopRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 9
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 1
	},
	checkboxActive: {
		backgroundColor: colors.goldDeep,
		borderColor: colors.goldDeep
	},
	subjectBottomRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: 'rgba(217, 119, 6, 0.15)'
	},
	primaryBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: colors.goldDeep,
		paddingHorizontal: 8,
		paddingVertical: 4.5,
		borderRadius: 6
	},
	makeMainBtn: {
		paddingHorizontal: 7,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#FEF3C7',
		borderWidth: 1,
		borderColor: '#FDE68A'
	},
	addedBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4.5,
		borderRadius: 6,
		backgroundColor: colors.goldDeep
	},
	chooseBtn: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		backgroundColor: '#FFFBEB',
		borderWidth: 1,
		borderColor: '#FDE68A'
	},
	addBtn: {
		paddingHorizontal: 8,
		paddingVertical: 4.5,
		borderRadius: 6,
		backgroundColor: '#F1F5F9'
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: 'rgba(217, 119, 6, 0.2)'
	},
	stepperCard: {
		backgroundColor: colors.white,
		borderRadius: 16,
		padding: 14,
		borderWidth: 1.2,
		borderColor: '#E2E8F0',
		gap: 10
	},
	stepperBars: {
		flexDirection: 'row',
		gap: 6
	},
	stepBar: {
		flex: 1,
		height: 4,
		borderRadius: 2
	},
	stepBarActive: {
		backgroundColor: colors.gold
	},
	stepBarInactive: {
		backgroundColor: '#E2E8F0'
	},
	stepInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	stepBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2.5,
		borderRadius: 6,
		backgroundColor: colors.goldTint
	},
	formCard: {
		padding: 18,
		borderRadius: 20,
		backgroundColor: colors.white,
		borderWidth: 1.2,
		borderColor: '#E2E8F0'
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
		borderColor: colors.goldSoft
	},
	doneIcon: { width: 92, height: 92, borderRadius: 32, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
	cred: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	credBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	teacher: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.greenSoft }
});
