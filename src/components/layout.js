import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Timer, AlertCircle } from 'lucide-react-native';
import { colors, radius } from '../theme';
import { IconButton, T } from './ui';
import { formatClock } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';

export const Canvas = ({ children, style }) => (
	<View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
		{children}
	</View>
);

// Standard scrollable screen with pull-to-refresh. `header` renders above content.
export const Screen = ({ children, onRefresh, header, contentStyle, tabBar = false, scrollRef, keyboard = false }) => {
	const insets = useSafeAreaInsets();
	const [refreshing, setRefreshing] = useState(false);
	const handleRefresh = useCallback(async () => {
		if (!onRefresh) return;
		setRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setRefreshing(false);
		}
	}, [onRefresh]);
	return (
		<Canvas>
			{header}
			<ScrollView
				ref={scrollRef}
				contentContainerStyle={[styles.screenContent, { paddingTop: header ? 4 : insets.top + 12, paddingBottom: tabBar ? 120 : insets.bottom + 32 }, contentStyle]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode={keyboard ? 'interactive' : 'on-drag'}
				refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.goldDeep} colors={[colors.goldDeep]} /> : undefined}
			>
				{children}
			</ScrollView>
		</Canvas>
	);
};

export const StackHeader = ({ title, subtitle, right, onBack }) => {
	const insets = useSafeAreaInsets();
	return (
		<View style={[styles.header, { paddingTop: insets.top + 6 }]}>
			<IconButton icon={ChevronLeft} onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
			<View style={{ flex: 1, minWidth: 0 }}>
				{title ? <T v="h3" numberOfLines={2} style={{ fontSize: 17 }}>{title}</T> : null}
				{subtitle ? <T v="small" numberOfLines={1}>{subtitle}</T> : null}
			</View>
			{right}
		</View>
	);
};

export const LargeTitle = ({ title, subtitle, right, style }) => (
	<View style={[styles.largeTitle, style]}>
		<View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0 }}>
			<T v="display">{title}</T>
			{subtitle ? <T v="body" style={{ marginTop: 4 }}>{subtitle}</T> : null}
		</View>
		{right}
	</View>
);

// Countdown in seconds; calls onExpire once when it reaches zero.
export const useCountdown = (initialSeconds, onExpire) => {
	const [left, setLeft] = useState(initialSeconds);
	const fired = useRef(false);
	const cb = useRef(onExpire);
	cb.current = onExpire;
	useEffect(() => {
		setLeft(initialSeconds);
		fired.current = false;
	}, [initialSeconds]);
	useEffect(() => {
		if (left === null || left === undefined) return;
		if (left <= 0) {
			if (!fired.current) {
				fired.current = true;
				cb.current?.();
			}
			return;
		}
		const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
		return () => clearTimeout(timer);
	}, [left]);
	return left;
};

export const PaymentCountdown = ({ seconds, onExpire, style }) => {
	const { t } = useLanguage();
	const left = useCountdown(seconds, onExpire);
	const urgent = left < 60;
	if (left <= 0) {
		return (
			<View style={[styles.countdown, { backgroundColor: colors.redSoft }, style]}>
				<AlertCircle size={15} color={colors.red} />
				<T v="strong" color={colors.red} style={{ fontSize: 13 }}>{t('timeExpired')}</T>
			</View>
		);
	}
	return (
		<View style={[styles.countdown, { backgroundColor: urgent ? colors.redSoft : colors.goldTint }, style]}>
			<Timer size={15} color={urgent ? colors.red : colors.amber} strokeWidth={2.4} />
			<T v="small" color={urgent ? colors.red : colors.amber} style={{ fontFamily: 'Manrope_700Bold' }}>{t('payWithin')}</T>
			<T v="mono" style={{ fontWeight: '800', color: urgent ? colors.red : colors.navyDeep }}>{formatClock(left)}</T>
		</View>
	);
};

const styles = StyleSheet.create({
	ambientGold: { position: 'absolute', top: 34, right: -92, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(253,200,0,0.075)' },
	ambientBlue: { position: 'absolute', top: 240, left: -110, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(47,111,235,0.035)' },
	screenContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18 },
	largeTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18, gap: 12 },
	header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: 'rgba(251,250,247,0.96)', zIndex: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(230,224,211,0.7)' },
	countdown: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
