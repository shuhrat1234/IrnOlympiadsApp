import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as XLSX from 'xlsx';

// Pick any document. Returns { uri, name, mimeType, size, base64() } or null.
export const pickDocument = async (types = '*/*') => {
	const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
	if (res.canceled || !res.assets?.length) return null;
	const a = res.assets[0];
	return { uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, base64: () => new File(a.uri).base64() };
};

// Pick a gallery image; returns { uri, name, mimeType, width, height, base64 }.
export const pickImage = async ({ base64 = false, quality = 0.8 } = {}) => {
	const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
	if (!perm.granted) throw new Error('denied');
	const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality, base64 });
	if (res.canceled || !res.assets?.length) return null;
	const a = res.assets[0];
	return { uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', width: a.width, height: a.height, base64: a.base64 };
};

// Pick several documents at once (bulk import accepts multiple Excel/CSV/PDF files).
export const pickDocuments = async (types = '*/*') => {
	const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: true });
	if (res.canceled || !res.assets?.length) return [];
	return res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, base64: () => new File(a.uri).base64() }));
};

export const isPdf = (f) => /pdf/i.test(f?.mimeType || '') || /\.pdf$/i.test(f?.name || '');
export const isSheet = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '') || /sheet|excel|csv/i.test(f?.mimeType || '');

// Read the first sheet of an Excel/CSV file into an array of row arrays.
export const readSheetRows = async (file) => {
	const b64 = await file.base64();
	const wb = XLSX.read(b64, { type: 'base64' });
	const ws = wb.Sheets[wb.SheetNames[0]];
	return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
};

export const safeFileName = (s) => String(s || 'file').replace(/[\s/\\:*?"<>|]+/g, '_').slice(0, 80);

// Binary API responses (axios responseType 'arraybuffer') → base64 for shareFile.
export const bufferToBase64 = (buffer) => {
	const bytes = new Uint8Array(buffer);
	let bin = '';
	for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	return btoa(bin);
};

// Write base64 (or utf8 text) into cache and open the share sheet.
export const shareFile = async (content, fileName, mimeType, { encoding = 'base64' } = {}) => {
	const file = new File(Paths.cache, safeFileName(fileName));
	if (file.exists) file.delete();
	file.create();
	if (encoding === 'base64') {
		const bin = atob(content);
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		file.write(bytes);
	} else {
		file.write(content);
	}
	if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
	return file.uri;
};

// rows: array of objects → .xlsx shared via the system sheet (website's XLSX.writeFile).
export const shareExcel = async (rows, fileName, sheetName = 'Sheet1') => {
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
	const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
	return shareFile(b64, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};
