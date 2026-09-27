import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Check, X } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { Button, Field, Sheet, T, Tap } from './ui';
import { colors, radius } from '../theme';
import { formatShortDate, formatDay } from '../utils/format';

// Section card with a title — admin forms are long, this keeps them scannable.
export const FormSection = ({ icon: Icon, title, children, right, style }) => (
	<View style={[styles.section, style]}>
		<View style={styles.sectionHead}>
			{Icon ? <View style={styles.sectionIcon}><Icon size={16} color={colors.amber} /></View> : null}
			<T v="h3" style={{ flex: 1 }}>{title}</T>
			{right}
		</View>
		<View style={{ gap: 14 }}>{children}</View>
	</View>
);

export const TextArea = ({ rows = 4, ...props }) => (
	<Field multiline textAlignVertical="top" inputStyle={{ minHeight: rows * 22, paddingTop: 14 }} {...props} />
);

export const NumberField = ({ value, onChange, ...props }) => (
	<Field keyboardType="number-pad" value={value === undefined || value === null ? '' : String(value)} onChangeText={(v) => onChange(v.replace(/[^\d]/g, ''))} {...props} />
);

export const SwitchRow = ({ label, hint, value, onChange, disabled }) => (
	<View style={styles.switchRow}>
		<View style={{ flex: 1 }}>
			<T v="strong" style={{ fontSize: 14.5 }}>{label}</T>
			{hint ? <T v="small" style={{ marginTop: 2 }}>{hint}</T> : null}
		</View>
		<Switch value={!!value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.gold, false: colors.lineStrong }} thumbColor={colors.white} ios_backgroundColor={colors.lineStrong} />
	</View>
);

// options: [{ value, label }]; value: array
export const ChipsSelect = ({ label, options, value = [], onChange, allLabel, noneLabel }) => {
	const all = options.length > 0 && options.every((o) => value.map(String).includes(String(o.value)));
	return (
		<View>
			{label || allLabel ? (
				<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
					{label ? <T v="label" style={{ marginLeft: 4 }}>{label}</T> : <View />}
					{allLabel ? (
						<Pressable onPress={() => onChange(all ? [] : options.map((o) => o.value))} hitSlop={8}>
							<T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{all ? noneLabel || allLabel : allLabel}</T>
						</Pressable>
					) : null}
				</View>
			) : null}
			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
				{options.map((o) => {
					const on = value.map(String).includes(String(o.value));
					return (
						<Tap key={String(o.value)} onPress={() => onChange(on ? value.filter((v) => String(v) !== String(o.value)) : [...value, o.value])} style={[styles.chip, on && styles.chipOn]}>
							{on ? <Check size={13} color={colors.navyDeep} strokeWidth={3} /> : null}
							<T v="strong" style={{ fontSize: 13 }} color={on ? colors.navyDeep : colors.ink2}>{o.label}</T>
						</Tap>
					);
				})}
			</View>
		</View>
	);
};

// Single choice as pills.
export const ChoicePills = ({ options, value, onChange }) => (
	<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
		{options.map((o) => {
			const on = String(o.value) === String(value);
			return (
				<Tap key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.chipOn]}>
					<T v="strong" style={{ fontSize: 13 }} color={on ? colors.navyDeep : colors.ink2}>{o.label}</T>
				</Tap>
			);
		})}
	</View>
);

// Date(+time) picker. value: ISO string or '' ; onChange(isoString | '').
export const DateTimeField = ({ label, value, onChange, mode = 'datetime', placeholder, clearable = true, error }) => {
	const { lang, tx } = useLanguage();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(null);
	const date = value ? new Date(value) : null;
	const valid = date && !isNaN(date.getTime());
	const text = valid ? (mode === 'date' ? formatDay(date) : formatShortDate(date, lang)) : '';

	const openPicker = () => {
		const base = valid ? date : new Date();
		if (Platform.OS === 'android') {
			DateTimePickerAndroid.open({
				value: base,
				mode: 'date',
				onChange: (e, d) => {
					if (e.type !== 'set' || !d) return;
					if (mode === 'date') return onChange(d.toISOString());
					DateTimePickerAndroid.open({
						value: d,
						mode: 'time',
						is24Hour: true,
						onChange: (e2, t2) => e2.type === 'set' && t2 && onChange(t2.toISOString()),
					});
				},
			});
			return;
		}
		setDraft(base);
		setOpen(true);
	};

	return (
		<View>
			{label ? <T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{label}</T> : null}
			<Pressable onPress={openPicker} style={[styles.dateField, error && { borderColor: colors.red }]}>
				<Calendar size={18} color={valid ? colors.amber : colors.faint} />
				<T v="strong" style={{ flex: 1, fontSize: 15 }} color={valid ? colors.ink : colors.faint}>{text || placeholder || '—'}</T>
				{clearable && valid ? (
					<Pressable onPress={() => onChange('')} hitSlop={10}><X size={16} color={colors.faint} /></Pressable>
				) : null}
			</Pressable>
			{error ? <T v="small" color={colors.red} style={{ marginTop: 6, marginLeft: 4 }}>{error}</T> : null}
			{Platform.OS === 'ios' ? (
				<Sheet visible={open} onClose={() => setOpen(false)} title={label}>
					<View style={{ alignItems: 'center' }}>
						{draft ? (
							<DateTimePicker value={draft} mode={mode} display={mode === 'date' ? 'inline' : 'spinner'} locale={lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-GB'} is24Hour onChange={(e, d) => d && setDraft(d)} themeVariant="light" accentColor={colors.goldDeep} />
						) : null}
					</View>
					<Button title={tx({ uz: 'Tayyor', ru: 'Готово', en: 'Done' })} style={{ marginTop: 12 }} onPress={() => { onChange(draft.toISOString()); setOpen(false); }} />
				</Sheet>
			) : null}
		</View>
	);
};

export const errorText = (err) => {
	if (!err) return '';
	if (typeof err === 'string') return err;
	if (typeof err === 'object') return Object.entries(err).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : v}`).join(' | ');
	return String(err);
};

const styles = StyleSheet.create({
	section: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, borderWidth: 1, borderColor: colors.line, marginBottom: 14 },
	sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
	sectionIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' },
	switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	chipOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16, minHeight: 54 },
});

