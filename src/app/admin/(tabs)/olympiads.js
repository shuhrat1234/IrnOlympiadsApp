import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Building2, Calendar, CheckSquare, ChevronDown, ChevronUp, Clock, Edit3, Eye, EyeOff, GraduationCap, Play, Plus, Search, Square, Trash2, Users, Wifi } from 'lucide-react-native';
import api from '../../../api/client';
import { useLanguage } from '../../../context/LanguageContext';
import { useOlympiad } from '../../../context/OlympiadContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, LargeTitle } from '../../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Sheet, SkeletonCard, T, Tap } from '../../../components/ui';
import { colors, fonts, radius } from '../../../theme';
import { formatDate, formatPrice, formatShortDate } from '../../../utils/format';

const L = {
	title: { ru: 'Олимпиады', uz: 'Olimpiadalar', en: 'Olympiads' },
	subtitle: { ru: 'Создание, редактирование и управление статусами', uz: 'Yaratish, tahrirlash va holatlarni boshqarish', en: 'Create, edit and manage statuses' },
	add: { ru: 'Добавить', uz: "Qo'shish", en: 'Add New' },
	online: { ru: 'Онлайн', uz: 'Onlayn', en: 'Online' },
	offline: { ru: 'Офлайн', uz: 'Oflayn', en: 'Offline' },
	start: { ru: 'Начать', uz: 'Boshlash', en: 'Start' },
	finish: { ru: 'Завершить', uz: 'Yakunlash', en: 'Finish' },
	started: { ru: 'Запущено', uz: 'Boshlandi', en: 'Started' },
	completed: { ru: 'Завершено', uz: 'Tugallangan', en: 'Completed' },
	hidden: { ru: 'Скрыта', uz: 'Yashirin', en: 'Hidden' },
	grade: { ru: 'кл.', uz: '-sinf', en: 'gr.' },
	schedule: { ru: 'Расписание', uz: 'Jadval', en: 'Schedule' },
	hide: { ru: 'Скрыть', uz: 'Yashirish', en: 'Hide' },
	noSessions: { ru: 'Расписание по классам не задано', uz: "Sinf jadvali yo'q", en: 'No grade schedule' },
	confirmStart: { ru: 'Начать олимпиаду?', uz: 'Olimpiadani boshlashni tasdiqlaysizmi?', en: 'Start Olympiad?' },
	confirmFinish: { ru: 'Завершить олимпиаду?', uz: 'Olimpiadani yakunlashni tasdiqlaysizmi?', en: 'Finish Olympiad?' },
	confirmStartSession: { ru: 'Начать сессию для класса?', uz: 'Sinf uchun sessiyani boshlaysizmi?', en: 'Start Grade Session?' },
	confirmFinishSession: { ru: 'Завершить сессию для класса?', uz: 'Sinf uchun sessiyani yakunlaysizmi?', en: 'Finish Grade Session?' },
	confirmDelete: { ru: 'Подтвердить удаление?', uz: "O'chirishni tasdiqlaysizmi?", en: 'Confirm delete?' },
	confirmMsg: { ru: 'Это действие изменит статус и будет доступно пользователям.', uz: "Bu harakat holatni o'zgartiradi va foydalanuvchilar uchun ochiq bo'ladi.", en: 'This action will change the status and make it available to users.' },
	toastStarted: { ru: 'Олимпиада начата', uz: 'Olimpiada boshlandi', en: 'Olympiad started' },
	toastFinished: { ru: 'Олимпиада завершена', uz: 'Olimpiada yakunlandi', en: 'Olympiad finished' },
	toastDeleted: { ru: 'Удалено', uz: "O'chirildi", en: 'Deleted' },
	toastHidden: { ru: 'Олимпиада скрыта', uz: 'Olimpiada yashirildi', en: 'Olympiad hidden' },
	toastShown: { ru: 'Олимпиада теперь видна', uz: "Olimpiada ko'rsatildi", en: 'Olympiad shown' },
	participants: { ru: 'Участники', uz: 'Ishtirokchilar', en: 'Participants' },
	startSelected: { ru: 'Начать для выбранных', uz: 'Tanlanganlar uchun boshlash', en: 'Start for selected' },
	finishSelected: { ru: 'Завершить для выбранных', uz: 'Tanlanganlar uchun yakunlash', en: 'Finish for selected' },
	searchParticipants: { ru: 'Поиск участника...', uz: 'Ishtirokchini qidirish...', en: 'Search participant...' },
	selected: { ru: 'выбрано', uz: 'tanlangan', en: 'selected' },
	noParticipants: { ru: 'Участники не найдены', uz: 'Ishtirokchilar topilmadi', en: 'No participants found' },
	notStarted: { ru: 'Не начал', uz: 'Boshlamagan', en: 'Not started' },
	loadMore: { ru: 'Загрузить еще', uz: 'Yana yuklash', en: 'Load more' },
	total: { ru: 'Всего', uz: 'Jami', en: 'Total' },
	ongoing: { ru: 'В процессе', uz: 'Jarayonda', en: 'Ongoing' },
	finished: { ru: 'Завершили', uz: 'Yakunlagan', en: 'Finished' },
	empty: { ru: 'Олимпиады не найдены', uz: 'Olimpiadalar topilmadi', en: 'No olympiads' },
	yes: { ru: 'Да', uz: 'Ha', en: 'Yes' },
	no: { ru: 'Нет', uz: "Yo'q", en: 'No' },
};

