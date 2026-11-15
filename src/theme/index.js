import { Platform } from 'react-native';

// Brand: IRN gold (#FDC800 on the website) paired with a deep "medal ink" navy
// used on the certificates (#16305c). Warm cream canvas instead of flat white.
export const colors = {
	bg: '#FBFAF7',
	bgDeep: '#F2EEE4',
	card: '#FFFFFF',
	cardMuted: '#F7F4EC',
	line: '#EAE4D8',
	lineStrong: '#E6D7B2',

	ink: '#101A33',
	ink2: '#3B4560',
	muted: '#7C8496',
	faint: '#A9AFBC',

	gold: '#FDC800',
	goldDeep: '#F2A900',
	amber: '#E08E00',
	goldSoft: '#FFF3C4',
	goldTint: '#FFF8DF',

	navy: '#16305C',
	navyDeep: '#0C1A36',
	navySoft: '#E7ECF6',

	green: '#12A150',
	greenSoft: '#E3F6EA',
	red: '#E5484D',
	redSoft: '#FDECEC',
	blue: '#2F6FEB',
	blueSoft: '#E8F0FE',
	purple: '#7C4DDB',
	purpleSoft: '#F1EAFD',

	white: '#FFFFFF',
	overlay: 'rgba(12, 18, 36, 0.55)',
};

export const gradients = {
	gold: [colors.gold, colors.gold],
	goldSoft: [colors.goldTint, colors.goldTint],
	navy: [colors.navyDeep, colors.navyDeep],
	canvas: [colors.bg, colors.bg],
	success: [colors.green, colors.green],
	danger: [colors.red, colors.red],
};

export const fonts = {
	medium: 'Manrope_500Medium',
	semibold: 'Manrope_600SemiBold',
	bold: 'Manrope_700Bold',
	extrabold: 'Manrope_800ExtraBold',
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const shadow = (level = 1) => {
	const presets = {
		1: { opacity: 0.06, radius: 10, y: 4, elevation: 2 },
		2: { opacity: 0.1, radius: 18, y: 8, elevation: 5 },
		3: { opacity: 0.18, radius: 28, y: 14, elevation: 10 },
	};
	const p = presets[level] || presets[1];
	return Platform.select({
		ios: {
			shadowColor: '#25304A',
			shadowOpacity: p.opacity,
			shadowRadius: p.radius,
			shadowOffset: { width: 0, height: p.y },
		},
		default: { elevation: p.elevation },
	});
};

export const goldGlow = Platform.select({
	ios: { shadowColor: '#F2A900', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
	default: { elevation: 6 },
});
