import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import { colors, fonts, radius, shadow } from '../theme';

const ToastContext = createContext(null);

const TYPES = {
	success: { icon: CheckCircle2, color: colors.green, bg: colors.greenSoft },
	error: { icon: XCircle, color: colors.red, bg: colors.redSoft },
	warning: { icon: AlertTriangle, color: colors.amber, bg: colors.goldTint },
	info: { icon: Info, color: colors.blue, bg: colors.blueSoft },
	payment: { icon: AlertTriangle, color: colors.red, bg: colors.redSoft },
};

export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([]);
	const insets = useSafeAreaInsets();
	const seq = useRef(0);

	const remove = useCallback((id) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

	// show({ title?, message, type }) — the web toasts took (message, type).
	const show = useCallback(
		({ title, message, type = 'info', duration = 4000 }) => {
			seq.current += 1;
			const id = seq.current;
			setToasts((prev) => [...prev.slice(-2), { id, title, message, type }]);
			setTimeout(() => remove(id), duration);
			return id;
		},
		[remove]
	);

	const value = useMemo(
		() => ({
			show,
			success: (message, title) => show({ message, title, type: 'success' }),
			error: (message, title) => show({ message, title, type: 'error' }),
			info: (message, title) => show({ message, title, type: 'info' }),
			warning: (message, title) => show({ message, title, type: 'warning' }),
		}),
		[show]
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
				{toasts.map((toast) => {
					const cfg = TYPES[toast.type] || TYPES.info;
					const Icon = cfg.icon;
					return (
						<Animated.View key={toast.id} entering={FadeInUp.duration(200)} exiting={FadeOutUp} layout={LinearTransition}>
							<Pressable onPress={() => remove(toast.id)} style={styles.toast}>
								<View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
									<Icon size={18} color={cfg.color} strokeWidth={2.4} />
								</View>
								<View style={{ flex: 1 }}>
									{toast.title ? <Text style={styles.title} numberOfLines={1}>{toast.title}</Text> : null}
									{toast.message ? <Text style={toast.title ? styles.message : styles.title} numberOfLines={3}>{toast.message}</Text> : null}
								</View>
							</Pressable>
						</Animated.View>
					);
				})}
			</View>
		</ToastContext.Provider>
	);
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
	host: { position: 'absolute', left: 14, right: 14, gap: 8, zIndex: 9999 },
	toast: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: colors.white,
		borderRadius: radius.lg,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: colors.line,
		...shadow(3),
	},
	iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
	message: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink2, marginTop: 2 },
});
