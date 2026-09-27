import { Image } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { shareFile } from './files';
import { mediaUrl } from '../api/client';
import { getEnglishSubject } from './format';

// The website renders these documents with html2canvas + jsPDF; here the same
// layouts are written as HTML and printed to PDF natively, then handed to the
// system share sheet (Save to Files, Telegram, print…).

export const ASSETS = {
	irnLogo: require('../../assets/brand/irn-logo.jpg'),
	certEnglish: require('../../assets/brand/cert-mustaqillik-english.jpg'),
	certMath: require('../../assets/brand/cert-mustaqillik-math.jpg'),
};

const dataUriCache = {};
const assetDataUri = async (moduleId, mime = 'image/jpeg') => {
	if (dataUriCache[moduleId]) return dataUriCache[moduleId];
	const asset = Asset.fromModule(moduleId);
	await asset.downloadAsync();
	const b64 = await new File(asset.localUri || asset.uri).base64();
	dataUriCache[moduleId] = `data:${mime};base64,${b64}`;
	return dataUriCache[moduleId];
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const qrSvg = (text, color = '#16305c') =>
	QRCode.toString(text, { type: 'svg', margin: 1, color: { dark: color, light: '#ffffff' } });

const safeName = (s) => String(s || 'IRN').replace(/[^\w\-]+/g, '_').slice(0, 60);

export const renderPdf = async (html, { width, height }) => {
	const { uri } = await Print.printToFileAsync({ html, width, height, margins: { left: 0, right: 0, top: 0, bottom: 0 } });
	return uri;
};

export const sharePdf = async (html, { width, height, fileName }) => {
	const uri = await renderPdf(html, { width, height });
	let finalUri = uri;
	try {
		const target = new File(Paths.cache, `${safeName(fileName)}.pdf`);
		if (target.exists) target.delete();
		new File(uri).move(target);
		finalUri = target.uri;
	} catch {}
	if (await Sharing.isAvailableAsync()) {
		await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileName });
	}
	return finalUri;
};

const page = (w, h, body, extraCss = '') => `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=${w}, initial-scale=1" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Great+Vibes&family=Merriweather:wght@700&family=Montserrat:wght@700;800&family=Playfair+Display:wght@700&family=Roboto:wght@600;700&display=block" />
<style>
@page { size: ${w}px ${h}px; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; position: relative; }
${extraCss}
</style></head><body>${body}</body></html>`;

// ——— Permission letter (A4 portrait, 595×842) ———
const permissionCss = `
.wave { position: absolute; top: 0; width: 170px; height: 170px; }
.wave.l { left: 0; } .wave.r { right: 0; }
.bar1 { position: absolute; left: 0; right: 0; bottom: 0; height: 16px; background: #f59e0b; }
.bar2 { position: absolute; left: 0; right: 0; bottom: 20px; height: 4px; background: #facc15; }
.wrap { position: absolute; inset: 0; padding: 112px 48px 64px; display: flex; flex-direction: column; justify-content: space-between; }
.logo { display: block; margin: 0 auto; width: 160px; height: 112px; object-fit: contain; }
h1 { text-align: center; font-size: 30px; letter-spacing: 3px; color: #111827; margin-top: 16px; }
.sub { text-align: center; font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
.tag { display: inline-block; background: #facc15; color: #000; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; padding: 9px 24px; transform: skewX(-12deg); }
.row { display: flex; align-items: baseline; margin-top: 22px; }
.row b { font-size: 17px; color: #111827; white-space: nowrap; margin-right: 8px; }
.row span { flex: 1; border-bottom: 1px dashed #d1d5db; font-size: 17px; font-weight: 700; color: #1f2937; padding-bottom: 2px; white-space: nowrap; overflow: hidden; }
.mono { font-family: Menlo, 'Courier New', monospace; }
.grid { display: flex; align-items: center; gap: 28px; }
.grid .fields { flex: 2; }
.qr { flex: 1; display: flex; justify-content: center; }
.qr div { width: 132px; height: 132px; padding: 6px; border: 1px solid #e5e7eb; box-shadow: 0 4px 10px rgba(0,0,0,.08); }
.qr svg { width: 100%; height: 100%; }
.foot { border-top: 1px solid #f3f4f6; padding-top: 22px; font-size: 11px; color: #6b7280; }
.foot b { color: #111827; }
`;

