import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, X, Check } from 'lucide-react-native';
import { colors, fonts, radius, shadow, goldGlow } from '../theme';

// ——— Typography ———
export const T = ({ v = 'body', color, style, children, ...rest }) => {
	// A custom fontSize without a lineHeight would inherit the variant's (smaller)
	// lineHeight and clip — derive a proportional one instead.
	const flat = StyleSheet.flatten(style) || {};
	const fix = flat.fontSize && !flat.lineHeight ? { lineHeight: Math.round(flat.fontSize * 1.28) } : null;
	return (
		<Text style={[typo[v], color && { color }, style, fix]} {...rest}>
			{children}
		</Text>
	);
};

const typo = StyleSheet.create({
	display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, color: colors.ink, letterSpacing: -0.8 },
	h1: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.5 },
	h2: { fontFamily: fonts.extrabold, fontSize: 20, lineHeight: 26, color: colors.ink, letterSpacing: -0.3 },
	h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink },
	body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink2 },
	small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
	label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
	strong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, color: colors.ink },
	mono: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 14, color: colors.ink },
});

// ——— Pressable with spring scale ———
export const Tap = ({ onPress, style, containerStyle, children, haptic = true, disabled, scale = 0.97, ...rest }) => {
	const s = useSharedValue(1);
	const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
	return (
		<Pressable
			style={containerStyle}
			disabled={disabled}
			onPressIn={() => { s.value = withSpring(scale, { damping: 15, stiffness: 400 }); }}
			onPressOut={() => { s.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
			onPress={(e) => {
				if (haptic) Haptics.selectionAsync().catch(() => {});
				onPress?.(e);
			}}
			{...rest}
		>
			<Animated.View style={[style, anim]}>{children}</Animated.View>
		</Pressable>
	);
};

// ——— Buttons ———
export const Button = ({ title, onPress, variant = 'primary', icon: Icon, iconRight: IconRight, loading, disabled, size = 'lg', style }) => {
	const isDisabled = disabled || loading;
	const h = size === 'sm' ? 40 : size === 'md' ? 48 : 56;
	const fs = size === 'sm' ? 13 : 15;
	const palette = {
		primary: { fg: colors.navyDeep, bg: colors.gold },
		dark: { fg: colors.white, bg: colors.navyDeep },
		success: { fg: colors.white, bg: colors.green },
		danger: { fg: colors.white, bg: colors.red },
		light: { fg: colors.ink, bg: colors.white, border: colors.line },
		soft: { fg: colors.amber, bg: colors.goldTint, border: colors.goldSoft },
		ghost: { fg: colors.muted, bg: 'transparent' },
	}[variant];
	const content = (
		<View style={[styles.btnInner, { height: h }]}>
			{loading ? (
				<ActivityIndicator color={palette.fg} />
			) : (
				<>
					{Icon ? <Icon size={18} color={palette.fg} strokeWidth={2.4} /> : null}
					<Text style={[styles.btnText, { color: palette.fg, fontSize: fs }]} numberOfLines={2}>{title}</Text>
					{IconRight ? <IconRight size={18} color={palette.fg} strokeWidth={2.4} /> : null}
				</>
			)}
		</View>
	);
	return (
		<Tap onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.55 : 1, borderRadius: radius.pill }, variant === 'primary' && !isDisabled && goldGlow, style]}>
			<View style={[styles.btnShape, { backgroundColor: palette.bg, borderWidth: palette.border ? 1.5 : 0, borderColor: palette.border }]}>{content}</View>
		</Tap>
	);
};

export const IconButton = ({ icon: Icon, onPress, color = colors.ink, bg = colors.white, size = 44, badge, style }) => (
	<Tap onPress={onPress} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, bg === colors.white && shadow(1), style]}>
		<Icon size={size * 0.45} color={color} strokeWidth={2.2} />
		{badge ? (
			<View style={styles.badgeDot}>
				<Text style={styles.badgeDotText}>{badge > 99 ? '99+' : badge}</Text>
			</View>
		) : null}
	</Tap>
);

