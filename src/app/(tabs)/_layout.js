import React from 'react';
import { Tabs } from 'expo-router';
import { Bell, BookOpen, Home, Menu, Trophy } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useSupport } from '../../context/SupportContext';
import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme';

export default function TabsLayout() {
	const { t } = useLanguage();
	const { currentUser } = useAuth();
	const { unreadCount } = useSupport();
	const unreadNotifs = (currentUser?.notifications || []).filter((n) => !n.is_read).length;
	const items = {
		index: { icon: Home, label: t('tabHome') },
		olympiads: { icon: BookOpen, label: t('tabOlympiads') },
		results: { icon: Trophy, label: t('tabResults') },
		notifications: { icon: Bell, label: t('tabAlerts'), badge: unreadNotifs },
		more: { icon: Menu, label: t('tabMore'), badge: unreadCount },
	};
	return (
		<Tabs tabBar={(props) => <TabBar {...props} items={items} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="olympiads" />
			<Tabs.Screen name="results" />
			<Tabs.Screen name="notifications" />
			<Tabs.Screen name="more" />
		</Tabs>
	);
}
