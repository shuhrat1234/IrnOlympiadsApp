import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight, Copy, Download, GraduationCap, Lock, MapPin, Phone, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2, User, UserPlus } from 'lucide-react-native';
import api, { errorMessage } from '../../../api/client';
import { useAuth, isCoordinator } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useOlympiad } from '../../../context/OlympiadContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, LargeTitle } from '../../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, Segmented, SelectField, Sheet, SkeletonCard, T, Tap } from '../../../components/ui';
import { ChipsSelect, ChoicePills, DateTimeField } from '../../../components/form';
import TeacherSearch from '../../../components/TeacherSearch';
import { colors, fonts, radius } from '../../../theme';
import { GRADES } from '../../../utils/constants';
import { shareExcel } from '../../../utils/files';
import { UL, phoneMask, payTone } from '../../../components/admin/userShared';

const PAGE_SIZE = 20;
const emptyUser = { first_name: '', last_name: '', middle_name: '', phone: '+998', region: '', school: '', grade: '', password: '', confirmPassword: '', birth_date: '', teacherId: null, teacher_name: '' };
const emptyTeacher = { first_name: '', last_name: '', phone: '+998', region: '', password: '' };

export default function AdminUsers() {
	const { tx, pick } = useLanguage();
	const { currentUser, regions } = useAuth();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const coordinator = isCoordinator(currentUser);

	const [role, setRole] = useState('participant');
	const [search, setSearch] = useState('');
	const [query, setQuery] = useState('');
	const [filters, setFilters] = useState({ regions: [], grades: [], olys: [], pay: 'all' });
	const [draft, setDraft] = useState(filters);
	const [filterOpen, setFilterOpen] = useState(false);
	const [users, setUsers] = useState([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [teacherOpen, setTeacherOpen] = useState(false);
	const [form, setForm] = useState(emptyUser);
	const [tForm, setTForm] = useState(emptyTeacher);
	const [errors, setErrors] = useState({});
	const [busy, setBusy] = useState(false);
	const [toDelete, setToDelete] = useState(null);
	const reqId = useRef(0);

	// Debounced search.
	useEffect(() => {
		const timer = setTimeout(() => setQuery(search.trim()), 400);
		return () => clearTimeout(timer);
	}, [search]);

	const params = useCallback(
		(p, size = PAGE_SIZE) => ({
			page_size: size,
			page: p,
			role: role === 'teacher' ? 'teacher' : undefined,
			search: query || undefined,
			region: filters.regions.length ? filters.regions : undefined,
			grade: role === 'teacher' || !filters.grades.length ? undefined : filters.grades,
			registrations__olympiad: role === 'teacher' || !filters.olys.length ? undefined : filters.olys,
			payment_status: role === 'teacher' || filters.pay === 'all' ? undefined : filters.pay,
		}),
		[role, query, filters]
	);

	const load = useCallback(
		async (p = 1) => {
			const id = ++reqId.current;
			if (p === 1) setLoading(true);
			else setLoadingMore(true);
			try {
				const res = await api.get('users/', { params: params(p) });
				if (id !== reqId.current) return;
				const items = res.data.results || res.data || [];
				setUsers((prev) => (p === 1 ? items : [...prev, ...items]));
				setCount(res.data.count ?? items.length);
				setHasMore(!!res.data.next);
				setPage(p);
			} catch {
			} finally {
				if (id === reqId.current) {
					setLoading(false);
					setLoadingMore(false);
				}
			}
		},
		[params]
	);

	useEffect(() => {
		load(1);
	}, [load]);

	const regName = (id) => pick(regions.find((r) => r.id === parseInt(id, 10)), 'name') || id || '—';
	const gradeText = (g) => (g === 'KG' ? tx(UL.kindergarten) : g);
	const olyTitle = (reg) => {
		const id = typeof reg?.olympiad === 'object' ? reg.olympiad?.id : reg?.olympiad;
		const o = olympiads.find((x) => String(x.id) === String(id));
		return o ? pick(o) : reg?.olympiad_title || String(id ?? '—');
	};

	// Export walks every page of the filtered set (same params as the list).
	const exportExcel = async () => {
		setExporting(true);
		toast.info(tx(UL.exporting));
		try {
			const all = [];
			for (let p = 1; p <= 1000; p++) {
				const res = await api.get('users/', { params: params(p, 100) });
				if (Array.isArray(res.data)) { all.push(...res.data); break; }
				const batch = res.data.results || [];
				all.push(...batch);
				if (!res.data.next || !batch.length || (typeof res.data.count === 'number' && all.length >= res.data.count)) break;
			}
			const withUid = filters.olys.length > 0;
			const rows = all.map((u) => {
				const regs = (u.registrations || []).filter((r) => !filters.olys.length || filters.olys.includes(String(r.olympiad)));
				const row = { ID: u.participant_id || u.id, 'Last Name': u.last_name, 'First Name': u.first_name, 'Middle Name': u.middle_name || '', Phone: u.phone, Region: regName(u.region), School: u.school, Grade: u.grade };
				if (withUid) row['Unique ID'] = regs[0]?.unique_participant_id || '-';
				row.Olympiads = regs.map(olyTitle).join('; ');
				row['Payment Status'] = regs.map((r) => r.payment_status || '-').join('; ');
				return row;
			});
			await shareExcel(rows, `users_export_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Users');
			toast.success(tx(UL.exported));
		} catch {
			toast.error(tx(UL.exportErr));
		}
		setExporting(false);
	};

	const createUser = async () => {
		const e = {};
		['last_name', 'first_name', 'middle_name', 'birth_date', 'region', 'school', 'grade'].forEach((k) => { if (!form[k]) e[k] = tx(UL.required); });
		if (!form.phone || form.phone === '+998') e.phone = tx(UL.required);
		if (!form.password) e.password = tx(UL.required);
		else if (form.password.length < 6) e.password = tx(UL.passShort);
		if (!form.confirmPassword) e.confirmPassword = tx(UL.required);
		else if (form.password !== form.confirmPassword) e.confirmPassword = tx(UL.passMismatch);
		setErrors(e);
		if (Object.keys(e).length) return toast.error(tx(UL.fillAll));
		setBusy(true);
		try {
			const { teacherId, teacher_name, ...rest } = form;
			await api.post('auth/register/', { ...rest, birth_date: rest.birth_date ? rest.birth_date.slice(0, 10) : rest.birth_date, teacher: teacherId });
			toast.success(tx(UL.userCreated));
			setCreateOpen(false);
			setForm(emptyUser);
			load(1);
		} catch (err) {
			toast.error(errorMessage(err, tx(UL.createErr)));
		}
		setBusy(false);
	};

	const createTeacher = async () => {
		const e = {};
		['first_name', 'last_name', 'region'].forEach((k) => { if (!tForm[k]) e[k] = tx(UL.required); });
		if (!tForm.phone || tForm.phone === '+998') e.phone = tx(UL.required);
		if (!tForm.password || tForm.password.length < 6) e.password = tx(UL.passShort);
		setErrors(e);
		if (Object.keys(e).length) return toast.error(tx(UL.fillAll));
		setBusy(true);
		try {
			await api.post('users/', { ...tForm, role: 'teacher' });
			toast.success(tx(UL.teacherCreated));
			setTeacherOpen(false);
			setTForm(emptyTeacher);
			load(1);
		} catch (err) {
			toast.error(errorMessage(err, tx(UL.createErr)));
		}
		setBusy(false);
	};

	const activeFilters = filters.regions.length + filters.grades.length + filters.olys.length + (filters.pay !== 'all' ? 1 : 0);
	const showUid = filters.olys.length > 0 || query.includes('-');
	const regionOpts = regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }));

	return (
		<Screen tabBar onRefresh={() => load(1)}>
			<LargeTitle
				title={tx(UL.title)}
				subtitle={`${count} ${tx(UL.total)}`}
				right={
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<IconButton icon={Download} onPress={exportExcel} color={colors.green} />
						{!coordinator ? <IconButton icon={UserPlus} bg={colors.gold} color={colors.navyDeep} onPress={() => { setErrors({}); setCreateOpen(true); }} /> : null}
					</View>
				}
			/>
			{exporting ? <View style={styles.exporting}><ActivityIndicator color={colors.green} /><T v="small" color={colors.green}>{tx(UL.exporting)}</T></View> : null}
			<Segmented value={role} onChange={setRole} options={[{ value: 'participant', label: tx(UL.students) }, { value: 'teacher', label: tx(UL.teachers) }]} />
			<View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 }}>
				<Field style={{ flex: 1 }} icon={Search} value={search} onChangeText={setSearch} placeholder={tx(UL.search)} autoCapitalize="none" autoCorrect={false} />
				<Tap onPress={() => { setDraft(filters); setFilterOpen(true); }} style={[styles.filterBtn, activeFilters && { backgroundColor: colors.gold, borderColor: colors.goldDeep }]}>
					<SlidersHorizontal size={20} color={colors.navyDeep} />
					{activeFilters ? <View style={styles.filterBadge}><T style={styles.filterBadgeText}>{activeFilters}</T></View> : null}
				</Tap>
			</View>
			{role === 'teacher' && !coordinator ? <Button size="sm" variant="soft" icon={Plus} title={tx(UL.addTeacher)} onPress={() => { setErrors({}); setTeacherOpen(true); }} style={{ marginBottom: 12 }} /> : null}

			{loading ? (
				<View style={{ gap: 10 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
			) : !users.length ? (
				<EmptyState icon={User} title={tx(UL.noUsers)} />
			) : (
				users.map((u) => {
					const regs = (u.registrations || []).filter((r) => !filters.olys.length || filters.olys.includes(String(r.olympiad)));
					const uid = showUid
						? (filters.olys.length ? regs[0] : (u.registrations || []).find((r) => r.unique_participant_id?.toLowerCase().includes(query.toLowerCase())))?.unique_participant_id
						: null;
					return (
						<Card key={u.id} onPress={() => router.push(`/admin/user/${u.id}`)} style={{ marginBottom: 10, padding: 14 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
								<View style={styles.avatar}><T v="strong" style={{ fontSize: 14 }}>{`${u.last_name?.[0] || ''}${u.first_name?.[0] || ''}`}</T></View>
								<View style={{ flex: 1 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
										<T v="strong" numberOfLines={1} style={{ flexShrink: 1 }}>{u.last_name} {u.first_name}</T>
										{role === 'teacher' ? <ShieldCheck size={13} color={colors.green} /> : null}
									</View>
									<T v="small" style={{ fontSize: 11.5 }} numberOfLines={1}>ID: {u.participant_id || u.id}{u.phone ? ` · ${u.phone}` : ''}</T>
								</View>
								{!coordinator ? (
									<Tap onPress={() => setToDelete(u)} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap>
								) : null}
								<ChevronRight size={18} color={colors.faint} />
							</View>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
								<Pill icon={MapPin} label={regName(u.region)} />
								{u.grade ? <Pill icon={GraduationCap} label={String(gradeText(u.grade))} color={colors.navyDeep} bg={colors.goldSoft} /> : null}
								{u.school ? <Pill label={u.school} /> : null}
							</View>
							{uid ? (
								<Tap onPress={async () => { await Clipboard.setStringAsync(uid); toast.success('ID'); }} style={styles.uid}>
									<T v="small" style={{ fontFamily: fonts.bold }}>{tx(UL.uniqueId)}: {uid}</T>
									<Copy size={13} color={colors.muted} />
								</Tap>
							) : null}
							{regs.length ? (
								<View style={{ flexDirection: 'row', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
									{regs.map((r, i) => {
										const [fg] = payTone(r.payment_status);
										return <View key={i} style={[styles.payDot, { backgroundColor: fg }]} />;
									})}
									<T v="small" style={{ fontSize: 11, marginLeft: 4 }}>{regs.length}</T>
								</View>
							) : null}
						</Card>
					);
				})
			)}
			{hasMore && !loading ? <Button title={tx(UL.loadMore)} variant="light" size="md" loading={loadingMore} onPress={() => load(page + 1)} /> : null}

			{/* Filters */}
			<Sheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={tx(UL.filters)} scroll>
				<View style={{ gap: 18, paddingBottom: 8 }}>
					<ChipsSelect label={tx(UL.region)} options={regionOpts} value={draft.regions} onChange={(v) => setDraft((d) => ({ ...d, regions: v }))} />
					{role !== 'teacher' ? (
						<>
							<ChipsSelect label={tx(UL.grade)} options={GRADES.map((g) => ({ value: String(g), label: String(gradeText(g)) }))} value={draft.grades} onChange={(v) => setDraft((d) => ({ ...d, grades: v }))} />
							<ChipsSelect label={tx(UL.olympiad)} options={olympiads.map((o) => ({ value: String(o.id), label: pick(o) }))} value={draft.olys} onChange={(v) => setDraft((d) => ({ ...d, olys: v }))} />
							<View>
								<T v="label" style={{ marginBottom: 10, marginLeft: 4 }}>{tx(UL.payment)}</T>
								<ChoicePills value={draft.pay} onChange={(v) => setDraft((d) => ({ ...d, pay: v }))} options={[{ value: 'all', label: tx(UL.all) }, { value: 'paid', label: tx(UL.paid) }, { value: 'pending', label: tx(UL.pending) }, { value: 'not_paid', label: tx(UL.notPaid) }]} />
							</View>
						</>
					) : null}
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Button style={{ flex: 1 }} size="md" variant="light" title={tx(UL.clear)} onPress={() => { const empty = { regions: [], grades: [], olys: [], pay: 'all' }; setDraft(empty); setFilters(empty); setFilterOpen(false); }} />
						<Button style={{ flex: 1.4 }} size="md" title={tx(UL.apply)} onPress={() => { setFilters(draft); setFilterOpen(false); }} />
					</View>
				</View>
			</Sheet>

			{/* Create user */}
			<Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title={tx(UL.addUser)} scroll maxHeight="94%">
				<View style={{ gap: 12, paddingBottom: 10 }}>
					{['first_name', 'last_name', 'middle_name'].map((k) => (
						<Field key={k} label={`${tx(UL[{ first_name: 'firstName', last_name: 'lastName', middle_name: 'middleName' }[k]])} *`} value={form[k]} onChangeText={(v) => setForm((f) => ({ ...f, [k]: v }))} error={errors[k]} autoCapitalize="words" />
					))}
					<DateTimeField mode="date" label={`${tx(UL.birthDate)} *`} value={form.birth_date} onChange={(v) => setForm((f) => ({ ...f, birth_date: v ? v.slice(0, 10) : '' }))} error={errors.birth_date} />
					<SelectField label={`${tx(UL.region)} *`} icon={MapPin} value={form.region} onChange={(v) => setForm((f) => ({ ...f, region: v }))} options={regions.map((r) => ({ value: r.id, label: pick(r, 'name') }))} placeholder={tx(UL.selectRegion)} error={errors.region} />
					<Field label={`${tx(UL.school)} *`} value={form.school} onChangeText={(v) => setForm((f) => ({ ...f, school: v }))} error={errors.school} />
					<SelectField label={`${tx(UL.grade)} *`} icon={GraduationCap} value={form.grade} onChange={(v) => setForm((f) => ({ ...f, grade: v }))} options={GRADES.map((g) => ({ value: g, label: String(gradeText(g)) }))} placeholder={tx(UL.selectGrade)} error={errors.grade} />
					<Field label={`${tx(UL.phone)} *`} icon={Phone} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: phoneMask(v) }))} keyboardType="phone-pad" error={errors.phone} />
					<View>
						<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(UL.teacherSearch)}</T>
						{form.teacherId ? (
							<View style={styles.teacher}>
								<T v="strong" style={{ flex: 1 }}>{form.teacher_name}</T>
								<Button size="sm" variant="light" title={tx(UL.change)} onPress={() => setForm((f) => ({ ...f, teacherId: null, teacher_name: '' }))} />
							</View>
						) : (
							<TeacherSearch onSelect={(t) => setForm((f) => ({ ...f, teacherId: t.id, teacher_name: t.full_name }))} />
						)}
					</View>
					<Field label={`${tx(UL.password)} *`} icon={Lock} value={form.password} onChangeText={(v) => setForm((f) => ({ ...f, password: v }))} secure error={errors.password} autoCapitalize="none" />
					<Field label={`${tx(UL.confirmPassword)} *`} icon={Lock} value={form.confirmPassword} onChangeText={(v) => setForm((f) => ({ ...f, confirmPassword: v }))} secure error={errors.confirmPassword} autoCapitalize="none" />
					<Button title={tx(UL.addUser)} icon={UserPlus} loading={busy} onPress={createUser} />
				</View>
			</Sheet>

			{/* Create teacher */}
			<Sheet visible={teacherOpen} onClose={() => setTeacherOpen(false)} title={tx(UL.addTeacher)} scroll>
				<View style={{ gap: 12, paddingBottom: 10 }}>
					<Field label={`${tx(UL.firstName)} *`} value={tForm.first_name} onChangeText={(v) => setTForm((f) => ({ ...f, first_name: v }))} error={errors.first_name} autoCapitalize="words" />
					<Field label={`${tx(UL.lastName)} *`} value={tForm.last_name} onChangeText={(v) => setTForm((f) => ({ ...f, last_name: v }))} error={errors.last_name} autoCapitalize="words" />
					<SelectField label={`${tx(UL.region)} *`} icon={MapPin} value={tForm.region} onChange={(v) => setTForm((f) => ({ ...f, region: v }))} options={regions.map((r) => ({ value: r.id, label: pick(r, 'name') }))} placeholder={tx(UL.selectRegion)} error={errors.region} />
					<Field label={`${tx(UL.phone)} *`} icon={Phone} value={tForm.phone} onChangeText={(v) => setTForm((f) => ({ ...f, phone: phoneMask(v) }))} keyboardType="phone-pad" error={errors.phone} />
					<Field label={`${tx(UL.password)} *`} icon={Lock} value={tForm.password} onChangeText={(v) => setTForm((f) => ({ ...f, password: v }))} error={errors.password} autoCapitalize="none" />
					<Button title={tx(UL.addTeacher)} icon={UserPlus} loading={busy} onPress={createTeacher} />
				</View>
			</Sheet>

			<Dialog
				visible={!!toDelete}
				onClose={() => setToDelete(null)}
				icon={Trash2}
				tone="red"
				title={tx(UL.deleteTitle)}
				message={toDelete ? `${toDelete.first_name} ${toDelete.last_name}. ${tx(UL.deleteMsg)}` : ''}
				actions={[
					{
						title: tx(UL.yesDelete),
						variant: 'danger',
						onPress: async () => {
							const u = toDelete;
							setToDelete(null);
							try {
								await api.delete(`users/${u.id}/`);
								toast.success(tx(UL.deleted));
								load(1);
							} catch (err) {
								toast.error(errorMessage(err));
							}
						},
					},
					{ title: tx(UL.cancel), variant: 'ghost', onPress: () => setToDelete(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	exporting: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.greenSoft, marginBottom: 12 },
	filterBtn: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	filterBadge: { position: 'absolute', top: 6, right: 6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.navyDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
	filterBadgeText: { color: colors.gold, fontFamily: fonts.extrabold, fontSize: 9.5 },
	avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	del: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
	uid: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.cardMuted },
	payDot: { width: 10, height: 10, borderRadius: 5 },
	teacher: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.greenSoft },
});
