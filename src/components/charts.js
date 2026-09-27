import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { T } from './ui';

// Minimal SVG charts (the website uses recharts). All take plain arrays.

const useWidth = () => {
	const [w, setW] = useState(0);
	return [w, (e) => setW(e.nativeEvent.layout.width)];
};

const compact = (n) => {
	const v = Number(n) || 0;
	if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
	if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
	if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
	return String(Math.round(v));
};

// data: [{ label, value }]
export const AreaChart = ({ data, height = 180, color = colors.goldDeep, showLabels = true }) => {
	const [w, onLayout] = useWidth();
	const pad = { l: 8, r: 8, t: 14, b: showLabels ? 22 : 8 };
	const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
	const iw = Math.max(1, w - pad.l - pad.r);
	const ih = height - pad.t - pad.b;
	const pts = data.map((d, i) => [pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw), pad.t + ih - ((Number(d.value) || 0) / max) * ih]);
	// smooth cubic path
	let line = '';
	pts.forEach(([x, y], i) => {
		if (i === 0) line = `M${x},${y}`;
		else {
			const [px, py] = pts[i - 1];
			const cx = (px + x) / 2;
			line += ` C${cx},${py} ${cx},${y} ${x},${y}`;
		}
	});
	const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z` : '';
	return (
		<View onLayout={onLayout} style={{ height }}>
			{w > 0 && pts.length ? (
				<Svg width={w} height={height}>
					<Defs>
						<LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0" stopColor={color} stopOpacity="0.28" />
							<Stop offset="1" stopColor={color} stopOpacity="0" />
						</LinearGradient>
					</Defs>
					{[0.25, 0.5, 0.75].map((f) => (
						<Line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * f} y2={pad.t + ih * f} stroke={colors.line} strokeDasharray="4 4" />
					))}
					<Path d={area} fill="url(#area)" />
					<Path d={line} stroke={color} strokeWidth={2.5} fill="none" />
					{pts.map(([x, y], i) => (
						<Circle key={i} cx={x} cy={y} r={3.5} fill={colors.white} stroke={color} strokeWidth={2} />
					))}
					{showLabels
						? data.map((d, i) => (
								<SvgText key={i} x={pts[i][0]} y={height - 6} fontSize={9.5} fontFamily={fonts.bold} fill={colors.muted} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
									{d.label}
								</SvgText>
							))
						: null}
				</Svg>
			) : null}
		</View>
	);
};

// Vertical columns. data: [{ label, value }]
export const ColumnChart = ({ data, height = 190, color = colors.gold, showValues = true, labelEvery = 1 }) => {
	const [w, onLayout] = useWidth();
	const pad = { t: 18, b: 22 };
	const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
	const ih = height - pad.t - pad.b;
	const slot = data.length ? w / data.length : 0;
	const bw = Math.min(28, slot * 0.6);
	return (
		<View onLayout={onLayout} style={{ height }}>
			{w > 0 ? (
				<Svg width={w} height={height}>
					{data.map((d, i) => {
						const h = ((Number(d.value) || 0) / max) * ih;
						const x = i * slot + (slot - bw) / 2;
						return (
							<G key={i}>
								<Rect x={x} y={pad.t + ih - h} width={bw} height={Math.max(2, h)} rx={6} fill={color} />
								{showValues ? (
									<SvgText x={x + bw / 2} y={pad.t + ih - h - 5} fontSize={9} fontFamily={fonts.bold} fill={colors.ink2} textAnchor="middle">
										{compact(d.value)}
									</SvgText>
								) : null}
								{i % labelEvery === 0 ? (
									<SvgText x={x + bw / 2} y={height - 6} fontSize={9.5} fontFamily={fonts.bold} fill={colors.muted} textAnchor="middle">
										{String(d.label).slice(0, 6)}
									</SvgText>
								) : null}
							</G>
						);
					})}
				</Svg>
			) : null}
		</View>
	);
};

// Horizontal bars as plain views (labels wrap nicely). data: [{ label, value, sub }]
export const HBarList = ({ data, color = colors.gold, format = compact }) => {
	const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
	return (
		<View style={{ gap: 12 }}>
			{data.map((d, i) => (
				<View key={i} style={{ gap: 6 }}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
						<T v="strong" style={{ fontSize: 13, flex: 1 }} numberOfLines={1}>{d.label}</T>
						<T v="strong" style={{ fontSize: 13 }}>{format(d.value)}</T>
					</View>
					<View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bgDeep, overflow: 'hidden' }}>
						<View style={{ width: `${((Number(d.value) || 0) / max) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: d.color || color }} />
					</View>
					{d.sub ? <T v="small" style={{ fontSize: 11.5 }}>{d.sub}</T> : null}
				</View>
			))}
		</View>
	);
};

// segments: [{ label, value, color }]
export const Donut = ({ segments, size = 150, stroke = 22, center }) => {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
	let offset = 0;
	return (
		<View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
			<Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
				<Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgDeep} strokeWidth={stroke} fill="none" />
				{segments.map((sg, i) => {
					const len = ((Number(sg.value) || 0) / total) * c;
					const el = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={sg.color} strokeWidth={stroke} fill="none" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
					offset += len;
					return el;
				})}
			</Svg>
			{center}
		</View>
	);
};

export const Legend = ({ items }) => (
	<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
		{items.map((it, i) => (
			<View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
				<View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: it.color }} />
				<T v="small" style={{ fontSize: 12.5 }}>{it.label}{it.value !== undefined ? `: ${it.value}` : ''}</T>
			</View>
		))}
	</View>
);

export { compact };
