import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import api from '../api/client';
import E from '../api/endpoints';
import { store } from '../api/storage';

// Configure foreground notification behavior (banners appear even if app is open)
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

/**
 * Request system permissions and register push token with backend
 */
export async function registerForPushNotificationsAsync() {
	let token = null;

	try {
		const { status: existingStatus } = await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;

		// Request permission if not already granted
		if (existingStatus !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync({
				ios: {
					allowAlert: true,
					allowBadge: true,
					allowSound: true,
				},
			});
			finalStatus = status;
		}

		if (finalStatus !== 'granted') {
			return null;
		}

		// Android notification channel setup
		if (Platform.OS === 'android') {
			await Notifications.setNotificationChannelAsync('default', {
				name: 'IRN Olympiads',
				importance: 5, // AndroidImportance.MAX
				vibrationPattern: [0, 250, 250, 250],
				lightColor: '#f59e0b',
				sound: 'default',
			});
		}

		// Get Expo push token
		const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
		const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
		token = tokenData?.data;

		if (token) {
			await store.set('expo_push_token', token);

			// Register token with backend
			let deviceId = await store.get('app_device_id');
			try {
				await api.post('device-token/', {
					token,
					platform: Platform.OS,
					device_id: deviceId,
				});
			} catch {
				// Fallback: ping app-version endpoint with push_token parameter
				try {
					await api.get(E.APP_VERSION, {
						params: {
							device_id: deviceId,
							platform: Platform.OS,
							push_token: token,
						},
					});
				} catch {}
			}
		}
	} catch (err) {
		console.log('Push notification registration:', err?.message || err);
	}

	return token;
}

/**
 * Listen for notification taps to open the intended route
 */
export function setupNotificationListeners() {
	const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
		// Notification received in foreground
	});

	const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
		const data = response?.notification?.request?.content?.data;
		const route = data?.route;
		if (route) {
			try {
				router.push(route);
			} catch (err) {
				console.warn('Notification route failure:', err);
			}
		}
	});

	return () => {
		receivedSubscription.remove();
		responseSubscription.remove();
	};
}
