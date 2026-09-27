import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, CheckCircle2, History, Medal, Sliders, Trophy, Users } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Card, IconBadge, Pill, Skeleton, T } from '../../components/ui';
import { colors, fonts, gradients, radius } from '../../theme';

const L = {
	title: { uz: 'Mening tangalarim', ru: 'Мои монеты', en: 'My coins' },
	subtitle: { uz: "Tasdiqlangan o'qituvchi: 1 tanga, o'quvchi ro'yxati: 1 tanga, oltin: 5, kumush: 4, bronza: 3 tanga", ru: 'Подтверждение учителя: 1 монета, регистрация ученика: 1 монета, золото: 5, серебро: 4, бронза: 3', en: 'Teacher approval: 1 coin, student registration: 1 coin, gold: 5, silver: 4, bronze: 3' },
	total: { uz: 'Jami tanga', ru: 'Всего монет', en: 'Total coins' },
	approval: { uz: 'Tasdiqlash', ru: 'Подтверждение', en: 'Approval' },
	registrations: { uz: "O'quvchi ro'yxati", ru: 'Регистрации', en: 'Registrations' },
	gold: { uz: 'Oltin', ru: 'Золото', en: 'Gold' },
	silver: { uz: 'Kumush', ru: 'Серебро', en: 'Silver' },
	bronze: { uz: 'Bronza', ru: 'Бронза', en: 'Bronze' },
	manual: { uz: 'Admin tuzatishi', ru: 'Корректировка админа', en: 'Admin adjustment' },
	history: { uz: 'Tangalar tarixi', ru: 'История монет', en: 'Coin history' },
	noHistory: { uz: "Hozircha tangalar tarixi yo'q", ru: 'Пока нет истории монет', en: 'No coin history yet' },
	records: { uz: 'ta yozuv', ru: 'записей', en: 'records' },
	coin: { uz: 'tanga', ru: 'монет', en: 'coins' },
	breakdown: { uz: "O'quvchilar bo'yicha taqsimot", ru: 'Распределение по ученикам', en: 'Breakdown by student' },
	approvedTitle: { uz: "O'qituvchi akkaunti tasdiqlangan", ru: 'Аккаунт учителя подтверждён', en: 'Teacher account approved' },
	approvedDesc: { uz: "Ro'yxatdan o'tish tasdiqlandi", ru: 'Регистрация одобрена', en: 'Registration approved' },
	regTitle: { uz: "O'quvchilar ro'yxatdan o'tkazildi", ru: 'Регистрации учеников на олимпиаду', en: 'Student olympiad registrations' },
	regDesc: { uz: "ta muvaffaqiyatli ro'yxat", ru: 'регистраций', en: 'registrations' },
	goldTitle: { uz: 'Oltin medal (100+ ball)', ru: 'Золотая медаль (100+)', en: 'Gold medal (100+)' },
	silverTitle: { uz: 'Kumush medal (95+ ball)', ru: 'Серебряная медаль (95+)', en: 'Silver medal (95+)' },
	bronzeTitle: { uz: 'Bronza medal (90+ ball)', ru: 'Бронзовая медаль (90+)', en: 'Bronze medal (90+)' },
	manualDesc: { uz: 'Tangalar miqdori yangilandi', ru: 'Количество монет обновлено', en: 'Coin balance updated' },
};

const MEDAL = { gold: ['🥇', colors.amber, colors.goldTint], silver: ['🥈', '#64748B', '#F1F5F9'], bronze: ['🥉', '#C2410C', '#FFF7ED'] };
const TYPE = {
	teacher_approval: [CheckCircle2, colors.blue, colors.blueSoft],
	student_registration: [Users, colors.purple, colors.purpleSoft],
	medal_result: [Trophy, colors.amber, colors.goldTint],
	manual_adjustment: [Sliders, colors.navy, colors.navySoft],
};
const fmtDate = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };

