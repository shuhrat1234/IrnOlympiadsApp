import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, ArrowRight, ChevronLeft, GraduationCap, Hash, Lock, LogIn, Phone, Send, ShieldCheck, Trophy, User, Globe } from 'lucide-react-native';
import { useAuth, homeRouteFor } from '../context/AuthContext';
import { useLanguage, LANGS } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Dialog, Field, Segmented, Sheet, T, Tap } from '../components/ui';
import { colors, fonts, gradients, radius, shadow } from '../theme';
import { LINKS } from '../utils/constants';

// Web kept these in sessionStorage — module memory is the app-session equivalent.
const attempts = { failed: 0, lockUntil: 0 };

const PHONE_RE = /^\+998\d{9}$/;

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

	useEffect(() => {
		if (lockout <= 0) return;
		const timer = setTimeout(() => setLockout((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [lockout]);

	const onPhoneChange = (value) => {
		let v = value.startsWith('+998') ? value : '+998';
		v = `+998${v.slice(4).replace(/\D/g, '').slice(0, 9)}`;
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
		if (!password || (mode === 'id' && !participantId.trim())) return;
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
			<LinearGradient colors={gradients.navy} style={StyleSheet.absoluteFill} />
			<View style={styles.glow} />
			<View style={styles.glow2} />

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
				<ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
					{/* Hero */}
					<View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
						<View style={styles.topRow}>
							<View style={styles.langs}>
								{LANGS.map((l) => (
									<Pressable key={l.code} onPress={() => changeLanguage(l.code)} style={[styles.langBtn, lang === l.code && styles.langBtnActive]}>
										<T v="strong" style={{ fontSize: 12 }} color={lang === l.code ? colors.navyDeep : 'rgba(255,255,255,0.7)'}>{l.short}</T>
									</Pressable>
								))}
							</View>
							<Pressable onPress={() => router.push('/catalog')} style={styles.browse}>
								<Trophy size={14} color={colors.gold} />
								<T v="strong" color="#fff" style={{ fontSize: 12.5 }}>{t('browseOlympiads')}</T>
							</Pressable>
						</View>

						<Animated.View entering={FadeInDown.duration(650)} style={styles.logoWrap}>
							<View style={styles.heroArtWrap}>
								<Image source={require('../../assets/illustrations/olympiad-hero.png')} style={styles.heroArt} resizeMode="cover" />
								<LinearGradient colors={['transparent', colors.navyDeep]} locations={[0.72, 1]} style={styles.heroFade} />
							</View>
						</Animated.View>
						<Animated.View entering={FadeInDown.delay(120).duration(600)}>
							<T v="label" color={colors.gold} style={{ textAlign: 'center', letterSpacing: 3 }}>IRN OLYMPIADS</T>
							<T v="display" color="#fff" style={{ textAlign: 'center', marginTop: 10, fontSize: 30 }}>{t('loginHero')}</T>
							<T v="body" color="rgba(255,255,255,0.65)" style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>{t('loginHeroSub')}</T>
						</Animated.View>
					</View>

					{/* Form card */}
					<Animated.View entering={FadeInUp.delay(150).springify().damping(18)} style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
							{twoFAToken || accounts ? (
								<Tap onPress={() => { setTwoFAToken(null); setAccounts(null); setCode(''); setError(''); }} style={styles.backBtn}>
									<ChevronLeft size={20} color={colors.ink} />
								</Tap>
							) : null}
							<T v="h1">{title}</T>
						</View>
						<T v="small" style={{ marginBottom: 20 }}>{twoFAToken ? t('twoFASubtitle') : accounts ? '' : t('loginSubtitle')}</T>

						{error ? (
							<View style={styles.errorBox}>
								<AlertTriangle size={16} color={colors.red} />
								<T v="small" color={colors.red} style={{ flex: 1, fontFamily: fonts.bold }}>{error}</T>
							</View>
						) : null}

						{twoFAToken ? (
							<View style={{ gap: 16 }}>
								<View style={styles.shield}><ShieldCheck size={30} color={colors.amber} /></View>
								<Field
									value={code}
									onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
									placeholder="000000"
									keyboardType="number-pad"
									autoFocus
									inputStyle={{ textAlign: 'center', fontSize: 26, letterSpacing: 10, fontFamily: fonts.extrabold }}
								/>
								<Button title={t('confirm')} onPress={submit2FA} loading={loading} disabled={code.length !== 6} />
							</View>
						) : accounts ? (
							<View style={{ gap: 10 }}>
								{accounts.map((acc) => {
									const isTeacher = acc.role === 'teacher' || acc.is_teacher || !acc.grade;
									return (
										<Tap key={acc.participant_id} onPress={() => pickAccount(acc.participant_id)} style={[styles.account, isTeacher && { backgroundColor: colors.goldTint, borderColor: colors.goldSoft }]}>
											<View style={[styles.accIcon, isTeacher && { backgroundColor: colors.gold }]}>
												{isTeacher ? <GraduationCap size={20} color={colors.navyDeep} /> : <User size={20} color={colors.amber} />}
											</View>
											<View style={{ flex: 1 }}>
												<T v="strong" numberOfLines={2} style={{ textTransform: 'uppercase', fontSize: 14 }}>{acc.full_name}</T>
												<T v="small" style={{ marginTop: 2 }}>
													{acc.participant_id}
													{acc.grade ? ` · ${acc.grade}${t('gradeSuffix')}` : ''}
													{isTeacher ? ` · ${t('teacherBadge')}` : ''}
												</T>
											</View>
											<ArrowRight size={18} color={colors.faint} />
										</Tap>
									);
								})}
							</View>
						) : (
							<View style={{ gap: 14 }}>
								<Segmented
									value={mode}
									onChange={(m) => { setMode(m); setError(''); }}
									options={[
										{ value: 'phone', label: t('byPhone'), icon: Phone },
										{ value: 'id', label: t('byId'), icon: Hash },
									]}
								/>
								{mode === 'phone' ? (
									<Field icon={Phone} value={phone} onChangeText={onPhoneChange} keyboardType="phone-pad" placeholder="+998XXXXXXXXX" error={phoneError} textContentType="telephoneNumber" autoComplete="tel" />
								) : (
									<Field icon={User} value={participantId} onChangeText={setParticipantId} placeholder="USR-XXXXX" autoCapitalize="characters" autoCorrect={false} />
								)}
								<Field icon={Lock} value={password} onChangeText={setPassword} placeholder={t('passwordPlaceholder')} secure autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
								<Pressable onPress={() => setShowRecovery(true)} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
									<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{t('forgotPassword')}</T>
								</Pressable>
								<Button
									title={lockout > 0 ? t('waitText', { s: lockout }) : t('loginBtn')}
									iconRight={lockout > 0 ? undefined : LogIn}
									onPress={submit}
									loading={loading}
									disabled={lockout > 0}
									style={{ marginTop: 4 }}
								/>
								<View style={styles.registerRow}>
									<T v="small">{t('noAccount')}</T>
									<Pressable onPress={() => router.push('/catalog')} hitSlop={8}>
										<T v="strong" color={colors.amber} style={{ fontSize: 13.5 }}>{t('register')}</T>
									</Pressable>
								</View>
							</View>
						)}
					</Animated.View>
				</ScrollView>
			</KeyboardAvoidingView>

			<Sheet visible={showRecovery} onClose={() => setShowRecovery(false)} title={t('recoverTitle')}>
				<View style={{ alignItems: 'center', gap: 14, paddingBottom: 6 }}>
					<LinearGradient colors={['#37BBFE', '#007DBB']} style={styles.tgIcon}>
						<Send size={30} color="#fff" />
					</LinearGradient>
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
	glow: { position: 'absolute', top: -120, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(253,200,0,0.18)' },
	glow2: { position: 'absolute', top: 160, left: -140, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(47,111,235,0.14)' },
	hero: { paddingHorizontal: 22, paddingBottom: 28 },
	topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	langs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, padding: 3 },
	langBtn: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill },
	langBtnActive: { backgroundColor: colors.gold },
	browse: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
	logoWrap: { alignItems: 'center', marginTop: 12, marginBottom: -4 },
	heroArtWrap: { width: 190, height: 174, overflow: 'hidden', borderRadius: 48, shadowColor: colors.gold, shadowOpacity: 0.24, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
	heroArt: { width: '100%', height: '100%' },
	heroFade: { ...StyleSheet.absoluteFillObject },
	card: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 22, paddingTop: 28, ...shadow(3) },
	backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
	errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.redSoft, borderRadius: radius.md, marginBottom: 14 },
	shield: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
	account: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	accIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 6 },
	tgIcon: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
