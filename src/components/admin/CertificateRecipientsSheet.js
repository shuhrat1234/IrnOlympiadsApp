import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Search, Trash2, Upload, X } from 'lucide-react-native';
import { useWebEngine } from '../WebEngine';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Pill, Sheet, T, Tap } from '../ui';
import { ChoicePills } from '../form';
import { colors, fonts, radius } from '../../theme';
import { isPdf, pickDocument, shareFile } from '../../utils/files';
import { certificatePdf, recipientsCertificatesZip } from '../../utils/documents';

export const AWARDS = [
	{ id: 'gold', badge: '🥇 Gold' },
	{ id: 'silver', badge: '🥈 Silver' },
	{ id: 'bronze', badge: '🥉 Bronze' },
	{ id: 'participant', badge: '📜 Ishtirokchi' },
];

const detectAward = (val) => {
	const s = String(val || '').trim().toUpperCase();
	if (s.includes('GOLD') || s.includes('OLTIN') || s.includes('ЗОЛОТ')) return 'gold';
	if (s.includes('SILVER') || s.includes('KUMUSH') || s.includes('СЕРЕБР')) return 'silver';
	if (s.includes('BRONZ') || s.includes('БРОНЗ')) return 'bronze';
	return 'participant';
};

// Header detection + column mapping — same rules as the website modal.
export const parseRecipientRows = (rawRows) => {
	let headerIdx = -1;
	const col = {};
	for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
		const row = rawRows[i];
		if (!Array.isArray(row)) continue;
		const str = row.map((c) => String(c).toLowerCase().trim()).join(' ');
		if ((str.includes('id') || str.includes('number')) && (str.includes('name') || str.includes('surname') || str.includes('ism'))) {
			headerIdx = i;
			row.forEach((cell, ci) => {
				const c = String(cell).toLowerCase().trim();
				if (/(id|number|kod|айди)/i.test(c)) col.id = ci;
				else if (/(surname|familiya|фамилия)/i.test(c)) col.surname = ci;
				else if (/^(name|ism|имя)$/i.test(c)) col.name = ci;
				else if (/(full\s*name|f\.?i\.?sh|фио)/i.test(c)) col.fullName = ci;
				else if (/(grade|sinf|класс)/i.test(c)) col.grade = ci;
				else if (/(total|score|ball|балл|natija)/i.test(c)) col.score = ci;
				else if (/(award|mukofot|награда|o'rin|orin|o‘rin)/i.test(c)) col.award = ci;
				else if (/(prize|sovrin|приз)/i.test(c)) col.prize = ci;
			});
			break;
		}
	}
	const cell = (row, k) => (col[k] !== undefined ? String(row[col[k]] || '').trim() : '');
	const out = [];
	(headerIdx !== -1 ? rawRows.slice(headerIdx + 1) : rawRows).forEach((row, idx) => {
		if (!Array.isArray(row) || row.every((c) => c === undefined || c === null || String(c).trim() === '')) return;
		const idVal = cell(row, 'id');
		if (/^(grade\s*\d+|mathematics|english|fan|subject)/i.test(idVal) || /^(grade\s*\d+|mathematics|english)/i.test(String(row[0] || '').trim())) return;
		const fullName = col.fullName !== undefined && row[col.fullName] ? String(row[col.fullName]).trim() : `${cell(row, 'surname')} ${cell(row, 'name')}`.trim();
		if (!idVal && !fullName) return;
		out.push({ id: `rec-${idx}-${Date.now()}`, id_number: idVal, name: fullName, grade: cell(row, 'grade'), score: cell(row, 'score'), award: detectAward(cell(row, 'award')), prize: cell(row, 'prize') });
	});
	return out;
};

export default function CertificateRecipientsSheet({ visible, onClose, initialRecipients = [], certificateConfig, certificateImage, olympiadTitle, olympiadId, onSave, lang }) {
	const engine = useWebEngine();
	const toast = useToast();
	const [recipients, setRecipients] = useState(initialRecipients);
	const [parsing, setParsing] = useState(false);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState('all');
	const [zip, setZip] = useState(null);
	const [rowBusy, setRowBusy] = useState(null);

	useEffect(() => {
		if (visible) setRecipients(initialRecipients || []);
	}, [visible]);

	const title = olympiadTitle || `Olimpiada_${olympiadId || ''}`;

	const upload = async () => {
		const file = await pickDocument(['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'text/comma-separated-values']);
		if (!file) return;
		setParsing(true);
		setError('');
		try {
			const b64 = await file.base64();
			let raw;
			if (isPdf(file)) raw = await engine.pdfTables(b64);
			else {
				const wb = XLSX.read(b64, { type: 'base64' });
				raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
			}
			if (!raw?.length) setError("Faylda ma'lumot topilmadi.");
			else {
				const parsed = parseRecipientRows(raw);
				if (!parsed.length) setError("Fayldan qatnashchilar topilmadi. Ustunlar nomlari to'g'riligini tekshiring.");
				else setRecipients(parsed);
			}
		} catch (e) {
			setError(`Faylni o'qishda xatolik yuz berdi: ${e.message || "Noto'g'ri format"}`);
		}
		setParsing(false);
	};

	const exportExcel = async () => {
		const ws = XLSX.utils.aoa_to_sheet([['ID Number', 'Name', 'Grade', 'Score', 'Award', 'Prize'], ...recipients.map((r) => [r.id_number, r.name, r.grade, r.score, String(r.award).toUpperCase(), r.prize])]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Sertifikatlar');
		await shareFile(XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), 'Sertifikatlar_royxati.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	};

	const downloadZip = async () => {
		setZip({ current: 0, total: recipients.length });
		try {
			await recipientsCertificatesZip({ recipients, olympiadTitle: title, certificateConfig, certificateImage, lang, onProgress: (current, total) => setZip({ current, total }) });
		} catch {
			toast.error('ZIP');
		}
		setZip(null);
	};

	const downloadOne = async (r) => {
		setRowBusy(r.id);
		try {
			await certificatePdf({
				data: { title, certificate_config: certificateConfig, certificate_image: certificateImage, name: r.name, grade: r.grade, score: r.score, award: r.award, regId: r.id_number || r.id },
				user: { first_name: r.name, participant_id: r.id_number, grade: r.grade },
				lang: certificateConfig?.certificateLanguage || lang,
			});
		} catch {}
		setRowBusy(null);
	};

	const counts = AWARDS.reduce((a, x) => ({ ...a, [x.id]: recipients.filter((r) => r.award === x.id).length }), {});
	const lookup = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return null;
		return recipients.find((r) => String(r.id_number || '').toLowerCase() === q) || null;
	}, [query, recipients]);
	const filtered = recipients.filter((r) => {
		if (filter !== 'all' && r.award !== filter) return false;
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return String(r.id_number || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || String(r.score || '').includes(q) || String(r.grade || '').includes(q);
	});

	return (
		<Sheet visible={visible} onClose={onClose} title="Natijalar va sertifikatlar importi" maxHeight="94%">
			<T v="small" style={{ marginBottom: 12 }}>{`${olympiadTitle ? `${olympiadTitle} — ` : ''}Faqat yuklangan fayldagi foydalanuvchilar o'z sertifikatini ko'radi.`}</T>
			<View style={{ flexDirection: 'row', gap: 8 }}>
				<Button style={{ flex: 1 }} size="sm" icon={Upload} title={parsing ? "O'qilmoqda..." : 'Excel / PDF'} loading={parsing} onPress={upload} />
				{recipients.length ? <Button size="sm" variant="light" icon={FileSpreadsheet} title="Excel" onPress={exportExcel} /> : null}
				{recipients.length ? <Button size="sm" variant="dark" icon={Download} title={zip ? `${zip.current}/${zip.total}` : `ZIP (${recipients.length})`} loading={!!zip && !zip.current} disabled={!!zip} onPress={downloadZip} /> : null}
			</View>
			{error ? (
				<View style={styles.error}><AlertCircle size={16} color={colors.red} /><T v="small" color={colors.red} style={{ flex: 1 }}>{error}</T></View>
			) : null}
			{recipients.length ? (
				<>
					<T v="small" style={{ marginTop: 12, fontFamily: fonts.bold }}>🥇 {counts.gold} · 🥈 {counts.silver} · 🥉 {counts.bronze} · (Jami: {recipients.length})</T>
					<Field icon={Search} value={query} onChangeText={setQuery} placeholder="ID yoki ism bo'yicha qidirish..." style={{ marginTop: 10 }} autoCapitalize="none" />
					{lookup ? (
						<View style={[styles.error, { backgroundColor: colors.greenSoft }]}>
							<CheckCircle2 size={15} color={colors.green} />
							<T v="small" color={colors.green} style={{ flex: 1 }}>{lookup.name} ({String(lookup.award).toUpperCase()}, {lookup.score} ball) — Sertifikat biriktirilgan!</T>
						</View>
					) : null}
					<View style={{ marginTop: 10 }}>
						<ChoicePills value={filter} onChange={setFilter} options={[{ value: 'all', label: `Barchasi (${recipients.length})` }, { value: 'gold', label: `🥇 ${counts.gold}` }, { value: 'silver', label: `🥈 ${counts.silver}` }, { value: 'bronze', label: `🥉 ${counts.bronze}` }]} />
					</View>
					<ScrollView style={{ maxHeight: 380, marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
						{filtered.map((r, i) => (
							<View key={r.id} style={styles.row}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
									<T v="small" style={{ width: 22 }}>{i + 1}</T>
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 13.5 }} numberOfLines={1}>{r.name}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{r.id_number || '-'} · {r.grade ? `${r.grade}-sinf` : '-'} · {r.score || '-'} ball{r.prize ? ` · ${r.prize}` : ''}</T>
									</View>
									<Tap onPress={() => downloadOne(r)} style={styles.icon}>{rowBusy === r.id ? <ActivityIndicator size="small" color={colors.goldDeep} /> : <Download size={15} color={colors.navy} />}</Tap>
									<Tap onPress={() => setRecipients((p) => p.filter((x) => x.id !== r.id))} style={[styles.icon, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap>
								</View>
								<View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
									{AWARDS.map((a) => (
										<Tap key={a.id} onPress={() => setRecipients((p) => p.map((x) => (x.id === r.id ? { ...x, award: a.id } : x)))}>
											<Pill label={a.badge} color={r.award === a.id ? colors.navyDeep : colors.muted} bg={r.award === a.id ? colors.gold : colors.white} />
										</Tap>
									))}
								</View>
							</View>
						))}
					</ScrollView>
				</>
			) : (
				<Tap onPress={upload} style={styles.drop}>
					<FileSpreadsheet size={40} color={colors.amber} />
					<T v="strong" style={{ marginTop: 10, textAlign: 'center' }}>{"G'oliblar ro'yxati faylini yuklang"}</T>
					<T v="small" style={{ textAlign: 'center', marginTop: 4 }}>Ustunlar: ID Number, Surname, Name, Grade, Score, Award (GOLD, SILVER, BRONZE), Prize</T>
				</Tap>
			)}
			<View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
				<Button style={{ flex: 1 }} size="md" variant="light" icon={X} title="Tozalash" disabled={!recipients.length} onPress={() => setRecipients([])} />
				<Button style={{ flex: 1.6 }} size="md" icon={CheckCircle2} title={`Biriktirish (${recipients.length})`} onPress={() => { onSave(recipients); onClose(); }} />
			</View>
		</Sheet>
	);
}

const styles = StyleSheet.create({
	error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.redSoft, marginTop: 10 },
	row: { padding: 12, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
	drop: { alignItems: 'center', padding: 26, marginTop: 12, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: colors.goldTint },
});
