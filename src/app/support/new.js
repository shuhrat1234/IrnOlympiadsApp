import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ImagePlus, Send, X } from 'lucide-react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Field, T, Tap } from '../../components/ui';
import { pickImage } from '../../components/support';
import { colors, radius } from '../../theme';

export default function NewTicket() {
	const { t } = useLanguage();
	const { createTicket } = useSupport();
	const toast = useToast();
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [image, setImage] = useState(null);
	const [sending, setSending] = useState(false);

	const canSend = subject.trim() && (message.trim() || image);

	const attach = async () => {
		try {
			const img = await pickImage();
			if (img) setImage(img);
		} catch {
			toast.error(t('photoPermission'));
		}
	};

	const submit = async () => {
		if (!canSend) return;
		setSending(true);
		try {
			const ticket = await createTicket({ subject: subject.trim(), message: message.trim() }, image);
			toast.success(t('ticketSent'));
			router.replace(`/support/${ticket.id}`);
		} catch {
			toast.error(t('failedToCreateTicket'));
			setSending(false);
		}
	};

	return (
		<Screen header={<StackHeader />} keyboard>
			<LargeTitle title={t('newTicket')} subtitle={t('supportNotice')} />
			<View style={{ gap: 14 }}>
				<Field label={t('subject')} value={subject} onChangeText={setSubject} placeholder={t('subjectPlaceholder')} />
				<Field label={t('message')} value={message} onChangeText={setMessage} placeholder={t('messagePlaceholder')} multiline textAlignVertical="top" inputStyle={{ minHeight: 140, paddingTop: 14 }} />
				{image ? (
					<View style={styles.preview}>
						<Image source={{ uri: image.uri }} style={{ width: 64, height: 64, borderRadius: 12 }} />
						<T v="small" numberOfLines={1} style={{ flex: 1 }}>{image.name}</T>
						<Tap onPress={() => setImage(null)} style={styles.remove}><X size={16} color={colors.red} /></Tap>
					</View>
				) : (
					<Tap onPress={attach} style={styles.attach}>
						<ImagePlus size={20} color={colors.amber} />
						<T v="strong" color={colors.amber}>{t('attachImage')}</T>
					</Tap>
				)}
				<Button title={t('send')} icon={Send} onPress={submit} loading={sending} disabled={!canSend} style={{ marginTop: 6 }} />
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	attach: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, backgroundColor: colors.goldTint },
	preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	remove: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
});
