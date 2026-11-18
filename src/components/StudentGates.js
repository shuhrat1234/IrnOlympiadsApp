import React, { useEffect, useState } from 'react';
import { AppState, Linking, Modal, ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { CheckCircle2, GraduationCap, Languages, LogOut, Megaphone, RefreshCw, Send } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { colors, shadow } from '../theme';
import { Button, Field, T, Tap } from './ui';
import { GRADES, LINKS } from '../utils/constants';
import { gradeLabel } from '../utils/format';

const CYRILLIC = /[Ѐ-ӿ]/;

const suggestNextGrade = (g) => {
	if (g === 'KG') return '1';
	if (g === '11+') return '11+';
	const n = parseInt(g, 10);
	if (isNaN(n)) return g;
	return n >= 11 ? '11+' : String(n + 1);
};

// True while one of the blocking gates below is on screen — other auto-opening
// sheets (e.g. the "Who is your teacher?" prompt) wait for it, since iOS can't stack modals reliably.
export const hasStudentGate = (user) =>
	(user?.role === 'teacher' && !user.telegram_chat_id) ||
	(user?.role === 'participant' && (!!user.needs_grade_confirmation || ['first_name', 'last_name', 'middle_name'].some((k) => user[k] && CYRILLIC.test(user[k]))));

// Full-screen blockers from the website's DashboardLayout:
// 1) Teachers require Telegram bot linking + channel
// 2) New school year → confirm grade
// 3) Cyrillic name → Latin name correction
export default function StudentGates() {
	const { currentUser, fetchMe, updateProfile, logout } = useAuth();
	const { t } = useLanguage();
	const pathname = usePathname();
	const [checking, setChecking] = useState(false);
	const [gradeValue, setGradeValue] = useState(null);
	const [savingGrade, setSavingGrade] = useState(false);
	const [names, setNames] = useState({ last_name: '', first_name: '', middle_name: '' });
	const [nameError, setNameError] = useState(false);
	const [savingName, setSavingName] = useState(false);

	const needsTelegram = currentUser?.role === 'teacher' && !currentUser?.telegram_chat_id;
	const needsGrade = currentUser?.role === 'participant' && currentUser?.needs_grade_confirmation;
	const hasCyrillic = ['first_name', 'last_name', 'middle_name'].some((k) => currentUser?.[k] && CYRILLIC.test(currentUser[k]));
	const needsLatin = currentUser?.role === 'participant' && !needsGrade && hasCyrillic;

	// Coming back from Telegram → re-check automatically.
	useEffect(() => {
		if (!needsTelegram) return;
		const sub = AppState.addEventListener('change', (s) => s === 'active' && fetchMe());
		return () => sub.remove();
	}, [needsTelegram, fetchMe]);

	if (!currentUser || pathname?.startsWith('/exam') || pathname?.startsWith('/register')) return null;
	const visible = needsTelegram || needsGrade || needsLatin;
	if (!visible) return null;

	const confirmGrade = async () => {
		if (savingGrade) return;
		setSavingGrade(true);
		const now = new Date();
		const academicYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
		await updateProfile({ grade: gradeValue ?? suggestNextGrade(currentUser.grade), grade_confirmed_year: academicYear });
		setSavingGrade(false);
	};

	const saveLatin = async () => {
		if (savingName) return;
		const bad = Object.keys(names).some((k) => !names[k].trim() || CYRILLIC.test(names[k]));
		if (bad) {
			setNameError(true);
			return;
		}
		setNameError(false);
		setSavingName(true);
		await updateProfile({ first_name: names.first_name.trim(), last_name: names.last_name.trim(), middle_name: names.middle_name.trim() });
		setSavingName(false);
	};

	const selectedGrade = gradeValue ?? suggestNextGrade(currentUser.grade);

	return (
		<Modal visible transparent animationType="fade" statusBarTranslucent>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
				<View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,18,36,0.72)' }]} />
				<Animated.View entering={FadeIn.duration(200)} style={styles.card}>
					<ScrollView contentContainerStyle={{ padding: 26, alignItems: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
						{needsTelegram ? (
							<>
								<View style={[styles.icon, { backgroundColor: '#0088CC' }]}>
									<Send size={32} color="#fff" strokeWidth={2.2} />
								</View>
								<T v="h2" style={styles.center}>{t('tgGateTitle')}</T>
								<T v="body" style={[styles.center, { marginTop: 8 }]}>{t('tgGateText')}</T>
								<View style={styles.actions}>
									<Button icon={Megaphone} title={`1. ${t('joinChannel') || "Kanalga a'zo bo'lish"}`} onPress={() => Linking.openURL(LINKS.channel)} />
									<Button icon={Send} title={`2. ${t('launchBot')}`} variant="light" onPress={() => Linking.openURL(`${LINKS.bot}?start=${currentUser.participant_id || currentUser.id}`)} />
									<Button
										title={`3. ${t('checkStatus')}`}
										icon={CheckCircle2}
										variant="dark"
										loading={checking}
										onPress={async () => {
											setChecking(true);
											await fetchMe();
											setChecking(false);
										}}
									/>
								</View>
							</>
						) : needsGrade ? (
							<>
								<View style={[styles.icon, { backgroundColor: colors.gold }]}>
									<GraduationCap size={34} color={colors.navyDeep} strokeWidth={2.2} />
								</View>
								<T v="h2" style={styles.center}>{t('gradeGateTitle')}</T>
								<T v="body" style={[styles.center, { marginTop: 8 }]}>{t('gradeGateText', { g: gradeLabel(currentUser.grade, t) })}</T>
								<View style={styles.grades}>
									{GRADES.map((g) => {
										const active = String(g) === String(selectedGrade);
										return (
											<Tap key={g} onPress={() => setGradeValue(g)} style={[styles.gradeChip, active && styles.gradeChipActive]}>
												<T v="strong" color={active ? colors.navyDeep : colors.ink2} style={{ fontSize: 14 }}>{g === 'KG' ? t('kindergarten') : g}</T>
											</Tap>
										);
									})}
								</View>
								<View style={styles.actions}>
									<Button title={t('confirm')} onPress={confirmGrade} loading={savingGrade} />
								</View>
							</>
						) : (
							<>
								<View style={[styles.icon, { backgroundColor: colors.navyDeep }]}>
									<Languages size={32} color={colors.gold} strokeWidth={2.2} />
								</View>
								<T v="h2" style={styles.center}>{t('latinGateTitle')}</T>
								<T v="body" style={[styles.center, { marginTop: 8 }]}>{t('latinGateText')}</T>
								<View style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }}>
									{[
										['last_name', 'lastNameLatin'],
										['first_name', 'firstNameLatin'],
										['middle_name', 'middleNameLatin'],
									].map(([key, label]) => (
										<Field
											key={key}
											value={names[key]}
											onChangeText={(v) => setNames((p) => ({ ...p, [key]: v }))}
											placeholder={`${currentUser[key] || ''} → ${t(label)}`}
											autoCapitalize="words"
											autoCorrect={false}
										/>
									))}
									{nameError ? <T v="small" color={colors.red} style={styles.center}>{t('latinGateError')}</T> : null}
								</View>
								<View style={styles.actions}>
									<Button title={t('save')} onPress={saveLatin} loading={savingName} />
								</View>
							</>
						)}
						<Button title={t('logout')} icon={LogOut} variant="ghost" size="md" onPress={logout} style={{ marginTop: 6 }} />
					</ScrollView>
				</Animated.View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
	card: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.white, borderRadius: 34, ...shadow(3) },
	icon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
	center: { textAlign: 'center' },
	actions: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
	grades: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
	gradeChip: { minWidth: 48, height: 44, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	gradeChipActive: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
});
