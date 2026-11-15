import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenCapture from 'expo-screen-capture';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, ZoomIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Maximize2, Send, Shield, X } from 'lucide-react-native';
import { mediaUrl } from '../../api/client';
import { store } from '../../api/storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LANGS } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { Button, Dialog, Loader, T, Tap } from '../../components/ui';
import { Canvas } from '../../components/layout';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatClock } from '../../utils/format';
import { LINKS } from '../../utils/constants';

const MAX_VIOLATIONS = 5;

export default function ExamScreen() {
	useKeepAwake();
	ScreenCapture.usePreventScreenCapture();
	const { id } = useLocalSearchParams();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const { currentUser } = useAuth();
	const { t, lang, changeLanguage, pick } = useLanguage();
	const { olympiads, isLoaded, fetchExamQuestions, submitExamResult } = useOlympiad();

	const answersKey = `exam_${id}_${currentUser?.id}`;
	const violationsKey = `violation_${id}_${currentUser?.id}`;

	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState(null);
	const [current, setCurrent] = useState(0);
	const [answers, setAnswers] = useState({});
	const [timeLeft, setTimeLeft] = useState(0);
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [violations, setViolations] = useState(0);
	const [showViolation, setShowViolation] = useState(false);
	const [zoom, setZoom] = useState(false);
	const [blackout, setBlackout] = useState(false);
	const navRef = useRef(null);
	const scrollRef = useRef(null);
	const stateRef = useRef({});

	const { oly, sub, session } = useMemo(() => {
		for (const o of olympiads) {
			for (const s of o.subs || []) {
				const gs = (s.grade_sessions || []).find((g) => String(g.id) === String(id));
				if (gs) return { oly: o, sub: s, session: gs };
			}
		}
		return { oly: null, sub: null, session: null };
	}, [olympiads, id]);

	const alreadyTaken = currentUser?.exam_results?.some((r) => String(r.sub_olympiad_grade) === String(id) && r.completed_at);

	// Load questions, sync the timer against the server clock, restore autosave.
	useEffect(() => {
		if (!currentUser) return;
		let alive = true;
		(async () => {
			setLoading(true);
			const res = await fetchExamQuestions(id);
			if (!alive) return;
			if (res.success) {
				const sorted = [...(res.data.questions || [])].sort((a, b) => a.id - b.id);
				setQuestions(sorted);
				sorted.forEach((q) => q.image && Image.prefetch(mediaUrl(q.image)).catch(() => {}));
				const start = new Date(res.data.start_time);
				const now = new Date(res.data.server_time || Date.now());
				const remaining = Math.max(0, res.data.duration_minutes * 60 - Math.floor((now - start) / 1000));
				setTimeLeft(remaining);
				stateRef.current.deadline = Date.now() + remaining * 1000;
				const saved = await store.get(answersKey);
				if (saved && typeof saved === 'object') setAnswers(saved);
				const v = await store.get(violationsKey, 0);
				setViolations(Number(v) || 0);
			} else {
				setFetchError(res.error);
			}
			setLoading(false);
		})();
		return () => { alive = false; };
	}, [id, currentUser?.id]);

	// Latest values for the timer/AppState callbacks (updated after each commit).
	useEffect(() => {
		stateRef.current = { ...stateRef.current, answers, violations, questions, submitted: stateRef.current.submitted || submitted };
	});

	const handleSubmit = useCallback(async () => {
		const s = stateRef.current;
		if (s.submitted) return;
		stateRef.current.submitted = true;
		setSubmitted(true);
		setSubmitting(true);
		setShowConfirm(false);
		setShowViolation(false);
		if (s.questions.length > 0) {
			const res = await submitExamResult(id, s.answers, s.violations);
			if (res.success) {
				store.remove(answersKey);
				store.remove(violationsKey);
			}
		}
		setSubmitting(false);
	}, [id, submitExamResult, answersKey, violationsKey]);

	// Autosave
	useEffect(() => {
		if (!submitted && Object.keys(answers).length) store.set(answersKey, answers);
	}, [answers, submitted]);

	useEffect(() => {
		if (!submitted) store.set(violationsKey, violations);
	}, [violations, submitted]);

	// Timer: derived from a wall-clock deadline so it stays correct after backgrounding.
	const running = !loading && !submitted && !alreadyTaken && questions.length > 0;
	useEffect(() => {
		if (!running) return;
		const tick = setInterval(() => {
			const left = Math.max(0, Math.round((stateRef.current.deadline - Date.now()) / 1000));
			setTimeLeft(left);
			if (left <= 0) {
				clearInterval(tick);
				handleSubmit();
			}
		}, 1000);
		return () => clearInterval(tick);
	}, [running, handleSubmit]);

	// Leaving the app = the website's tab-switch violation. 5 → auto submit.
	useEffect(() => {
		if (!running) return;
		const sub = AppState.addEventListener('change', (state) => {
			if (state !== 'background') return;
			const next = stateRef.current.violations + 1;
			setViolations(next);
			if (next >= MAX_VIOLATIONS) handleSubmit();
			else setShowViolation(true);
		});
		return () => sub.remove();
	}, [running, handleSubmit]);

	// Screenshots → blackout, like the website's PrintScreen handler.
	useEffect(() => {
		if (!running) return;
		const sub = ScreenCapture.addScreenshotListener(() => {
			setBlackout(true);
			setTimeout(() => setBlackout(false), 2000);
		});
		return () => sub.remove();
	}, [running]);

	// Android back must not silently leave the exam.
	useEffect(() => {
		if (!running) return;
		const sub = BackHandler.addEventListener('hardwareBackPress', () => {
			setShowConfirm(true);
			return true;
		});
		return () => sub.remove();
	}, [running]);

	useEffect(() => {
		scrollRef.current?.scrollTo({ y: 0, animated: true });
		navRef.current?.scrollTo({ x: Math.max(0, current * 44 - width / 2 + 22), animated: true });
	}, [current]);

	const answeredCount = Object.keys(answers).length;

	if (!isLoaded && olympiads.length === 0) return <Canvas><Loader label={t('loading')} /></Canvas>;

	if (session && ((!session.is_started && questions.length === 0 && !loading) || session.is_completed) && !submitted) {
		return <StatusScreen icon={session.is_completed ? CheckCircle2 : Clock} tone={session.is_completed ? 'green' : 'gold'} title={session.is_completed ? t('examCompleted') : t('notStartedYet')} message={session.is_completed ? t('examCompletedMsg') : t('waitAdmin')} />;
	}

	if (fetchError && !submitted) {
		const done = /завершили|completed|already taken/i.test(String(fetchError));
		if (done) {
			return (
				<StatusScreen icon={CheckCircle2} tone="green" title={t('examCompleted')} message={String(fetchError)}>
					<T v="small" style={{ textAlign: 'center', marginTop: 6 }}>{t('examResultMsg')}</T>
					<TelegramBlock />
				</StatusScreen>
			);
		}
		return <StatusScreen icon={AlertTriangle} tone="red" title={t('testNotAvailable')} message={String(fetchError)} />;
	}

	if (loading) return <Canvas><Loader label={t('loadingQuestions')} /></Canvas>;

	if (!sub) return <StatusScreen icon={AlertTriangle} tone="red" title={t('testNotAvailable')} />;

	if (alreadyTaken && !submitted) {
		return (
			<StatusScreen icon={CheckCircle2} tone="green" title={t('examCompleted')} message={t('alreadyTaken')}>
				<T v="small" style={{ textAlign: 'center', marginTop: 6 }}>{t('examResultMsg')}</T>
				<TelegramBlock />
			</StatusScreen>
		);
	}

	if (questions.length === 0) return <StatusScreen icon={AlertTriangle} tone="red" title={t('noQuestions')} />;

	if (submitted) {
		return (
			<StatusScreen icon={CheckCircle2} tone="green" title={t('examCompleted')} message={t('examCompletedMsg')}>
				<View style={styles.submittedStats}>
					<View style={{ flex: 1, alignItems: 'center' }}>
						<T v="label">{t('answered')}</T>
						<T v="h2" style={{ marginTop: 4 }}>{answeredCount} / {questions.length}</T>
					</View>
					<View style={{ width: 1, backgroundColor: colors.line }} />
					<View style={{ flex: 1, alignItems: 'center' }}>
						<T v="label">{t('status')}</T>
						{submitting ? <T v="h3" style={{ marginTop: 6 }}>…</T> : <T v="h3" color={colors.green} style={{ marginTop: 6 }}>{t('statusSuccess')}</T>}
					</View>
				</View>
				<TelegramBlock />
			</StatusScreen>
		);
	}

	const q = questions[current];
	const urgent = timeLeft < 300;
	const critical = timeLeft < 60;
	const progress = ((current + 1) / questions.length) * 100;

	return (
		<Canvas>
			{/* Header */}
			<View style={[styles.header, { paddingTop: insets.top + 6 }]}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
					<View style={{ flex: 1 }}>
						<T v="label" numberOfLines={1} color={colors.amber}>{pick(oly)}</T>
						<T v="h3" numberOfLines={1}>{pick(sub) || t('question')}</T>
					</View>
					<View style={[styles.timer, urgent && { backgroundColor: colors.redSoft, borderColor: '#F7C9CA' }, critical && { backgroundColor: colors.red, borderColor: colors.red }]}>
						<Clock size={15} color={critical ? '#fff' : urgent ? colors.red : colors.amber} strokeWidth={2.5} />
						<T style={[styles.timerText, { color: critical ? '#fff' : urgent ? colors.red : colors.navyDeep }]}>{formatClock(timeLeft)}</T>
					</View>
				</View>
				<View style={styles.headerRow2}>
					<View style={styles.langs}>
						{LANGS.map((l) => (
							<Pressable key={l.code} onPress={() => changeLanguage(l.code)} style={[styles.langBtn, lang === l.code && styles.langBtnActive]}>
								<T v="strong" style={{ fontSize: 11 }} color={lang === l.code ? colors.navyDeep : colors.muted}>{l.short}</T>
							</Pressable>
						))}
					</View>
					<T v="small" style={{ fontFamily: fonts.bold }}>{t('answered')}: <T v="small" style={{ fontFamily: fonts.extrabold, color: colors.green }}>{answeredCount}</T>/{questions.length}</T>
					{violations > 0 ? (
						<View style={styles.violBadge}><Shield size={12} color={colors.red} /><T v="strong" color={colors.red} style={{ fontSize: 11 }}>{violations}/{MAX_VIOLATIONS}</T></View>
					) : null}
				</View>
				<View style={styles.progressTrack}>
					<ProgressFill value={progress} />
				</View>
			</View>

			{/* Navigator */}
			<ScrollView ref={navRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nav} style={{ flexGrow: 0 }}>
				{questions.map((item, i) => {
					const active = i === current;
					const done = !!answers[item.id];
					return (
						<Tap key={item.id} onPress={() => setCurrent(i)} style={[styles.navItem, done && styles.navDone, active && styles.navActive]}>
							<T v="strong" style={{ fontSize: 13 }} color={active ? colors.navyDeep : done ? colors.green : colors.muted}>{i + 1}</T>
						</Tap>
					);
				})}
			</ScrollView>

			{/* Question */}
			<ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
				<Animated.View key={q.id} entering={FadeInRight.springify().damping(20)} exiting={FadeOutLeft.duration(120)}>
					<View style={styles.qCard}>
						<View style={styles.qTag}>
							<T v="label" color={colors.amber}>{t('question')} {current + 1} / {questions.length}</T>
						</View>
						<T style={styles.qText}>{q[`text_${lang}`] || q.text_en || q.text_uz || q.text_ru}</T>
						{q.image ? (
							<Pressable onPress={() => setZoom(true)} style={styles.qImageWrap}>
								<Image source={{ uri: mediaUrl(q.image) }} style={styles.qImage} resizeMode="contain" />
								<View style={styles.zoomHint}><Maximize2 size={13} color="#fff" /><T v="small" color="#fff" style={{ fontSize: 11 }}>{t('tapToZoom')}</T></View>
							</Pressable>
						) : null}
					</View>
					<View style={{ gap: 10, marginTop: 16 }}>
						{(q.options || []).map((opt) => {
							const selected = answers[q.id] === opt.id;
							return (
								<Tap
									key={opt.id}
									onPress={() => {
										setAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
									}}
									haptic={false}
									scale={0.98}
									style={[styles.option, selected && styles.optionSelected]}
								>
									<View style={[styles.optLetter, selected && styles.optLetterSelected]}>
										<T v="strong" color={selected ? colors.navyDeep : colors.muted}>{opt.id}</T>
									</View>
									<T style={[styles.optText, selected && { color: colors.ink }]}>{opt.text}</T>
									{selected ? <Animated.View entering={ZoomIn}><CheckCircle2 size={20} color={colors.goldDeep} fill={colors.goldTint} /></Animated.View> : null}
								</Tap>
							);
						})}
					</View>
				</Animated.View>
			</ScrollView>

			{/* Footer */}
			<View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
				<Button title={t('prev')} icon={ChevronLeft} variant="light" size="md" disabled={current === 0} onPress={() => setCurrent((c) => Math.max(0, c - 1))} style={{ flex: 1 }} />
				{current === questions.length - 1 ? (
					<Button title={t('finish')} icon={Flag} variant="success" size="md" onPress={() => setShowConfirm(true)} style={{ flex: 1.3 }} />
				) : (
					<Button title={t('next')} iconRight={ChevronRight} size="md" onPress={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} style={{ flex: 1.3 }} />
				)}
			</View>

			<Dialog
				visible={showConfirm}
				onClose={() => setShowConfirm(false)}
				icon={Flag}
				tone="green"
				title={t('examConfirmTitle')}
				message={t('examConfirmMsg')}
				actions={[
					{ title: t('submit'), variant: 'success', onPress: handleSubmit },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setShowConfirm(false) },
				]}
			>
				<View style={styles.confirmStats}>
					<T v="strong">{t('answered')}</T>
					<T v="h2" color={answeredCount === questions.length ? colors.green : colors.amber}>{answeredCount}/{questions.length}</T>
				</View>
			</Dialog>

			<Dialog
				visible={showViolation && !submitted}
				onClose={() => setShowViolation(false)}
				icon={AlertTriangle}
				tone="red"
				title={t('violationTitle')}
				message={t('violationMsg')}
				actions={[{ title: t('closeWarn'), variant: 'dark', onPress: () => setShowViolation(false) }]}
			>
				<T v="small" color={colors.red} style={{ textAlign: 'center', marginTop: 10, fontFamily: fonts.bold }}>{t('violationLimit')}</T>
				<View style={[styles.confirmStats, { backgroundColor: colors.redSoft }]}>
					<T v="strong" color={colors.red}>{t('violations')}</T>
					<T v="h2" color={colors.red}>{violations} / {MAX_VIOLATIONS}</T>
				</View>
			</Dialog>

			<Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
				<Pressable style={styles.zoomWrap} onPress={() => setZoom(false)}>
					{q.image ? <Image source={{ uri: mediaUrl(q.image) }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
					<View style={[styles.zoomClose, { top: insets.top + 12 }]}><X size={22} color="#fff" /></View>
				</Pressable>
			</Modal>

			{blackout ? (
				<Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.blackout]}>
					<Shield size={70} color={colors.red} />
					<T v="h2" color="#fff" style={{ marginTop: 16 }}>Security Breach Detected</T>
					<T v="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 6 }}>{t('screenshotBlocked')}</T>
				</Animated.View>
			) : null}
		</Canvas>
	);
}

