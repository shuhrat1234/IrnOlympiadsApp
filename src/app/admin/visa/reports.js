import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as XLSX from 'xlsx';
import { CalendarClock, CheckCircle2, Download, FileSpreadsheet, FileText, FileWarning, Upload, Wallet } from 'lucide-react-native';
import api from '../../../api/client';
import E from '../../../api/endpoints';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../../components/layout';
import { Button, Card, T, Tap } from '../../../components/ui';
import { HBarList } from '../../../components/charts';
import { VisaBell, VisaNav, fetchAllApplicants } from '../../../components/admin/visa';
import { colors, radius } from '../../../theme';
import { pickDocument, shareFile } from '../../../utils/files';
import { sharePdf } from '../../../utils/documents';

const IMPORT_HEADERS = ['Фамилия', 'Имя', 'Отчество', 'Телефон', 'Email', 'Страна', 'Программа', 'Оплата'];
const IMPORT_FIELDS = ['last_name', 'first_name', 'middle_name', 'phone', 'email', 'country', 'program_name', 'payment_required'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const L = {
	title: { uz: 'Hisobotlar va eksport', ru: 'Отчёты и экспорт', en: 'Reports & Export' },
	subtitle: { uz: "Umumiy statistika va ro'yxatlarni yuklab olish", ru: 'Сводная статистика и выгрузка списков', en: 'Summary statistics and list exports' },
	byStatus: { uz: "Status bo'yicha", ru: 'По статусу', en: 'By status' },
	byCountry: { uz: "Mamlakatlar bo'yicha", ru: 'По странам', en: 'By country' },
	byStaff: { uz: "Xodimlar bo'yicha", ru: 'По сотрудникам', en: 'By staff' },
	exports: { uz: "Ro'yxatlarni yuklab olish", ru: 'Выгрузка списков', en: 'List exports' },
	debtors: { uz: "Qarzdorlar ro'yxati", ru: 'Список должников', en: 'Debtors list' },
	missingDocs: { uz: 'Yetishmayotgan hujjatlar', ru: 'Недостающие документы', en: 'Missing documents' },
	readyList: { uz: 'Elchixonaga tayyor', ru: 'Готовы к посольству', en: 'Ready for embassy' },
	appointmentsList: { uz: "Sana bo'yicha yozuvlar", ru: 'Записи по датам', en: 'Appointments by date' },
	pdfSummary: { uz: 'PDF-xulosa', ru: 'PDF-сводка', en: 'PDF summary' },
	exported: { uz: 'Fayl tayyor', ru: 'Файл выгружен', en: 'File exported' },
	noData: { uz: "Yuklab olish uchun ma'lumot yo'q", ru: 'Нет данных для выгрузки', en: 'No data to export' },
	importTitle: { uz: "Excel'dan import", ru: 'Импорт участников из Excel', en: 'Import applicants from Excel' },
	importDesc: { uz: "Shablonni yuklab oling, to'ldiring va qayta yuklang", ru: 'Скачайте шаблон, заполните и загрузите обратно', en: 'Download the template, fill it in and upload it back' },
	downloadTemplate: { uz: 'Shablon', ru: 'Шаблон', en: 'Template' },
	uploadFile: { uz: 'Faylni yuklash', ru: 'Загрузить файл', en: 'Upload file' },
	importDone: { uz: 'Import qilindi', ru: 'Импортировано', en: 'Imported' },
	importErrors: { uz: 'Xatolar', ru: 'Ошибки', en: 'Errors' },
	importFailed: { uz: "Faylni import qilib bo'lmadi", ru: 'Не удалось импортировать файл', en: 'Failed to import file' },
	emptyFile: { uz: "Fayl bo'sh yoki ma'lumot qatorlari yo'q", ru: 'Файл пуст или не содержит строк с данными', en: 'The file is empty or has no data rows' },
	unmatchedHeaders: { uz: 'Ustun sarlavhalari aniqlanmadi. Yuklab olingan shablondan foydalaning.', ru: 'Заголовки колонок не распознаны. Используйте скачанный шаблон.', en: "Column headers weren't recognized. Use the downloaded template." },
	row: { uz: 'qator', ru: 'Строка', en: 'Row' },
	rowMissing: { uz: 'ism, familiya va mamlakatni kiriting', ru: 'заполните имя, фамилию и страну', en: 'fill in first name, last name and country' },
	notAssigned: { uz: 'Tayinlanmagan', ru: 'Не назначен', en: 'Not assigned' },
	loadErr: { uz: "Ma'lumotlarni yuklab bo'lmadi", ru: 'Не удалось загрузить данные', en: 'Failed to load data' },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const today = () => new Date().toISOString().split('T')[0];

export default function VisaReports() {
	const { tx } = useLanguage();
	const toast = useToast();
	const [applicants, setApplicants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [result, setResult] = useState(null);
	const [pdfBusy, setPdfBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			setApplicants(await fetchAllApplicants());
		} catch {
			toast.error(tx(L.loadErr));
		}
		setLoading(false);
	}, []);
	useEffect(() => { load(); }, [load]);

	const breakdowns = useMemo(() => {
		const s = {}; const c = {}; const st = {};
		applicants.forEach((a) => {
			s[a.status_display] = (s[a.status_display] || 0) + 1;
			c[a.country] = (c[a.country] || 0) + 1;
			const k = a.assigned_to_name || tx(L.notAssigned);
			st[k] = (st[k] || 0) + 1;
		});
		const sort = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]);
		return { byStatus: sort(s), byCountry: sort(c), byStaff: sort(st) };
	}, [applicants, tx]);

	const exportExcel = async (rows, headers, name) => {
		if (!rows.length) return toast.error(tx(L.noData));
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Sheet1');
		try {
			await shareFile(XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), `${name}_${today()}.xlsx`, XLSX_MIME);
			toast.success(tx(L.exported));
		} catch {}
	};

	const EXPORTS = [
		{ label: L.debtors, icon: Wallet, c: [colors.red, colors.redSoft], run: () => exportExcel(applicants.filter((a) => a.debt > 0).map((a) => [a.full_name, a.phone, a.country, a.status_display, a.assigned_to_name || '—', a.payment_required, a.payment_paid, a.debt]), ['ФИО', 'Телефон', 'Страна', 'Статус', 'Ответственный', 'Требуется', 'Оплачено', 'Долг'], 'visa_debtors') },
		{ label: L.missingDocs, icon: FileWarning, c: [colors.amber, colors.goldTint], run: () => exportExcel(applicants.filter((a) => ['awaiting_documents', 'documents_received', 'needs_correction', 'needs_replacement'].includes(a.status) || a.has_documents_needing_replacement).map((a) => [a.full_name, a.phone, a.country, a.status_display, a.assigned_to_name || '—']), ['ФИО', 'Телефон', 'Страна', 'Статус', 'Ответственный'], 'visa_missing_documents') },
		{ label: L.readyList, icon: CheckCircle2, c: [colors.green, colors.greenSoft], run: () => exportExcel(applicants.filter((a) => a.status === 'ready_for_embassy').map((a) => [a.full_name, a.phone, a.country, a.assigned_to_name || '—', a.embassy_appointment_date ? new Date(a.embassy_appointment_date).toLocaleString() : '—']), ['ФИО', 'Телефон', 'Страна', 'Ответственный', 'Дата записи'], 'visa_ready_for_embassy') },
		{ label: L.appointmentsList, icon: CalendarClock, c: [colors.blue, colors.blueSoft], run: () => exportExcel(applicants.filter((a) => a.embassy_appointment_date).sort((a, b) => new Date(a.embassy_appointment_date) - new Date(b.embassy_appointment_date)).map((a) => [a.full_name, a.phone, a.country, new Date(a.embassy_appointment_date).toLocaleString(), a.assigned_to_name || '—']), ['ФИО', 'Телефон', 'Страна', 'Дата и время записи', 'Ответственный'], 'visa_appointments') },
	];

	const pdfSummary = async () => {
		setPdfBusy(true);
		const table = (head, rows) => `<table><thead><tr><th>${head}</th><th style="width:80px;text-align:right">Count</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${v}</td></tr>`).join('')}</tbody></table>`;
		const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:595px 842px;margin:32px}body{font-family:Helvetica,Arial;color:#1f2937}h1{font-size:16px;margin:0 0 4px}p{font-size:9px;color:#666;margin:0 0 14px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px}th{background:#16305c;color:#fff;text-align:left;padding:6px}td{padding:5px 6px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#fafafb}</style></head><body><h1>Visa / Embassy Module — Summary Report</h1><p>${new Date().toLocaleString()}</p>${table('Status', breakdowns.byStatus)}${table('Country', breakdowns.byCountry)}${table('Staff', breakdowns.byStaff)}</body></html>`;
		try {
			await sharePdf(html, { width: 595, height: 842, fileName: `visa_summary_${today()}` });
			toast.success(tx(L.exported));
		} catch {}
		setPdfBusy(false);
	};

	const downloadTemplate = () => {
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([IMPORT_HEADERS]), 'Sheet1');
		shareFile(XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), 'visa_import_template.xlsx', XLSX_MIME).catch(() => {});
	};

	const rowLabel = (n) => `${tx(L.row)} ${n}`;

	const importFile = async () => {
		const file = await pickDocument();
		if (!file) return;
		setImporting(true);
		setResult(null);
		try {
			const wb = XLSX.read(await file.base64(), { type: 'base64' });
			const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
			const [headerRow, ...dataRows] = raw;
			const fields = (headerRow || []).map((h) => {
				const i = IMPORT_HEADERS.findIndex((ih) => ih.toLowerCase() === String(h).trim().toLowerCase());
				return i >= 0 ? IMPORT_FIELDS[i] : null;
			});
			if (!fields.some(Boolean)) { setResult({ created: [], errors: [tx(L.unmatchedHeaders)] }); return; }
			const rows = (dataRows || []).map((cells, i) => ({ excelRow: i + 2, cells })).filter((r) => r.cells.some((c) => c !== undefined && c !== ''));
			if (!rows.length) { setResult({ created: [], errors: [tx(L.emptyFile)] }); return; }
			const clientErrors = [];
			const valid = [];
			rows.forEach(({ excelRow, cells }) => {
				const data = {};
				fields.forEach((f, i) => { if (f && cells[i] !== undefined && cells[i] !== '') data[f] = cells[i]; });
				if (data.payment_required !== undefined) data.payment_required = parseInt(data.payment_required, 10) || 0;
				if (!String(data.first_name || '').trim() || !String(data.last_name || '').trim() || !String(data.country || '').trim()) clientErrors.push(`${rowLabel(excelRow)}: ${tx(L.rowMissing)}`);
				else valid.push({ excelRow, data });
			});
			let created = [];
			let backendErrors = [];
			if (valid.length) {
				const res = await api.post(E.VISA_APPLICANT_BULK_CREATE, { rows: valid.map((r) => r.data) });
				created = res.data.created || [];
				backendErrors = (res.data.errors || []).map((e) => {
					if (typeof e === 'string') return e;
					const idx = typeof e?.row === 'number' ? e.row : typeof e?.index === 'number' ? e.index : null;
					const msg = e?.message || e?.error || e?.detail || JSON.stringify(e);
					return idx !== null && valid[idx] ? `${rowLabel(valid[idx].excelRow)}: ${msg}` : msg;
				});
			}
			const errors = [...clientErrors, ...backendErrors];
			setResult({ created, errors });
			if (created.length) { toast.success(`${tx(L.importDone)}: ${created.length}`); load(); }
			if (errors.length && !created.length) toast.error(tx(L.importFailed));
		} catch (err) {
			const detail = err.response?.data?.detail || err.response?.data?.error;
			setResult({ created: [], errors: [detail ? String(detail) : tx(L.importFailed)] });
			toast.error(tx(L.importFailed));
		} finally {
			setImporting(false);
		}
	};

	return (
		<Screen header={<StackHeader onBack={() => router.back()} right={<VisaBell />} />} onRefresh={load}>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />
			<VisaNav />
			{loading ? <ActivityIndicator color={colors.goldDeep} style={{ marginTop: 30 }} /> : (
				<>
					<Button icon={FileText} title={tx(L.pdfSummary)} variant="dark" loading={pdfBusy} onPress={pdfSummary} style={{ marginBottom: 14 }} />
					{[[L.byStatus, breakdowns.byStatus, colors.gold], [L.byCountry, breakdowns.byCountry, colors.blue], [L.byStaff, breakdowns.byStaff, colors.purple]].map(([title, data, color]) => (
						<Card key={title.en} style={{ marginBottom: 12 }}>
							<T v="strong" style={{ marginBottom: 10 }}>{tx(title)}</T>
							{data.length ? <HBarList data={data.map(([label, value]) => ({ label: label || '—', value }))} color={color} format={(v) => String(v)} /> : <T v="small">—</T>}
						</Card>
					))}

					<T v="h3" style={{ marginTop: 6, marginBottom: 10 }}>{tx(L.exports)}</T>
					<View style={styles.grid}>
						{EXPORTS.map((x) => (
							<Tap key={x.label.en} onPress={x.run} containerStyle={{ width: '48%', flexGrow: 1 }} style={styles.exp}>
								<View style={[styles.expIcon, { backgroundColor: x.c[1] }]}><x.icon size={17} color={x.c[0]} /></View>
								<T v="strong" style={{ fontSize: 13.5 }} numberOfLines={2}>{tx(x.label)}</T>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><FileSpreadsheet size={11} color={colors.green} /><T v="small" style={{ fontSize: 11 }}>Excel</T></View>
							</Tap>
						))}
					</View>

					<Card style={{ marginTop: 14, gap: 12 }}>
						<T v="strong">{tx(L.importTitle)}</T>
						<T v="small">{tx(L.importDesc)}</T>
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Button style={{ flex: 1 }} size="md" variant="light" icon={Download} title={tx(L.downloadTemplate)} onPress={downloadTemplate} />
							<Button style={{ flex: 1 }} size="md" icon={Upload} title={tx(L.uploadFile)} loading={importing} onPress={importFile} />
						</View>
						{result ? (
							<View style={[styles.result, { backgroundColor: result.errors.length ? colors.goldTint : colors.greenSoft }]}>
								<T v="strong" color={colors.green}>{tx(L.importDone)}: {result.created.length}</T>
								{result.errors.length ? <T v="strong" color={colors.red}>{tx(L.importErrors)}: {result.errors.length}</T> : null}
								{result.errors.map((e, i) => <T key={i} v="small" color={colors.red}>• {e}</T>)}
							</View>
						) : null}
					</Card>
				</>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	exp: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 8, minHeight: 120 },
	expIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	result: { padding: 12, borderRadius: radius.md, gap: 4 },
});
