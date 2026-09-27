import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Home } from 'lucide-react-native';
import { colors, fonts, shadow } from '../theme';

// Floating glass tab bar shared by the student, admin and teacher areas.
const TabItem = ({ route, focused, onPress, label, badge, icon: Icon = Home }) => {
	const pill = useAnimatedStyle(() => ({
		transform: [{ scale: withSpring(focused ? 1 : 0.6, { damping: 14 }) }],
		opacity: withSpring(focused ? 1 : 0),
	}));
	return (
		<Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
			<View style={styles.iconBox}>
				<Animated.View style={[styles.pill, pill]} />
				<Icon size={22} color={focused ? colors.navyDeep : colors.muted} strokeWidth={focused ? 2.5 : 2} />
				{badge ? (
					<View style={styles.badge}>
						<Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
					</View>
				) : null}
			</View>
			<Text style={[styles.label, { color: focused ? colors.ink : colors.muted, fontFamily: focused ? fonts.extrabold : fonts.semibold }]} numberOfLines={1}>
				{label}
			</Text>
		</Pressable>
	);
};

// items: { [routeName]: { icon, label, badge } } — routes missing from items are hidden.
export const TabBar = ({ state, navigation, items }) => {
	const insets = useSafeAreaInsets();

	return (
		<View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
			<View style={styles.bar}>
				{Platform.OS === 'ios' ? <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} /> : null}
				<View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.78)' : colors.white }]} />
				{state.routes.map((route, index) => {
					const item = items[route.name];
					if (!item) return null;
					const focused = state.index === index;
					return (
						<TabItem
							key={route.key}
							route={route}
							focused={focused}
							icon={item.icon}
							label={item.label}
							badge={item.badge}
							onPress={() => {
								const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
								if (!focused && !event.defaultPrevented) {
									Haptics.selectionAsync().catch(() => {});
									navigation.navigate(route.name);
								}
							}}
						/>
					);
				})}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrap: { position: 'absolute', left: 14, right: 14 },
	bar: { flexDirection: 'row', height: 70, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(230,215,178,0.7)', paddingHorizontal: 6, ...shadow(3) },
	item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
	iconBox: { width: 52, height: 32, alignItems: 'center', justifyContent: 'center' },
	pill: { position: 'absolute', width: 52, height: 32, borderRadius: 16, backgroundColor: colors.gold },
	label: { fontSize: 10.5 },
	badge: { position: 'absolute', top: -3, right: 6, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
	badgeText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 9 },
});