const waves = `
<svg class="wave l" viewBox="0 0 200 200"><path fill="rgba(245,158,11,.1)" d="M0 0 C 120 0, 160 40, 160 100 C 160 165, 90 180, 0 200 Z"/><path fill="rgba(250,204,21,.8)" d="M0 0 C 90 0, 120 30, 120 70 C 120 120, 60 140, 0 160 Z"/></svg>
<svg class="wave r" viewBox="0 0 200 200"><path fill="rgba(245,158,11,.1)" d="M200 0 C 80 0, 40 40, 40 100 C 40 165, 110 180, 200 200 Z"/><path fill="rgba(250,204,21,.8)" d="M200 0 C 110 0, 80 30, 80 70 C 80 120, 140 140, 200 160 Z"/></svg>
<div class="bar1"></div><div class="bar2"></div>`;

export const permissionPdf = async ({ reg, oly, user, lang }) => {
	const olyTitle = oly?.[`title_${lang}`] || oly?.title_en || oly?.title_ru || oly?.title_uz || 'IRN Olympiad';
	const subject = getEnglishSubject(oly?.title_en || oly?.title_ru || oly?.title_uz);
	const logo = await assetDataUri(ASSETS.irnLogo);
	const verify = `https://irnolympiad.uz/verify?id=${reg?.unique_participant_id}&student=${user?.first_name}+${user?.last_name}&user=${user?.username || user?.id}&olympiad=${olyTitle}`;
	const qr = await qrSvg(verify, '#000000');
	const body = `${waves}
<div class="wrap">
	<div><img class="logo" src="${logo}" /><h1>PERMISSION</h1><div class="sub">${esc(olyTitle)}</div></div>
	<div>
		<div class="tag">Information:</div>
		<div class="row"><b>Name-Surname:</b><span>${esc(user?.first_name)} ${esc(user?.last_name)}</span></div>
		<div class="grid">
			<div class="fields">
				<div class="row"><b>Grade:</b><span>${esc(user?.grade)}</span></div>
				<div class="row"><b>Subject:</b><span>${esc(subject)}</span></div>
				<div class="row"><b>User ID:</b><span class="mono">${esc(user?.username || user?.id)}</span></div>
				<div class="row"><b>ID Number:</b><span class="mono" style="color:#d97706">${esc(reg?.unique_participant_id)}</span></div>
				<div class="row"><b>Payment Status:</b><span style="color:#059669">Paid</span></div>
			</div>
			<div class="qr"><div>${qr}</div></div>
		</div>
	</div>
	<div class="foot">This student can participate in <b>${esc(olyTitle)}</b>.</div>
</div>`;
	return sharePdf(page(595, 842, body, permissionCss), { width: 595, height: 842, fileName: `Permission_${reg?.unique_participant_id || 'IRN'}` });
};

const FINAL_LABELS = {
	nameLabel: { uz: 'Ism-Familiya:', ru: 'Имя-Фамилия:', en: 'Name-Surname:' },
	gradeLabel: { uz: 'Sinf:', ru: 'Класс:', en: 'Grade:' },
	subjectLabel: { uz: 'Fan:', ru: 'Предмет:', en: 'Subject:' },
	examDateLabel: { uz: 'Imtihon sanasi:', ru: 'Дата экзамена:', en: 'Exam Date:' },
	examTimeLabel: { uz: 'Imtihon vaqti:', ru: 'Время экзамена:', en: 'Exam Time:' },
	venueLabel: { uz: 'Joyi:', ru: 'Место:', en: 'Venue:' },
	roomLabel: { uz: 'Xona:', ru: 'Кабинет:', en: 'Room:' },
	seatLabel: { uz: "O'rin:", ru: 'Место (номер):', en: 'Seat:' },
	scoreLabel: { uz: 'Ball:', ru: 'Балл:', en: 'Score:' },
	idLabel: { uz: 'Ruxsat ID:', ru: 'ID допуска:', en: 'Permission ID:' },
	description: { uz: 'Ushbu ishtirokchi', ru: 'Данный участник', en: 'This participant' },
	descriptionSuffix: { uz: 'uchun Final Round bosqichida ishtirok etishga ruxsat berilgan.', ru: 'допущен к участию в Final Round.', en: 'is permitted to take part in the Final Round.' },
};

