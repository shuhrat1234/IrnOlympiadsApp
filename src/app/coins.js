import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, isTeacher } from '../context/AuthContext';

export default function CoinsRoute() {
	const { currentUser } = useAuth();
	if (isTeacher(currentUser)) {
		return <Redirect href="/teacher/coins" />;
	}
	return <Redirect href="/(tabs)" />;
}
