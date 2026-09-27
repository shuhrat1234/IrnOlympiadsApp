import React from 'react';
import { Stack } from 'expo-router';
import { VisaProvider } from '../../../components/admin/visa';
import { colors } from '../../../theme';

// Visa / Embassy module (website VisaLayout): its own reminder poller + nested screens.
export default function VisaLayout() {
	return (
		<VisaProvider>
			<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'none' }}>
				<Stack.Screen name="participants/[id]" options={{ animation: 'slide_from_right' }} />
			</Stack>
		</VisaProvider>
	);
}