export const finalPermissionPdf = async ({ perm, user, lang }) => {
	const L = (k) => FINAL_LABELS[k]?.[lang] || FINAL_LABELS[k]?.en;
	const olyTitle = perm?.olympiad?.[`title_${lang}`] || perm?.olympiad?.title_en || perm?.olympiad?.title_ru || perm?.olympiad?.title_uz || 'IRN Olympiad';
	const logo = await assetDataUri(ASSETS.irnLogo);
	const qr = await qrSvg(`https://irnolympiad.uz/verify?permission=${perm?.unique_permission_id || perm?.id}&student=${user?.first_name}+${user?.last_name}`, '#000000');
	const rows = [
		['gradeLabel', perm?.grade],
		['subjectLabel', perm?.subject],
		['examDateLabel', perm?.exam_date],
		['examTimeLabel', perm?.exam_time],
		['venueLabel', perm?.venue],
		['roomLabel', perm?.room],
		['seatLabel', perm?.seat_number],
		['scoreLabel', perm?.score],
		['idLabel', perm?.unique_permission_id],
	]
		.filter(([, v]) => v !== null && v !== undefined && v !== '')
		.map(([k, v]) => `<div class="row" style="margin-top:16px"><b>${esc(L(k))}</b><span>${esc(v)}</span></div>`)
		.join('');
	const body = `${waves}
<div class="wrap" style="padding-top:96px">
	<div><img class="logo" src="${logo}" /><h1 style="font-size:24px">FINAL ROUND PERMISSION</h1><div class="sub">${esc(olyTitle)}</div></div>
	<div>
		<div class="tag">Information:</div>
		<div class="row"><b>${esc(L('nameLabel'))}</b><span>${esc(user?.first_name)} ${esc(user?.last_name)}</span></div>
		<div class="grid"><div class="fields">${rows}</div><div class="qr"><div>${qr}</div></div></div>
	</div>
	<div class="foot">${esc(L('description'))} <b>${esc(olyTitle)}</b> ${esc(L('descriptionSuffix'))}</div>
</div>`;
	return sharePdf(page(595, 842, body, permissionCss), { width: 595, height: 842, fileName: `Permission_Final_${perm?.unique_permission_id || 'IRN'}` });
};

// ——— Certificate ———
// Same defaults as the website's CertificateBuilder.
export const DEFAULT_CERT_CONFIG = {
	name: { show: true, x: 50, y: 55, fontSize: 28, fontFamily: "'Playfair Display', Georgia, serif", color: '#16305c', align: 'center', includeMiddleName: false },
	score: { show: true, x: 88, y: 28, fontSize: 34, fontFamily: "'Montserrat', sans-serif", color: '#16305c', align: 'center' },
	grade: { show: false, x: 50, y: 63, fontSize: 18, fontFamily: 'Georgia, serif', color: '#16305c', align: 'center' },
	date: { show: true, x: 50, y: 89, fontSize: 14, fontFamily: 'Georgia, serif', color: '#16305c', align: 'center' },
	qr: { show: true, x: 88, y: 88, size: 64, showLabel: true },
};

