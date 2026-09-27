import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as XLSX from 'xlsx';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Download, Edit2, FileSpreadsheet, FileText, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react-native';
import api from '../../api/client';
import E from '../../api/endpoints';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { useWebEngine } from '../../components/WebEngine';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, Field, Pill, ProgressBar, SelectField, T, Tap } from '../../components/ui';
import { RowReview } from '../../components/admin/BulkImportReview';
import { colors, fonts, radius } from '../../theme';
import { isPdf, pickDocuments, shareFile } from '../../utils/files';
import { sharePdf } from '../../utils/documents';
import { parsePdfTable, parseSheetBase64, templateWorkbookBase64 } from '../../utils/bulkImport';

const INGEST_CHUNK_SIZE = 1000;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const L = {
	title: { uz: 'Ommaviy import', ru: 'Массовый импорт', en: 'Bulk import' },
	subtitle: { uz: 'Final Round natijalarini yuklang va topilgan ishtirokchilarga ruxsat bering', ru: 'Загрузите результаты Final Round и назначьте допуск найденным участникам', en: 'Upload Final Round results and grant permission to matched participants' },
	selectOlympiad: { uz: 'Olimpiadani tanlang', ru: 'Выберите олимпиаду', en: 'Select olympiad' },
	selectOlympiadHint: { uz: 'Ruxsat aynan shu olimpiada (bosqich/fan) uchun beriladi', ru: 'Допуск будет выдан именно для этой олимпиады (этапа/предмета)', en: 'Permission is granted for exactly this olympiad (stage/subject)' },
	choose: { uz: '— tanlang —', ru: '— выберите —', en: '— choose —' },
	startNew: { uz: 'Yangi import yaratish', ru: 'Создать новый импорт', en: 'Create new import' },
	existing: { uz: 'Oldingi importlar', ru: 'Ранее созданные импорты', en: 'Existing imports' },
	noExisting: { uz: 'Bu olimpiada uchun hali import qilinmagan.', ru: 'Для этой олимпиады импортов ещё нет.', en: 'No imports for this olympiad yet.' },
	open: { uz: 'Ochish', ru: 'Открыть', en: 'Open' },
	deleteAll: { uz: "Barchasini o'chirish", ru: 'Удалить все', en: 'Delete all' },
	confirmDeleteAllTitle: { uz: "Barcha importlarni o'chirish?", ru: 'Удалить все импорты?', en: 'Delete all imports?' },
	confirmDeleteAllText: { uz: "Ushbu olimpiada uchun BARCHA import fayllari o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.", ru: 'Будут удалены ВСЕ файлы импорта этой олимпиады. Действие необратимо.', en: 'ALL import files for this olympiad will be deleted. This cannot be undone.' },
	confirmDeleteTitle: { uz: "Import faylini o'chirish?", ru: 'Удалить файл импорта?', en: 'Delete import file?' },
	yesDelete: { uz: "Ha, o'chirish", ru: 'Да, удалить', en: 'Yes, delete' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	batchDeleted: { uz: "Import fayli o'chirildi", ru: 'Файл импорта удален', en: 'Import deleted' },
	allDeleted: { uz: "Barcha import fayllari o'chirildi", ru: 'Все файлы импорта удалены', en: 'All imports deleted' },
	deleteErr: { uz: "O'chirishda xatolik", ru: 'Ошибка при удалении', en: 'Delete failed' },
	renamed: { uz: 'Fayl nomi saqlandi', ru: 'Название сохранено', en: 'Name saved' },
	renameErr: { uz: "Nomini o'zgartirishda xatolik", ru: 'Ошибка переименования', en: 'Rename failed' },
	uploadTitle: { uz: 'Excel, CSV yoki PDF fayllarni yuklang', ru: 'Загрузите Excel, CSV или PDF файлы', en: 'Upload Excel, CSV or PDF files' },
	uploadHint: { uz: "Fayl tarkibi: ID, F.I.SH, sinf, fan, viloyat, maktab, telefon, ball. Bir nechta fayl tanlash mumkin.", ru: 'Файл может содержать: ID, ФИО, класс, предмет, регион, школу, телефон, балл. Можно выбрать несколько файлов.', en: 'Files may contain: ID, full name, grade, subject, region, school, phone, score. Multiple files allowed.' },
	chooseFiles: { uz: 'Fayllarni tanlash', ru: 'Выбрать файлы', en: 'Choose files' },
	addMore: { uz: "Yana fayl qo'shish", ru: 'Добавить ещё файлы', en: 'Add more files' },
	clearAll: { uz: 'Tozalash', ru: 'Очистить', en: 'Clear' },
	uploadAnalyze: { uz: 'Yuklash va tahlil qilish', ru: 'Загрузить и анализировать', en: 'Upload and analyze' },
	reading: { uz: "Fayl o'qilmoqda", ru: 'Чтение файла', en: 'Reading file' },
	uploading: { uz: 'Yuklanmoqda', ru: 'Загрузка', en: 'Uploading' },
	analyzing: { uz: 'Ishtirokchilar tahlil qilinmoqda…', ru: 'Анализ совпадений участников…', en: 'Analyzing participant matches…' },
	analyzingHint: { uz: "Bazadan F.I.SH, telefon va ID orqali solishtirilmoqda", ru: 'Сопоставление по ФИО, телефону и ID', en: 'Matching by name, phone and ID' },
	emptyFile: { uz: "Fayl bo'sh yoki unda ma'lumot qatorlari yo'q", ru: 'Файл пуст или в нем нет строк с данными', en: 'File is empty or has no data rows' },
	parseFailed: { uz: "Faylni o'qib bo'lmadi", ru: 'Не удалось прочитать файл', en: 'Failed to read the file' },
	analysisFailed: { uz: 'Tahlil xatosi', ru: 'Ошибка анализа', en: 'Analysis failed' },
	extraCols: { uz: "Qo'shimcha ustunlar saqlandi", ru: 'Дополнительные колонки сохранены', en: 'Extra columns preserved' },
	skipped: { uz: "Ayrim fayllar o'tkazib yuborildi (faqat .xlsx, .xls, .csv, .pdf)", ru: 'Некоторые файлы пропущены (только .xlsx, .xls, .csv, .pdf)', en: 'Some files were skipped (only .xlsx, .xls, .csv, .pdf)' },
	template: { uz: 'Shablon namunasi', ru: 'Пример шаблона', en: 'Sample template' },
	summary: { uz: 'Import yakunlari', ru: 'Итоги импорта', en: 'Import summary' },
	totalRows: { uz: 'Jami qatorlar', ru: 'Всего строк', en: 'Total rows' },
	found: { uz: 'Topildi', ru: 'Найдено', en: 'Matched' },
	possible: { uz: 'Ehtimoliy', ru: 'Возможные', en: 'Possible' },
	notFound: { uz: 'Topilmadi', ru: 'Не найдено', en: 'Not found' },
	assigned: { uz: 'Ruxsat berildi', ru: 'Допуск выдан', en: 'Permission assigned' },
	newImport: { uz: 'Yangi import', ru: 'Новый импорт', en: 'New import' },
	backToReview: { uz: "Ishtirokchilar ro'yxatiga", ru: 'К списку участников', en: 'Back to review' },
	exportExcel: { uz: 'Excel', ru: 'Excel', en: 'Excel' },
	exportPdf: { uz: 'PDF', ru: 'PDF', en: 'PDF' },
	noRows: { uz: "Eksport uchun qatorlar yo'q", ru: 'Нет строк для экспорта', en: 'No rows to export' },
	addFiles: { uz: "Fayl qo'shish", ru: 'Добавить файлы', en: 'Add files' },
	refresh: { uz: 'Yangilash', ru: 'Обновить', en: 'Refresh' },
	delete: { uz: "O'chirish", ru: 'Удалить', en: 'Delete' },
	rows: { uz: 'Qatorlar', ru: 'Строк', en: 'Rows' },
	permission: { uz: 'Ruxsat', ru: 'Допуск', en: 'Permission' },
	colName: { uz: 'F.I.SH (Excel)', ru: 'ФИО (Excel)', en: 'Full name (Excel)' },
	colGrade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	colSubject: { uz: 'Fan', ru: 'Предмет', en: 'Subject' },
	colScore: { uz: 'Ball', ru: 'Балл', en: 'Score' },
	colStatus: { uz: 'Holat', ru: 'Статус', en: 'Status' },
	colMatched: { uz: 'Topilgan ishtirokchi', ru: 'Найденный участник', en: 'Matched participant' },
	colPhone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	colConfirmed: { uz: 'Tasdiq.', ru: 'Подтв.', en: 'Confirmed' },
	st_found: { uz: 'Topildi', ru: 'Найден', en: 'Found' },
	st_manually_linked: { uz: "Qo'lda bog'landi", ru: 'Привязан вручную', en: 'Manually linked' },
	st_possible: { uz: 'Ehtimoliy', ru: 'Возможно', en: 'Possible' },
	st_not_found: { uz: 'Topilmadi', ru: 'Не найден', en: 'Not found' },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sizeLabel = (b) => (!b && b !== 0 ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export default function BulkImport() {
	const { tx, pick } = useLanguage();
	const { olympiads, fetchOlympiads } = useOlympiad();
	const toast = useToast();
	const engine = useWebEngine();
	const [step, setStep] = useState('select');
	const [olympiadId, setOlympiadId] = useState('');
	const [batch, setBatch] = useState(null);
	const [batches, setBatches] = useState([]);
	const [loadingBatches, setLoadingBatches] = useState(false);
	const [files, setFiles] = useState([]);
	const [progress, setProgress] = useState(null); // { label, done, total }
	const [polling, setPolling] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [confirm, setConfirm] = useState(null); // { all } | { id }
	const [deleting, setDeleting] = useState(false);
	const [renaming, setRenaming] = useState(null); // { id, name }

	useEffect(() => { if (!olympiads?.length) fetchOlympiads?.(); }, []);

	const olyTitle = (id) => { const o = olympiads.find((x) => String(x.id) === String(id)); return o ? pick(o, 'title') : ''; };

	const fetchBatches = useCallback(async (id) => {
		if (!id) return setBatches([]);
		setLoadingBatches(true);
		try {
			const res = await api.get(E.FINAL_ROUND_BATCHES, { params: { olympiad: id } });
			setBatches(res.data.results || res.data || []);
		} catch {}
		setLoadingBatches(false);
	}, []);

	const chooseOlympiad = (id) => { setOlympiadId(id); fetchBatches(id); };

	const createBatch = async () => {
		if (!olympiadId) return;
		try {
			const res = await api.post(E.FINAL_ROUND_BATCHES, { olympiad: olympiadId, source_filename: olyTitle(olympiadId) });
			setBatch(res.data);
			setStep('upload');
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.parseFailed));
		}
	};

	const openBatch = (b) => {
		setBatch(b);
		if (b.status === 'analyzing') { setPolling(true); setStep('review'); } else setStep(b.total_rows > 0 ? 'review' : 'upload');
	};

	const saveRename = async () => {
		const { id, name } = renaming;
		setRenaming(null);
		if (!name.trim()) return;
		try {
			await api.patch(E.FINAL_ROUND_BATCH_DETAIL(id), { source_filename: name.trim() });
			setBatches((p) => p.map((b) => (b.id === id ? { ...b, source_filename: name.trim() } : b)));
			if (batch?.id === id) setBatch((b) => ({ ...b, source_filename: name.trim() }));
			toast.success(tx(L.renamed));
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.renameErr));
		}
	};

	const executeDelete = async () => {
		setDeleting(true);
		try {
			if (confirm.all) {
				try {
					await api.post(`${E.FINAL_ROUND_BATCHES}delete_all/`, { olympiad: olympiadId });
				} catch {
					await Promise.all(batches.map((b) => api.delete(E.FINAL_ROUND_BATCH_DETAIL(b.id))));
				}
				toast.success(tx(L.allDeleted));
			} else {
				await api.delete(E.FINAL_ROUND_BATCH_DETAIL(confirm.id));
				toast.success(tx(L.batchDeleted));
				if (batch?.id === confirm.id) { setBatch(null); setStep('select'); }
			}
			setConfirm(null);
			fetchBatches(olympiadId);
		} catch (err) {
			toast.error(err.response?.data?.detail || tx(L.deleteErr));
		}
		setDeleting(false);
	};

	const backFromUpload = async () => {
		setFiles([]);
		if (batch && !batch.total_rows) {
			try { await api.delete(E.FINAL_ROUND_BATCH_DETAIL(batch.id)); } catch {}
			setBatch(null);
			setStep('select');
			fetchBatches(olympiadId);
		} else if (batch?.total_rows > 0) setStep('review');
		else { setBatch(null); setStep('select'); }
	};

	const addFiles = async () => {
		const picked = await pickDocuments();
		if (!picked.length) return;
		const valid = picked.filter((f) => /\.(xlsx|xls|csv|pdf)$/i.test(f.name || '') || isPdf(f));
		if (valid.length < picked.length) toast.info(tx(L.skipped));
		setFiles((prev) => {
			const keys = new Set(prev.map((p) => `${p.name}-${p.size}`));
			return [...prev, ...valid.filter((f) => !keys.has(`${f.name}-${f.size}`))];
		});
	};

	const downloadTemplate = () => shareFile(templateWorkbookBase64(), 'final_round_import_template.xlsx', XLSX_MIME).catch(() => {});

	const processFiles = async () => {
		if (!files.length || !batch) return;
		try {
			const allRows = [];
			const unmapped = [];
			let rowIndex = (batch.total_rows || 0) + 1;
			for (let i = 0; i < files.length; i++) {
				const f = files[i];
				setProgress({ label: `${tx(L.reading)} ${i + 1}/${files.length}: ${f.name}`, done: i, total: files.length });
				const b64 = await f.base64();
				const parsed = isPdf(f) ? parsePdfTable(await engine.pdfTables(b64), f.name, rowIndex) : parseSheetBase64(b64, f.name, rowIndex);
				rowIndex = parsed.nextRowIndex;
				allRows.push(...parsed.rows);
				unmapped.push(...parsed.unmappedHeaders);
			}
			if (unmapped.length) toast.info(`${tx(L.extraCols)}: ${[...new Set(unmapped)].slice(0, 5).join(', ')}`);
			if (!allRows.length) { toast.error(tx(L.emptyFile)); setProgress(null); return; }
			const sourceFilename = files.map((f) => f.name).filter(Boolean).join(', ');
			if (sourceFilename) {
				try {
					await api.patch(E.FINAL_ROUND_BATCH_DETAIL(batch.id), { source_filename: sourceFilename });
					setBatch((b) => ({ ...b, source_filename: sourceFilename }));
				} catch {}
			}
			for (let i = 0; i < allRows.length; i += INGEST_CHUNK_SIZE) {
				setProgress({ label: tx(L.uploading), done: i, total: allRows.length });
				await api.post(E.FINAL_ROUND_BATCH_INGEST_ROWS(batch.id), { rows: allRows.slice(i, i + INGEST_CHUNK_SIZE), source_filename: sourceFilename }, { timeout: 120000 });
			}
			setProgress({ label: tx(L.uploading), done: allRows.length, total: allRows.length });
			await api.post(E.FINAL_ROUND_BATCH_ANALYZE(batch.id));
			setFiles([]);
			setPolling(true);
			setStep('review');
		} catch (err) {
			toast.error(err.response?.data?.detail || err.message || tx(L.parseFailed));
		}
		setProgress(null);
	};

	const refreshBatch = useCallback(async () => {
		if (!batch) return;
		try {
			const res = await api.get(E.FINAL_ROUND_BATCH_DETAIL(batch.id));
			setBatch(res.data);
			if (res.data.status === 'analyzed') setPolling(false);
			else if (res.data.status === 'analysis_failed') { setPolling(false); toast.error(res.data.error_message || tx(L.analysisFailed)); }
		} catch {}
	}, [batch?.id]);

	useEffect(() => {
		if (!polling) return;
		const t = setInterval(refreshBatch, 2000);
		return () => clearInterval(t);
	}, [polling, refreshBatch]);

	const fetchAllRows = async () => {
		const out = [];
		for (let page = 1; page <= 2000; page++) {
			const res = await api.get(E.FINAL_ROUND_ROWS, { params: { batch: batch.id, page, page_size: 100 } });
			if (Array.isArray(res.data)) { out.push(...res.data); break; }
			const chunk = res.data.results || [];
			out.push(...chunk);
			if (!res.data.next || !chunk.length || (typeof res.data.count === 'number' && out.length >= res.data.count)) break;
		}
		return out;
	};
	const toRecord = (r, i) => ({
		n: i + 1,
		name: r.raw_full_name || r.raw_data?.full_name || '',
		grade: r.grade || r.raw_data?.grade || '',
		subject: r.subject || r.raw_data?.subject || '',
		score: r.score ?? r.raw_data?.score ?? '',
		status: L[`st_${r.match_status}`] ? tx(L[`st_${r.match_status}`]) : r.match_status || '',
		confidence: r.match_confidence != null ? `${r.match_confidence}%` : '',
		matched: r.matched_user_info?.full_name || '',
		matchedId: r.matched_user_info?.participant_id || '',
		phone: r.matched_user_info?.phone || r.raw_data?.phone || '',
		confirmed: r.has_permission ? '✓ Ruxsat' : r.is_confirmed ? '✓' : '',
	});
	const headers = () => ['#', tx(L.colName), tx(L.colGrade), tx(L.colSubject), tx(L.colScore), tx(L.colStatus), 'Match', tx(L.colMatched), 'ID', tx(L.colPhone), tx(L.colConfirmed)];
	const KEYS = ['n', 'name', 'grade', 'subject', 'score', 'status', 'confidence', 'matched', 'matchedId', 'phone', 'confirmed'];

	const exportExcel = async () => {
		setExporting(true);
		try {
			const rows = await fetchAllRows();
			if (!rows.length) { toast.error(tx(L.noRows)); return; }
			const h = headers();
			const ws = XLSX.utils.aoa_to_sheet([h, ...rows.map(toRecord).map((r) => KEYS.map((k) => r[k]))]);
			ws['!cols'] = h.map((x, i) => ({ wch: Math.min(Math.max(String(x).length + 2, i === 1 || i === 7 ? 26 : 12), 40) }));
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'Final Round');
			await shareFile(XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }), `final_round_import_${batch.id}.xlsx`, XLSX_MIME);
		} catch {
			toast.error(tx(L.parseFailed));
		} finally {
			setExporting(false);
		}
	};

	const exportPdf = async () => {
		setExporting(true);
		try {
			const rows = await fetchAllRows();
			if (!rows.length) { toast.error(tx(L.noRows)); return; }
			const body = rows.map(toRecord).map((r) => `<tr>${KEYS.map((k) => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
			const stats = [[L.totalRows, batch.total_rows], [L.found, batch.found_count], [L.possible, batch.possible_count], [L.notFound, batch.not_found_count], [L.assigned, batch.permission_assigned_count]].map(([k, v]) => `${tx(k)}: ${v ?? 0}`).join(' · ');
			const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:842px 595px;margin:22px}body{font-family:Helvetica,Arial;color:#1f2937}h1{font-size:13px;margin:0 0 4px}p{font-size:9px;color:#5a5a5a;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:7.5px}th{background:#f3f4f6;text-align:left;padding:4px}td{padding:3px 4px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#fafafb}</style></head><body><h1>IRN Olympiads — Final Round import #${batch.id}</h1><p>${esc(olyTitle(batch.olympiad))}<br/>${esc(stats)}</p><table><thead><tr>${headers().map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`;
			await sharePdf(html, { width: 842, height: 595, fileName: `final_round_import_${batch.id}` });
		} catch {
			toast.error(tx(L.parseFailed));
		} finally {
			setExporting(false);
		}
	};

	const ExportBar = (
		<View style={{ flexDirection: 'row', gap: 8 }}>
			<Button style={{ flex: 1 }} size="sm" variant="light" icon={Download} title={tx(L.exportExcel)} loading={exporting} onPress={exportExcel} />
			<Button style={{ flex: 1 }} size="sm" variant="light" icon={FileText} title={tx(L.exportPdf)} loading={exporting} onPress={exportPdf} />
		</View>
	);

	const batchLabel = (b) => olyTitle(b.olympiad) || b.olympiad_title || b.source_filename || `Import #${b.id}`;

	return (
		<Screen header={<StackHeader onBack={step === 'upload' ? backFromUpload : step === 'review' || step === 'summary' ? () => { setStep('select'); setPolling(false); fetchBatches(olympiadId); } : undefined} />} onRefresh={step === 'select' ? () => fetchBatches(olympiadId) : step === 'review' ? refreshBatch : undefined} keyboard>
			<LargeTitle title={tx(L.title)} subtitle={tx(L.subtitle)} />

			{step === 'select' ? (
				<>
					<Card style={{ gap: 12, marginBottom: 14 }}>
						<SelectField label={tx(L.selectOlympiad)} title={tx(L.selectOlympiad)} value={olympiadId} placeholder={tx(L.choose)} options={olympiads.map((o) => ({ value: String(o.id), label: pick(o, 'title') }))} onChange={chooseOlympiad} />
						<T v="small">{tx(L.selectOlympiadHint)}</T>
						<Button icon={Upload} title={tx(L.startNew)} disabled={!olympiadId} onPress={createBatch} />
						<Button size="sm" variant="ghost" icon={Download} title={tx(L.template)} onPress={downloadTemplate} />
					</Card>

					{olympiadId ? (
						<>
							<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
								<T v="h3" style={{ flex: 1 }}>{tx(L.existing)}</T>
								{batches.length ? <Tap onPress={() => setConfirm({ all: true })}><T v="strong" color={colors.red} style={{ fontSize: 13 }}>{tx(L.deleteAll)}</T></Tap> : null}
							</View>
							{loadingBatches ? <ActivityIndicator color={colors.goldDeep} /> : !batches.length ? <T v="small">{tx(L.noExisting)}</T> : batches.map((b) => (
								<Card key={b.id} onPress={() => openBatch(b)} style={{ marginBottom: 10, padding: 14 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
										<View style={styles.fileIcon}><FileSpreadsheet size={18} color={colors.green} /></View>
										<View style={{ flex: 1 }}>
											{renaming?.id === b.id ? (
												<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
													<Field style={{ flex: 1 }} value={renaming.name} onChangeText={(v) => setRenaming((r) => ({ ...r, name: v }))} autoFocus onSubmitEditing={saveRename} />
													<Tap onPress={saveRename} style={[styles.act, { backgroundColor: colors.greenSoft }]}><Check size={15} color={colors.green} /></Tap>
													<Tap onPress={() => setRenaming(null)} style={[styles.act, { backgroundColor: colors.cardMuted }]}><X size={15} color={colors.muted} /></Tap>
												</View>
											) : (
												<>
													<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
														<T v="strong" style={{ flexShrink: 1 }} numberOfLines={1}>#{b.id} {batchLabel(b)}</T>
														<Tap onPress={() => setRenaming({ id: b.id, name: b.source_filename || batchLabel(b) })} hitSlop={8}><Edit2 size={13} color={colors.muted} /></Tap>
													</View>
													{b.source_filename && b.source_filename !== batchLabel(b) ? <T v="small" style={{ fontSize: 11.5 }} numberOfLines={1}>{b.source_filename}</T> : null}
												</>
											)}
										</View>
										<Tap onPress={() => setConfirm({ id: b.id })} style={[styles.act, { backgroundColor: colors.redSoft }]}><Trash2 size={15} color={colors.red} /></Tap>
									</View>
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
										<Pill label={b.status} />
										<T v="small" style={{ fontSize: 11.5 }}>{tx(L.rows)}: <T v="strong" style={{ fontSize: 11.5 }}>{b.total_rows}</T> · {tx(L.found)}: <T v="strong" style={{ fontSize: 11.5 }}>{b.found_count}</T> · {tx(L.permission)}: <T v="strong" style={{ fontSize: 11.5 }}>{b.permission_assigned_count}</T></T>
										<View style={{ flex: 1 }} />
										<T v="strong" color={colors.amber} style={{ fontSize: 12.5 }}>{tx(L.open)}</T>
										<ChevronRight size={14} color={colors.amber} />
									</View>
								</Card>
							))}
						</>
					) : null}
				</>
			) : null}

			{step === 'upload' && batch ? (
				<Card style={{ gap: 12 }}>
					<View style={styles.drop}>
						<Upload size={30} color={colors.amber} />
						<T v="h3" style={{ textAlign: 'center' }}>{tx(L.uploadTitle)}</T>
						<T v="small" style={{ textAlign: 'center' }}>{tx(L.uploadHint)}</T>
						<Button size="md" icon={Plus} title={files.length ? tx(L.addMore) : tx(L.chooseFiles)} onPress={addFiles} disabled={!!progress} style={{ alignSelf: 'stretch', marginTop: 6 }} />
					</View>
					{files.length ? (
						<>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
								<T v="strong">{files.length} ✓</T>
								<Tap onPress={() => setFiles([])}><T v="strong" color={colors.red} style={{ fontSize: 13 }}>{tx(L.clearAll)}</T></Tap>
							</View>
							{files.map((f, idx) => (
								<View key={`${f.name}-${idx}`} style={styles.fileRow}>
									{isPdf(f) ? <FileText size={17} color={colors.red} /> : <FileSpreadsheet size={17} color={colors.green} />}
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={1} style={{ fontSize: 13.5 }}>{f.name}</T>
										<T v="small" style={{ fontSize: 11 }}>{sizeLabel(f.size)}</T>
									</View>
									<Tap onPress={() => setFiles((p) => p.filter((_, i) => i !== idx))} hitSlop={8}><Trash2 size={15} color={colors.red} /></Tap>
								</View>
							))}
						</>
					) : null}
					{progress ? (
						<View style={{ gap: 6 }}>
							<T v="small" numberOfLines={1}>{progress.label}</T>
							<ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 0} />
						</View>
					) : null}
					<Button icon={Upload} title={`${tx(L.uploadAnalyze)}${files.length ? ` (${files.length})` : ''}`} loading={!!progress} disabled={!files.length} onPress={processFiles} />
				</Card>
			) : null}

			{step === 'review' && batch ? (
				polling ? (
					<Card style={{ alignItems: 'center', gap: 10, paddingVertical: 36 }}>
						<ActivityIndicator size="large" color={colors.goldDeep} />
						<T v="h3" style={{ textAlign: 'center' }}>{tx(L.analyzing)}</T>
						<T v="small" style={{ textAlign: 'center' }}>{tx(L.analyzingHint)}</T>
					</Card>
				) : (
					<>
						<Card style={{ gap: 10, marginBottom: 14 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<FileSpreadsheet size={18} color={colors.green} />
								<T v="strong" style={{ flex: 1 }} numberOfLines={2}>{batchLabel(batch)}</T>
								<Pill label={`#${batch.id}`} />
							</View>
							{batch.source_filename && batch.source_filename !== batchLabel(batch) ? <T v="small" numberOfLines={1}>{batch.source_filename}</T> : null}
							<View style={styles.stats}>
								{[[L.totalRows, batch.total_rows, colors.ink], [L.found, batch.found_count, colors.green], [L.possible, batch.possible_count, colors.blue], [L.assigned, batch.permission_assigned_count, colors.amber]].map(([k, v, c]) => (
									<View key={k.en} style={styles.stat}><T style={{ fontFamily: fonts.extrabold, fontSize: 18, color: c }}>{v ?? 0}</T><T v="label" style={{ fontSize: 9 }} numberOfLines={1}>{tx(k)}</T></View>
								))}
							</View>
							<View style={{ flexDirection: 'row', gap: 8 }}>
								<Button style={{ flex: 1 }} size="sm" variant="light" icon={RefreshCw} title={tx(L.refresh)} onPress={refreshBatch} />
								<Button style={{ flex: 1 }} size="sm" variant="light" icon={Plus} title={tx(L.addFiles)} onPress={() => setStep('upload')} />
								<Tap onPress={() => setConfirm({ id: batch.id })} style={[styles.act, { backgroundColor: colors.redSoft, width: 40, height: 40, borderRadius: 20 }]}><Trash2 size={16} color={colors.red} /></Tap>
							</View>
							{ExportBar}
							<Button size="sm" variant="dark" icon={CheckCircle2} title={tx(L.summary)} onPress={() => setStep('summary')} />
						</Card>
						<RowReview batch={batch} onBatchUpdate={setBatch} />
					</>
				)
			) : null}

			{step === 'summary' && batch ? (
				<Card style={{ gap: 12 }}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
						<CheckCircle2 size={24} color={colors.green} />
						<View style={{ flex: 1 }}>
							<T v="h3">{tx(L.summary)}</T>
							<T v="small" numberOfLines={2}>{olyTitle(batch.olympiad)}</T>
						</View>
					</View>
					{[[L.totalRows, batch.total_rows, colors.ink], [L.found, batch.found_count, colors.green], [L.possible, batch.possible_count, colors.blue], [L.notFound, batch.not_found_count, colors.muted], [L.assigned, batch.permission_assigned_count, colors.amber]].map(([k, v, c]) => (
						<View key={k.en} style={styles.sumRow}><T v="body" style={{ flex: 1 }}>{tx(k)}</T><T style={{ fontFamily: fonts.extrabold, fontSize: 18, color: c }}>{v ?? 0}</T></View>
					))}
					{ExportBar}
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<Button style={{ flex: 1 }} size="md" variant="light" icon={ArrowLeft} title={tx(L.backToReview)} onPress={() => setStep('review')} />
						<Button style={{ flex: 1 }} size="md" icon={Plus} title={tx(L.newImport)} onPress={() => { setBatch(null); setOlympiadId(''); setBatches([]); setStep('select'); }} />
					</View>
				</Card>
			) : null}

			<Dialog
				visible={!!confirm}
				onClose={() => !deleting && setConfirm(null)}
				icon={Trash2}
				tone="red"
				title={tx(confirm?.all ? L.confirmDeleteAllTitle : L.confirmDeleteTitle)}
				message={confirm?.all ? tx(L.confirmDeleteAllText) : `#${confirm?.id}`}
				actions={[{ title: tx(L.yesDelete), variant: 'danger', loading: deleting, onPress: executeDelete }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setConfirm(null) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	fileIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
	act: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	drop: { alignItems: 'center', gap: 8, padding: 18, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, backgroundColor: colors.goldTint },
	fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	stats: { flexDirection: 'row', gap: 6 },
	stat: { flex: 1, alignItems: 'center', padding: 8, borderRadius: radius.md, backgroundColor: colors.cardMuted },
	sumRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