const ParticipantsSheet = ({ target, onClose }) => {
	const { tx } = useLanguage();
	const toast = useToast();
	const { startGradeSession, finishGradeSession } = useOlympiad();
	const [search, setSearch] = useState('');
	const [list, setList] = useState([]);
	const [results, setResults] = useState({});
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState(new Set());
	const [busy, setBusy] = useState(null);

	const fetchPage = useCallback(
		async (query, p, append) => {
			if (!target) return;
			setLoading(true);
			try {
				const res = await api.get('users/', { params: { registrations__olympiad: target.olyId, grade: target.grade, page_size: 40, search: query, page: p } });
				const items = res.data.results || res.data || [];
				setList((prev) => (append ? [...prev, ...items] : items));
				setHasMore(!!res.data.next);
			} catch {
			} finally {
				setLoading(false);
			}
		},
		[target]
	);

	useEffect(() => {
		if (!target) return;
		setSelected(new Set());
		setSearch('');
		setList([]);
		api.get('results/', { params: { sub_olympiad_grade: target.sessionId, page_size: 100 } })
			.then((r) => {
				const map = {};
				(r.data.results || r.data || []).forEach((x) => { map[x.user] = x; });
				setResults(map);
			})
			.catch(() => setResults({}));
	}, [target]);

	useEffect(() => {
		if (!target) return;
		const timer = setTimeout(() => {
			setPage(1);
			fetchPage(search, 1, false);
		}, 500);
		return () => clearTimeout(timer);
	}, [search, target]);

	const toggle = (id) => setSelected((prev) => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});

	const act = async (kind) => {
		setBusy(kind);
		const fn = kind === 'start' ? startGradeSession : finishGradeSession;
		const res = await fn(target.sessionId, Array.from(selected));
		setBusy(null);
		if (res.success) {
			toast.success(tx(kind === 'start' ? L.toastStarted : L.toastFinished));
			onClose();
		} else toast.error(res.error);
	};

	return (
		<Sheet visible={!!target} onClose={onClose} title={`${tx(L.participants)} · ${target?.grade ?? ''} ${tx(L.grade)}`} maxHeight="92%">
			<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.searchParticipants)} autoCorrect={false} />
			<View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
				<Button style={{ flex: 1 }} size="sm" variant="danger" icon={Square} title={tx(L.finishSelected)} disabled={!selected.size} loading={busy === 'finish'} onPress={() => act('finish')} />
				<Button style={{ flex: 1 }} size="sm" variant="success" icon={Play} title={tx(L.startSelected)} disabled={!selected.size} loading={busy === 'start'} onPress={() => act('start')} />
			</View>
			{selected.size ? <T v="small" style={{ marginTop: 8, fontFamily: fonts.bold, color: colors.amber }}>{selected.size} {tx(L.selected)}</T> : null}
			<View style={{ marginTop: 10, maxHeight: 460 }}>
				{loading && !list.length ? (
					<ActivityIndicator color={colors.goldDeep} style={{ marginVertical: 30 }} />
				) : list.length ? (
					<SheetList>
						{list.map((u) => {
							const r = results[u.id];
							const done = r?.completed_at;
							const on = selected.has(u.id);
							return (
								<Pressable key={u.id} onPress={() => toggle(u.id)} style={[styles.pRow, on && { borderColor: colors.gold, backgroundColor: colors.goldTint }]}>
									{on ? <CheckSquare size={20} color={colors.amber} /> : <Square size={20} color={colors.faint} />}
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 13.5 }} numberOfLines={1}>{u.last_name} {u.first_name} {u.middle_name || ''}</T>
										<T v="small" style={{ fontSize: 11.5 }}>ID: {u.participant_id || u.id}{u.phone ? ` · ${u.phone}` : ''}</T>
									</View>
									<Pill label={done ? tx(L.completed) : r ? tx(L.started) : tx(L.notStarted)} color={done ? colors.green : r ? colors.amber : colors.muted} bg={done ? colors.greenSoft : r ? colors.goldTint : colors.cardMuted} />
								</Pressable>
							);
						})}
						{hasMore ? <Button title={tx(L.loadMore)} variant="light" size="sm" loading={loading} onPress={() => { const p = page + 1; setPage(p); fetchPage(search, p, true); }} /> : null}
					</SheetList>
				) : (
					<T v="small" style={{ textAlign: 'center', marginVertical: 30 }}>{tx(L.noParticipants)}</T>
				)}
			</View>
		</Sheet>
	);
};

