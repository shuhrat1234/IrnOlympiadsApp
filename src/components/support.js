import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme';

export const ticketStatus = (status, t) =>
	({
		open: { label: t('ticketOpen'), color: colors.blue, bg: colors.blueSoft },
		in_progress: { label: t('ticketInProgress'), color: colors.amber, bg: colors.goldTint },
		resolved: { label: t('ticketResolved'), color: colors.muted, bg: colors.cardMuted },
	})[status] || { label: status, color: colors.blue, bg: colors.blueSoft };

// Returns { uri, name, mimeType } or null.
export const pickImage = async () => {
	const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
	if (res.canceled || !res.assets?.length) return null;
	const a = res.assets[0];
	return { uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg' };
};
