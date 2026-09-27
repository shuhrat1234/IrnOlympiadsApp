import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AlignCenter, AlignLeft, AlignRight, Calendar, Copy, Download, Hash, ImagePlus, Minus, Plus, QrCode, RotateCcw, Shuffle, Sparkles, Trash2, Type, Users } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useWebEngine } from '../WebEngine';
import { Button, Segmented, T, Tap } from '../ui';
import { ChoicePills, FormSection, SwitchRow } from '../form';
import CertificateRecipientsSheet from './CertificateRecipientsSheet';
import { colors, fonts, radius } from '../../theme';
import { mediaUrl } from '../../api/client';
import { DEFAULT_CERT_CONFIG, qrSvg, recipientsCertificatesZip } from '../../utils/documents';
import { isPdf, pickDocument } from '../../utils/files';

export const FULL_DEFAULT_CERT_CONFIG = {
	certificateLanguage: 'uz',
	...DEFAULT_CERT_CONFIG,
	aspectRatio: 1.414,
	award_templates: { gold: '', silver: '', bronze: '', general: '' },
	award_configs: {},
	recipients: [],
};

export const CERT_FONTS = [
	{ id: "'Playfair Display', Georgia, serif", name: 'Playfair Display', native: 'Georgia' },
	{ id: "'Cinzel', Georgia, serif", name: 'Cinzel', native: 'Times New Roman' },
	{ id: "'Great Vibes', cursive", name: 'Great Vibes', native: Platform.select({ ios: 'Snell Roundhand', default: 'serif' }) },
	{ id: "'Montserrat', sans-serif", name: 'Montserrat', native: fonts.extrabold },
	{ id: 'Georgia, serif', name: 'Georgia', native: 'Georgia' },
	{ id: "'Times New Roman', serif", name: 'Times New Roman', native: 'Times New Roman' },
	{ id: "'Roboto', sans-serif", name: 'Roboto', native: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }) },
	{ id: "'Merriweather', serif", name: 'Merriweather', native: 'Georgia' },
];
const nativeFont = (css) => (CERT_FONTS.find((f) => f.id === css) || CERT_FONTS[4]).native;

const SAMPLES = [
	{ first_name: 'Bekzod', last_name: 'Xayrullayev', middle_name: "Alisher o'g'li", score: 100, grade: '3' },
	{ first_name: 'Jasurbek', last_name: 'Rustamov', middle_name: "Botir o'g'li", score: 88, grade: '9' },
	{ first_name: 'Madina', last_name: 'Karimova', middle_name: 'Anvar qizi', score: 100, grade: '11' },
	{ first_name: 'Muhammadali', last_name: 'Abdullayev', middle_name: "Jaxongir o'g'li", score: 74, grade: '8' },
	{ first_name: 'Imronbek', last_name: 'Odiljonov', middle_name: "Oybek o'g'li", score: 97, grade: '1' },
	{ first_name: 'Rayhona', last_name: 'Salimova', middle_name: 'Rustam qizi', score: 85, grade: '7' },
	{ first_name: "Ulug'bek", last_name: 'Kamiljanov', middle_name: 'Rustamovich', score: 92, grade: '6' },
	{ first_name: 'Azizbek', last_name: 'Normatov', middle_name: 'Ilhomovich', score: 89, grade: '6' },
	{ first_name: 'Zilola', last_name: 'Toshmatova', middle_name: 'Zafar qizi', score: 96, grade: '8' },
	{ first_name: 'Sardor', last_name: 'Yusupov', middle_name: "Akmal o'g'li", score: 94, grade: '10' },
];
const AWARD_SAMPLE = { gold: 0, silver: 1, bronze: 3, general: 5 };
const SWATCHES = ['#16305c', '#0f172a', '#000000', '#d97706', '#b45309', '#15803d', '#dc2626', '#ffffff'];
const AWARD_TABS = [
	{ id: 'gold', label: '🥇 Gold' },
	{ id: 'silver', label: '🥈 Silver' },
	{ id: 'bronze', label: '🥉 Bronze' },
	{ id: 'general', label: '📜 Umumiy' },
];
const ELEMENTS = ['name', 'score', 'grade', 'date', 'qr'];

