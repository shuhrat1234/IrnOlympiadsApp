import React, { useEffect, useRef, useState } from 'react';
import {
	Image,
	InputAccessoryView,
	Keyboard,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, ArrowRight, ChevronLeft, GraduationCap, Hash, Lock, LogIn, Phone, Send, ShieldCheck, Trophy, User, Globe } from 'lucide-react-native';
import { useAuth, homeRouteFor } from '../context/AuthContext';
import { useLanguage, LANGS } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Dialog, Field, Segmented, Sheet, T, Tap } from '../components/ui';
import { colors, fonts, radius, shadow } from '../theme';
import { LINKS } from '../utils/constants';
import { cleanUzPhone } from '../utils/format';

// Web kept these in sessionStorage — module memory is the app-session equivalent.
const attempts = { failed: 0, lockUntil: 0 };

const PHONE_RE = /^\+998\d{9}$/;
const ACCESSORY_ID = 'login_phone_bar';

export default function LoginScreen() {
	const insets = useSafeAreaInsets();
	const { login, verify2FA } = useAuth();
	const { t, lang, changeLanguage } = useLanguage();
	const toast = useToast();

	const [mode, setMode] = useState('phone');
	const [phone, setPhone] = useState('+998');
	const [participantId, setParticipantId] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [phoneError, setPhoneError] = useState('');
	const [loading, setLoading] = useState(false);
	const [accounts, setAccounts] = useState(null);
	const [twoFAToken, setTwoFAToken] = useState(null);
	const [code, setCode] = useState('');
	const [showRecovery, setShowRecovery] = useState(false);
	const [staffBlocked, setStaffBlocked] = useState(false);
	const [lockout, setLockout] = useState(() => Math.max(0, Math.ceil((attempts.lockUntil - Date.now()) / 1000)));
	const scrollRef = useRef(null);

	useEffect(() => {
		if (lockout <= 0) return;
		const timer = setTimeout(() => setLockout((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [lockout]);

	const onPhoneChange = (value) => {
		const v = cleanUzPhone(value);
		setPhone(v);
		setPhoneError(v.length === 13 && !PHONE_RE.test(v) ? t('phoneInvalid') : '');
	};

	const fail = (raw) => {
		attempts.failed += 1;
		if (attempts.failed >= 5) {
			const duration = attempts.failed >= 8 ? 60 : 30;
			attempts.lockUntil = Date.now() + duration * 1000;
			setLockout(duration);
			const msg = t('rateLimit', { s: duration });
			setError(msg);
			toast.error(msg);
			return;
		}
		const fallback = mode === 'id' ? t('loginErrorId') : t('loginError');
		let msg = fallback;
		if (raw === 'network') msg = t('networkError');
		else if (typeof raw === 'string') {
			const lower = raw.toLowerCase();
			if (/2fa|kod|code/.test(lower)) msg = t('twoFAError');
			else if (/attempt|urinish|попыток|rate limit|too many/.test(lower)) msg = t('rateLimit', { s: 30 });
			else if (!/invalid|password|username|credential|login_failed|not found|parol/.test(lower)) msg = raw;
		}
		setError(msg);
		toast.error(msg);
	};

	const handleResult = (res) => {
		if (res.success) {
			attempts.failed = 0;
			attempts.lockUntil = 0;
			toast.success(t('loginSuccess'));
			router.replace(homeRouteFor(res.user));
			return;
		}
		if (res.error === 'role') {
			setStaffBlocked(true);
			return;
		}
		fail(res.error);
	};

	const submit = async () => {
		setError('');
		setAccounts(null);
		if (lockout > 0) {
			setError(t('rateLimit', { s: lockout }));
			return;
		}
		if (mode === 'phone' && !PHONE_RE.test(phone)) {
			setPhoneError(t('phoneInvalid'));
			return;
		}
		if (!password || (mode === 'id' && !participantId.trim())) {
			toast.error(t('fillAllFields'));
			return;
		}
		setLoading(true);
		const res = await login(mode === 'phone' ? phone : participantId.trim(), password);
		setLoading(false);
		if (res.multiple_accounts) setAccounts(res.accounts);
		else if (res.requires_2fa) setTwoFAToken(res.pre_auth_token);
		else handleResult(res);
	};

	const pickAccount = async (pid) => {
		if (lockout > 0) return;
		setLoading(true);
		const res = await login(pid, password);
		setLoading(false);
		if (res.requires_2fa) setTwoFAToken(res.pre_auth_token);
		else handleResult(res);
	};

	const submit2FA = async () => {
		setLoading(true);
		const res = await verify2FA(twoFAToken, code);
		setLoading(false);
		if (res.success || res.error === 'role') handleResult(res);
		else fail(t('twoFAError'));
	};

	const title = twoFAToken ? t('twoFATitle') : accounts ? t('selectAccount') : t('loginTitle');

	return (
		<View style={{ flex: 1, backgroundColor: colors.navyDeep }}>
			<StatusBar style="light" />
			<LinearGradient
				colors={['#081226', '#0C1A36', '#102244']}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={StyleSheet.absoluteFill}
				pointerEvents="none"
			/>
			<Image source={require('../../assets/brand/glow.png')} style={styles.glow} resizeMode="contain" pointerEvents="none" />
			<Image source={require('../../assets/brand/glow.png')} style={styles.glow2} resizeMode="contain" pointerEvents="none" />

			{/* Fixed Top Bar - protected safe area zone, never collides with status bar */}
			<View style={[styles.topRowFixed, { paddingTop: insets.top + 6 }]}>
				<View style={styles.langs}>
					{LANGS.map((l) => (
						<Pressable key={l.code} onPress={() => changeLanguage(l.code)} style={[styles.langBtn, lang === l.code && styles.langBtnActive]}>
							<T v="strong" style={{ fontSize: 11.5 }} color={lang === l.code ? colors.navyDeep : 'rgba(255,255,255,0.7)'}>{l.short}</T>
						</Pressable>
					))}
				</View>
				<Pressable onPress={() => router.push('/catalog')} style={styles.browse}>
					<Trophy size={13} color={colors.gold} />
					<T v="strong" color="#fff" style={{ fontSize: 12 }}>{t('browseOlympiads')}</T>
				</Pressable>
			</View>

			<ScrollView
				ref={scrollRef}
				contentContainerStyle={{ flexGrow: 1 }}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
				showsVerticalScrollIndicator={false}
				bounces={false}
			>
				{/* Hero area */}
				<Pressable onPress={Keyboard.dismiss} style={styles.heroContent}>
					<Animated.View entering={FadeInDown.duration(500)} style={styles.logoWrap}>
						<View style={styles.heroArtWrap}>
							<Image source={require('../../assets/brand/irn-official-gold-logo.png')} style={styles.heroArt} resizeMode="contain" />
						</View>
					</Animated.View>
					<Animated.View entering={FadeInDown.delay(80).duration(450)}>
						<T v="display" color="#fff" style={{ textAlign: 'center', marginTop: 4, fontSize: 22, lineHeight: 28 }}>{t('loginHero')}</T>
						<T v="body" color="rgba(255,255,255,0.7)" style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: 16, fontSize: 13, lineHeight: 18 }}>{t('loginHeroSub')}</T>
					</Animated.View>
				</Pressable>

				{/* Form card */}
				<Animated.View entering={FadeInUp.delay(80).duration(260)} style={[styles.card, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
								{twoFAToken || accounts ? (
									<Tap onPress={() => { setTwoFAToken(null); setAccounts(null); setCode(''); setError(''); }} style={styles.backBtn}>
										<ChevronLeft size={18} color={colors.ink} />
									</Tap>
								) : null}
								<T v="h2">{title}</T>
							</View>
							<T v="small" style={{ marginBottom: 16, fontSize: 12 }}>{twoFAToken ? t('twoFASubtitle') : accounts ? '' : t('loginSubtitle')}</T>

							{error ? (
								<View style={styles.errorBox}>
									<AlertTriangle size={15} color={colors.red} />
									<T v="small" color={colors.red} style={{ flex: 1, fontFamily: fonts.bold, fontSize: 12 }}>{error}</T>
								</View>
							) : null}

							{twoFAToken ? (
								<View style={{ gap: 14 }}>
									<View style={styles.shield}><ShieldCheck size={28} color={colors.amber} /></View>
									<Field
										value={code}
										onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
										placeholder="000000"
										keyboardType="number-pad"
										inputAccessoryViewID={ACCESSORY_ID}
										autoFocus
										inputStyle={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: fonts.extrabold }}
										returnKeyType="done"
										onSubmitEditing={submit2FA}
									/>
									<Button size="md" title={t('confirm')} onPress={submit2FA} loading={loading} disabled={code.length !== 6} />
								</View>
							) : accounts ? (
								<View style={{ gap: 8 }}>
									{accounts.map((acc) => {
										const isTeacher = acc.role === 'teacher' || acc.is_teacher || !acc.grade;
										return (
											<Tap key={acc.participant_id} onPress={() => pickAccount(acc.participant_id)} style={[styles.account, isTeacher && { backgroundColor: colors.goldTint, borderColor: colors.goldSoft }]}>
												<View style={[styles.accIcon, isTeacher && { backgroundColor: colors.gold }]}>
													{isTeacher ? <GraduationCap size={18} color={colors.navyDeep} /> : <User size={18} color={colors.amber} />}
												</View>
												<View style={{ flex: 1 }}>
													<T v="strong" numberOfLines={1} style={{ textTransform: 'uppercase', fontSize: 13 }}>{acc.full_name}</T>
													<T v="small" style={{ marginTop: 1, fontSize: 11.5 }}>
														{acc.participant_id}
														{acc.grade ? ` · ${acc.grade}${t('gradeSuffix')}` : ''}
														{isTeacher ? ` · ${t('teacherBadge')}` : ''}
													</T>
												</View>
												<ArrowRight size={16} color={colors.faint} />
											</Tap>
										);
									})}
								</View>
							) : (
								<View style={{ gap: 12 }}>
									<Segmented
										value={mode}
										onChange={(m) => { setMode(m); setError(''); }}
										options={[
											{ value: 'phone', label: t('byPhone'), icon: Phone },
											{ value: 'id', label: t('byId'), icon: Hash },
										]}
									/>
									{mode === 'phone' ? (
										<Field
											icon={Phone}
											value={phone}
											onChangeText={onPhoneChange}
											keyboardType="phone-pad"
											inputAccessoryViewID={ACCESSORY_ID}
											placeholder="+998XXXXXXXXX"
											error={phoneError}
											textContentType="telephoneNumber"
											autoComplete="tel"
											returnKeyType="done"
											onSubmitEditing={Keyboard.dismiss}
										/>
									) : (
										<Field icon={User} value={participantId} onChangeText={setParticipantId} placeholder="USR-XXXXX" autoCapitalize="characters" autoCorrect={false} returnKeyType="next" />
									)}
									<Field icon={Lock} value={password} onChangeText={setPassword} placeholder={t('passwordPlaceholder')} secure autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
									<Pressable onPress={() => setShowRecovery(true)} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
										<T v="strong" color={colors.amber} style={{ fontSize: 12.5 }}>{t('forgotPassword')}</T>
									</Pressable>
									<Button
										size="md"
										title={lockout > 0 ? t('waitText', { s: lockout }) : t('loginBtn')}
										iconRight={lockout > 0 ? undefined : LogIn}
										onPress={submit}
										loading={loading}
										disabled={lockout > 0}
										style={{ marginTop: 2 }}
									/>
									<View style={styles.registerRow}>
										<T v="small" style={{ fontSize: 12.5 }}>{t('noAccount')}</T>
										<Pressable onPress={() => router.push('/catalog')} hitSlop={8}>
											<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{t('register')}</T>
										</Pressable>
									</View>
									<Pressable
										onPress={() => router.push('/register-teacher')}
										style={styles.teacherBanner}
										accessibilityRole="button"
									>
										<GraduationCap size={15} color={colors.goldDeep} />
										<T v="strong" numberOfLines={1} style={{ fontSize: 12, color: colors.goldDeep, flexShrink: 1 }}>{t('teacherSignup')}</T>
										<ArrowRight size={13} color={colors.goldDeep} />
									</Pressable>
								</View>
							)}
						</Animated.View>
					</ScrollView>

				{Platform.OS === 'ios' ? (
					<InputAccessoryView nativeID={ACCESSORY_ID}>
						<View style={styles.accessory}>
							<Pressable onPress={Keyboard.dismiss} hitSlop={10} style={styles.accessoryBtn}>
								<T v="strong" color={colors.goldDeep} style={{ fontSize: 14 }}>{t('done')}</T>
							</Pressable>
						</View>
					</InputAccessoryView>
				) : null}

				<Sheet visible={showRecovery} onClose={() => setShowRecovery(false)} title={t('recoverTitle')}>
					<View style={{ alignItems: 'center', gap: 14, paddingBottom: 6 }}>
						<View style={[styles.tgIcon, { backgroundColor: '#0088CC' }]}>
							<Send size={30} color="#fff" />
						</View>
						<T v="body" style={{ textAlign: 'center' }}>{t('recoverText')}</T>
						<Button title={t('openBot')} icon={Send} style={{ alignSelf: 'stretch', marginTop: 6 }} onPress={() => { setShowRecovery(false); Linking.openURL(LINKS.bot); }} />
					</View>
				</Sheet>

				<Dialog
					visible={staffBlocked}
					onClose={() => setStaffBlocked(false)}
					icon={GraduationCap}
					tone="navy"
					title={t('studentsOnlyTitle')}
					message={t('studentsOnlyText')}
					actions={[
						{ title: t('openSite'), icon: Globe, variant: 'dark', onPress: () => { setStaffBlocked(false); Linking.openURL(`${LINKS.site}/login`); } },
						{ title: t('close'), variant: 'ghost', onPress: () => setStaffBlocked(false) },
					]}
				/>
			</View>
	);
}

const styles = StyleSheet.create({
	glow: {
		position: 'absolute',
		top: -90,
		right: -80,
		width: 380,
		height: 380,
		opacity: 0.35,
		...Platform.select({
			web: {
				filter: 'blur(24px)',
			},
		}),
	},
	glow2: {
		position: 'absolute',
		top: 120,
		left: -120,
		width: 340,
		height: 340,
		opacity: 0.22,
		tintColor: '#2F6FEB',
		...Platform.select({
			web: {
				filter: 'blur(30px)',
			},
		}),
	},
	topRowFixed: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingBottom: 8,
		backgroundColor: 'transparent',
		zIndex: 10,
	},
	heroContent: {
		paddingHorizontal: 20,
		paddingTop: Platform.select({ web: 36, default: 28 }),
		paddingBottom: 18,
	},
	langs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, padding: 2 },
	langBtn: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
	langBtnActive: { backgroundColor: colors.gold },
	browse: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
	logoWrap: { alignItems: 'center', marginTop: 14, marginBottom: 12 },
	heroArtWrap: { width: 140, height: 90, alignItems: 'center', justifyContent: 'center' },
	heroArt: { width: '100%', height: '100%' },
	card: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 22, minHeight: 480, justifyContent: 'flex-start', ...shadow(3) },
	backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
	errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: colors.redSoft, borderRadius: radius.md, marginBottom: 8 },
	shield: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
	account: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	accIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	registerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
	teacherBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 36, borderRadius: radius.md, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.goldSoft, marginTop: 6, paddingHorizontal: 12 },
	tgIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
	accessory: { backgroundColor: '#F8F9FA', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D1D5DB', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, height: 42 },
	accessoryBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.goldTint },
});
