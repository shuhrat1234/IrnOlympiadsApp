import React from 'react';
import { Stack } from 'expo-router';
import { AdminProvider } from '../../context/AdminContext';
import { WebEngineProvider } from '../../components/WebEngine';
import { colors } from '../../theme';

export default function AdminLayout() {
	return (
		<AdminProvider>
			<WebEngineProvider>
				<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />
			</WebEngineProvider>
		</AdminProvider>
	);
}
