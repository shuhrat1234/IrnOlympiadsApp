import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, isTeacher } from '../context/AuthContext';
import { colors } from '../theme';

export default function Index() {
	const { isLoggedIn, currentUser, booting } = useAuth();

	if (booting) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator size="large" color={colors.goldDeep} />
			</View>
		);
	}

	if (!isLoggedIn) {
		return <Redirect href="/login" />;
	}

	if (isTeacher(currentUser)) {
		return <Redirect href="/teacher" />;
	}

	return <Redirect href="/(tabs)" />;
}