const L = {
	title: { ru: 'Сертификаты и награды', uz: 'Sertifikat sozlamalari va mukofotlar', en: 'Certificate Settings & Awards' },
	subtitle: { ru: 'Шаблоны для Gold, Silver, Bronze и импорт результатов из Excel/PDF.', uz: 'Gold, Silver, Bronze uchun shablonlar va Excel/PDF orqali import.', en: 'Templates for Gold, Silver, Bronze and Excel/PDF import.' },
	upload: { ru: 'Загрузить шаблон', uz: 'Shablon yuklash', en: 'Upload template' },
	change: { ru: 'Заменить шаблон', uz: 'Shablonni almashtirish', en: 'Change template' },
	converting: { ru: 'Преобразование PDF...', uz: 'PDF rasmga aylantirilmoqda...', en: 'Converting PDF...' },
	noTemplate: { ru: 'Шаблон не загружен — загрузите PDF, PNG или JPG.', uz: 'Shablon yuklanmagan — PDF, PNG yoki JPG yuklang.', en: 'No template yet — upload a PDF, PNG or JPG.' },
	dragHint: { ru: '💡 Перетаскивайте элементы пальцем прямо на макете', uz: "💡 Elementlarni barmoq bilan sertifikat ustida suring", en: '💡 Drag elements with your finger on the preview' },
	certLang: { ru: 'Язык сертификата', uz: 'Sertifikat tili', en: 'Certificate language' },
	show: { ru: 'Показывать на сертификате', uz: "Sertifikatda ko'rsatish", en: 'Show on certificate' },
	middle: { ru: 'Включать отчество (ФИО)', uz: 'Otasining ismi (Sharif)', en: 'Include middle name' },
	fontSize: { ru: 'Размер шрифта', uz: "Shrift o'lchami", en: 'Font size' },
	fontFamily: { ru: 'Шрифт', uz: 'Shrift turi', en: 'Font' },
	color: { ru: 'Цвет текста', uz: 'Matn rangi', en: 'Text color' },
	align: { ru: 'Выравнивание', uz: 'Tekislash', en: 'Alignment' },
	qrSize: { ru: 'Размер QR', uz: "QR o'lchami", en: 'QR size' },
	qrLabel: { ru: 'Подпись irnolympiad.uz', uz: 'irnolympiad.uz yozuvi', en: 'irnolympiad.uz caption' },
	reset: { ru: 'Сбросить позиции', uz: 'Pozitsiyalarni tiklash', en: 'Reset positions' },
	copyFrom: { ru: 'Скопировать позиции из', uz: 'Pozitsiyalarni nusxalash', en: 'Copy positions from' },
	random: { ru: 'Случайный ученик', uz: "Tasodifiy o'quvchi", en: 'Random sample' },
	import: { ru: 'Импорт результатов (Excel / PDF)', uz: 'Natijalar importi (Excel / PDF)', en: 'Import winners (Excel / PDF)' },
	tabs: { name: { ru: 'Имя', uz: 'Ism', en: 'Name' }, score: { ru: 'Балл', uz: 'Ball', en: 'Score' }, grade: { ru: 'Класс', uz: 'Sinf', en: 'Grade' }, date: { ru: 'Дата', uz: 'Sana', en: 'Date' }, qr: { ru: 'QR', uz: 'QR', en: 'QR' } },
};

const Stepper = ({ label, value, onChange, step = 1, min = 0, max = 300, suffix = '' }) => (
	<View style={styles.stepper}>
		<T v="strong" style={{ flex: 1, fontSize: 14 }}>{label}</T>
		<Tap onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))} style={styles.stepBtn}><Minus size={16} color={colors.ink} /></Tap>
		<T v="strong" style={{ minWidth: 56, textAlign: 'center' }}>{value}{suffix}</T>
		<Tap onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))} style={styles.stepBtn}><Plus size={16} color={colors.ink} /></Tap>
	</View>
);