// ——— Surfaces ———
export const Card = ({ children, style, padded = true, onPress }) => {
	const body = <View style={[styles.card, padded && { padding: 18 }, style]}>{children}</View>;
	return onPress ? <Tap onPress={onPress} scale={0.985}>{body}</Tap> : body;
};

export const Pill = ({ label, color = colors.ink2, bg = colors.cardMuted, icon: Icon, style, dot }) => (
	<View style={[styles.pill, { backgroundColor: bg }, style]}>
		{dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
		{Icon ? <Icon size={12} color={color} strokeWidth={2.5} /> : null}
		<Text style={[styles.pillText, { color }]} numberOfLines={1}>{label}</Text>
	</View>
);

export const IconBadge = ({ icon: Icon, color = colors.amber, bg = colors.goldTint, size = 44, radiusSize }) => (
	<View style={{ width: size, height: size, borderRadius: radiusSize ?? size / 3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
		<Icon size={size * 0.46} color={color} strokeWidth={2.2} />
	</View>
);

export const Divider = ({ style }) => <View style={[{ height: 1, backgroundColor: colors.line }, style]} />;

export const SectionTitle = ({ title, action, onAction, style }) => (
	<View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, marginTop: 8 }, style]}>
		<T v="h2" style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>{title}</T>
		{action ? (
			<Pressable onPress={onAction} hitSlop={10}>
				<T v="strong" color={colors.amber} style={{ fontSize: 14 }}>{action}</T>
			</Pressable>
		) : null}
	</View>
);

// ——— Inputs ———
export const Field = ({ label, icon: Icon, error, secure, right, style, inputStyle, hint, ...props }) => {
	const [focused, setFocused] = useState(false);
	const [hidden, setHidden] = useState(true);
	const inputRef = useRef(null);
	return (
		<View style={style}>
			{label ? <T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{label}</T> : null}
			<View
				style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}
				onTouchEnd={() => inputRef.current?.focus()}
			>
				{Icon ? <Icon size={18} color={focused ? colors.amber : colors.faint} strokeWidth={2.2} /> : null}
				<TextInput
					ref={inputRef}
					placeholderTextColor={colors.faint}
					style={[styles.input, inputStyle]}
					secureTextEntry={secure && hidden}
					showSoftInputOnFocus
					onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
					onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
					{...props}
				/>
				{secure ? (
					<Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
						{hidden ? <Eye size={18} color={colors.faint} /> : <EyeOff size={18} color={colors.faint} />}
					</Pressable>
				) : null}
				{right}
			</View>
			{error ? <T v="small" color={colors.red} style={{ marginTop: 6, marginLeft: 4, fontFamily: fonts.semibold }}>{error}</T> : hint ? <T v="small" style={{ marginTop: 6, marginLeft: 4 }}>{hint}</T> : null}
		</View>
	);
};

export const Segmented = ({ options, value, onChange, style, dark }) => (
	<View style={[styles.segment, dark && { backgroundColor: 'rgba(255,255,255,0.08)' }, style]}>
		{options.map((opt) => {
			const active = opt.value === value;
			const Icon = opt.icon;
			return (
				<Pressable
					key={String(opt.value)}
					onPress={() => {
						Haptics.selectionAsync().catch(() => {});
						onChange(opt.value);
					}}
					style={[styles.segmentItem, active && (dark ? styles.segmentActiveDark : styles.segmentActive)]}
				>
					{Icon ? <Icon size={15} color={active ? (dark ? colors.navyDeep : colors.ink) : colors.muted} strokeWidth={2.4} /> : null}
					<Text style={[styles.segmentText, { color: active ? (dark ? colors.navyDeep : colors.ink) : colors.muted }]} numberOfLines={1}>
						{opt.label}
					</Text>
					{opt.badge ? (
						<View style={[styles.segBadge, active && { backgroundColor: colors.gold }]}>
							<Text style={styles.segBadgeText}>{opt.badge}</Text>
						</View>
					) : null}
				</Pressable>
			);
		})}
	</View>
);

