import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Download } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Button, Sheet } from './ui';
import { colors, fonts } from '../theme';
import { ASSETS, certificatePdf, certificateSize, mustaqillikLayout, permissionPdf, permissionState, qrSvg, resolveCertificate, templateSize } from '../utils/documents';
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

// Branded visual preview of the Permission slip (1:1 with web's PermissionModal)
const PermissionPreview = ({ reg, oly, user }) => {
	const { pick } = useLanguage();
	const { width: screenW } = useWindowDimensions();
	const [qr, setQr] = useState(null);

	const olyTitle = pick(oly) || 'IRN Olympiad';
	const titleStr = `${oly?.category || ''} ${oly?.title_uz || ''} ${oly?.title_ru || ''} ${oly?.title_en || ''} ${olyTitle}`.toLowerCase();
	const isNextGen = titleStr.includes('nextgen') || Boolean(oly?.is_nextgen);
	const isXpert = !isNextGen && (titleStr.includes('xpert') || titleStr.includes('stem') || (reg?.unique_participant_id && String(reg.unique_participant_id).toUpperCase().startsWith('XSTEM')));

	const W = isNextGen ? 724 : 768;
	const H = 1024;
	const bgAsset = isNextGen ? ASSETS.permNextGen : isXpert ? ASSETS.permXpert : ASSETS.permRepublic;

	const boxW = Math.min(screenW - 40, 420);
	const s = boxW / W;
	const boxH = H * s;

	const subject = getEnglishSubject(oly?.title_en || oly?.title_ru || oly?.title_uz);
	const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || reg?.student_name || 'Participant';
	const gradeText = user?.grade ? `${user.grade}-sinf` : reg?.grade ? `${reg.grade}-sinf` : '—';
	const schoolText = user?.school || reg?.school || '—';
	const userIdText = user?.participant_id || user?.username || user?.id || '—';
	const idNumberText = reg?.unique_participant_id || reg?.participant_id || '—';
	const pay = permissionState(reg, oly);

	const verify = `https://irnolympiad.uz/verify?id=${encodeURIComponent(idNumberText)}&student=${encodeURIComponent(fullName)}&user=${encodeURIComponent(userIdText)}&olympiad=${encodeURIComponent(olyTitle)}&status=${reg?.payment_status || 'pending'}`;

	useEffect(() => {
		let alive = true;
		qrSvg(verify, '#000000').then((x) => alive && setQr(x)).catch(() => {});
		return () => { alive = false; };
	}, [verify]);

	let pos;
	if (isNextGen) {
		pos = {
			name: { left: 238, top: 447, font: 18 },
			grade: { left: 238, top: 486, font: 18 },
			school: { left: 238, top: 525, font: 16 },
			subject: { left: 238, top: 566, font: 17 },
			user: { left: 238, top: 605, font: 18 },
			id: { left: 238, top: 644, font: 18 },
			status: { left: 238, top: 683, font: 18 },
			qr: { left: 501, top: 547, size: 128 },
		};
	} else if (isXpert) {
		pos = {
			name: { left: 232, top: 522, font: 18 },
			grade: { left: 232, top: 552, font: 18 },
			school: { left: 232, top: 582, font: 16 },
			subject: { left: 232, top: 611, font: 17 },
			user: { left: 232, top: 640, font: 18 },
			id: { left: 232, top: 669, font: 18 },
			status: { left: 232, top: 697, font: 18 },
			qr: { left: 540, top: 572, size: 140 },
		};
	} else {
		pos = {
			name: { left: 210, top: 537, font: 18 },
			grade: { left: 210, top: 570, font: 18 },
			school: { left: 210, top: 603, font: 16 },
			subject: { left: 210, top: 636, font: 17 },
			user: { left: 210, top: 669, font: 18 },
			id: { left: 210, top: 702, font: 18 },
			status: { left: 210, top: 735, font: 18 },
			qr: { left: 540, top: 578, size: 148 },
		};
	}

	const renderItem = (p, text, color = '#0f172a', mono = false, weight = '700') => (
		<View key={p.top} style={{ position: 'absolute', left: p.left * s, top: p.top * s, backgroundColor: '#ffffff', paddingHorizontal: 2 * s, paddingVertical: 1 * s, borderRadius: 2 }}>
			<Text numberOfLines={1} style={{ fontSize: Math.max(9, p.font * s), fontWeight: weight, color, fontFamily: mono ? 'Menlo' : undefined }}>{text}</Text>
		</View>
	);

	return (
		<View style={[styles.frame, { width: boxW, height: boxH, alignSelf: 'center' }]}>
			<Image source={bgAsset} style={{ width: boxW, height: boxH }} resizeMode="stretch" />
			{renderItem(pos.name, fullName, '#0f172a')}
			{renderItem(pos.grade, gradeText, '#0f172a')}
			{renderItem(pos.school, schoolText, '#0f172a')}
			{renderItem(pos.subject, subject, '#0f172a')}
			{renderItem(pos.user, userIdText, '#0f172a', true)}
			{renderItem(pos.id, idNumberText, colors.amber, true, '800')}
			{renderItem(pos.status, pay.label.toUpperCase(), pay.color, false, '900')}
			<View style={{ position: 'absolute', left: pos.qr.left * s, top: pos.qr.top * s, width: pos.qr.size * s, height: pos.qr.size * s, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
				{qr ? <SvgXml xml={qr} width={pos.qr.size * s * 0.9} height={pos.qr.size * s * 0.9} /> : null}
			</View>
		</View>
	);
};

// Permission letter preview card (A4 PDF generated on demand).
export const PermissionSheet = ({ visible, onClose, reg, oly, user }) => {
	const { t, lang } = useLanguage();
	const toast = useToast();
	const [busy, setBusy] = useState(false);
	if (!reg || !oly) return null;
	const pay = permissionState(reg, oly);

	return (
		<Sheet visible={visible} onClose={onClose} title={t('permission')}>
			<View style={{ gap: 16 }}>
				<PermissionPreview reg={reg} oly={oly} user={user} />
				<Button
					title={pay.isPaid ? t('downloadPDF') : t('paymentNotConfirmed')}
					icon={Download}
					loading={busy}
					disabled={!pay.isPaid}
					variant={pay.isPaid ? 'primary' : 'light'}
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
			</View>
		</Sheet>
	);
};

const styles = StyleSheet.create({
	frame: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	qrBox: { backgroundColor: '#fff', padding: 3, borderRadius: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(22,48,92,0.15)' },
});

