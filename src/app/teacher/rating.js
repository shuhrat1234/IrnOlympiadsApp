import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Award, BookOpenCheck, MapPin, Medal, Search, Trophy, UserCheck, Users, Wrench } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Button, Card, EmptyState, Field, IconBadge, Pill, Segmented, SelectField, Skeleton, T } from '../../components/ui';
import { ChoicePills } from '../../components/form';
import { colors, fonts, radius, shadow } from '../../theme';

const L = {
	title: { uz: "O'qituvchilar reytingi", ru: 'Рейтинг учителей', en: 'Teacher leaderboard' },
	subtitle: { uz: "Respublika bo'yicha o'qituvchilar ligasi va yutuqlaringiz statistikasi", ru: 'Республиканская лига учителей и статистика ваших достижений', en: 'National teacher ranking and your personal performance' },
	myRank: { uz: 'Sizning natijangiz', ru: 'Ваш результат', en: 'Your result' },
	inCountry: { uz: "Respublika bo'yicha", ru: 'По Узбекистану', en: 'Nationwide' },
	inRegion: { uz: "Viloyat bo'yicha", ru: 'По региону', en: 'In your region' },
	among: { uz: "ta o'qituvchi orasida", ru: 'среди учителей', en: 'teachers in total' },
	totalCoins: { uz: 'Jami tangalar', ru: 'Всего монет', en: 'Total coins' },
	medals: { uz: "O'quvchilar medallari", ru: 'Медали учеников', en: 'Student medals' },
	studentRegs: { uz: "To'lovli ro'yxatlar", ru: 'Оплаченные регистрации', en: 'Paid registrations' },
	approvalBonus: { uz: "O'qituvchi bonusi", ru: 'Бонус учителя', en: 'Teacher bonus' },
	manualBonus: { uz: "Qo'shimcha bonus", ru: 'Корректировка', en: 'Adjustment' },
	tabBoard: { uz: 'Umumiy reyting', ru: 'Общий рейтинг', en: 'Leaderboard' },
	tabRules: { uz: 'Tangalar qoidalari', ru: 'Правила начисления', en: 'Coin rules' },
	search: { uz: "O'qituvchi yoki viloyat nomi bo'yicha...", ru: 'Поиск по имени или региону...', en: 'Search by name or region...' },
	allRegions: { uz: 'Barcha viloyatlar', ru: 'Все регионы', en: 'All regions' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	sortCoins: { uz: "Tangalar bo'yicha", ru: 'По монетам', en: 'By coins' },
	sortGold: { uz: "Oltinlar bo'yicha", ru: 'По золоту', en: 'By gold' },
	sortStudents: { uz: "O'quvchilar soni", ru: 'По числу учеников', en: 'By students' },
	you: { uz: 'Siz', ru: 'Вы', en: 'You' },
	students: { uz: "o'quvchi", ru: 'учеников', en: 'students' },
	loadMore: { uz: "Yana ko'rsatish", ru: 'Показать ещё', en: 'Show more' },
	empty: { uz: "O'qituvchilar topilmadi", ru: 'Учителя не найдены', en: 'No teachers found' },
	maintBadge: { uz: 'Texnik ishlar', ru: 'Технические работы', en: 'Maintenance' },
	maintTitle: { uz: 'Reyting vaqtincha yopiq', ru: 'Рейтинг временно недоступен', en: 'Leaderboard is temporarily unavailable' },
	maintDesc: { uz: "Reyting bo'limida texnik ishlar olib borilmoqda. Tez orada qaytamiz.", ru: 'В разделе рейтинга учителей ведутся технические работы. Скоро всё заработает.', en: 'The teacher rating section is under maintenance. It will be back soon.' },
	rulesTitle: { uz: 'Tangalar hisoblanish tartibi', ru: 'Правила начисления монет', en: 'How coins are awarded' },
	rulesSub: { uz: "IRN Respublika, NextGen va XpertStem seriyalari bo'yicha hisoblash qoidalari", ru: 'Система начисления баллов по сериям Республиканская IRN, NextGen и XpertStem', en: 'Scoring rules for the IRN Republic, NextGen and XpertStem series' },
};

const RULES = [
	{
		icon: UserCheck, tone: [colors.blue, colors.blueSoft],
		title: { uz: "1. O'qituvchi ro'yxatdan o'tishi", ru: '1. Регистрация учителя', en: '1. Teacher registration' },
		desc: { uz: "Tizimda o'qituvchi sifatida ro'yxatdan o'tib, admin tasdiqlaganida bir martalik beriladi:", ru: 'За регистрацию в качестве учителя и подтверждение аккаунта администрацией начисляется единоразово:', en: 'Awarded once for registering as a teacher and getting the account approved:' },
		badges: [{ uz: '+1 tanga', ru: '+1 монета', en: '+1 coin' }],
	},
	{
		icon: Users, tone: [colors.purple, colors.purpleSoft],
		title: { uz: "2. O'quvchilarning to'lovli ro'yxatlari", ru: '2. Оплаченная регистрация ученика', en: '2. Paid student registrations' },
		desc: { uz: "Sizga biriktirilgan har bir o'quvchi IRN Respublika, NextGen va XpertStem olimpiadalariga muvaffaqiyatli to'lov qilganda:", ru: 'За каждого прикреплённого ученика, успешно оплатившего участие в олимпиадах Республиканская IRN, NextGen и XpertStem:', en: 'For every linked student who pays for an IRN Republic, NextGen or XpertStem olympiad:' },
		badges: [{ uz: "Har bir to'lovli o'quvchi uchun +1 tanga", ru: '+1 монета за каждого ученика', en: '+1 coin per paid student' }],
	},
	{
		icon: Medal, tone: [colors.amber, colors.goldTint],
		title: { uz: "3. O'quvchilarning sovrinli medallari", ru: '3. Медали учеников', en: '3. Student medals' },
		desc: { uz: "IRN Respublika, NextGen va XpertStem olimpiadalarida (onlayn va rasmiy protokollar bo'yicha) o'quvchilaringizning medallari uchun:", ru: 'За призовые результаты прикреплённых учеников в олимпиадах Республиканская IRN, NextGen и XpertStem (онлайн и очные протоколы):', en: 'For medals your students win in IRN Republic, NextGen and XpertStem olympiads (online and official protocols):' },
		badges: [
			{ icon: Medal, tone: [colors.amber, colors.goldTint], uz: "Oltin medal (100+ ball): +5 tanga", ru: 'Золотая медаль (100+ баллов): +5 монет', en: 'Gold medal (100+ points): +5 coins' },
			{ icon: Medal, tone: ['#64748B', '#F1F5F9'], uz: "Kumush medal (95+ ball): +4 tanga", ru: 'Серебряная медаль (95+ баллов): +4 монеты', en: 'Silver medal (95+ points): +4 coins' },
			{ icon: Medal, tone: ['#C2410C', '#FFF7ED'], uz: "Bronza medal (90+ ball): +3 tanga", ru: 'Бронзовая медаль (90+ баллов): +3 монеты', en: 'Bronze medal (90+ points): +3 coins' },
		],
	},
	{
		icon: Award, tone: [colors.green, colors.greenSoft],
		title: { uz: '4. Reyting yetakchilarini taqdirlash', ru: '4. Награды и признание', en: '4. Awards and recognition' },
		desc: { uz: "Eng faol va yuqori natija ko'rsatgan o'qituvchilar tashkilotchilar tomonidan maxsus sertifikat, diplom va qimmatbaho esdalik sovg'alari bilan taqdirlanadi.", ru: 'Учителя, занявшие лидирующие места в республиканском рейтинге, награждаются официальными дипломами, бонусами и ценными подарками.', en: 'Teachers at the top of the national ranking receive official diplomas, bonuses and valuable gifts.' },
		badges: [{ uz: 'Sertifikat va maxsus mukofotlar', ru: 'Дипломы и ценные призы', en: 'Diplomas and special awards' }],
	},
];

const PAGE = 30;
const PODIUM = ['#F2A900', '#94A3B8', '#C2410C'];

// Website /teacher/rating: national leaderboard + the teacher's own place and the coin rules.
export default function TeacherRating() {
	const { tx, lang } = useLanguage();
	const { currentUser } = useAuth();
	const [loading, setLoading] = useState(true);
	const [maintenance, setMaintenance] = useState(null);
	const [teachers, setTeachers] = useState([]);
	const [myCoins, setMyCoins] = useState(null);
	const [tab, setTab] = useState('board');
	const [query, setQuery] = useState('');
	const [region, setRegion] = useState('all');
	const [sortBy, setSortBy] = useState('coins');
	const [page, setPage] = useState(1);

	const load = useCallback(async () => {
		let under = false;
		let message = '';
		try {
			const st = await api.get(E.TEACHER_RATING_STATUS, { params: { _t: Date.now() } });
			under = st.data?.is_under_maintenance === true;
			message = st.data?.message || '';
		} catch {}
		if (!under) {
			const [list, mine] = await Promise.allSettled([
				api.get(E.TEACHER_COINS, { params: { lang, page_size: 'all' }, timeout: 90000 }),
				api.get(E.TEACHER_MY_COINS, { params: { lang } }),
			]);
			if (list.status === 'fulfilled') {
				const raw = list.value.data;
				if (raw?.is_under_maintenance) { under = true; message = raw.message || message; }
				else setTeachers(Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []);
			}
			if (mine.status === 'fulfilled') setMyCoins(mine.value.data);
		}
		setMaintenance(under ? message || tx(L.maintDesc) : null);
		setLoading(false);
	}, [lang]);
	useEffect(() => { load(); }, [load]);

	// The API returns teachers ordered by total coins — the index is the national place.
	const ranked = useMemo(() => [...teachers].sort((a, b) => (b.total_coins || 0) - (a.total_coins || 0)), [teachers]);
	const regions = useMemo(() => [...new Set(teachers.map((t) => t.region_name).filter(Boolean))].sort(), [teachers]);

	const my = useMemo(() => {
		const id = Number(currentUser?.id);
		const idx = ranked.findIndex((t) => Number(t.teacher_id) === id);
		const row = idx !== -1 ? ranked[idx] : null;
		const myRegion = row?.region_name || null;
		const inRegion = myRegion ? ranked.filter((t) => t.region_name === myRegion) : [];
		const rIdx = inRegion.findIndex((t) => Number(t.teacher_id) === id);
		const gold = row?.gold ?? myCoins?.gold ?? 0;
		const silver = row?.silver ?? myCoins?.silver ?? 0;
		const bronze = row?.bronze ?? myCoins?.bronze ?? 0;
		return {
			rank: idx !== -1 ? idx + 1 : null,
			regionRank: rIdx !== -1 ? rIdx + 1 : null,
			regionCount: inRegion.length,
			myRegion,
			total: row?.total_coins ?? myCoins?.total_coins ?? 0,
			gold, silver, bronze,
			studentRegs: row?.student_reg_count ?? myCoins?.student_reg_coins ?? 0,
			regCoins: row?.registration_coin ?? myCoins?.registration_coins ?? 0,
			manualAdj: row?.manual_adjustment ?? myCoins?.manual_adjustment ?? 0,
		};
	}, [ranked, currentUser?.id, myCoins]);

	const filtered = useMemo(() => {
		const q = query.toLowerCase().trim();
		let list = ranked.map((t, i) => ({ ...t, place: i + 1 }));
		if (q) list = list.filter((t) => (t.teacher_name || '').toLowerCase().includes(q) || (t.region_name || '').toLowerCase().includes(q));
		if (region !== 'all') list = list.filter((t) => t.region_name === region);
		if (sortBy === 'gold') list.sort((a, b) => (b.gold || 0) - (a.gold || 0) || (b.total_coins || 0) - (a.total_coins || 0));
		else if (sortBy === 'students') list.sort((a, b) => (b.student_reg_count || 0) - (a.student_reg_count || 0) || (b.total_coins || 0) - (a.total_coins || 0));
		return list;
	}, [ranked, query, region, sortBy]);
	// Any filter change starts the list from the first page again.
	const filterBy = (setter) => (value) => { setter(value); setPage(1); };

	if (!loading && maintenance) {
		return (
			<Screen tabBar onRefresh={load}>
				<LargeTitle title={tx(L.title)} />
				<Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
					<Pill label={tx(L.maintBadge)} color={colors.amber} bg={colors.goldTint} dot />
					<IconBadge icon={Wrench} size={68} />
					<T v="h2" style={{ textAlign: 'center' }}>{tx(L.maintTitle)}</T>
					<T v="body" style={{ textAlign: 'center' }}>{maintenance}</T>
				</Card>
			</Screen>
		);
	}

	const myId = Number(currentUser?.id);
	const metrics = [
		[tx(L.approvalBonus), `+${my.regCoins}`],
		[tx(L.studentRegs), `+${my.studentRegs}`],
		[tx(L.medals), `${my.gold || 0} / ${my.silver || 0} / ${my.bronze || 0}`],
		...(my.manualAdj ? [[tx(L.manualBonus), `${my.manualAdj > 0 ? '+' : ''}${my.manualAdj}`]] : []),
	];

	return (
		<Screen tabBar onRefresh={load} keyboard>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />

			{loading ? <Skeleton height={190} radiusSize={26} /> : (
				<View style={styles.hero}>
					<T v="label" color={colors.gold} style={{ letterSpacing: 2 }}>{tx(L.myRank)}</T>
					<View style={styles.heroRow}>
						<View style={styles.rankBox}>
							<T style={styles.rankValue}>{my.rank ? `#${my.rank}` : '—'}</T>
							<T v="small" color="rgba(255,255,255,0.65)" style={{ fontSize: 11.5 }}>{tx(L.inCountry)}</T>
							<T v="small" color="rgba(255,255,255,0.45)" style={{ fontSize: 11 }}>{ranked.length} {tx(L.among)}</T>
						</View>
						<View style={[styles.rankBox, styles.rankDivider]}>
							<T style={styles.rankValue}>{my.regionRank ? `#${my.regionRank}` : '—'}</T>
							<T v="small" color="rgba(255,255,255,0.65)" style={{ fontSize: 11.5 }}>{tx(L.inRegion)}</T>
							{my.myRegion ? <T v="small" color="rgba(255,255,255,0.45)" style={{ fontSize: 11 }} numberOfLines={1}>{my.myRegion} · {my.regionCount}</T> : null}
						</View>
						<View style={[styles.rankBox, styles.rankDivider]}>
							<T style={[styles.rankValue, { color: colors.gold }]}>{my.total}</T>
							<T v="small" color="rgba(255,255,255,0.65)" style={{ fontSize: 11.5 }}>{tx(L.totalCoins)}</T>
						</View>
					</View>
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
						{metrics.map(([label, value]) => <Pill key={label} label={`${label}: ${value}`} color="#fff" bg="rgba(255,255,255,0.12)" />)}
					</View>
				</View>
			)}

			<Segmented
				style={{ marginTop: 16, marginBottom: 14 }}
				value={tab}
				onChange={setTab}
				options={[{ value: 'board', label: tx(L.tabBoard), icon: Trophy }, { value: 'rules', label: tx(L.tabRules), icon: BookOpenCheck }]}
			/>

			{tab === 'board' ? (
				<>
					<View style={{ gap: 10, marginBottom: 12 }}>
						<Field icon={Search} value={query} onChangeText={filterBy(setQuery)} placeholder={tx(L.search)} autoCorrect={false} autoCapitalize="none" />
						{regions.length > 1 ? (
							<SelectField icon={MapPin} title={tx(L.region)} value={region} options={[{ value: 'all', label: tx(L.allRegions) }, ...regions.map((r) => ({ value: r, label: r }))]} onChange={filterBy(setRegion)} />
						) : null}
						<ChoicePills value={sortBy} onChange={filterBy(setSortBy)} options={[{ value: 'coins', label: tx(L.sortCoins) }, { value: 'gold', label: tx(L.sortGold) }, { value: 'students', label: tx(L.sortStudents) }]} />
					</View>
					{loading ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} radiusSize={18} style={{ marginBottom: 8 }} />) : !filtered.length ? <EmptyState icon={Trophy} title={tx(L.empty)} /> : filtered.slice(0, page * PAGE).map((t) => {
						const mine = Number(t.teacher_id) === myId;
						return (
							<View key={t.teacher_id} style={[styles.row, mine && styles.rowMine]}>
								<View style={[styles.place, t.place <= 3 && { backgroundColor: PODIUM[t.place - 1] }]}>
									<T style={[styles.placeText, t.place <= 3 && { color: colors.white }]}>{t.place}</T>
								</View>
								<View style={{ flex: 1, gap: 2 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
										<T v="strong" style={{ flexShrink: 1, fontSize: 14 }} numberOfLines={1}>{t.teacher_name}</T>
										{mine ? <Pill label={tx(L.you)} color={colors.navyDeep} bg={colors.gold} /> : null}
									</View>
									<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
										{t.region_name ? <T v="small" style={{ fontSize: 12 }}>{t.region_name} ·</T> : null}
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Medal size={12} color={colors.amber} /><T v="small" style={{ fontSize: 11.5, color: colors.amber, fontFamily: fonts.bold }}>{t.gold || 0}</T></View>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Medal size={12} color="#64748B" /><T v="small" style={{ fontSize: 11.5, color: '#64748B', fontFamily: fonts.bold }}>{t.silver || 0}</T></View>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Medal size={12} color="#C2410C" /><T v="small" style={{ fontSize: 11.5, color: '#C2410C', fontFamily: fonts.bold }}>{t.bronze || 0}</T></View>
										{t.student_reg_count ? <T v="small" style={{ fontSize: 12 }}>· {t.student_reg_count} {tx(L.students)}</T> : null}
									</View>
								</View>
								<View style={{ alignItems: 'flex-end' }}>
									<T style={styles.coins}>{t.total_coins || 0}</T>
								</View>
							</View>
						);
					})}
					{!loading && filtered.length > page * PAGE ? <Button size="sm" variant="light" title={`${tx(L.loadMore)} (${filtered.length - page * PAGE})`} onPress={() => setPage((p) => p + 1)} style={{ marginTop: 4 }} /> : null}
				</>
			) : (
				<>
					<T v="h3">{tx(L.rulesTitle)}</T>
					<T v="small" style={{ marginBottom: 12 }}>{tx(L.rulesSub)}</T>
					{RULES.map((rule) => (
						<Card key={rule.title.en} style={{ marginBottom: 10, padding: 16 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
								<IconBadge icon={rule.icon} size={40} color={rule.tone[0]} bg={rule.tone[1]} />
								<T v="strong" style={{ flex: 1 }}>{tx(rule.title)}</T>
							</View>
							<T v="small" style={{ marginTop: 8, color: colors.ink2 }}>{tx(rule.desc)}</T>
							<View style={{ gap: 6, marginTop: 10, alignItems: 'flex-start' }}>
								{rule.badges.map((b) => <Pill key={b.en} icon={b.icon} label={tx(b)} color={b.tone ? b.tone[0] : rule.tone[0]} bg={b.tone ? b.tone[1] : rule.tone[1]} />)}
							</View>
						</Card>
					))}
				</>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { backgroundColor: colors.navyDeep, padding: 18, borderRadius: 26, ...shadow(2) },
	heroRow: { flexDirection: 'row', marginTop: 12 },
	rankBox: { flex: 1, gap: 2, paddingHorizontal: 4 },
	rankDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)', paddingLeft: 12 },
	rankValue: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.white },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
	rowMine: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	place: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	placeText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink2 },
	coins: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.amber },
});