const SheetList = ({ children }) => <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>{children}</ScrollView>;

export default function AdminOlympiads() {
	const { tx, lang, pick } = useLanguage();
	const toast = useToast();
	const { olympiads, isLoaded, isFetching, fetchOlympiads, deleteOlympiad, updateOlympiad, startOlympiad, finishOlympiad, startGradeSession, finishGradeSession, moveOlympiad } = useOlympiad();
	const [expanded, setExpanded] = useState({});
	const [confirm, setConfirm] = useState(null);
	const [participants, setParticipants] = useState(null);
	const autoDone = useRef(new Set());

	useEffect(() => {
		fetchOlympiads(true);
	}, []);

	// Website parity: while this screen is open the admin client auto-starts
	// sessions at their start time and auto-finishes them after the duration.
	useEffect(() => {
		const tick = async () => {
			const now = Date.now();
			for (const oly of olympiads) {
				const start = new Date(oly.start_datetime || oly.date).getTime();
				const dur = (oly.duration_minutes || 60) * 60000;
				if (!oly.subs?.length && !isNaN(start)) {
					if (!oly.is_started && !oly.is_completed && now >= start && !autoDone.current.has(`os${oly.id}`)) {
						autoDone.current.add(`os${oly.id}`);
						await startOlympiad(oly.id);
					}
					if (oly.is_started && !oly.is_completed && now > start + dur && !autoDone.current.has(`of${oly.id}`)) {
						autoDone.current.add(`of${oly.id}`);
						await finishOlympiad(oly.id);
					}
				}
				for (const sub of oly.subs || []) {
					for (const gs of sub.grade_sessions || []) {
						const gStart = new Date(gs.start_datetime).getTime();
						if (!gs.start_datetime || isNaN(gStart)) continue;
						const gDur = (gs.duration_minutes || 60) * 60000;
						if (!gs.is_started && !gs.is_completed && now >= gStart && !autoDone.current.has(`gs${gs.id}`)) {
							autoDone.current.add(`gs${gs.id}`);
							await startGradeSession(gs.id);
						}
						if (gs.is_started && !gs.is_completed && now > gStart + gDur && !autoDone.current.has(`gf${gs.id}`)) {
							autoDone.current.add(`gf${gs.id}`);
							await finishGradeSession(gs.id);
						}
					}
				}
			}
		};
		tick();
		const timer = setInterval(tick, 5000);
		return () => clearInterval(timer);
	}, [olympiads]);

	const act = async (fn, okMsg) => {
		const res = await fn();
		if (res.success) toast.success(tx(okMsg));
		else toast.error(res.error);
	};

	const ask = (title, onConfirm, tone = 'gold') => setConfirm({ title, onConfirm, tone });

	return (
		<Screen tabBar onRefresh={() => fetchOlympiads(true)}>
			<LargeTitle
				title={tx(L.title)}
				subtitle={tx(L.subtitle)}
				right={isFetching ? <ActivityIndicator color={colors.goldDeep} /> : <IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={() => router.push('/admin/olympiad-form')} />}
			/>
			{!isLoaded && !olympiads.length ? (
				<View style={{ gap: 12 }}><SkeletonCard /><SkeletonCard /></View>
			) : !olympiads.length ? (
				<EmptyState icon={GraduationCap} title={tx(L.empty)} action={<Button title={tx(L.add)} icon={Plus} onPress={() => router.push('/admin/olympiad-form')} />} />
			) : (
				olympiads.map((oly, index) => {
					const online = oly.olympiad_type === 'online';
					const hasSubs = oly.subs?.length > 0;
					const open = expanded[oly.id];
					return (
						<Card key={oly.id} style={[{ marginBottom: 12, padding: 16 }, oly.is_active === false && { opacity: 0.75 }]}>
							<View style={{ flexDirection: 'row', gap: 10 }}>
								<View style={styles.order}>
									<Tap onPress={() => moveOlympiad(oly.id, 'up')} disabled={index === 0} style={[styles.orderBtn, index === 0 && { opacity: 0.3 }]}><ArrowUp size={14} color={colors.ink2} /></Tap>
									<T v="strong" style={{ fontSize: 11 }}>#{index + 1}</T>
									<Tap onPress={() => moveOlympiad(oly.id, 'down')} disabled={index === olympiads.length - 1} style={[styles.orderBtn, index === olympiads.length - 1 && { opacity: 0.3 }]}><ArrowDown size={14} color={colors.ink2} /></Tap>
								</View>
								<View style={{ flex: 1 }}>
									<T v="h3" numberOfLines={3} style={{ fontSize: 15.5 }}>{pick(oly)}</T>
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
										<Pill icon={online ? Wifi : Building2} label={tx(online ? L.online : L.offline)} color={online ? colors.amber : colors.navy} bg={online ? colors.goldTint : colors.navySoft} />
										{oly.is_active === false ? <Pill icon={EyeOff} label={tx(L.hidden)} color={colors.red} bg={colors.redSoft} /> : null}
										<Pill icon={Users} label={`${oly.registered_count || 0}${oly.max_participants > 0 ? `/${oly.max_participants}` : ''}`} />
										{Number(oly.price) > 0 ? <Pill label={formatPrice(oly.price)} color={colors.navyDeep} bg={colors.goldSoft} /> : null}
									</View>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
										<Calendar size={12} color={colors.faint} />
										<T v="small" style={{ fontSize: 12 }}>{formatDate(oly.date || oly.start_datetime, lang)}</T>
									</View>
								</View>
							</View>

							<View style={styles.actions}>
								<Tap onPress={() => act(() => updateOlympiad(oly.id, { is_active: !oly.is_active }), oly.is_active ? L.toastHidden : L.toastShown)} style={styles.iconAct}>
									{oly.is_active ? <Eye size={17} color={colors.green} /> : <EyeOff size={17} color={colors.muted} />}
								</Tap>
								<Tap onPress={() => router.push({ pathname: '/admin/olympiad-form', params: { id: oly.id } })} style={styles.iconAct}><Edit3 size={17} color={colors.blue} /></Tap>
								<Tap onPress={() => ask(L.confirmDelete, () => act(() => deleteOlympiad(oly.id), L.toastDeleted), 'red')} style={styles.iconAct}><Trash2 size={17} color={colors.red} /></Tap>
								<View style={{ flex: 1 }} />
								{hasSubs ? (
									<Button size="sm" variant="soft" icon={open ? ChevronUp : ChevronDown} title={tx(open ? L.hide : L.schedule)} onPress={() => setExpanded((p) => ({ ...p, [oly.id]: !p[oly.id] }))} />
								) : oly.is_completed ? (
									<Pill label={tx(L.completed)} color={colors.muted} bg={colors.cardMuted} />
								) : oly.is_started ? (
									<Button size="sm" variant="danger" icon={Square} title={tx(L.finish)} onPress={() => ask(L.confirmFinish, () => act(() => finishOlympiad(oly.id), L.toastFinished), 'red')} />
								) : (
									<Button size="sm" variant="success" icon={Play} title={tx(L.start)} onPress={() => ask(L.confirmStart, () => act(() => startOlympiad(oly.id), L.toastStarted), 'green')} />
								)}
							</View>

							{hasSubs && open ? (
								<View style={{ gap: 12, marginTop: 14 }}>
									{oly.subs.map((sub) => (
										<View key={sub.id} style={styles.sub}>
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
												<GraduationCap size={15} color={colors.amber} />
												<T v="strong" style={{ flex: 1 }}>{pick(sub)}</T>
												<T v="small">{sub.grade_sessions?.length || 0}</T>
											</View>
											{[...(sub.grade_sessions || [])].sort((a, b) => parseInt(a.grade, 10) - parseInt(b.grade, 10)).map((gs) => (
												<View key={gs.id} style={styles.session}>
													<View style={styles.gradeBox}><T v="strong" style={{ fontSize: 13 }}>{gs.grade}</T></View>
													<View style={{ flex: 1, gap: 3 }}>
														<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
															<Calendar size={11} color={colors.faint} />
															<T v="small" style={{ fontSize: 11.5 }}>{formatShortDate(gs.start_datetime, lang)}</T>
															<Clock size={11} color={colors.faint} />
															<T v="small" style={{ fontSize: 11.5 }}>{gs.duration_minutes}′</T>
														</View>
														<View style={{ flexDirection: 'row', gap: 10 }}>
															<T v="small" style={{ fontSize: 11 }}>👥 {gs.participants_count || 0}</T>
															<T v="small" style={{ fontSize: 11, color: colors.amber }}>⏳ {gs.ongoing_count || 0}</T>
															<T v="small" style={{ fontSize: 11, color: colors.green }}>✓ {gs.finished_count || 0}</T>
														</View>
													</View>
													<Tap onPress={() => setParticipants({ sessionId: gs.id, grade: gs.grade, olyId: oly.id })} style={styles.iconAct}><Users size={16} color={colors.navy} /></Tap>
													{gs.is_completed ? (
														<Pill label={tx(L.completed)} color={colors.muted} bg={colors.white} />
													) : gs.is_started ? (
														<Tap onPress={() => ask(L.confirmFinishSession, () => act(() => finishGradeSession(gs.id), L.toastFinished), 'red')} style={[styles.sessBtn, { backgroundColor: colors.redSoft }]}><Square size={14} color={colors.red} /></Tap>
													) : (
														<Tap onPress={() => ask(L.confirmStartSession, () => act(() => startGradeSession(gs.id), L.toastStarted), 'green')} style={[styles.sessBtn, { backgroundColor: colors.greenSoft }]}><Play size={14} color={colors.green} /></Tap>
													)}
												</View>
											))}
											{!sub.grade_sessions?.length ? <T v="small">{tx(L.noSessions)}</T> : null}
										</View>
									))}
								</View>
							) : null}
						</Card>
					);
				})
			)}

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={confirm?.tone === 'red' ? Trash2 : Play}
				tone={confirm?.tone}
				title={confirm ? tx(confirm.title) : ''}
				message={tx(L.confirmMsg)}
				actions={[
					{ title: tx(L.yes), variant: confirm?.tone === 'red' ? 'danger' : 'primary', onPress: () => { const c = confirm; setConfirm(null); c.onConfirm(); } },
					{ title: tx(L.no), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
			<ParticipantsSheet target={participants} onClose={() => setParticipants(null)} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	order: { alignItems: 'center', gap: 4 },
	orderBtn: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
	iconAct: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
	sub: { padding: 12, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	session: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
	gradeBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	sessBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
	pRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
});
