import React from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Award, Building2, Calendar, CheckCircle2, Clock, Copy, CreditCard, FileText, Play, RotateCcw, Wifi, X, Zap, BarChart3 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Card, IconBadge, Pill, T, Tap } from './ui';
import { PaymentCountdown } from './layout';
import { colors, radius } from '../theme';
import { formatDate } from '../utils/format';
import { canShowCertificate, canStartExam, isPaidLike, registrationStatus, resultForOlympiad, resultForSession, userSessionFor } from '../utils/olympiadLogic';

const STATUS_STYLE = {
	completed: { color: colors.green, bg: colors.greenSoft, key: 'completed' },
	expired: { color: colors.red, bg: colors.redSoft, key: 'expired' },
	active: { color: colors.green, bg: colors.greenSoft, key: 'active' },
	waiting: { color: colors.muted, bg: colors.cardMuted, key: 'waiting' },
};

// One registration in "My olympiads" — same actions as the website card:
// pay / cancel / re-register, unique ID, permission, certificate, start exam, result.
export default function RegistrationCard({ reg, oly, onAction, onPermission, onCertificate }) {
	const { currentUser, fetchMe } = useAuth();
	const { t, lang, pick } = useLanguage();
	const toast = useToast();
	const title = pick(oly);
	const status = registrationStatus(reg, oly);
	const st = STATUS_STYLE[status];
	const online = oly.olympiad_type === 'online';
	const expired = reg.payment_status === 'expired';
	const paid = isPaidLike(reg, oly);
	const showCert = paid && canShowCertificate(currentUser, oly, reg);
	const examResult = resultForOlympiad(currentUser, oly.id);
	const userGrade = String(currentUser?.grade || '');

	const copy = async () => {
		await Clipboard.setStringAsync(String(reg.unique_participant_id));
		toast.success(t('copied'));
	};

	const sessions = (oly.subs || [])
		.map((sub) => ({ sub, session: userSessionFor(sub, currentUser) }))
		.filter((x) => x.session);

	return (
		<Card style={[styles.card, expired && { borderColor: '#F7C9CA', opacity: 0.9 }]}>
			<View style={[styles.accent, { backgroundColor: expired ? colors.red : online ? colors.gold : colors.navy }]} />
			<View style={styles.head}>
				<IconBadge icon={expired ? X : online ? Wifi : Building2} color={expired ? colors.red : online ? colors.amber : colors.navy} bg={expired ? colors.redSoft : online ? colors.goldTint : colors.navySoft} />
				<View style={{ flex: 1 }}>
					<T v="h3" numberOfLines={2}>{title}</T>
					<View style={styles.metaRow}>
						<Pill dot label={t(st.key)} color={st.color} bg={st.bg} />
						<Pill label={online ? t('online') : t('offline')} color={online ? colors.amber : colors.navy} bg={online ? colors.goldTint : colors.navySoft} />
						{examResult?.completed_at ? <Pill icon={CheckCircle2} label={`${examResult.score} ${t('points')}`} color={colors.green} bg={colors.greenSoft} /> : null}
					</View>
				</View>
			</View>

			<View style={styles.infoRow}>
				<View style={styles.info}><Calendar size={13} color={colors.faint} /><T v="small" numberOfLines={1}>{formatDate(oly.date || oly.start_datetime, lang)}</T></View>
				{online && oly.duration ? <View style={styles.info}><Clock size={13} color={colors.faint} /><T v="small">{oly.duration} {t('min')}</T></View> : null}
			</View>

			{oly.grades?.length ? (
				<View style={styles.grades}>
					{oly.grades.map((g) => {
						const mine = String(g) === userGrade;
						return (
							<View key={g} style={[styles.grade, mine && styles.gradeMine]}>
								<T v="strong" style={{ fontSize: 11 }} color={mine ? colors.navyDeep : colors.faint}>{g}</T>
							</View>
						);
					})}
				</View>
			) : null}

			{/* Payment block */}
			{paid ? (
				<View style={{ gap: 10, marginTop: 14 }}>
					<View style={styles.paidRow}>
						<CheckCircle2 size={15} color={colors.green} />
						<T v="strong" color={colors.green} style={{ fontSize: 13 }}>{Number(oly.price) === 0 ? t('active') : t('paid')}</T>
					</View>
					{reg.unique_participant_id ? (
						<View style={styles.docRow}>
							<Tap onPress={copy} containerStyle={{ flex: 1 }} style={styles.idBox}>
								<T v="label" style={{ fontSize: 9.5 }}>{t('uniqueId')}</T>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
									<T v="mono" style={{ fontWeight: '800', fontSize: 14 }}>{reg.unique_participant_id}</T>
									<Copy size={13} color={colors.faint} />
								</View>
							</Tap>
							<Tap onPress={() => onPermission(reg, oly)} style={styles.docBtn}>
								<FileText size={17} color={colors.navy} />
								<T v="strong" style={{ fontSize: 11 }} color={colors.navy}>{t('permission')}</T>
							</Tap>
							{showCert && !sessions.length ? (
								<Tap onPress={() => onCertificate(reg, oly)} style={[styles.docBtn, { backgroundColor: colors.goldTint }]}>
									<Award size={17} color={colors.amber} />
									<T v="strong" style={{ fontSize: 11 }} color={colors.amber}>{t('certificate')}</T>
								</Tap>
							) : null}
						</View>
					) : null}
				</View>
			) : expired ? (
				<View style={[styles.payBox, { backgroundColor: colors.redSoft }]}>
					<T v="strong" color={colors.red} style={{ flex: 1, fontSize: 13.5 }}>{t('expired')}</T>
					<Button size="sm" variant="danger" icon={RotateCcw} title={t('reRegister')} onPress={() => onAction({ title: t('confirmReRegTitle'), msg: t('confirmReRegMsg'), route: `/olympiad/${oly.id}` })} />
				</View>
			) : (
				<View style={{ gap: 10, marginTop: 14 }}>
					{reg.seconds_left > 0 ? <PaymentCountdown seconds={reg.seconds_left} onExpire={fetchMe} /> : null}
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
						<Button style={{ flex: 1 }} size="md" icon={CreditCard} title={t('pay')} onPress={() => onAction({ title: t('confirmPayTitle'), msg: t('confirmPayMsg'), route: `/payment/${oly.id}`, icon: CreditCard })} />
						<Tap onPress={() => onAction({ title: t('confirmCancelTitle'), msg: t('confirmCancelMsg'), cancelRegId: reg.id, tone: 'red' })} style={styles.cancelBtn}>
							<X size={20} color={colors.red} />
						</Tap>
					</View>
				</View>
			)}

			{/* Sub-olympiads (grade sessions) */}
			{sessions.length ? (
				<View style={{ gap: 8, marginTop: 14 }}>
					{sessions.map(({ sub, session }) => {
						const result = resultForSession(currentUser, session.id);
						const startable = canStartExam(currentUser, reg, oly, session);
						const done = result?.completed_at;
						let badge;
						if (result) badge = <Pill icon={CheckCircle2} label={`${result.score} ${t('points')}`} color={colors.green} bg={colors.greenSoft} />;
						else if (session.is_completed) badge = <Pill label={t('completed')} color={colors.muted} bg={colors.cardMuted} />;
						else if (session.is_started) badge = <Pill icon={Zap} label={t('active')} color={colors.green} bg={colors.greenSoft} />;
						else badge = <Pill label={t('waiting')} color={colors.muted} bg={colors.cardMuted} />;
						return (
							<View key={sub.id} style={styles.sub}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
									<T v="strong" style={{ flex: 1, fontSize: 14 }} numberOfLines={2}>{pick(sub)}</T>
									{badge}
								</View>
								{startable ? (
									<Button size="md" icon={Play} title={t('startExam')} style={{ marginTop: 10 }} onPress={() => onAction({ title: t('confirmStartTitle'), msg: t('confirmStartMsg'), route: `/exam/${session.id}`, icon: Play, start: true })} />
								) : (done && online) || showCert ? (
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
										{done && online ? (
											<Button style={{ flex: 1 }} size="sm" variant="dark" icon={BarChart3} title={t('viewResult')} onPress={() => onAction({ title: t('viewResult'), msg: '', route: { pathname: `/analysis/${oly.id}`, params: { session: session.id } }, direct: true })} />
										) : null}
										{showCert ? <Button style={{ flex: 1 }} size="sm" variant="soft" icon={Award} title={t('certificate')} onPress={() => onCertificate(reg, oly, sub, result)} /> : null}
									</View>
								) : null}
							</View>
						);
					})}
				</View>
			) : (
				<>
					{examResult && oly.is_completed && online ? (
						<Button size="md" variant="dark" icon={Award} title={t('viewResult')} style={{ marginTop: 12 }} onPress={() => onAction({ route: `/analysis/${oly.id}`, direct: true })} />
					) : null}
					{canStartExam(currentUser, reg, oly) ? (
						<Button size="md" icon={Zap} title={t('startExam')} style={{ marginTop: 12 }} onPress={() => onAction({ title: t('confirmStartTitle'), msg: t('confirmStartMsg'), route: `/exam/${oly.id}`, icon: Play, start: true })} />
					) : null}
				</>
			)}
		</Card>
	);
}

const styles = StyleSheet.create({
	card: { overflow: 'hidden', marginBottom: 14 },
	accent: { position: 'absolute', left: 0, top: 22, bottom: 22, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
	head: { flexDirection: 'row', gap: 12 },
	metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
	infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
	info: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
	grade: { minWidth: 26, height: 24, borderRadius: 8, paddingHorizontal: 5, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	gradeMine: { backgroundColor: colors.gold },
	paidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	idBox: { flex: 1, backgroundColor: colors.cardMuted, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, gap: 3, borderWidth: 1, borderColor: colors.line },
	docBtn: { minWidth: 76, flexGrow: 1, borderRadius: radius.md, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
	payBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, marginTop: 14 },
	cancelBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
	sub: { backgroundColor: colors.cardMuted, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line },
});