// Resolves everything the certificate needs (template, layout, text) — shared by
// the in-app preview and the PDF export so both always match.
export const resolveCertificate = (data, user, lang) => {
	const olyTitle = data?.title || data?.olympiad_title || data?.oly?.[`title_${lang}`] || data?.oly?.title_uz || data?.oly?.title_en || 'IRN Olympiad';
	const subjectStr = `${olyTitle} ${data?.sub_title || ''} ${data?.subject || ''}`;
	const isMath = /matematika|math/i.test(subjectStr);
	const isMustaqillik = /mustaqillik/i.test(olyTitle);
	const custom = data?.certificate_config || data?.oly?.certificate_config || {};
	const customImage = data?.certificate_image || data?.oly?.certificate_image || '';
	const certLang = custom?.certificateLanguage || lang || 'uz';

	const award = String(data?.award || '').toLowerCase().trim();
	const templates = custom?.award_templates || {};
	const configs = custom?.award_configs || {};
	let awardImage = '';
	let awardKey = '';
	if (award && templates[award]) {
		awardImage = mediaUrl(templates[award]);
		awardKey = award;
	} else if (templates.general) {
		awardImage = mediaUrl(templates.general);
		awardKey = 'general';
	} else if (award && configs[award]) {
		awardKey = award;
	}
	const awardEls = (awardKey && configs[awardKey]) || {};
	const remoteTemplate = awardImage || (customImage ? mediaUrl(customImage) : null);
	const localTemplate = remoteTemplate ? null : isMath ? ASSETS.certMath : ASSETS.certEnglish;
	const useCustomLayout = Boolean(awardImage) || Boolean(customImage) || (Object.keys(custom).length > 0 && !isMustaqillik);

	const cfg = {};
	['name', 'score', 'grade', 'date', 'qr'].forEach((k) => {
		cfg[k] = { ...DEFAULT_CERT_CONFIG[k], ...(custom?.[k] || {}), ...(awardEls[k] || {}) };
	});

	let name = data?.name;
	if (cfg.name.includeMiddleName && user?.middle_name) name = `${user?.last_name || ''} ${user?.first_name || ''} ${user.middle_name}`.trim();
	else if (!name) name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Participant';

	let score = data?.score !== undefined && data?.score !== null && data?.score !== '' ? String(data.score) : '';
	if (!score && user?.exam_results?.length) {
		const olyId = data?.oly?.id;
		const direct = olyId && user.exam_results.find((r) => String(r.olympiad) === String(olyId));
		if (direct && direct.score != null && direct.score !== '') score = String(direct.score);
		else if (data?.oly?.subs) {
			const ids = data.oly.subs.flatMap((s) => (s.grade_sessions || []).map((gs) => String(gs.id)));
			const r = user.exam_results.find((x) => ids.includes(String(x.sub_olympiad_grade)));
			if (r && r.score != null && r.score !== '') score = String(r.score);
		}
		if (!score) {
			const last = [...user.exam_results].reverse().find((r) => r.score != null && r.score !== '');
			if (last) score = String(last.score);
		}
	}

	const grade = data?.grade || user?.grade || '';
	const gradeText = grade ? `${grade}${certLang === 'ru' ? ' класс' : certLang === 'en' ? 'th Grade' : '-sinf'}` : '';
	const date = data?.date || (certLang === 'ru' ? '15.09.2026 г.' : certLang === 'en' ? 'September 15, 2026' : '15.09.2026');
	const participantId = data?.regId || user?.participant_id || user?.username || user?.id || '';
	const verifyUrl = `https://irnolympiad.uz/verify?id=${encodeURIComponent(participantId)}&student=${encodeURIComponent(name)}&olympiad=${encodeURIComponent(olyTitle)}${score ? `&score=${encodeURIComponent(score)}` : ''}`;

	return { olyTitle, isMath, useCustomLayout, remoteTemplate, localTemplate, cfg, name, score, gradeText, date, verifyUrl };
};

// Card is 840 px on its long side, keeping the template's aspect ratio.
export const certificateSize = (imgW, imgH) => {
	if (!imgW || !imgH) return { width: 840, height: 630 };
	const ratio = imgW / imgH;
	return ratio >= 1 ? { width: 840, height: Math.round(840 / ratio) } : { width: Math.round(840 * ratio), height: 840 };
};

export const templateSize = (cert) =>
	new Promise((resolve) => {
		if (cert.localTemplate) {
			const src = Image.resolveAssetSource(cert.localTemplate);
			resolve({ w: src.width, h: src.height });
			return;
		}
		Image.getSize(cert.remoteTemplate, (w, h) => resolve({ w, h }), () => resolve({ w: 0, h: 0 }));
	});

// Fixed positions for the bundled Mustaqillik templates (website values).
export const mustaqillikLayout = (isMath, name) => {
	const len = name.length;
	return {
		name: { top: 344, left: isMath ? 390 : 395, width: isMath ? 245 : 265, height: 42, fontSize: len > 30 ? 16 : len > 24 ? 18 : len > 18 ? 20 : 22 },
		score: { top: isMath ? 118 : 212, left: isMath ? 726 : 721, width: isMath ? 90 : 80, height: isMath ? 70 : 75, fontSize: 34 },
		qr: { bottom: 34, right: 54, size: 64 },
	};
};

