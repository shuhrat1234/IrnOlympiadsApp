import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, isTeacher } from '../context/AuthContext';

export default function RatingRoute() {
	const { currentUser } = useAuth();
	if (isTeacher(currentUser)) {
		return <Redirect href="/teacher/rating" />;
	}
	return <Redirect href="/results" />;
}
