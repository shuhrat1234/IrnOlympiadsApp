import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Award, BarChart2, CheckCircle2, Clock, Info, ListChecks, Send, Trophy, X, XCircle } from 'lucide-react-native';
import api, { mediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { Screen, StackHeader } from '../../components/layout';
import { Button, Card, EmptyState, Loader, Segmented, T } from '../../components/ui';
import { CertificateSheet } from '../../components/DocumentSheets';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatDate } from '../../utils/format';
import { LINKS } from '../../utils/constants';

const ScoreRing = ({ score }) => {
	const size = 150;
	const stroke = 12;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, Number(score) || 0));
	return (
		<View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
			<Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
				<Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
				<Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.gold} strokeWidth={stroke} fill="none" strokeDasharray={`${(c * pct) / 100} ${c}`} strokeLinecap="round" />
			</Svg>
			<T style={{ fontFamily: fonts.extrabold, fontSize: 42, color: '#fff' }}>{score}</T>
			<T v="small" color="rgba(255,255,255,0.6)">/ 100</T>
		</View>
	);
};

export default function AnalysisScreen() {
	const { id, session, sub } = useLocalSearchParams();
	const insets = useSafeAreaInsets();
	const { currentUser } = useAuth();
	const { t, lang } = useLanguage();
	const { olympiads, getOlympiad } = useOlympiad();
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState('summary');
	const [zoom, setZoom] = useState(null);
	const [cert, setCert] = useState(null);

	// Same fallback chain as the website (endpoint naming changed over time).
	useEffect(() => {
		let alive = true;
		(async () => {
			setLoading(true);
			setError(null);
			if (!session && !sub) {
				setError(t('analysisMissing'));
				setLoading(false);
				return;
			}
			const params = { lang, ...(sub ? { sub_id: sub } : {}) };
			const withSession = { ...params, grade_session_id: session, sub_olympiad_grade: session };
			const attempts = [
				() => api.get(`exams/${id}/analysis/`, { params: withSession }),
				...(session && session !== 'null'
					? [() => api.get(`exams/grade-sessions/${session}/analysis/`, { params }), () => api.get(`exams/grade-session/${session}/analysis/`, { params })]
					: []),
				...(sub && sub !== id ? [() => api.get(`exams/${sub}/analysis/`, { params: withSession })] : []),
				() => api.get('exams/analysis/', { params: withSession }),
			];
			const errors = [];
			for (const attempt of attempts) {
				try {
					const res = await attempt();
					if (alive) setData(res.data);
					setLoading(false);
					return;
				} catch (e) {
					errors.push(e);
				}
			}
			if (!alive) return;
			const text = JSON.stringify(errors.map((e) => e.response?.data || '')).toLowerCase();
			if (text.includes('not completed')) setError(t('analysisNotCompleted'));
			else if (errors.some((e) => e.response?.status === 404)) setError(t('analysisNotFound'));
			else setError(errors[0]?.response?.data?.error || errors[0]?.response?.data?.detail || t('error'));
			setLoading(false);
		})();
		return () => { alive = false; };
	}, [id, session, sub, lang]);

	const sessionFromContext = useMemo(() => {
		for (const o of olympiads) for (const s of o.subs || []) {
			const gs = (s.grade_sessions || []).find((g) => String(g.id) === String(session));
			if (gs) return gs;
		}
		return null;
	}, [olympiads, session]);

	if (loading) return <Screen header={<StackHeader title={t('analysisTitle')} />}><Loader label={t('loading')} /></Screen>;

	if (error || !data) {
		return (
			<Screen header={<StackHeader title={t('analysisTitle')} />}>
				<EmptyState icon={Info} title={t('error')} text={error} action={<Button title={t('back')} variant="dark" onPress={() => router.back()} />} />
			</Screen>
		);
	}

	const completed = data.is_completed === true || data.session_is_completed === true || data.session?.is_completed === true || sessionFromContext?.is_completed === true || data.status === 'completed' || data.session?.status === 'completed';
	const score = Number(data.score) || 0;
	const stats = data.stats || { correct: 0, wrong: 0, total: 0 };
	const motivation = score >= 90 ? t('topTier') : score >= 70 ? t('solidGrasp') : t('goodAttempt');

	const openCert = () => {
		const oly = getOlympiad(id);
		setCert({
			title: data.olympiad_title,
			olympiad_title: data.olympiad_title,
			sub_title: data.sub_title,
			score: data.score,
			date: formatDate(data.completed_at, lang, { time: false }),
			grade: String(currentUser?.grade || ''),
			oly,
		});
	};

	return (
		<Screen header={<StackHeader title={t('analysisTitle')} subtitle={data.sub_title || data.olympiad_title} />}>
			<Animated.View entering={FadeInDown}>
				<View style={styles.hero}>
					<View style={styles.glow} />
					<ScoreRing score={data.score} />
					<T v="h2" color="#fff" style={{ marginTop: 14, textAlign: 'center' }}>{score >= 70 ? t('congrats') : t('keepGoing')}</T>
					<T v="small" color="rgba(255,255,255,0.65)" style={{ textAlign: 'center', marginTop: 4 }} numberOfLines={2}>{data.olympiad_title}</T>
					<View style={styles.statRow}>
						<View style={styles.stat}>
							<CheckCircle2 size={18} color="#4ADE80" />
							<T style={styles.statVal}>{stats.correct}</T>
							<T v="small" color="rgba(255,255,255,0.6)">{t('correctShort')}</T>
						</View>
						<View style={[styles.stat, styles.statDiv]}>
							<XCircle size={18} color="#FF8A8D" />
							<T style={styles.statVal}>{stats.wrong}</T>
							<T v="small" color="rgba(255,255,255,0.6)">{t('mistakes')}</T>
						</View>
						<View style={[styles.stat, styles.statDiv]}>
							<BarChart2 size={18} color={colors.gold} />
							<T style={styles.statVal}>{stats.total}</T>
							<T v="small" color="rgba(255,255,255,0.6)">{t('total')}</T>
						</View>
					</View>
				</View>
			</Animated.View>

			{completed ? (
				<Segmented value={tab} onChange={setTab} style={{ marginTop: 18 }} options={[{ value: 'summary', label: t('summary'), icon: Trophy }, { value: 'questions', label: t('questions'), icon: ListChecks }]} />
			) : null}

			{tab === 'summary' ? (
				<View style={{ marginTop: 16, gap: 14 }}>
					<Card>
						<T v="body">{t('performance')} {motivation}</T>
						{data.completed_at ? (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
								<Clock size={14} color={colors.faint} />
								<T v="small">{formatDate(data.completed_at, lang)}</T>
							</View>
						) : null}
						<View style={{ gap: 10, marginTop: 16 }}>
							{completed ? <Button title={t('viewStats')} icon={ListChecks} variant="dark" size="md" onPress={() => setTab('questions')} /> : null}
						</View>
					</Card>
					<Card style={{ alignItems: 'center' }}>
						<T v="small" style={{ textAlign: 'center' }}>{t('tgChannel')}</T>
						<Button title="@IRN_Olympiads" icon={Send} size="sm" style={{ marginTop: 10 }} variant="dark" onPress={() => Linking.openURL(LINKS.channel)} />
					</Card>
				</View>
			) : (
				<View style={{ marginTop: 16, gap: 12 }}>
					{(data.questions || []).map((q, idx) => {
						const correct = q.user_answer === q.correct_answer;
						return (
							<Card key={q.id}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
									<View style={[styles.qNum, { backgroundColor: correct ? colors.greenSoft : colors.redSoft }]}>
										<T v="strong" color={correct ? colors.green : colors.red}>{idx + 1}</T>
									</View>
									<T v="label" style={{ flex: 1 }}>{t('question')} {idx + 1}</T>
									{correct ? <CheckCircle2 size={18} color={colors.green} /> : <XCircle size={18} color={colors.red} />}
								</View>
								<T v="strong" style={{ fontSize: 15.5, lineHeight: 22 }}>{q.text}</T>
								{q.image ? (
									<Pressable onPress={() => setZoom(mediaUrl(q.image))} style={styles.qImg}>
										<Image source={{ uri: mediaUrl(q.image) }} style={{ width: '100%', height: 180 }} resizeMode="contain" />
									</Pressable>
								) : null}
								<View style={{ gap: 8, marginTop: 12 }}>
									{(q.options || []).map((opt) => {
										const isCorrect = opt.id === q.correct_answer;
										const isMine = opt.id === q.user_answer;
										const tone = isCorrect ? [colors.greenSoft, colors.green, '#BDEBCF'] : isMine ? [colors.redSoft, colors.red, '#F7C9CA'] : [colors.cardMuted, colors.muted, colors.line];
										return (
											<View key={opt.id} style={[styles.opt, { backgroundColor: tone[0], borderColor: tone[2] }, !isCorrect && !isMine && { opacity: 0.7 }]}>
												<View style={[styles.optLetter, (isCorrect || isMine) && { backgroundColor: tone[1] }]}>
													<T v="strong" color={isCorrect || isMine ? '#fff' : colors.muted} style={{ fontSize: 13 }}>{opt.id}</T>
												</View>
												<T v="body" style={{ flex: 1, color: colors.ink, fontSize: 14 }}>{opt.text}</T>
												{isCorrect ? <T v="label" color={colors.green} style={{ fontSize: 9 }}>{t('correctAnswer')}</T> : isMine ? <T v="label" color={colors.red} style={{ fontSize: 9 }}>{t('yourAnswer')}</T> : null}
											</View>
										);
									})}
								</View>
							</Card>
						);
					})}
				</View>
			)}

			<Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
				<Pressable style={styles.zoom} onPress={() => setZoom(null)}>
					{zoom ? <Image source={{ uri: zoom }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
					<View style={[styles.zoomClose, { top: insets.top + 12 }]}><X size={22} color="#fff" /></View>
				</Pressable>
			</Modal>
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { backgroundColor: colors.navyDeep, borderRadius: 32, padding: 24, alignItems: 'center', overflow: 'hidden', ...shadow(3) },
	glow: { position: 'absolute', top: -80, width: 260, height: 260, borderRadius: 130, borderWidth: 30, borderColor: 'rgba(253,200,0,0.08)' },
	statRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingVertical: 14 },
	stat: { flex: 1, alignItems: 'center', gap: 2 },
	statDiv: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
	statVal: { fontFamily: fonts.extrabold, fontSize: 22, color: '#fff', marginTop: 2 },
	qNum: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	qImg: { marginTop: 12, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.cardMuted },
	opt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, borderWidth: 1 },
	optLetter: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	zoom: { flex: 1, backgroundColor: 'rgba(5,10,24,0.95)', alignItems: 'center', justifyContent: 'center', padding: 12 },
	zoomClose: { position: 'absolute', right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
