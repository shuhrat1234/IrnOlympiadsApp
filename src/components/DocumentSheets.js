import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Download, FileText, QrCode } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Sheet, T } from './ui';
import { colors, fonts, radius } from '../theme';
import { certificatePdf, certificateSize, mustaqillikLayout, permissionPdf, permissionState, permissionSubtitle, qrSvg, resolveCertificate, templateSize } from '../utils/documents';
import { getEnglishSubject } from '../utils/format';

// Live preview of the certificate (same resolver as the PDF), scaled to the sheet width.
const CertificatePreview = ({ data, user }) => {
	const { lang } = useLanguage();
	const { width: screenW } = useWindowDimensions();
	const cert = useMemo(() => resolveCertificate(data, user, lang), [data, user, lang]);
	const [size, setSize] = useState(null);
	const [qr, setQr] = useState(null);

	useEffect(() => {
		let alive = true;
		templateSize(cert).then(({ w, h }) => alive && setSize(certificateSize(w, h)));
		qrSvg(cert.verifyUrl).then((x) => alive && setQr(x)).catch(() => {});
		return () => { alive = false; };
	}, [cert]);

	if (!size) return <View style={[styles.frame, { height: 220, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.goldDeep} /></View>;

	const boxW = screenW - 40;
	const s = boxW / size.width;
	const H = size.height * s;
	const src = cert.localTemplate || { uri: cert.remoteTemplate };

	const qrNode = (px, label) => (
		<View style={styles.qrBox}>
			{qr ? <SvgXml xml={qr} width={px * s} height={px * s} /> : <View style={{ width: px * s, height: px * s }} />}
			{label ? <Text style={{ fontSize: 7 * s, fontFamily: fonts.extrabold, color: '#16305c', marginTop: 2 * s }}>IRNOLYMPIAD.UZ</Text> : null}
		</View>
	);

	// Positions a text box centred on (x%, y%) — mirrors translate(-50%, -50%).
	const centered = (c, text, weight) => (
		<View style={{ position: 'absolute', left: (c.x / 100) * boxW - boxW / 2, top: (c.y / 100) * H - c.fontSize * s, width: boxW, height: c.fontSize * s * 2, alignItems: 'center', justifyContent: 'center' }}>
			<Text numberOfLines={1} style={{ fontSize: c.fontSize * s, color: c.color, fontFamily: weight >= 800 ? fonts.extrabold : fonts.bold, fontWeight: String(weight) }}>{text}</Text>
		</View>
	);

	let overlay;
	if (cert.useCustomLayout) {
		const { cfg } = cert;
		const qrPx = (cfg.qr.size || 64) + 8;
		overlay = (
			<>
				{cfg.name.show ? centered(cfg.name, cert.name, 700) : null}
				{cfg.score.show && cert.score !== '' ? centered(cfg.score, cert.score, 800) : null}
				{cfg.grade.show && cert.gradeText ? centered(cfg.grade, cert.gradeText, 600) : null}
				{cfg.date.show ? centered(cfg.date, cert.date, 600) : null}
				{cfg.qr.show ? <View style={{ position: 'absolute', left: (cfg.qr.x / 100) * boxW - (qrPx * s) / 2, top: (cfg.qr.y / 100) * H - (qrPx * s) / 2 }}>{qrNode(cfg.qr.size || 64, cfg.qr.showLabel)}</View> : null}
			</>
		);
	} else {
		const m = mustaqillikLayout(cert.isMath, cert.name);
		overlay = (
			<>
				<View style={{ position: 'absolute', top: m.name.top * s, left: m.name.left * s, width: m.name.width * s, height: m.name.height * s, justifyContent: 'flex-end', alignItems: 'center' }}>
					<Text numberOfLines={1} style={{ fontFamily: 'Georgia', fontWeight: '700', fontSize: m.name.fontSize * s, color: '#16305c' }}>{cert.name}</Text>
				</View>
				{cert.score !== '' ? (
					<View style={{ position: 'absolute', top: m.score.top * s, left: m.score.left * s, width: m.score.width * s, height: m.score.height * s, justifyContent: 'center', alignItems: 'center' }}>
						<Text style={{ fontFamily: 'Georgia', fontWeight: '800', fontSize: 34 * s, color: '#16305c' }}>{cert.score}</Text>
					</View>
				) : null}
				<View style={{ position: 'absolute', bottom: m.qr.bottom * s, right: m.qr.right * s }}>{qrNode(64, true)}</View>
			</>
		);
	}

	return (
		<View style={[styles.frame, { width: boxW, height: H }]}>
			<Image source={src} style={{ width: boxW, height: H }} resizeMode="stretch" />
			{overlay}
		</View>
	);
};

export const CertificateSheet = ({ visible, onClose, data, user }) => {
	const { t, lang } = useLanguage();
	const toast = useToast();
	const [busy, setBusy] = useState(false);
	return (
		<Sheet visible={visible} onClose={onClose} title={t('certificate')}>
			{data ? (
				<View style={{ gap: 18 }}>
					<CertificatePreview data={data} user={user} />
					<Button
						title={t('downloadPDF')}
						icon={Download}
						loading={busy}
						onPress={async () => {
							setBusy(true);
							try {
								await certificatePdf({ data, user, lang });
							} catch {
								toast.error(t('error'));
							}
							setBusy(false);
						}}
					/>
				</View>
			) : null}
		</Sheet>
	);
};

// Permission letter preview card (A4 PDF generated on demand).
export const PermissionSheet = ({ visible, onClose, reg, oly, user }) => {
	const { t, lang, pick } = useLanguage();
	const toast = useToast();
	const [busy, setBusy] = useState(false);
	if (!reg || !oly) return null;
	const pay = permissionState(reg, oly);
	const rows = [
		['Name-Surname', `${user?.first_name || ''} ${user?.last_name || ''}`],
		['Grade', user?.grade],
		['Subject', getEnglishSubject(oly.title_en || oly.title_ru || oly.title_uz)],
		['User ID', user?.username || user?.id],
		['ID Number', reg.unique_participant_id],
	];
	return (
		<Sheet visible={visible} onClose={onClose} title={t('permission')}>
			<View style={styles.letter}>
				<View style={styles.letterBand} />
				<Image source={require('../../assets/brand/irn-logo.jpg')} style={{ width: 110, height: 76, alignSelf: 'center' }} resizeMode="contain" />
				<T v="h2" style={{ textAlign: 'center', letterSpacing: 3, marginTop: 6 }}>PERMISSION</T>
				<T v="label" style={{ textAlign: 'center', marginTop: 4 }} numberOfLines={2}>{permissionSubtitle(oly, lang)}</T>
				<View style={{ marginTop: 16, gap: 10 }}>
					{rows.map(([k, v]) => (
						<View key={k} style={styles.letterRow}>
							<T v="strong" style={{ fontSize: 13.5 }}>{k}:</T>
							<T v="strong" numberOfLines={1} style={[styles.letterVal, k === 'ID Number' && { color: colors.amber }]}>{v}</T>
						</View>
					))}
					<View style={styles.letterRow}>
						<T v="strong" style={{ fontSize: 13.5 }}>Payment Status:</T>
						<T v="strong" style={[styles.letterVal, { color: pay.color }]}>{pay.label}</T>
					</View>
				</View>
				<T v="small" style={{ marginTop: 14, fontSize: 12, color: pay.isPaid ? colors.muted : colors.amber }}>
					{pay.isPaid ? `This student can participate in ${pick(oly)}.` : 'Payment is pending. This student CANNOT participate until the registration fee is confirmed.'}
				</T>
				<View style={[styles.letterFoot, { marginTop: 10 }]}>
					<QrCode size={16} color={colors.muted} />
					<T v="small" style={{ flex: 1, fontSize: 12 }}>QR · irnolympiad.uz/verify</T>
				</View>
			</View>
			<Button
				title={pay.isPaid ? t('downloadPDF') : t('paymentNotConfirmed')}
				icon={FileText}
				loading={busy}
				disabled={!pay.isPaid}
				variant={pay.isPaid ? 'primary' : 'light'}
				style={{ marginTop: 18 }}
				onPress={async () => {
					setBusy(true);
					try {
						await permissionPdf({ reg, oly, user, lang });
					} catch {
						toast.error(t('error'));
					}
					setBusy(false);
				}}
			/>
		</Sheet>
	);
};

const styles = StyleSheet.create({
	frame: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	qrBox: { backgroundColor: '#fff', padding: 3, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(22,48,92,0.15)' },
	letter: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 20, paddingTop: 26, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
	letterBand: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: colors.gold },
	letterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	letterVal: { flex: 1, fontSize: 14, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, paddingBottom: 3 },
	letterFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
});