export default function TeacherCoins() {
	const { tx, lang } = useLanguage();
	const { currentUser } = useAuth();
	const [coins, setCoins] = useState(null);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		const [c, h] = await Promise.allSettled([
			api.get(E.TEACHER_MY_COINS, { params: { lang } }),
			currentUser?.id ? api.get(E.TEACHER_COIN_HISTORY(currentUser.id), { params: { lang } }) : Promise.reject(),
		]);
		if (c.status === 'fulfilled') setCoins(c.value.data);
		if (h.status === 'fulfilled' && Array.isArray(h.value.data?.history)) setHistory(h.value.data.history);
		setLoading(false);
	}, [lang, currentUser?.id]);
	useEffect(() => { load(); }, [load]);

	// Website fallback: synthesize history from the coin summary when the history endpoint is empty.
	const items = useMemo(() => {
		if (history.length) return history;
		if (!coins) return [];
		const list = [];
		if (coins.registration_coins > 0) list.push({ type: 'teacher_approval', title: tx(L.approvedTitle), description: tx(L.approvedDesc), coins: coins.registration_coins, date: currentUser?.date_joined });
		if (coins.student_reg_coins > 0) list.push({ type: 'student_registration', title: tx(L.regTitle), description: `${coins.student_reg_coins} ${tx(L.regDesc)}`, coins: coins.student_reg_coins });
		(coins.entries || []).forEach((e) => list.push({ type: 'medal_result', title: tx(e.medal === 'gold' ? L.goldTitle : e.medal === 'silver' ? L.silverTitle : L.bronzeTitle), description: `${e.student_name} · ${e.olympiad_title}${e.score ? ` · ${e.score}` : ''}`, coins: e.coins }));
		if (coins.manual_adjustment) list.push({ type: 'manual_adjustment', title: tx(L.manual), description: tx(L.manualDesc), coins: coins.manual_adjustment });
		return list;
	}, [history, coins, tx, currentUser]);

	const stats = coins ? [
		[L.approval, `+${coins.registration_coins || 0}`, colors.blue],
		[L.registrations, `+${coins.student_reg_coins || 0}`, colors.purple],
		[L.gold, coins.gold || 0, colors.amber, '🥇'],
		[L.silver, coins.silver || 0, '#64748B', '🥈'],
		[L.bronze, coins.bronze || 0, '#C2410C', '🥉'],
	] : [];

	return (
		<Screen tabBar onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			{loading ? <Skeleton height={160} radiusSize={26} /> : coins ? (
				<>
					<LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
						<View style={styles.heroIcon}><Award size={26} color={colors.navyDeep} /></View>
						<T v="label" color="rgba(255,255,255,0.6)" style={{ marginTop: 12 }}>{tx(L.total)}</T>
						<T style={styles.total}>{coins.total_coins || 0}</T>
						{coins.manual_adjustment ? <Pill label={`${tx(L.manual)}: ${coins.manual_adjustment > 0 ? '+' : ''}${coins.manual_adjustment}`} color={colors.navyDeep} bg={colors.gold} /> : null}
					</LinearGradient>
					<View style={styles.grid}>
						{stats.map(([k, v, c, emoji]) => (
							<Card key={k.en} style={styles.stat}>
								<T style={{ fontFamily: fonts.extrabold, fontSize: 20, color: c }}>{emoji ? `${emoji} ` : ''}{v}</T>
								<T v="small" style={{ fontSize: 11.5 }} numberOfLines={1}>{tx(k)}</T>
							</Card>
						))}
					</View>
				</>
			) : null}

			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10 }}>
				<History size={16} color={colors.ink2} />
				<T v="h3" style={{ flex: 1 }}>{tx(L.history)}</T>
				<T v="small">{items.length} {tx(L.records)}</T>
			</View>
			{!items.length && !loading ? <T v="small">{tx(L.noHistory)}</T> : items.map((item, i) => {
				const [Icon, c, bg] = TYPE[item.type] || TYPE.manual_adjustment;
				return (
					<Card key={i} style={{ marginBottom: 8, padding: 14, flexDirection: 'row', gap: 12 }}>
						<IconBadge icon={Icon} color={c} bg={bg} size={40} />
						<View style={{ flex: 1, gap: 2 }}>
							<View style={{ flexDirection: 'row', gap: 8 }}>
								<T v="strong" style={{ flex: 1, fontSize: 14 }}>{item.title}</T>
								<T v="strong" style={{ fontSize: 14 }} color={item.coins < 0 ? colors.red : colors.green}>{item.coins > 0 ? '+' : ''}{item.coins} {tx(L.coin)}</T>
							</View>
							{item.description ? <T v="small" style={{ fontSize: 12 }}>{item.description}</T> : null}
							{item.date ? <T v="small" style={{ fontSize: 11 }}>{fmtDate(item.date)}</T> : null}
						</View>
					</Card>
				);
			})}

			{coins?.entries?.length ? (
				<>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10 }}>
						<Medal size={16} color={colors.ink2} />
						<T v="h3">{tx(L.breakdown)}</T>
					</View>
					{coins.entries.map((e, i) => {
						const [emoji, c, bg] = MEDAL[e.medal] || MEDAL.bronze;
						return (
							<View key={`${e.student_id}-${e.olympiad_id}-${i}`} style={styles.entry}>
								<View style={{ flex: 1 }}>
									<T v="strong" style={{ fontSize: 14 }}>{e.student_name}</T>
									<T v="small" style={{ fontSize: 12 }} numberOfLines={1}>{e.olympiad_title}</T>
								</View>
								<Pill label={`${emoji} ${tx(L[e.medal] || L.bronze)}`} color={c} bg={bg} />
								<T v="strong" color={colors.green}>+{e.coins}</T>
							</View>
						);
					})}
				</>
			) : null}
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { alignItems: 'center', padding: 22, borderRadius: 26, marginBottom: 12 },
	heroIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	total: { fontFamily: fonts.extrabold, fontSize: 44, color: colors.white, marginBottom: 8 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	stat: { width: '31%', flexGrow: 1, padding: 12, alignItems: 'center', gap: 2 },
	entry: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
});