// Builds the certificate page; returns { html, width, height, name }.
export const certificateHtml = async ({ data, user, lang }) => {
	const cert = resolveCertificate(data, user, lang);
	const { w, h } = await templateSize(cert);
	const { width: W, height: H } = certificateSize(w, h);
	const bg = cert.localTemplate ? await assetDataUri(cert.localTemplate) : cert.remoteTemplate;
	const qr = await qrSvg(cert.verifyUrl);
	const qrBox = (size, label) =>
		`<div style="background:#fff;padding:4px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.12);border:1px solid rgba(22,48,92,.15);display:flex;flex-direction:column;align-items:center"><div style="width:${size}px;height:${size}px">${qr.replace('<svg', `<svg width="${size}" height="${size}"`)}</div>${label ? '<span style="font-size:7px;font-weight:700;color:#16305c;text-transform:uppercase;letter-spacing:.04em;margin-top:2px">irnolympiad.uz</span>' : ''}</div>`;

	let overlay = '';
	if (cert.useCustomLayout) {
		const el = (c, text, weight) =>
			`<div style="position:absolute;left:${c.x}%;top:${c.y}%;transform:translate(-50%,-50%);font-family:${c.fontFamily};font-weight:${weight};font-size:${c.fontSize}px;color:${c.color};text-align:${c.align};white-space:nowrap;line-height:1.1">${esc(text)}</div>`;
		if (cert.cfg.name.show) overlay += el(cert.cfg.name, cert.name, 700);
		if (cert.cfg.score.show && cert.score !== '') overlay += el(cert.cfg.score, cert.score, 800);
		if (cert.cfg.grade.show && cert.gradeText) overlay += el(cert.cfg.grade, cert.gradeText, 600);
		if (cert.cfg.date.show) overlay += el(cert.cfg.date, cert.date, 600);
		if (cert.cfg.qr.show) overlay += `<div style="position:absolute;left:${cert.cfg.qr.x}%;top:${cert.cfg.qr.y}%;transform:translate(-50%,-50%)">${qrBox(cert.cfg.qr.size || 64, cert.cfg.qr.showLabel)}</div>`;
	} else {
		const m = mustaqillikLayout(cert.isMath, cert.name);
		overlay += `<div style="position:absolute;top:${m.name.top}px;left:${m.name.left}px;width:${m.name.width}px;height:${m.name.height}px;display:flex;align-items:flex-end;justify-content:center;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:${m.name.fontSize}px;letter-spacing:.02em;color:#16305c;white-space:nowrap;line-height:1">${esc(cert.name)}</div>`;
		if (cert.score !== '') overlay += `<div style="position:absolute;top:${m.score.top}px;left:${m.score.left}px;width:${m.score.width}px;height:${m.score.height}px;display:flex;align-items:center;justify-content:center;font-family:Georgia,'Times New Roman',serif;font-weight:800;font-size:34px;color:#16305c;line-height:1">${esc(cert.score)}</div>`;
		overlay += `<div style="position:absolute;bottom:${m.qr.bottom}px;right:${m.qr.right}px">${qrBox(64, true)}</div>`;
	}

	const body = `<img src="${bg}" style="position:absolute;inset:0;width:${W}px;height:${H}px;display:block" />${overlay}`;
	return { html: page(W, H, body), width: W, height: H, name: cert.name, olyTitle: cert.olyTitle };
};

export const certificatePdf = async ({ data, user, lang }) => {
	const c = await certificateHtml({ data, user, lang });
	return sharePdf(c.html, { width: c.width, height: c.height, fileName: `Sertifikat_${c.name.replace(/\s+/g, '_')}` });
};

// Admin: all uploaded recipients → one ZIP of PDFs (website certificateBundle.js).
export const recipientsCertificatesZip = async ({ recipients, olympiadTitle, certificateConfig, certificateImage, lang, onProgress }) => {
	const zip = new JSZip();
	for (let i = 0; i < recipients.length; i++) {
		onProgress?.(i + 1, recipients.length);
		const r = recipients[i];
		try {
			const c = await certificateHtml({
				data: { title: olympiadTitle, certificate_config: certificateConfig, certificate_image: certificateImage, name: r.name, grade: r.grade, score: r.score, award: r.award, regId: r.id_number || r.id },
				user: { first_name: r.name, participant_id: r.id_number, grade: r.grade },
				lang: certificateConfig?.certificateLanguage || lang,
			});
			const uri = await renderPdf(c.html, c);
			const b64 = await new File(uri).base64();
			const clean = (r.name || `Qatnashchi_${i + 1}`).trim().replace(/[\s/\\:]+/g, '_');
			zip.file(`${String(i + 1).padStart(2, '0')}_${clean}${r.id_number ? `_${r.id_number}` : ''}${r.award ? `_${String(r.award).toUpperCase()}` : ''}.pdf`, b64, { base64: true });
		} catch {}
	}
	const zipB64 = await zip.generateAsync({ type: 'base64' });
	return shareFile(zipB64, `Sertifikatlar_${(olympiadTitle || 'Olimpiada').replace(/[\s/\\:]+/g, '_')}_${recipients.length}_ta.zip`, 'application/zip');
};
