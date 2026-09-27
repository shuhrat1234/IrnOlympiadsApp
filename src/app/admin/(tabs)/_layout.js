import React from 'react';
import { Tabs } from 'expo-router';
import { Award, LayoutDashboard, Menu, Trophy, Users } from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth, isCoordinator } from '../../../context/AuthContext';
import { useSupport } from '../../../context/SupportContext';
import { useAdmin } from '../../../context/AdminContext';
import { TabBar } from '../../../components/TabBar';
import { colors } from '../../../theme';

export default function AdminTabs() {
	const { tx } = useLanguage();
	const { currentUser } = useAuth();
	const { notClosedCount } = useSupport();
	const { pendingEditRequests, pendingBookOrders } = useAdmin();
	const coordinator = isCoordinator(currentUser);
	const menuBadge = (notClosedCount || 0) + (coordinator ? 0 : pendingEditRequests + pendingBookOrders);
	const items = {
		...(coordinator
			? {}
			: {
					index: { icon: LayoutDashboard, label: tx({ uz: 'Asosiy', ru: 'Дашборд', en: 'Home' }) },
					olympiads: { icon: Trophy, label: tx({ uz: 'Olimpiada', ru: 'Олимпиады', en: 'Olympiads' }) },
				}),
		users: { icon: Users, label: tx({ uz: 'Userlar', ru: 'Польз.', en: 'Users' }) },
		results: { icon: Award, label: tx({ uz: 'Natijalar', ru: 'Результаты', en: 'Results' }) },
		menu: { icon: Menu, label: tx({ uz: 'Menyu', ru: 'Меню', en: 'Menu' }), badge: menuBadge },
	};
	return (
		<Tabs
			initialRouteName={coordinator ? 'users' : 'index'}
			tabBar={(props) => <TabBar {...props} items={items} />}
			screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
		>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="olympiads" />
			<Tabs.Screen name="users" />
			<Tabs.Screen name="results" />
			<Tabs.Screen name="menu" />
		</Tabs>
	);
}
