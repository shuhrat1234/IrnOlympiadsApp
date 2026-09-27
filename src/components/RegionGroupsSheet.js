import React from 'react';
import { Linking, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, MapPin, Send } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { Sheet, T, Tap } from './ui';
import { colors, radius } from '../theme';
import { REGION_GROUPS } from '../utils/constants';

// Shown after registering: the student's own regional Telegram group (all groups if unknown).
export default function RegionGroupsSheet({ visible, onClose, userRegion }) {
	const { t, lang } = useLanguage();
	const matched = userRegion ? REGION_GROUPS.filter((g) => g.regionIds.includes(Number(userRegion))) : [];
	const groups = matched.length ? matched : REGION_GROUPS;
	return (
		<Sheet visible={visible} onClose={onClose} title={matched.length ? t('regionGroupTitle') : t('regionGroupsTitle')} scroll>
			<View style={{ alignItems: 'center', marginBottom: 16 }}>
				<LinearGradient colors={['#37BBFE', '#007DBB']} style={{ width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
					<Send size={28} color="#fff" />
				</LinearGradient>
				<T v="body" style={{ textAlign: 'center', marginTop: 12 }}>{t('regionGroupText')}</T>
			</View>
			<View style={{ gap: 10 }}>
				{groups.map((g) => (
					<Tap key={g.url} onPress={() => Linking.openURL(g.url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line }}>
						<View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
							<MapPin size={18} color="#0088CC" />
						</View>
						<View style={{ flex: 1 }}>
							<T v="strong">{g[lang] || g.en}</T>
							<T v="small">{g.url.replace('https://', '')}</T>
						</View>
						<ChevronRight size={18} color={colors.faint} />
					</Tap>
				))}
			</View>
		</Sheet>
	);
}
