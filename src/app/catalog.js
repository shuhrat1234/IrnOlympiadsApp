import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GraduationCap, MapPin, Search, SlidersHorizontal, Trophy, Wifi, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useOlympiad } from '../context/OlympiadContext';
import { Screen, StackHeader, LargeTitle } from '../components/layout';
import { EmptyState, Field, SelectSheet, SkeletonCard, T } from '../components/ui';
import OlympiadCard from '../components/OlympiadCard';
import { colors, fonts, radius } from '../theme';
import { GRADES } from '../utils/constants';
import { registrationStateFor } from '../utils/olympiadLogic';

const Chip = ({ icon: Icon, label, active, onPress, onClear }) => (
	<Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
		<Icon size={14} color={active ? colors.navyDeep : colors.muted} strokeWidth={2.4} />
		<T v="strong" style={{ fontSize: 13 }} color={active ? colors.navyDeep : colors.ink2} numberOfLines={1}>{label}</T>
		{active && onClear ? (
			<Pressable onPress={onClear} hitSlop={8}><X size={14} color={colors.navyDeep} /></Pressable>
		) : null}
	</Pressable>
);

export default function CatalogScreen() {
	const { currentUser, regions } = useAuth();
	const { t, pick } = useLanguage();
	const { olympiads, isLoaded, fetchOlympiads, userRegistrations, isRegistrationClosed } = useOlympiad();
	const [query, setQuery] = useState('');
	const [type, setType] = useState('all');
	const [grade, setGrade] = useState('all');
	const [region, setRegion] = useState('all');
	const [sheet, setSheet] = useState(null);

	const filtered = useMemo(
		() =>
			olympiads.filter((o) => {
				if (o.is_active === false) return false;
				if (query && !pick(o).toLowerCase().includes(query.toLowerCase())) return false;
				if (type !== 'all' && o.type !== type) return false;
				if (grade !== 'all' && !(o.grades || []).some((g) => String(g) === String(grade))) return false;
				if (region !== 'all' && !(o.region_ids || []).includes(parseInt(region, 10))) return false;
				return true;
			}),
		[olympiads, query, type, grade, region, pick]
	);

	// Grouped by brand (category, else first word of the title) like the website.
	const groups = useMemo(() => {
		const map = new Map();
		filtered.forEach((o) => {
			const brand = (o.category && o.category.trim()) || pick(o).trim().split(/\s+/)[0] || t('all');
			if (!map.has(brand)) map.set(brand, []);
			map.get(brand).push(o);
		});
		return Array.from(map.entries());
	}, [filtered, pick]);

	const regionName = region !== 'all' ? pick(regions.find((r) => String(r.id) === String(region)), 'name') : t('region');

	return (
		<Screen header={<StackHeader />} onRefresh={() => fetchOlympiads(true)}>
			<LargeTitle title={t('catalogTitle')} subtitle={t('catalogSub')} />
			<Field icon={Search} value={query} onChangeText={setQuery} placeholder={t('search')} returnKeyType="search" />
			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginTop: 12, marginBottom: 18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
				<Chip icon={Wifi} label={type === 'all' ? t('type') : type === 'online' ? t('online') : t('offline')} active={type !== 'all'} onPress={() => setSheet('type')} onClear={() => setType('all')} />
				<Chip icon={GraduationCap} label={grade === 'all' ? t('grade') : `${grade}${t('gradeSuffix')}`} active={grade !== 'all'} onPress={() => setSheet('grade')} onClear={() => setGrade('all')} />
				<Chip icon={MapPin} label={regionName} active={region !== 'all'} onPress={() => setSheet('region')} onClear={() => setRegion('all')} />
				{type !== 'all' || grade !== 'all' || region !== 'all' ? (
					<Chip icon={SlidersHorizontal} label={t('clearFilters')} onPress={() => { setType('all'); setGrade('all'); setRegion('all'); }} />
				) : null}
			</ScrollView>

			{!isLoaded && olympiads.length === 0 ? (
				<View style={{ gap: 14 }}><SkeletonCard /><SkeletonCard /></View>
			) : groups.length === 0 ? (
				<EmptyState icon={Trophy} title={t('notFound')} />
			) : (
				groups.map(([brand, items]) => (
					<View key={brand}>
						<View style={styles.groupHead}>
							<View style={styles.groupBar} />
							<T v="h2" style={{ flex: 1 }}>{brand}</T>
							<T v="small" style={{ fontFamily: fonts.bold }}>{items.length}</T>
						</View>
						{items.map((o) => {
							const st = currentUser ? registrationStateFor(currentUser, userRegistrations, o) : {};
							return <OlympiadCard key={o.id} oly={o} userGrade={currentUser?.grade} registered={st.isRegistered} closed={isRegistrationClosed(o)} />;
						})}
					</View>
				))
			)}

			<SelectSheet visible={sheet === 'type'} onClose={() => setSheet(null)} title={t('type')} value={type} onSelect={setType} options={[{ value: 'all', label: t('all') }, { value: 'online', label: t('online') }, { value: 'offline', label: t('offline') }]} />
			<SelectSheet visible={sheet === 'grade'} onClose={() => setSheet(null)} title={t('grade')} value={grade} onSelect={setGrade} options={[{ value: 'all', label: t('all') }, ...GRADES.filter((g) => g !== 'KG').map((g) => ({ value: g, label: `${g}${t('gradeSuffix')}` }))]} />
			<SelectSheet visible={sheet === 'region'} onClose={() => setSheet(null)} title={t('region')} value={region} onSelect={setRegion} options={[{ value: 'all', label: t('all') }, ...regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))]} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	chipActive: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	groupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 6 },
	groupBar: { width: 5, height: 22, borderRadius: 3, backgroundColor: colors.gold },
});
