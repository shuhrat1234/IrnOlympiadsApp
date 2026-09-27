import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { AlertCircle, BarChart3, Calendar, ChevronDown, ChevronUp, Trophy } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, Pill, SkeletonCard, T, Tap } from '../../components/ui';
import { colors, fonts, radius } from '../../theme';
import { formatDate } from '../../utils/format';

const scoreTone = (s) => (s >= 90 ? [colors.green, colors.greenSoft] : s >= 70 ? [colors.goldDeep, colors.goldTint] : s >= 40 ? [colors.blue, colors.blueSoft] : [colors.red, colors.redSoft]);

export default function ResultsTab() {
	const { fetchMe } = useAuth();
	const { t, lang } = useLanguage();
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState({});

	const load = useCallback(async () => {
		try {
			const res = await api.get(E.PERSONAL_RESULTS, { params: { lang } });
			setResults(Array.isArray(res.data) ? res.data : res.data?.results || []);
		} catch {
		} finally {
			setLoading(false);
		}
	}, [lang]);

	useEffect(() => {
		fetchMe();
		load();
	}, [load]);

	const openAnalysis = (res) => {
		const session = res.session_id || res.sub_olympiad_grade || res.grade_session_id || res.id;
		const sub = res.sub_id || res.sub_olympiad_id || res.sub_olympiad;
		router.push({ pathname: `/analysis/${res.olympiad_id}`, params: { session, ...(sub ? { sub } : {}) } });
	};

	return (
		<Screen onRefresh={() => Promise.all([fetchMe(), load()])} tabBar>
			<LargeTitle title={t('resultsTitle')} subtitle={t('resultsSub')} />
			{loading ? (
				<View style={{ gap: 14 }}>
					<SkeletonCard />
					<SkeletonCard />
				</View>
			) : results.length === 0 ? (
				<EmptyState icon={Trophy} title={t('noResults')} text={t('noResultsSub')} />
			) : (
				results.map((res, i) => {
					const score = Number(res.score) || 0;
					const [fg, bg] = scoreTone(score);
					const mistakes = res.mistakes || [];
					return (
						<Animated.View key={res.id} entering={FadeInDown.delay(i * 60)}>
							<Card style={{ marginBottom: 14 }}>
								<View style={{ flexDirection: 'row', gap: 14 }}>
									<View style={[styles.ring, { borderColor: fg, backgroundColor: bg }]}>
										<T style={[styles.score, { color: fg }]}>{res.score}</T>
										<T v="label" style={{ fontSize: 8.5 }} color={fg}>{t('score')}</T>
									</View>
									<View style={{ flex: 1 }}>
										<Pill label={res.olympiad_type === 'online' ? t('online') : t('offline')} color={res.olympiad_type === 'online' ? colors.amber : colors.navy} bg={res.olympiad_type === 'online' ? colors.goldTint : colors.navySoft} />
										<T v="h3" numberOfLines={2} style={{ marginTop: 8 }}>{res.olympiad_title}</T>
										{res.sub_olympiad_title ? <T v="small" numberOfLines={1} style={{ marginTop: 2 }}>{res.sub_olympiad_title}</T> : null}
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
											<Calendar size={13} color={colors.faint} />
											<T v="small">{formatDate(res.completed_at, lang)}</T>
										</View>
									</View>
								</View>

								{mistakes.length ? (
									<View style={{ marginTop: 14 }}>
										<Tap onPress={() => setOpen((p) => ({ ...p, [res.id]: !p[res.id] }))} style={styles.mistakeToggle}>
											<AlertCircle size={15} color={colors.red} />
											<T v="strong" color={colors.red} style={{ flex: 1, fontSize: 13.5 }}>{open[res.id] ? t('hideMistakes') : t('showMistakes', { n: mistakes.length })}</T>
											{open[res.id] ? <ChevronUp size={16} color={colors.red} /> : <ChevronDown size={16} color={colors.red} />}
										</Tap>
										{open[res.id] ? (
											<Animated.View entering={FadeIn} exiting={FadeOut} style={{ gap: 8, marginTop: 10 }}>
												{mistakes.map((m, idx) => (
													<View key={idx} style={styles.mistake}>
														<View style={styles.qNum}><T v="strong" style={{ fontSize: 12 }}>{m.question_number}</T></View>
														<View style={{ flex: 1, gap: 2 }}>
															<T v="small">{t('yourAnswer')}: <T v="small" style={{ fontFamily: fonts.extrabold, color: colors.red }}>{m.user_answer || '—'}</T></T>
															<T v="small">{t('correctShort')}: <T v="small" style={{ fontFamily: fonts.extrabold, color: colors.green }}>{m.correct_answer || '—'}</T></T>
														</View>
														<T v="strong" color={colors.red} style={{ fontSize: 13 }}>-{m.minus_points}</T>
													</View>
												))}
											</Animated.View>
										) : null}
									</View>
								) : null}

								{res.olympiad_type === 'online' ? <Button title={t('viewAnalysis')} icon={BarChart3} variant="dark" size="md" style={{ marginTop: 14 }} onPress={() => openAnalysis(res)} /> : null}
							</Card>
						</Animated.View>
					);
				})
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	ring: { width: 76, height: 76, borderRadius: 26, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
	score: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 30 },
	mistakeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.redSoft, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
	mistake: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 10 },
	qNum: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
});
