import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Search, UserRound } from 'lucide-react-native';
import api from '../api/client';
import E from '../api/endpoints';
import { useLanguage } from '../context/LanguageContext';
import { Button, Field, T } from './ui';
import { colors, radius } from '../theme';

// Debounced search over teachers/search/ (≥2 chars, 350 ms) — same as the website.
export default function TeacherSearch({ onSelect, actionLabel, busyId }) {
	const { t } = useLanguage();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const timer = useRef(null);

	useEffect(() => () => clearTimeout(timer.current), []);

	const onChange = (value) => {
		setQuery(value);
		clearTimeout(timer.current);
		if (value.trim().length < 2) {
			setResults([]);
			setSearching(false);
			return;
		}
		setSearching(true);
		timer.current = setTimeout(() => {
			api
				.get(E.TEACHER_SEARCH, { params: { search: value.trim() } })
				.then((res) => setResults(Array.isArray(res.data) ? res.data : res.data?.results || []))
				.catch(() => setResults([]))
				.finally(() => setSearching(false));
		}, 350);
	};

	return (
		<View>
			<Field icon={Search} value={query} onChangeText={onChange} placeholder={t('teacherSearchPlaceholder')} autoCorrect={false} />
			{query.trim().length >= 2 ? (
				<View style={{ marginTop: 8, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
					{searching ? (
						<View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator color={colors.goldDeep} /></View>
					) : results.length ? (
						results.map((teacher, i) => (
							<View key={teacher.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
								<View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' }}>
									<UserRound size={18} color={colors.navy} />
								</View>
								<View style={{ flex: 1 }}>
									<T v="strong" numberOfLines={1} style={{ fontSize: 14 }}>{teacher.full_name}</T>
									<T v="small" numberOfLines={1}>{teacher.phone}{teacher.region_name ? ` · ${teacher.region_name}` : ''}</T>
								</View>
								<Button
									size="sm"
									title={actionLabel || t('confirm')}
									loading={busyId === teacher.id}
									onPress={() => {
										onSelect(teacher);
										setQuery('');
										setResults([]);
									}}
								/>
							</View>
						))
					) : (
						<T v="small" style={{ padding: 14, textAlign: 'center' }}>{t('noResultsTeacher')}</T>
					)}
				</View>
			) : null}
		</View>
	);
}
