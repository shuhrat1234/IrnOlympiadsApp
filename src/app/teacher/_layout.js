import React from 'react';
import { Tabs } from 'expo-router';
import { Award, Menu, Trophy, Users } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme';

// Teacher area (website TeacherLayout: students, coins, rating + support in the menu).
export default function TeacherTabs() {
	const { tx } = useLanguage();
	const { unreadCount } = useSupport();
	const items = {
		index: { icon: Users, label: tx({ uz: "O'quvchilar", ru: 'Ученики', en: 'Students' }) },
		coins: { icon: Award, label: tx({ uz: 'Tangalar', ru: 'Монеты', en: 'Coins' }) },
		rating: { icon: Trophy, label: tx({ uz: 'Reyting', ru: 'Рейтинг', en: 'Rating' }) },
		more: { icon: Menu, label: tx({ uz: 'Menyu', ru: 'Меню', en: 'Menu' }), badge: unreadCount },
	};
	return (
		<Tabs tabBar={(props) => <TabBar {...props} items={items} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="coins" />
			<Tabs.Screen name="rating" />
			<Tabs.Screen name="more" />
		</Tabs>
	);
}