// ——— Overlays ———
// Bottom sheet built on Modal: dimmed backdrop, spring-in panel, safe-area aware.
export const Sheet = ({ visible, onClose, children, title, dismissable = true, scroll = false, maxHeight = '88%' }) => {
	const insets = useSafeAreaInsets();
	const Body = scroll ? ScrollView : View;
	return (
		<Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => dismissable && onClose?.()}>
			{visible ? (
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
					<Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
						<Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => dismissable && onClose?.()} />
					</Animated.View>
					<View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
						<Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)} exiting={SlideOutDown.duration(180)} style={[styles.sheet, { paddingBottom: insets.bottom + 18, maxHeight }]}>
							<View style={styles.grabber} />
							{title || dismissable ? (
								<View style={styles.sheetHeader}>
									<T v="h2" style={{ flex: 1 }}>{title}</T>
									{dismissable ? <IconButton icon={X} onPress={onClose} size={36} bg={colors.cardMuted} color={colors.ink2} /> : null}
								</View>
							) : null}
							<Body {...(scroll ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' } : {})}>{children}</Body>
						</Animated.View>
					</View>
				</KeyboardAvoidingView>
			) : null}
		</Modal>
	);
};

// Centered alert-style dialog used for every "Are you sure?" on the website.
export const Dialog = ({ visible, onClose, icon: Icon, tone = 'gold', title, message, children, actions = [], dismissable = true }) => {
	const toneMap = {
		gold: [colors.goldTint, colors.amber],
		red: [colors.redSoft, colors.red],
		green: [colors.greenSoft, colors.green],
		blue: [colors.blueSoft, colors.blue],
		navy: [colors.navySoft, colors.navy],
	}[tone];
	return (
		<Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => dismissable && onClose?.()}>
			{visible ? (
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dialogWrap}>
					<Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill}>
						<Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => dismissable && onClose?.()} />
					</Animated.View>
					<Animated.View entering={ZoomIn.springify().damping(16)} style={styles.dialog}>
						{Icon ? (
							<View style={[styles.dialogIcon, { backgroundColor: toneMap[0] }]}>
								<Icon size={30} color={toneMap[1]} strokeWidth={2.2} />
							</View>
						) : null}
						{title ? <T v="h2" style={{ textAlign: 'center' }}>{title}</T> : null}
						{message ? <T v="body" style={{ textAlign: 'center', marginTop: 8 }}>{message}</T> : null}
						{children}
						<View style={{ gap: 10, marginTop: 22, alignSelf: 'stretch' }}>
							{actions.map((a, i) => (
								<Button key={i} size="md" {...a} />
							))}
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
			) : null}
		</Modal>
	);
};

// Option list in a sheet — replaces <select>.
export const SelectSheet = ({ visible, onClose, title, options, value, onSelect }) => (
	<Sheet visible={visible} onClose={onClose} title={title} scroll maxHeight="75%">
		<View style={{ gap: 6 }}>
			{options.map((opt) => {
				const active = String(opt.value) === String(value);
				return (
					<Tap
						key={String(opt.value)}
						onPress={() => {
							onSelect(opt.value);
							onClose();
						}}
						style={[styles.option, active && styles.optionActive]}
					>
						<T v="strong" style={{ flex: 1 }} color={active ? colors.navyDeep : colors.ink}>{opt.label}</T>
						{active ? <Check size={18} color={colors.amber} strokeWidth={3} /> : null}
					</Tap>
				);
			})}
		</View>
	</Sheet>
);

export const SelectField = ({ label, icon: Icon, value, options, onChange, placeholder, error, title }) => {
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => String(o.value) === String(value));
	return (
		<View>
			{label ? <T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{label}</T> : null}
			<Pressable onPress={() => setOpen(true)} style={[styles.field, error && styles.fieldError]}>
				{Icon ? <Icon size={18} color={colors.faint} strokeWidth={2.2} /> : null}
				<Text style={[styles.input, { color: selected ? colors.ink : colors.faint, paddingVertical: 0 }]} numberOfLines={1}>
					{selected ? selected.label : placeholder}
				</Text>
				<T v="small" color={colors.faint}>▾</T>
			</Pressable>
			{error ? <T v="small" color={colors.red} style={{ marginTop: 6, marginLeft: 4, fontFamily: fonts.semibold }}>{error}</T> : null}
			<SelectSheet visible={open} onClose={() => setOpen(false)} title={title || label} options={options} value={value} onSelect={onChange} />
		</View>
	);
};

