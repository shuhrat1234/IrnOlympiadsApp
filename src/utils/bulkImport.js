import * as XLSX from 'xlsx';

// Spreadsheet → final-round rows; same heuristics as the website's BulkParticipantImportPage.

export const mapHeaderToField = (header) => {
	if (!header) return null;
	const normalized = String(header).trim().toLowerCase().replace(/[‘’ʻʼ`]/g, "'");
	const stripped = normalized.replace(/[^a-z0-9а-яёўқғҳ]/gi, '');
	if (/(phone|tel|telefon|aloqa|bog'lanish|mobil|номер тел)/i.test(normalized)) return 'phone';
	if (/(ball|балл|score|ochko|points|natija|natijasi|очки|результат|result)/i.test(normalized)) return 'score';
	if (/(correct\s*answers?|to'g'ri\s*javoblar?|правильные\s*ответы)/i.test(normalized)) return 'correct_answers';
	if (
		stripped.includes('fish') || stripped.includes('fio') || stripped.includes('фио') ||
		/(full\s*name|fullname|f\.?i\.?sh|f\.?i\.?o|ф\.?и\.?о|ism\s*sharif|ism\s*familiya|familiya\s*ism|участник|ученик|talaba|o'quvchi|oquvchi|fio)/i.test(normalized)
	) return 'full_name';
	if (/^(ism|first\s*name|имя)$/i.test(normalized.trim())) return 'first_name';
	if (/^(familiya|last\s*name|фамилия)$/i.test(normalized.trim())) return 'last_name';
	if (/^(middle\s*name|sharif|otasi|otasining\s*ismi|отчество)$/i.test(normalized.trim())) return 'middle_name';
	if (/(grade|sinf|класс|синф|class|bosqich)/i.test(normalized)) return 'grade';
	if (/(subject|predmet|предмет|fan|fani|kurs|yo'nalish|yonalish|дисциплин)/i.test(normalized)) return 'subject';
	if (/(region|viloyat|hudud|shahar|город|область|регион|вилоят)/i.test(normalized)) return 'region';
	if (/(school|maktab|muassasa|litsey|lyceum|школа|лицей)/i.test(normalized)) return 'school';
	if (/(student.?id|participant.?id|user.?id|\bid\b|\bид\b|\bkod\b|айди)/i.test(normalized)) return 'student_id';
	if (/(award|mukofot|награда|medal|медаль)/i.test(normalized)) return 'award';
	if (/(questions?|savollar?|вопросы)/i.test(normalized)) return 'questions_count';
	if (/(status|holat|статус|состояни)/i.test(normalized)) return 'status';
	return null;
};

const filled = (c) => c !== undefined && c !== null && String(c).trim() !== '';

const bestHeaderIndex = (raw, maxScan) => {
	let idx = 0;
	let best = 0;
	for (let i = 0; i < Math.min(raw.length, maxScan); i++) {
		const row = raw[i];
		if (!Array.isArray(row)) continue;
		const matches = row.filter((c) => filled(c) && mapHeaderToField(c)).length;
		if (matches > best) { best = matches; idx = i; }
	}
	return { idx, matches: best };
};

export const findBestSheetAndHeader = (workbook) => {
	let result = { headerRowIndex: 0, raw: [] };
	let bestScore = -1;
	for (const name of workbook.SheetNames) {
		const sheet = workbook.Sheets[name];
		if (!sheet) continue;
		const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
		if (!raw?.length) continue;
		const { idx, matches } = bestHeaderIndex(raw, 25);
		const dataRows = raw.slice(idx + 1).filter((r) => Array.isArray(r) && r.some(filled)).length;
		const score = matches * 1000 + dataRows;
		if (score > bestScore) { bestScore = score; result = { headerRowIndex: idx, raw }; }
	}
	return result;
};

export const autoDetectColumnsFromData = (dataRows, fieldByColumn) => {
	const updated = [...fieldByColumn];
	const sample = dataRows.slice(0, 15);
	if (!sample.length) return updated;
	const maxCols = Math.max(...sample.map((r) => r.length));
	for (let c = 0; c < maxCols; c++) {
		if (updated[c]) continue;
		let phone = 0, grade = 0, name = 0, score = 0, award = 0, valid = 0;
		sample.forEach((row) => {
			const val = row[c];
			if (!filled(val)) return;
			valid++;
			const s = String(val).trim();
			const digits = s.replace(/\D/g, '');
			if (digits.length >= 9 && digits.length <= 13 && (s.startsWith('+') || s.startsWith('998') || s.startsWith('9') || digits.length === 9)) phone++;
			else if (/^(?:[1-9]|1[0-1])(?:\s*-?\s*sinf|\s*-?\s*класс)?$/i.test(s)) grade++;
			else if (/^(gold|silver|bronze|oltin|kumush|bronza|золото|серебро|бронза)$/i.test(s)) award++;
			else if (/^\d+(?:[.,]\d+)?$/.test(s) && parseFloat(s.replace(',', '.')) >= 0 && parseFloat(s.replace(',', '.')) <= 100) score++;
			else {
				const words = s.split(/\s+/).filter((w) => w.length >= 2);
				if (words.length >= 2 && words.length <= 6 && !/[\d@=><\/\\]/.test(s)) name++;
			}
		});
		if (!valid) continue;
		if (!updated.includes('full_name') && name >= Math.max(1, valid * 0.4)) updated[c] = 'full_name';
		else if (!updated.includes('phone') && phone >= Math.max(1, valid * 0.5)) updated[c] = 'phone';
		else if (!updated.includes('award') && award >= Math.max(1, valid * 0.3)) updated[c] = 'award';
		else if (!updated.includes('grade') && grade >= Math.max(1, valid * 0.5)) updated[c] = 'grade';
		else if (!updated.includes('score') && score >= Math.max(1, valid * 0.5)) updated[c] = 'score';
	}
	if (!updated.includes('full_name')) {
		for (let c = 0; c < maxCols; c++) {
			if (!updated[c] && sample.some((r) => typeof r[c] === 'string' && r[c].trim().length > 3 && !/^\d+$/.test(r[c].trim()))) {
				updated[c] = 'full_name';
				break;
			}
		}
	}
	return updated;
};

const cleanPhone = (val) => {
	if (!filled(val)) return '';
	const s = String(val).trim();
	return s.endsWith('.0') ? s.slice(0, -2) : s;
};
const cleanScore = (val) => {
	if (!filled(val)) return null;
	const s = String(val).trim().replace(',', '.');
	const n = parseFloat(s);
	return isNaN(n) ? s : n;
};

// Excel/CSV bytes (base64) or PDF table rows → { rows, unmappedHeaders, nextRowIndex }
export const tableToRows = ({ raw, headerRowIndex, fileName, startRowIndex }) => {
	if (!raw?.length) return { rows: [], unmappedHeaders: [], nextRowIndex: startRowIndex };
	const headerRow = raw[headerRowIndex] || [];
	const dataRows = raw.slice(headerRowIndex + 1);
	const fieldByColumn = autoDetectColumnsFromData(dataRows, headerRow.map(mapHeaderToField));
	const unmappedHeaders = headerRow.filter((h, i) => h !== undefined && h !== '' && !fieldByColumn[i]);
	let idx = startRowIndex;
	const rows = dataRows
		.filter((cells) => Array.isArray(cells) && cells.some(filled))
		.map((cells) => {
			const data = { _file: fileName };
			fieldByColumn.forEach((field, col) => {
				const value = cells[col];
				if (value === undefined || value === null || value === '') return;
				let v = typeof value === 'string' ? value.trim() : value instanceof Date ? value.toISOString().slice(0, 10) : value;
				if (field === 'phone') v = cleanPhone(v);
				if (field === 'score') v = cleanScore(v);
				data[field || String(headerRow[col] || `col_${col}`)] = v;
			});
			if (!data.award && data.status && /(gold|silver|bronze|oltin|kumush|bronza|золот|серебр|бронз)/i.test(String(data.status))) data.award = String(data.status).trim();
			if (!data.full_name && (data.last_name || data.first_name || data.middle_name)) {
				data.full_name = [data.last_name, data.first_name, data.middle_name].filter(Boolean).join(' ').trim();
			}
			if (!data.full_name) {
				for (let c = 0; c < cells.length; c++) {
					const v = String(cells[c] || '').trim();
					if (v.length > 3 && !/^\d+$/.test(v) && !fieldByColumn[c]) { data.full_name = v; break; }
				}
			}
			return { row_index: idx++, raw_data: data };
		})
		.filter((r) => {
			const fn = String(r.raw_data.full_name || '').toLowerCase();
			if (['last name first name', 'fio', 'full name', 'ism familiya'].includes(fn)) return false;
			return r.raw_data.full_name || Object.keys(r.raw_data).length > 1;
		});
	return { rows, unmappedHeaders, nextRowIndex: idx };
};

export const parseSheetBase64 = (b64, fileName, startRowIndex) => {
	const wb = XLSX.read(b64, { type: 'base64', cellDates: true });
	if (!wb.SheetNames?.length) return { rows: [], unmappedHeaders: [], nextRowIndex: startRowIndex };
	const { raw, headerRowIndex } = findBestSheetAndHeader(wb);
	return tableToRows({ raw, headerRowIndex, fileName, startRowIndex });
};

export const parsePdfTable = (raw, fileName, startRowIndex) => {
	if (!raw?.length) return { rows: [], unmappedHeaders: [], nextRowIndex: startRowIndex };
	return tableToRows({ raw, headerRowIndex: bestHeaderIndex(raw, 10).idx, fileName, startRowIndex });
};

export const templateWorkbookBase64 = () => {
	const headers = ['Full Name', 'Grade', 'Subject', 'Region', 'School', 'Phone Number', 'Student ID', 'Score', 'Status'];
	const sample = ["Aliyev Vali G'anisher o'g'li", '5', 'Matematika', 'Toshkent sh.', '12-maktab', '+998901234567', 'ID-100234', '85.5', 'Qabul qilindi'];
	const wb = XLSX.utils.book_new();
	const sheet = XLSX.utils.aoa_to_sheet([headers, sample]);
	sheet['!cols'] = [30, 10, 18, 18, 22, 18, 14, 10, 16].map((wch) => ({ wch }));
	XLSX.utils.book_append_sheet(wb, sheet, 'Ishtirokchilar');
	return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
};
