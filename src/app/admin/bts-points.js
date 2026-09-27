import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { Edit3, ExternalLink, Eye, EyeOff, MapPin, Plus, RefreshCw, Search, Trash2 } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, EmptyState, Field, IconButton, Pill, SelectField, Sheet, T, Tap } from '../../components/ui';
import { SwitchRow, TextArea } from '../../components/form';
import MapPicker from '../../components/admin/MapPicker';
import { ALL_BTS_LOCATIONS } from '../../data/btsLocations';
import { colors } from '../../theme';

const TASHKENT = [41.2995, 69.2401];

const L = {
	title: { uz: 'BTS punktlari', ru: 'Пункты BTS', en: 'BTS Points' },
	subtitle: { uz: 'Yetkazib berish uchun BTS punktlarini boshqarish', ru: 'Управление пунктами выдачи BTS', en: 'Manage BTS delivery pickup points' },
	addPoint: { uz: 'Yangi punkt', ru: 'Добавить пункт', en: 'Add point' },
	editPoint: { uz: 'Punktni tahrirlash', ru: 'Редактировать пункт', en: 'Edit point' },
	noPoints: { uz: 'Punktlar topilmadi', ru: 'Пункты не найдены', en: 'No points found' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	active: { uz: 'Faol', ru: 'Активен', en: 'Active' },
	inactive: { uz: 'Nofaol', ru: 'Неактивен', en: 'Inactive' },
	confirmDeleteTitle: { uz: "Punktni o'chirish?", ru: 'Удалить пункт?', en: 'Delete point?' },
	confirmDeleteText: { uz: "Ushbu punktni o'chirishni tasdiqlaysizmi?", ru: 'Вы уверены, что хотите удалить этот пункт?', en: 'Are you sure you want to delete this point?' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	nameLabel: { uz: 'Nomi', ru: 'Название', en: 'Name' },
	regionLabel: { uz: 'Viloyat/shahar', ru: 'Регион/город', en: 'Region/city' },
	addressLabel: { uz: 'Manzil', ru: 'Адрес', en: 'Address' },
	mapHint: { uz: 'Joylashuvni belgilash uchun xaritani bosing', ru: 'Нажмите на карту, чтобы указать местоположение', en: 'Tap the map to set the location' },
	regionNone: { uz: 'Tanlanmagan', ru: 'Не выбрано', en: 'None' },
	saved: { uz: 'Muvaffaqiyatli saqlandi', ru: 'Успешно сохранено', en: 'Saved' },
	saveErr: { uz: 'Saqlashda xatolik', ru: 'Ошибка при сохранении', en: 'Error saving' },
	deleted: { uz: "O'chirildi", ru: 'Удалено', en: 'Deleted' },
	deleteErr: { uz: "O'chirishda xatolik", ru: 'Ошибка при удалении', en: 'Error deleting' },
	fetchErr: { uz: 'Yuklashda xatolik', ru: 'Ошибка загрузки', en: 'Error loading' },
	viewMap: { uz: "Xaritada ko'rish", ru: 'На карте', en: 'View on map' },
	nameRequired: { uz: 'Nomini kiriting', ru: 'Введите название', en: 'Enter a name' },
	regionRequired: { uz: 'Viloyatni tanlang', ru: 'Выберите регион', en: 'Select a region' },
	addressRequired: { uz: 'Manzilni kiriting', ru: 'Введите адрес', en: 'Enter an address' },
	seedAll: { uz: 'bts.uz bilan sinxronlash (397)', ru: 'Синхронизировать с bts.uz (397)', en: 'Sync with bts.uz (397)' },
	confirmSeedTitle: { uz: 'Sinxronlash', ru: 'Синхронизация', en: 'Synchronize' },
	confirmSeed: { uz: "Faqat rasmiy bts.uz ro'yxatidagi 397 ta punkt saqlanadi. Nofaol va takroriy punktlar tozalanadi.", ru: 'Будет сохранён только официальный список 397 пунктов bts.uz. Неофициальные и дублирующиеся пункты будут удалены.', en: 'Only the official list of 397 bts.uz points will be kept. Unofficial and duplicate points are removed.' },
	seedAdded: { uz: "ta yangi rasmiy punkt qo'shildi", ru: 'новых официальных пунктов добавлено', en: 'new official points added' },
	seedSynced: { uz: "Barcha rasmiy punktlar sinxronlangan", ru: 'Все официальные пункты синхронизированы', en: 'All official points are in sync' },
	seeding: { uz: 'Sinxronlanmoqda', ru: 'Синхронизация', en: 'Syncing' },
	search: { uz: 'Qidirish (nomi, viloyat, manzil)...', ru: 'Поиск (название, регион, адрес)...', en: 'Search (name, region, address)...' },
	results: { uz: 'Natijalar', ru: 'Результаты', en: 'Results' },
};

const emptyForm = { name: '', region: '', address: '', latitude: TASHKENT[0], longitude: TASHKENT[1], is_active: true };
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export default function BTSPoints() {
	const { tx, pick } = useLanguage();
	const toast = useToast();
	const [points, setPoints] = useState([]);
	const [regions, setRegions] = useState([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(true);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [editingId, setEditingId] = useState(null);
	const [submitting, setSubmitting] = useState(false);
	const [seeding, setSeeding] = useState(null);
	const [confirm, setConfirm] = useState(null);
	const [visible, setVisible] = useState(40);

	const fetchAll = useCallback(async () => {
		setLoading(true);
		try {
			const regionsReq = api.get(E.REGIONS);
			let all = [];
			let url = E.BTS_POINTS;
			let params = { page_size: 100 };
			while (url) {
				const res = await api.get(url, { params });
				if (Array.isArray(res.data)) { all = res.data; break; }
				all.push(...(res.data.results || []));
				url = res.data.next;
				params = {};
			}
			const regionsRes = await regionsReq;
			setPoints(all);
			setRegions(Array.isArray(regionsRes.data) ? regionsRes.data : regionsRes.data.results || []);
		} catch {
			toast.error(tx(L.fetchErr));
		}
		setLoading(false);
	}, []);

	useEffect(() => { fetchAll(); }, [fetchAll]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return points;
		return points.filter((p) => p.name?.toLowerCase().includes(q) || p.region_name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
	}, [points, search]);

	const set = (patch) => setForm((f) => ({ ...f, ...patch }));
	const openCreate = () => { setForm(emptyForm); setEditingId(null); setFormOpen(true); };
	const openEdit = (p) => {
		setForm({ name: p.name || '', region: p.region ? String(p.region) : '', address: p.address || '', latitude: parseFloat(p.latitude) || TASHKENT[0], longitude: parseFloat(p.longitude) || TASHKENT[1], is_active: p.is_active !== false });
		setEditingId(p.id);
		setFormOpen(true);
	};

	const save = async () => {
		if (!form.name.trim()) return toast.error(tx(L.nameRequired));
		if (!form.region) return toast.error(tx(L.regionRequired));
		if (!form.address.trim()) return toast.error(tx(L.addressRequired));
		const lat = parseFloat(form.latitude);
		const lng = parseFloat(form.longitude);
		setSubmitting(true);
		try {
			const payload = {
				name: form.name.trim(), region: parseInt(form.region, 10), address: form.address.trim(),
				latitude: !isNaN(lat) ? parseFloat(lat.toFixed(6)) : TASHKENT[0], longitude: !isNaN(lng) ? parseFloat(lng.toFixed(6)) : TASHKENT[1],
				is_active: form.is_active,
			};
			if (editingId) await api.patch(E.BTS_POINT_DETAIL(editingId), payload);
			else await api.post(E.BTS_POINTS, payload);
			toast.success(tx(L.saved));
			setFormOpen(false);
			fetchAll();
		} catch (err) {
			const d = err.response?.data;
			toast.error(typeof d === 'string' ? d : d && typeof d === 'object' ? Object.entries(d).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`).join(' | ') : tx(L.saveErr));
		}
		setSubmitting(false);
	};

	const remove = async (id) => {
		try {
			await api.delete(E.BTS_POINT_DETAIL(id));
			toast.success(tx(L.deleted));
			fetchAll();
		} catch {
			toast.error(tx(L.deleteErr));
		}
	};

	const seedAll = async () => {
		setSeeding({ done: 0, total: 0 });
		try {
			const official = new Map(ALL_BTS_LOCATIONS.map((loc) => [norm(loc.name), loc]));
			const seen = new Set();
			const toDelete = [];
			points.forEach((p) => {
				const n = norm(p.name);
				if (!official.has(n) || seen.has(n)) toDelete.push(p.id);
				else seen.add(n);
			});
			const toAdd = ALL_BTS_LOCATIONS.filter((loc) => !seen.has(norm(loc.name)));
			const total = toDelete.length + toAdd.length;
			let done = 0;
			setSeeding({ done, total });
			for (const id of toDelete) {
				try { await api.delete(E.BTS_POINT_DETAIL(id)); } catch {}
				setSeeding({ done: ++done, total });
			}
			let added = 0;
			for (const loc of toAdd) {
				const n = norm(loc.name);
				if (seen.has(n)) { setSeeding({ done: ++done, total }); continue; }
				const rn = loc.region_name.toLowerCase();
				const reg = regions.find((r) => r.name_uz?.toLowerCase().includes(rn) || r.name_ru?.toLowerCase().includes(rn) || r.name_en?.toLowerCase().includes(rn));
				try {
					await api.post(E.BTS_POINTS, { name: loc.name, region: reg ? reg.id : null, address: loc.address, latitude: parseFloat(loc.latitude.toFixed(6)), longitude: parseFloat(loc.longitude.toFixed(6)), is_active: true });
					added++;
					seen.add(n);
				} catch {}
				setSeeding({ done: ++done, total });
			}
			toast.success(added > 0 ? `${added} ${tx(L.seedAdded)}` : tx(L.seedSynced));
			fetchAll();
		} catch {
			toast.error(tx(L.saveErr));
		}
		setSeeding(null);
	};

	return (
		<Screen header={<StackHeader right={<IconButton icon={Plus} bg={colors.gold} color={colors.navyDeep} onPress={openCreate} />} />} onRefresh={fetchAll}>
			<LargeTitle title={tx(L.title)} subtitle={`${points.length} · ${tx(L.subtitle)}`} />
			<Button
				size="md"
				variant="dark"
				icon={RefreshCw}
				title={seeding ? `${tx(L.seeding)} ${seeding.done}/${seeding.total}` : tx(L.seedAll)}
				loading={!!seeding && !seeding.total}
				disabled={!!seeding || loading}
				onPress={() => setConfirm({ kind: 'seed' })}
				style={{ marginBottom: 12 }}
			/>
			<Field icon={Search} value={search} onChangeText={setSearch} placeholder={tx(L.search)} style={{ marginBottom: 8 }} />
			{search.trim() ? <T v="small" style={{ marginBottom: 8 }}>{tx(L.results)}: <T v="strong">{filtered.length}</T> / {points.length}</T> : null}

			{loading && !points.length ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 20 }} /> : !filtered.length ? <EmptyState icon={MapPin} title={tx(L.noPoints)} /> : filtered.slice(0, visible).map((p) => (
				<Card key={p.id} style={{ marginBottom: 10, padding: 14 }}>
					<View style={{ flexDirection: 'row', gap: 10 }}>
						<View style={{ flex: 1, gap: 3 }}>
							<T v="strong">{p.name}</T>
							<T v="small" style={{ fontSize: 12 }}>{p.region_name || '—'}</T>
							<T v="body" style={{ fontSize: 13 }}>{p.address}</T>
						</View>
						<View style={{ gap: 8 }}>
							<Tap onPress={() => openEdit(p)} style={[styles.act, { backgroundColor: colors.blueSoft }]}><Edit3 size={15} color={colors.blue} /></Tap>
							<Tap onPress={() => setConfirm({ kind: 'delete', id: p.id })} style={[styles.act, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap>
						</View>
					</View>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
						<Pill icon={p.is_active !== false ? Eye : EyeOff} label={tx(p.is_active !== false ? L.active : L.inactive)} color={p.is_active !== false ? colors.green : colors.muted} bg={p.is_active !== false ? colors.greenSoft : colors.cardMuted} />
						<Tap onPress={() => Linking.openURL(`https://www.google.com/maps?q=${p.latitude},${p.longitude}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
							<ExternalLink size={12} color={colors.blue} /><T v="strong" color={colors.blue} style={{ fontSize: 12.5 }}>{tx(L.viewMap)}</T>
						</Tap>
					</View>
				</Card>
			))}
			{filtered.length > visible ? <Button size="md" variant="light" title={`+${Math.min(40, filtered.length - visible)}`} onPress={() => setVisible((v) => v + 40)} /> : null}

			<Sheet visible={formOpen} onClose={() => !submitting && setFormOpen(false)} title={tx(editingId ? L.editPoint : L.addPoint)} scroll maxHeight="94%">
				<View style={{ gap: 12, paddingBottom: 10 }}>
					<Field label={tx(L.nameLabel)} value={form.name} onChangeText={(v) => set({ name: v })} />
					<SelectField label={tx(L.regionLabel)} title={tx(L.regionLabel)} value={form.region} placeholder={tx(L.regionNone)} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} onChange={(v) => set({ region: v })} />
					<TextArea rows={2} label={tx(L.addressLabel)} value={form.address} onChangeText={(v) => set({ address: v })} />
					<T v="small">{tx(L.mapHint)}</T>
					{formOpen ? <MapPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lng) => set({ latitude: lat, longitude: lng })} /> : null}
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Field style={{ flex: 1 }} label="Lat" value={String(form.latitude)} keyboardType="decimal-pad" onChangeText={(v) => set({ latitude: v })} />
						<Field style={{ flex: 1 }} label="Lng" value={String(form.longitude)} keyboardType="decimal-pad" onChangeText={(v) => set({ longitude: v })} />
					</View>
					<SwitchRow label={tx(L.active)} value={form.is_active} onChange={(v) => set({ is_active: v })} />
					<Button title={tx(L.save)} loading={submitting} onPress={save} />
				</View>
			</Sheet>

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={confirm?.kind === 'seed' ? RefreshCw : Trash2}
				tone={confirm?.kind === 'seed' ? 'gold' : 'red'}
				title={tx(confirm?.kind === 'seed' ? L.confirmSeedTitle : L.confirmDeleteTitle)}
				message={tx(confirm?.kind === 'seed' ? L.confirmSeed : L.confirmDeleteText)}
				actions={[
					{ title: confirm?.kind === 'seed' ? tx(L.seedAll) : tx(L.yesDelete), variant: confirm?.kind === 'seed' ? 'primary' : 'danger', onPress: () => { const c = confirm; setConfirm(null); if (c.kind === 'seed') seedAll(); else remove(c.id); } },
					{ title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