// ——— States ———
export const EmptyState = ({ icon: Icon, title, text, action }) => (
	<Animated.View entering={FadeIn.duration(300)} style={styles.empty}>
		<View style={[styles.emptyIcon, { backgroundColor: colors.goldTint }]}>
			<Icon size={34} color={colors.amber} strokeWidth={2} />
		</View>
		<T v="h3" style={{ textAlign: 'center', fontSize: 17 }}>{title}</T>
		{text ? <T v="small" style={{ textAlign: 'center', marginTop: 6, maxWidth: 280 }}>{text}</T> : null}
		{action ? <View style={{ marginTop: 20, alignSelf: 'stretch' }}>{action}</View> : null}
	</Animated.View>
);

export const Skeleton = ({ height = 16, width = '100%', radiusSize = 10, style }) => {
	const o = useSharedValue(0.5);
	useEffect(() => {
		o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
	}, []);
	const anim = useAnimatedStyle(() => ({ opacity: o.value }));
	return <Animated.View style={[{ height, width, borderRadius: radiusSize, backgroundColor: colors.bgDeep }, anim, style]} />;
};

export const SkeletonCard = () => (
	<Card style={{ gap: 12 }}>
		<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
			<Skeleton width={46} height={46} radiusSize={16} />
			<View style={{ flex: 1, gap: 8 }}>
				<Skeleton width="70%" />
				<Skeleton width="40%" height={12} />
			</View>
		</View>
		<Skeleton height={44} radiusSize={22} />
	</Card>
);

export const Loader = ({ label }) => (
	<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 }}>
		<ActivityIndicator size="large" color={colors.goldDeep} />
		{label ? <T v="small">{label}</T> : null}
	</View>
);

export const ProgressBar = ({ value = 0, color = colors.gold, track = colors.bgDeep, height = 6, style }) => (
	<View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
		<View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
	</View>
);

export const Avatar = ({ initials, size = 56, dark }) => (
	<View style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: dark ? colors.navyDeep : colors.gold, alignItems: 'center', justifyContent: 'center' }}>
		<Text style={{ fontFamily: fonts.extrabold, fontSize: size * 0.36, color: dark ? colors.gold : colors.navyDeep }}>{initials || '?'}</Text>
	</View>
);

const styles = StyleSheet.create({
	btnShape: { borderRadius: radius.pill, overflow: 'hidden' },
	btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, minWidth: 0 },
	btnText: { fontFamily: fonts.extrabold, letterSpacing: 0.1, flexShrink: 1, textAlign: 'center' },
	card: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(230,224,211,0.85)', ...shadow(1) },
	pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start', maxWidth: '100%' },
	pillText: { fontFamily: fonts.bold, fontSize: 11.5, letterSpacing: 0.2, flexShrink: 1 },
	dot: { width: 6, height: 6, borderRadius: 3 },
	badgeDot: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
	badgeDotText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 9 },
	field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, minHeight: 56 },
	fieldFocused: { borderColor: colors.goldDeep, backgroundColor: '#FFFEF9', ...shadow(1) },
	fieldError: { borderColor: colors.red, backgroundColor: '#FFF8F8' },
	input: { flex: 1, fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink, paddingVertical: 14 },
	segment: { flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: 'rgba(230,224,211,0.75)' },
	segmentItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.pill },
	segmentActive: { backgroundColor: colors.white, ...shadow(1) },
	segmentActiveDark: { backgroundColor: colors.gold },
	segmentText: { fontFamily: fonts.bold, fontSize: 13.5, flexShrink: 1 },
	segBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
	segBadgeText: { fontFamily: fonts.extrabold, fontSize: 10, color: colors.navyDeep },
	sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 10 },
	grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginBottom: 12 },
	sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
	dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
	dialog: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 32, padding: 26, alignItems: 'center', ...shadow(3) },
	dialogIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
	option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	optionActive: { backgroundColor: colors.goldTint, borderColor: colors.gold },
	empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
	emptyIcon: { width: 84, height: 84, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
});
