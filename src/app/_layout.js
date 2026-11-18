import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider, useAuth, homeRouteFor, isStudent, isTeacher } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';
import { SupportProvider } from '../context/SupportContext';
import { OlympiadProvider } from '../context/OlympiadContext';
import StudentGates from '../components/StudentGates';
import BootLoader from '../components/BootLoader';
import useIdleLogout from '../hooks/useIdleLogout';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Top-level route areas per role.
const AREA = { participant: '(tabs)', teacher: 'teacher' };
const STUDENT_ONLY = ['(tabs)', 'payment', 'exam', 'analysis', 'profile', 'history', 'orders', 'books', 'checkout'];

const RootNavigator = ({ onReady }) => {
	const { isLoggedIn, booting, currentUser } = useAuth();
	const touch = useIdleLogout();
	const segments = useSegments();
	const role = currentUser?.role;
	const student = isStudent(currentUser);
	const teacher = isTeacher(currentUser);

	// Guests may browse the public catalog; anything else sends them to login.
	// Logged-in users are kept inside their own role's area.
	const landed = React.useRef(false);
	useEffect(() => {
		if (booting) return;
		const first = segments[0];
		if (!first || first === 'index') return;
		if (!isLoggedIn) {
			const publicRoute = ['login', 'catalog', 'olympiad', 'register', 'register-teacher', 'books'].includes(first);
			if (!publicRoute) {
				router.replace('/login');
			}
			return;
		}
		landed.current = true;
		const area = AREA[role];
		const inOtherArea = (first === 'teacher' && area !== 'teacher') || (STUDENT_ONLY.includes(first) && area !== '(tabs)') || first === 'login';
		if (inOtherArea) router.replace(homeRouteFor(currentUser));
	}, [booting, isLoggedIn, role, segments]);

	useEffect(() => {
		if (!booting) onReady?.();
	}, [booting]);

	if (booting) return null;

	return (
		<View style={{ flex: 1 }} onTouchStart={touch}>
			<Stack initialRouteName="index" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
				<Stack.Screen name="index" />
				<Stack.Protected guard={student}>
					<Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
					<Stack.Screen name="payment/[id]" />
					<Stack.Screen name="exam/[id]" options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
					<Stack.Screen name="analysis/[id]" />
					<Stack.Screen name="profile" />
					<Stack.Screen name="history" />
					<Stack.Screen name="orders" />
					<Stack.Screen name="checkout" />
				</Stack.Protected>
				<Stack.Protected guard={teacher}>
					<Stack.Screen name="teacher" options={{ animation: 'fade' }} />
				</Stack.Protected>
				<Stack.Protected guard={isLoggedIn}>
					<Stack.Screen name="support/index" />
					<Stack.Screen name="support/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
					<Stack.Screen name="support/[id]" />
				</Stack.Protected>
				<Stack.Protected guard={!isLoggedIn}>
					<Stack.Screen name="login" options={{ animation: 'fade' }} />
					<Stack.Screen name="register-teacher" />
				</Stack.Protected>
				{/* Public: stays mounted when signup logs the student in mid-flow. */}
				<Stack.Screen name="register/[id]" />
				<Stack.Screen name="catalog" />
				<Stack.Screen name="books" />
				<Stack.Screen name="olympiad/[id]" />
			</Stack>
			{student ? <StudentGates /> : null}
		</View>
	);
};

export default function RootLayout() {
	const [fontsLoaded, fontError] = useFonts({ Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
	const fontsReady = fontsLoaded || !!fontError;
	const [navReady, setNavReady] = useState(false);
	const [loader, setLoader] = useState(true);
	return (
		<SafeAreaProvider>
			<StatusBar style={loader ? 'light' : 'dark'} />
			<View style={{ flex: 1, backgroundColor: loader ? '#09090C' : colors.bg }}>
				{fontsReady ? (
					<LanguageProvider>
						<AuthProvider>
							<ToastProvider>
								<SocketProvider>
									<SupportProvider>
										<OlympiadProvider>
											<RootNavigator onReady={() => setNavReady(true)} />
										</OlympiadProvider>
									</SupportProvider>
								</SocketProvider>
							</ToastProvider>
						</AuthProvider>
					</LanguageProvider>
				) : null}
				{loader ? <BootLoader done={fontsReady && navReady} onFinish={() => setLoader(false)} /> : null}
			</View>
		</SafeAreaProvider>
	);
}
