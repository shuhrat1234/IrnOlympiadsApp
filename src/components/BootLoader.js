import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const BG = '#09090C';
const TRACK_W = 220;

// Branded boot screen (continues the native splash): warm glow, floating trophy,
// gold progress bar and "Loading...". `done` finishes the bar and fades out.
export default function BootLoader({ done, onFinish }) {
	const progress = useSharedValue(0);
	const fade = useSharedValue(1);
	const float = useSharedValue(0);
	const glow = useSharedValue(0.85);
	const [dots, setDots] = useState(1);

	useEffect(() => {
		progress.value = withTiming(0.82, { duration: 1600, easing: Easing.out(Easing.cubic) });
		float.value = withRepeat(withSequence(withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })), -1);
		glow.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.8, { duration: 1400 })), -1);
		const t = setInterval(() => setDots((d) => (d % 3) + 1), 380);
		return () => clearInterval(t);
	}, []);

	useEffect(() => {
		if (!done) return;
		progress.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
		fade.value = withDelay(460, withTiming(0, { duration: 320 }, (finished) => finished && onFinish && runOnJS(onFinish)()));
	}, [done]);

	const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
	const barStyle = useAnimatedStyle(() => ({ width: TRACK_W * progress.value }));
	const trophyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
	const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.9 + glow.value * 0.15 }] }));

	return (
		<Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} onLayout={() => SplashScreen.hideAsync().catch(() => {})} pointerEvents={done ? 'none' : 'auto'}>
			<View style={styles.center}>
				<Animated.Image source={require('../../assets/brand/glow.png')} style={[styles.glow, glowStyle]} resizeMode="contain" />
				<Animated.View style={trophyStyle}>
					<Image source={require('../../assets/brand/trophy.png')} style={styles.trophy} resizeMode="contain" />
				</Animated.View>
			</View>
			<View style={styles.bottom}>
				<View style={styles.track}>
					<Animated.View style={[styles.fill, barStyle, { backgroundColor: '#FDC800' }]} />
				</View>
				<Text style={styles.loading}>{`Loading${'.'.repeat(dots)}`}<Text style={{ color: 'transparent' }}>{'.'.repeat(3 - dots)}</Text></Text>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	root: { backgroundColor: BG, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
	center: { alignItems: 'center', justifyContent: 'center', width: 320, height: 320 },
	glow: { position: 'absolute', width: 420, height: 420 },
	trophy: { width: 200, height: 200 },
	bottom: { alignItems: 'center', marginTop: 34 },
	track: { width: TRACK_W, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
	fill: { height: 8, borderRadius: 4, overflow: 'hidden' },
	loading: { marginTop: 16, color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
});