export default function CertificateBuilder({ certificatePreview, config: certificateConfig, onChange, onImageChange, olympiadId, olympiadTitle }) {
	const { tx, lang } = useLanguage();
	const toast = useToast();
	const engine = useWebEngine();
	const [award, setAward] = useState('gold');
	const [tab, setTab] = useState('name');
	const [sample, setSample] = useState(0);
	const [converting, setConverting] = useState(false);
	const [qr, setQr] = useState(null);
	const [canvasW, setCanvasW] = useState(0);
	const [importOpen, setImportOpen] = useState(false);
	const [zip, setZip] = useState(null);
	const canvasRef = useRef(null);
	const canvasBox = useRef({ x: 0, y: 0 });

	useEffect(() => {
		qrSvg('https://irnolympiad.uz/verify?id=SAMPLE-1001&student=Bekzod+Xayrullayev&score=100').then(setQr).catch(() => {});
	}, []);
	useEffect(() => setSample(AWARD_SAMPLE[award] ?? 0), [award]);

	// Same merge rules as the website: per-award configs fall back to top-level ones.
	const templates = { ...FULL_DEFAULT_CERT_CONFIG.award_templates, ...(certificateConfig?.award_templates || {}) };
	const raw = certificateConfig?.award_configs || {};
	const base = useMemo(() => {
		const b = {};
		ELEMENTS.forEach((k) => { b[k] = { ...DEFAULT_CERT_CONFIG[k], ...(certificateConfig?.[k] || {}) }; });
		b.aspectRatio = certificateConfig?.aspectRatio || 1.414;
		return b;
	}, [certificateConfig]);
	const awardConfigs = {};
	AWARD_TABS.forEach(({ id }) => {
		awardConfigs[id] = { aspectRatio: raw[id]?.aspectRatio || base.aspectRatio };
		ELEMENTS.forEach((k) => { awardConfigs[id][k] = { ...base[k], ...(raw[id]?.[k] || {}) }; });
	});
	const current = awardConfigs[award];
	const full = {
		certificateLanguage: certificateConfig?.certificateLanguage || 'uz',
		...ELEMENTS.reduce((a, k) => ({ ...a, [k]: current[k] }), {}),
		aspectRatio: current.aspectRatio,
		award_templates: templates,
		award_configs: awardConfigs,
		recipients: certificateConfig?.recipients || [],
	};
	const rawTemplate = templates[award] || (award === 'general' ? certificatePreview : '');
	const preview = rawTemplate ? mediaUrl(rawTemplate) : '';

	// Keep the stored aspect ratio in sync with the real template.
	useEffect(() => {
		if (!preview) return;
		Image.getSize(preview, (w, h) => {
			const r = Math.round((w / h) * 1000) / 1000;
			if (!current.aspectRatio || Math.abs(current.aspectRatio - r) > 0.005) {
				onChange({ ...full, aspectRatio: r, award_configs: { ...awardConfigs, [award]: { ...current, aspectRatio: r } } });
			}
		}, () => {});
	}, [preview, award]);

	const updateEl = (key, patch) => {
		const el = { ...current[key], ...patch };
		onChange({ ...full, [key]: el, award_configs: { ...awardConfigs, [award]: { ...current, [key]: el } } });
	};

	const setTemplate = (img, ratio) => {
		const r = ratio ? Math.round(ratio * 1000) / 1000 : undefined;
		onChange({ ...full, ...(r ? { aspectRatio: r } : {}), award_templates: { ...templates, [award]: img }, award_configs: { ...awardConfigs, [award]: { ...current, ...(r ? { aspectRatio: r } : {}) } } });
		if (award === 'general' || !certificatePreview) onImageChange?.(img);
	};

	const uploadTemplate = async () => {
		const file = await pickDocument(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
		if (!file) return;
		setConverting(true);
		try {
			const b64 = await file.base64();
			const res = isPdf(file) ? await engine.pdfToImage(b64) : await engine.compressImage(`data:${file.mimeType || 'image/jpeg'};base64,${b64}`);
			setTemplate(res.dataUrl, res.aspectRatio);
		} catch {
			toast.error("Faylni o'qishda xatolik. PNG yoki JPG yuklang.");
		}
		setConverting(false);
	};

	const ratio = current.aspectRatio || 1.414;
	const H = canvasW ? canvasW / ratio : 0;
	const baseW = ratio >= 1 ? 840 : Math.round(630 * ratio);
	const s = canvasW ? canvasW / baseW : 1; // px → screen scale
	const who = SAMPLES[sample];
	const certLang = full.certificateLanguage;
	const texts = {
		name: current.name.includeMiddleName && who.middle_name ? `${who.last_name} ${who.first_name} ${who.middle_name}` : `${who.first_name} ${who.last_name}`,
		score: String(who.score),
		grade: `${who.grade}${certLang === 'ru' ? ' класс' : certLang === 'en' ? 'th grade' : '-sinf'}`,
		date: certLang === 'ru' ? '15.09.2026 г.' : certLang === 'en' ? 'September 15, 2026' : '15.09.2026',
	};

	// Canvas-level drag: grab the element nearest to the finger, move it in %.
	// The responder is created once; it reads the latest layout/config from a ref.
	const dragKey = useRef(null);
	const latest = useRef({});
	latest.current = { canvasW, H, full, updateEl };
	const responder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: (e) => {
				const { canvasW: w, H: h, full: f } = latest.current;
				if (!w) return false;
				const { locationX, locationY } = e.nativeEvent;
				let best = null;
				let dist = 44;
				ELEMENTS.forEach((k) => {
					if (!f[k].show) return;
					const d = Math.hypot((f[k].x / 100) * w - locationX, (f[k].y / 100) * h - locationY);
					if (d < dist) { dist = d; best = k; }
				});
				dragKey.current = best;
				return !!best;
			},
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: () => {
				canvasRef.current?.measureInWindow((x, y) => { canvasBox.current = { x, y }; });
				if (dragKey.current) setTab(dragKey.current);
			},
			onPanResponderMove: (e, g) => {
				const k = dragKey.current;
				const { canvasW: w, H: h, updateEl: update } = latest.current;
				if (!k || !w) return;
				const x = Math.max(0, Math.min(100, Math.round(((g.moveX - canvasBox.current.x) / w) * 1000) / 10));
				const y = Math.max(0, Math.min(100, Math.round(((g.moveY - canvasBox.current.y) / h) * 1000) / 10));
				update(k, { x, y });
			},
		})
	).current;

	const el = full[tab];

	return (
		<FormSection icon={Sparkles} title={tx(L.title)}>
			<T v="small">{tx(L.subtitle)}</T>
			<View>
				<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.certLang)}</T>
				<Segmented value={certLang} onChange={(v) => onChange({ ...full, certificateLanguage: v })} options={[{ value: 'uz', label: '🇺🇿 UZ' }, { value: 'ru', label: '🇷🇺 RU' }, { value: 'en', label: '🇬🇧 EN' }]} />
			</View>
			<View style={{ flexDirection: 'row', gap: 8 }}>
				<Button style={{ flex: 1 }} size="sm" variant="dark" icon={Users} title={`${tx(L.import)}${full.recipients.length ? ` (${full.recipients.length})` : ''}`} onPress={() => setImportOpen(true)} />
				{full.recipients.length ? (
					<Button size="sm" variant="soft" icon={Download} title={zip ? `${zip.current}/${zip.total}` : 'ZIP'} disabled={!!zip} onPress={async () => {
						setZip({ current: 0, total: full.recipients.length });
						try {
							await recipientsCertificatesZip({ recipients: full.recipients, olympiadTitle: olympiadTitle || `Olimpiada_${olympiadId}`, certificateConfig: full, certificateImage: preview, lang, onProgress: (c, t) => setZip({ current: c, total: t }) });
						} catch {}
						setZip(null);
					}} />
				) : null}
			</View>

			<ChoicePills value={award} onChange={setAward} options={AWARD_TABS.map((a) => ({ value: a.id, label: `${a.label}${templates[a.id] ? ' •' : ''}` }))} />

			<View style={{ flexDirection: 'row', gap: 8 }}>
				<Button style={{ flex: 1 }} size="sm" variant="light" icon={ImagePlus} title={converting ? tx(L.converting) : rawTemplate ? tx(L.change) : tx(L.upload)} loading={converting} onPress={uploadTemplate} />
				{rawTemplate ? <Tap onPress={() => setTemplate('')} style={styles.round}><Trash2 size={17} color={colors.red} /></Tap> : null}
				<Tap onPress={() => setSample((i) => (i + 1) % SAMPLES.length)} style={[styles.round, { backgroundColor: colors.goldTint }]}><Shuffle size={17} color={colors.amber} /></Tap>
			</View>
			<T v="small">{tx(L.dragHint)}</T>

			{/* Canvas */}
			<View onLayout={(e) => setCanvasW(e.nativeEvent.layout.width)}>
				{canvasW ? (
					<View ref={canvasRef} style={[styles.canvas, { width: canvasW, height: H }]} {...responder.panHandlers}>
						{preview ? <Image source={{ uri: preview }} style={{ width: canvasW, height: H }} resizeMode="stretch" /> : (
							<View style={styles.empty}><ImagePlus size={32} color={colors.faint} /><T v="small" style={{ textAlign: 'center', marginTop: 8 }}>{tx(L.noTemplate)}</T></View>
						)}
						{['name', 'score', 'grade', 'date'].map((k) =>
							full[k].show ? (
								<View key={k} pointerEvents="none" style={{ position: 'absolute', left: (full[k].x / 100) * canvasW - canvasW, top: (full[k].y / 100) * H - full[k].fontSize * s, width: canvasW * 2, height: full[k].fontSize * s * 2, alignItems: 'center', justifyContent: 'center' }}>
									<Text numberOfLines={1} style={[{ color: full[k].color, fontSize: Math.max(4, full[k].fontSize * s), fontFamily: nativeFont(full[k].fontFamily), fontWeight: k === 'score' ? '800' : '700' }, tab === k && styles.activeEl]}>{texts[k]}</Text>
								</View>
							) : null
						)}
						{full.qr.show ? (
							<View pointerEvents="none" style={[styles.qr, { left: (full.qr.x / 100) * canvasW - ((full.qr.size + 8) * s) / 2, top: (full.qr.y / 100) * H - ((full.qr.size + 8) * s) / 2 }, tab === 'qr' && styles.activeEl]}>
								{qr ? <SvgXml xml={qr} width={full.qr.size * s} height={full.qr.size * s} /> : <QrCode size={full.qr.size * s} color={colors.navy} />}
								{full.qr.showLabel ? <Text style={{ fontSize: Math.max(3, 7 * s), fontFamily: fonts.extrabold, color: '#16305c' }}>IRNOLYMPIAD.UZ</Text> : null}
							</View>
						) : null}
					</View>
				) : <ActivityIndicator color={colors.goldDeep} />}
			</View>

			{/* Element controls */}
			<ChoicePills value={tab} onChange={setTab} options={[{ value: 'name', icon: Type }, { value: 'score', icon: Hash }, { value: 'grade', icon: Sparkles }, { value: 'date', icon: Calendar }, { value: 'qr', icon: QrCode }].map((o) => ({ value: o.value, label: `${full[o.value].show ? '● ' : '○ '}${tx(L.tabs[o.value])}` }))} />
			<SwitchRow label={tx(L.show)} value={el.show} onChange={(v) => updateEl(tab, { show: v })} />
			{tab === 'name' ? <SwitchRow label={tx(L.middle)} value={el.includeMiddleName} onChange={(v) => updateEl('name', { includeMiddleName: v })} /> : null}
			<Stepper label="X" value={el.x} step={0.5} max={100} suffix="%" onChange={(v) => updateEl(tab, { x: v })} />
			<Stepper label="Y" value={el.y} step={0.5} max={100} suffix="%" onChange={(v) => updateEl(tab, { y: v })} />
			{tab !== 'qr' ? (
				<>
					<Stepper label={tx(L.fontSize)} value={el.fontSize || 20} min={8} max={250} suffix="px" onChange={(v) => updateEl(tab, { fontSize: v })} />
					<View>
						<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.fontFamily)}</T>
						<ChoicePills value={el.fontFamily} onChange={(v) => updateEl(tab, { fontFamily: v })} options={CERT_FONTS.map((f) => ({ value: f.id, label: f.name }))} />
					</View>
					<View>
						<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.color)}</T>
						<View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
							{SWATCHES.map((c) => (
								<Tap key={c} onPress={() => updateEl(tab, { color: c })} style={[styles.swatch, { backgroundColor: c }, String(el.color).toLowerCase() === c && styles.swatchOn]} />
							))}
						</View>
					</View>
					<View>
						<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.align)}</T>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							{[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
								<Tap key={a} onPress={() => updateEl(tab, { align: a })} style={[styles.round, (el.align || 'center') === a && { backgroundColor: colors.gold }]}><Icon size={17} color={colors.ink} /></Tap>
							))}
						</View>
					</View>
				</>
			) : (
				<>
					<Stepper label={tx(L.qrSize)} value={el.size || 64} min={30} max={300} step={2} suffix="px" onChange={(v) => updateEl('qr', { size: v })} />
					<SwitchRow label={tx(L.qrLabel)} value={el.showLabel} onChange={(v) => updateEl('qr', { showLabel: v })} />
				</>
			)}
			<View>
				<T v="label" style={{ marginBottom: 8, marginLeft: 4 }}>{tx(L.copyFrom)}</T>
				<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
					{AWARD_TABS.filter((a) => a.id !== award).map((a) => (
						<Button key={a.id} size="sm" variant="light" icon={Copy} title={a.label} onPress={() => {
							const src = awardConfigs[a.id];
							onChange({ ...full, award_configs: { ...awardConfigs, [award]: { ...current, ...ELEMENTS.reduce((acc, k) => ({ ...acc, [k]: { ...src[k] } }), {}) } } });
						}} />
					))}
				</View>
			</View>
			<Button size="sm" variant="ghost" icon={RotateCcw} title={tx(L.reset)} onPress={() => onChange({ ...full, award_configs: { ...awardConfigs, [award]: { ...ELEMENTS.reduce((acc, k) => ({ ...acc, [k]: { ...DEFAULT_CERT_CONFIG[k] } }), {}), aspectRatio: current.aspectRatio } } })} />

			<CertificateRecipientsSheet
				visible={importOpen}
				onClose={() => setImportOpen(false)}
				initialRecipients={full.recipients}
				certificateConfig={full}
				certificateImage={preview}
				olympiadTitle={olympiadTitle}
				olympiadId={olympiadId}
				lang={lang}
				onSave={(recipients) => onChange({ ...full, recipients })}
			/>
		</FormSection>
	);
}

const styles = StyleSheet.create({
	canvas: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.lineStrong },
	empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
	qr: { position: 'absolute', backgroundColor: '#fff', padding: 3, borderRadius: 5, alignItems: 'center' },
	activeEl: { backgroundColor: 'rgba(253,200,0,0.25)', borderRadius: 4 },
	stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingLeft: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line },
	stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	round: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
	swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong },
	swatchOn: { borderWidth: 3, borderColor: colors.gold, transform: [{ scale: 1.1 }] },
});
