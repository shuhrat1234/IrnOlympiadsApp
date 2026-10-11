import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export const safeFileName = (s) => String(s || 'file').replace(/[\s/\\:*?"<>|]+/g, '_').slice(0, 80);

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