// ——— Status screens (module level so they don't remount on every tick) ———
const StatusScreen = ({ icon: Icon, tone = 'gold', title, message, children }) => {
	const insets = useSafeAreaInsets();
	const { t } = useLanguage();
	return (
		<Canvas>
			<View style={[styles.center, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
				<Animated.View entering={FadeIn.duration(200)} style={styles.statusCard}>
					<View style={[styles.statusIcon, { backgroundColor: tone === 'green' ? colors.green : tone === 'red' ? colors.red : colors.gold }]}>
						<Icon size={38} color={tone === 'gold' ? colors.navyDeep : '#fff'} strokeWidth={2.2} />
					</View>
					<T v="h1" style={{ textAlign: 'center' }}>{title}</T>
					{message ? <T v="body" style={{ textAlign: 'center', marginTop: 8 }}>{message}</T> : null}
					{children}
					<Button title={t('goToDash')} icon={ChevronLeft} variant="dark" onPress={() => router.replace('/olympiads')} style={{ alignSelf: 'stretch', marginTop: 22 }} />
				</Animated.View>
			</View>
		</Canvas>
	);
};

const TelegramBlock = () => {
	const { t } = useLanguage();
	return (
		<View style={styles.tgBlock}>
			<T v="small" style={{ textAlign: 'center' }}>{t('tgChannel')}</T>
			<Tap onPress={() => Linking.openURL(LINKS.channel)} style={styles.tgBtn}>
				<Send size={15} color="#fff" />
				<T v="strong" color="#fff" style={{ fontSize: 14 }}>@IRN_Olympiads</T>
			</Tap>
			<View style={styles.announce}>
				<Clock size={16} color={colors.amber} />
				<T v="small" style={{ flex: 1, color: colors.ink2 }}>{t('newOlyAnnounce')}</T>
			</View>
		</View>
	);
};

const ProgressFill = ({ value }) => {
	const style = useAnimatedStyle(() => ({ width: withTiming(`${value}%`, { duration: 400 }) }));
	return <Animated.View style={[styles.progressFill, style]} />;
};

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', padding: 20 },
	statusCard: { backgroundColor: colors.white, borderRadius: 34, padding: 26, alignItems: 'center', ...shadow(2) },
	statusIcon: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
	tgBlock: { alignSelf: 'stretch', marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: colors.cardMuted, gap: 10, alignItems: 'center' },
	tgBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0088CC', paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill },
	announce: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.goldTint, padding: 10, borderRadius: radius.md },
	submittedStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted },
	header: { paddingHorizontal: 18, paddingBottom: 10, backgroundColor: 'rgba(255,249,238,0.96)', borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 },
	headerRow2: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	timer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.goldSoft },
	timerText: { fontFamily: fonts.extrabold, fontSize: 16, fontVariant: ['tabular-nums'] },
	langs: { flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.pill, padding: 3 },
	langBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
	langBtnActive: { backgroundColor: colors.gold },
	violBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.redSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
	progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.bgDeep, overflow: 'hidden' },
	progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.gold },
	nav: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
	navItem: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	navDone: { backgroundColor: colors.greenSoft, borderColor: '#BDEBCF' },
	navActive: { backgroundColor: colors.gold, borderColor: colors.goldDeep, transform: [{ scale: 1.08 }] },
	qCard: { backgroundColor: colors.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: colors.line, ...shadow(1) },
	qTag: { alignSelf: 'flex-start', backgroundColor: colors.goldTint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: 14 },
	qText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 27, color: colors.ink },
	qImageWrap: { marginTop: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	qImage: { width: '100%', height: 220 },
	zoomHint: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(12,26,54,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
	option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.white, ...shadow(1) },
	optionSelected: { borderColor: colors.gold, backgroundColor: '#FFFBEA' },
	optLetter: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	optLetterSelected: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	optText: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink2 },
	footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: 'rgba(255,249,238,0.97)', borderTopWidth: 1, borderTopColor: colors.line },
	confirmStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 16, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted },
	zoomWrap: { flex: 1, backgroundColor: 'rgba(5,10,24,0.95)', alignItems: 'center', justifyContent: 'center', padding: 12 },
	zoomClose: { position: 'absolute', right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
	blackout: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
