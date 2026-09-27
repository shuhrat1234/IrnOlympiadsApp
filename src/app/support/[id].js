import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckCheck, CheckCircle2, Copy, Eye, EyeOff, Headset, ImagePlus, Info, Lock, Pencil, Send, Trash2, User, X } from 'lucide-react-native';
import api, { mediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSupport } from '../../context/SupportContext';
import { useToast } from '../../context/ToastContext';
import { Canvas, StackHeader } from '../../components/layout';
import { Button, Dialog, IconButton, Loader, Pill, Sheet, T, Tap } from '../../components/ui';
import { pickImage, ticketStatus } from '../../components/support';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatShortDate, formatTime } from '../../utils/format';

const STAFF = ['admin', 'superadmin', 'coordinator'];

const SL = {
	markResolved: { uz: 'Yopilgan deb belgilash', ru: 'Отметить как решено', en: 'Mark resolved' },
	resolvedOk: { uz: 'Murojaat yopildi', ru: 'Обращение закрыто', en: 'Ticket resolved' },
	resolveErr: { uz: "Yopib bo'lmadi", ru: 'Не удалось закрыть', en: 'Failed to resolve' },
	details: { uz: 'Murojaat tafsilotlari', ru: 'Детали тикета', en: 'Ticket details' },
	requestedBy: { uz: 'Kim tomonidan', ru: 'Запросил', en: 'Requested by' },
	userId: { uz: 'Foydalanuvchi ID', ru: 'ID пользователя', en: 'User ID' },
	date: { uz: 'Sana', ru: 'Дата', en: 'Date' },
	personalInfo: { uz: "Shaxsiy ma'lumotlar", ru: 'Личная информация', en: 'Personal information' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	region: { uz: 'Viloyat', ru: 'Регион', en: 'Region' },
	school: { uz: 'Maktab', ru: 'Школа', en: 'School' },
	grade: { uz: 'Sinf', ru: 'Класс', en: 'Grade' },
	birthDate: { uz: "Tug'ilgan sana", ru: 'Дата рождения', en: 'Birth date' },
	teacherName: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' },
	teacherPhone: { uz: "O'qituvchi telefoni", ru: 'Телефон учителя', en: 'Teacher phone' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
	quick: { uz: 'Tezkor javob', ru: 'Быстрый ответ', en: 'Quick reply' },
};
// "May I close this ticket?" preset, in all three languages (website recMsg).
const REC_MSG = {
	uz: "Ushbu murojaatni yopsam bo'ladimi? Boshqa mavzu bo'yicha qo'shimcha savollaringiz bo'lsa, yangi tiket ochishingiz mumkin.",
	ru: 'Могу ли я закрыть данное обращение? В случае возникновения дополнительных вопросов по другой теме, вы можете открыть новый тикет.',
	en: 'Can I close this inquiry? If you have additional questions on another topic, you can open a new ticket.',
};

const Bubble = ({ mine, author, text, img, time, onLongPress, onImage, staffView }) => (
	<Animated.View entering={FadeInUp.duration(250)} style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : null]}>
		{!mine ? <View style={styles.agent}>{staffView ? <User size={15} color={colors.navy} /> : <Headset size={15} color={colors.navy} />}</View> : null}
		<Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
			{!mine ? <T v="label" style={{ fontSize: 9.5, marginBottom: 4 }} color={colors.navy}>{author}</T> : null}
			{text ? <T style={[styles.msg, mine && { color: colors.navyDeep }]}>{text}</T> : null}
			{img ? (
				<Pressable onPress={() => onImage(mediaUrl(img))}>
					<Image source={{ uri: mediaUrl(img) }} style={styles.msgImg} resizeMode="cover" />
				</Pressable>
			) : null}
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 }}>
				<T v="small" style={{ fontSize: 10.5 }} color={mine ? 'rgba(12,26,54,0.55)' : colors.faint}>{time}</T>
				{mine ? <CheckCheck size={12} color="rgba(12,26,54,0.55)" /> : null}
			</View>
		</Pressable>
	</Animated.View>
);

export default function TicketChat() {
	const { id } = useLocalSearchParams();
	const insets = useSafeAreaInsets();
	const { currentUser, regions } = useAuth();
	const { t, tx, lang, pick } = useLanguage();
	const toast = useToast();
	const { tickets, fetchTickets, addReply, deleteReply, resolveTicket, markTicketAsRead, setViewingSupport, isStaff } = useSupport();
	const [infoOpen, setInfoOpen] = useState(false);
	const [ticketUser, setTicketUser] = useState(null);
	const [showPassword, setShowPassword] = useState(false);
	const [resolving, setResolving] = useState(false);
	const ticket = tickets.find((x) => String(x.id) === String(id));
	const [message, setMessage] = useState('');
	const [image, setImage] = useState(null);
	const [sending, setSending] = useState(false);
	const [menu, setMenu] = useState(null);
	const [confirmDelete, setConfirmDelete] = useState(null);
	const [lightbox, setLightbox] = useState(null);
	const scrollRef = useRef(null);

	useEffect(() => {
		setViewingSupport(true);
		fetchTickets();
		const poll = setInterval(fetchTickets, 20000);
		return () => {
			clearInterval(poll);
			setViewingSupport(false);
		};
	}, []);

	useEffect(() => {
		if (ticket) markTicketAsRead(ticket.id);
	}, [ticket?.updated_at]);

	useEffect(() => {
		if (!isStaff || !ticket?.user) return;
		api.get(`users/${ticket.user}/`).then((res) => setTicketUser(res.data)).catch(() => {});
	}, [isStaff, ticket?.user]);

	if (!ticket) return <Canvas><StackHeader /><Loader /></Canvas>;

	const closed = ticket.status === 'resolved' && !isStaff;
	const isMine = (role, userId) => (isStaff ? STAFF.includes(role) : userId === currentUser?.id);

	const resolve = async () => {
		setResolving(true);
		try {
			await resolveTicket(ticket.id);
			toast.success(tx(SL.resolvedOk));
		} catch {
			toast.error(tx(SL.resolveErr));
		}
		setResolving(false);
	};
	const st = ticketStatus(ticket.status, t);

	const send = async () => {
		if ((!message.trim() && !image) || closed) return;
		setSending(true);
		try {
			await addReply(ticket.id, message.trim(), image);
			setMessage('');
			setImage(null);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
		} catch {
			toast.error(t('failedToSendMessage'));
		}
		setSending(false);
	};

	const attach = async () => {
		try {
			const img = await pickImage();
			if (img) setImage(img);
		} catch {
			toast.error(t('photoPermission'));
		}
	};

	return (
		<Canvas>
			<StackHeader
				title={ticket.subject}
				subtitle={isStaff ? `#${ticket.id} · ${ticket.user_full_name || ''}` : `#${ticket.id} · ${st.label}`}
				right={isStaff ? <IconButton icon={Info} onPress={() => setInfoOpen(true)} /> : <Pill label={st.label} color={st.color} bg={st.bg} dot />}
			/>
			{isStaff && ticket.status !== 'resolved' ? (
				<View style={styles.staffBar}>
					<Pill label={st.label} color={st.color} bg={st.bg} dot />
					<View style={{ flex: 1 }} />
					<Button size="sm" variant="success" icon={CheckCircle2} title={tx(SL.markResolved)} loading={resolving} onPress={resolve} />
				</View>
			) : null}
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
				<ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} keyboardDismissMode="interactive">
					<T v="small" style={{ textAlign: 'center', marginBottom: 6 }}>{formatShortDate(ticket.created_at, lang)}</T>
					<Bubble mine={!isStaff} staffView={isStaff} author={ticket.user_full_name} text={ticket.message} img={ticket.image} time={formatTime(ticket.created_at)} onImage={setLightbox} />
					{(ticket.replies || []).map((r) => {
						const mine = isMine(r.user_role, r.user);
						const own = r.user === currentUser?.id;
						return (
							<Bubble
								key={r.id}
								mine={mine}
								staffView={isStaff}
								author={STAFF.includes(r.user_role) ? t('supportAgent') : r.user_full_name}
								text={r.message}
								img={r.image}
								time={formatTime(r.created_at)}
								onImage={setLightbox}
								onLongPress={own || isStaff ? () => { Haptics.selectionAsync().catch(() => {}); setMenu(r); } : undefined}
							/>
						);
					})}
				</ScrollView>

				{closed ? (
					<View style={[styles.closed, { paddingBottom: insets.bottom + 14 }]}>
						<Lock size={16} color={colors.muted} />
						<T v="small" style={{ flex: 1 }}>{t('ticketClosedNote')}</T>
					</View>
				) : (
					<View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
						{isStaff && ticket.status !== 'resolved' ? (
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
								{['uz', 'ru', 'en'].map((code) => (
									<Tap key={code} onPress={() => setMessage(REC_MSG[code])} style={styles.preset}>
										<T style={styles.presetText} numberOfLines={1}>{code.toUpperCase()}: {REC_MSG[code].slice(0, 22)}…</T>
									</Tap>
								))}
							</ScrollView>
						) : null}
						{image ? (
							<View style={styles.attachPreview}>
								<Image source={{ uri: image.uri }} style={{ width: 44, height: 44, borderRadius: 10 }} />
								<T v="small" numberOfLines={1} style={{ flex: 1 }}>{image.name}</T>
								<Tap onPress={() => setImage(null)}><X size={18} color={colors.red} /></Tap>
							</View>
						) : null}
						<View style={styles.inputRow}>
							<Tap onPress={attach} style={styles.roundBtn}><ImagePlus size={20} color={colors.muted} /></Tap>
							<TextInput value={message} onChangeText={setMessage} placeholder={t('replyPlaceholder')} placeholderTextColor={colors.faint} multiline style={styles.input} />
							<Tap onPress={send} disabled={sending || (!message.trim() && !image)} style={[styles.roundBtn, styles.sendBtn, (sending || (!message.trim() && !image)) && { opacity: 0.5 }]}>
								<Send size={18} color={colors.navyDeep} />
							</Tap>
						</View>
					</View>
				)}
			</KeyboardAvoidingView>

			<Sheet visible={!!menu} onClose={() => setMenu(null)} title={t('message')}>
				<View style={{ gap: 10 }}>
					{menu?.message ? (
						<Tap onPress={async () => { await Clipboard.setStringAsync(menu.message); setMenu(null); toast.success(t('copied')); }} style={styles.menuItem}>
							<Copy size={18} color={colors.ink2} /><T v="strong">{t('copy')}</T>
						</Tap>
					) : null}
					<Tap onPress={() => { setConfirmDelete(menu); setMenu(null); }} style={[styles.menuItem, { backgroundColor: colors.redSoft }]}>
						<Trash2 size={18} color={colors.red} /><T v="strong" color={colors.red}>{t('delete')}</T>
					</Tap>
				</View>
			</Sheet>

			<Dialog
				visible={!!confirmDelete}
				onClose={() => setConfirmDelete(null)}
				icon={Trash2}
				tone="red"
				title={t('confirmDeleteMsg')}
				message={t('deleteInfo')}
				actions={[
					{
						title: t('delete'),
						variant: 'danger',
						onPress: async () => {
							const r = confirmDelete;
							setConfirmDelete(null);
							try {
								await deleteReply(r.id);
								toast.success(t('messageDeleted'));
							} catch {
								toast.error(t('error'));
							}
						},
					},
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirmDelete(null) },
				]}
			/>

			{isStaff ? (
				<Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title={tx(SL.details)} scroll maxHeight="90%">
					<View style={{ gap: 2, paddingBottom: 10 }}>
						{[[SL.requestedBy, ticket.user_full_name], [SL.userId, ticket.user_participant_id || `USR-${ticket.user}`], [SL.date, new Date(ticket.created_at).toLocaleString()]].map(([k, v]) => (
							<View key={k.en} style={styles.infoRow}><T v="small" style={{ width: 130 }}>{tx(k)}</T><T v="strong" style={{ flex: 1, fontSize: 14 }} selectable>{v || '—'}</T></View>
						))}
						{ticketUser ? (
							<>
								<T v="label" style={{ marginTop: 14, marginBottom: 4 }}>{tx(SL.personalInfo)}</T>
								{[
									[SL.lastName, ticketUser.last_name], [SL.firstName, ticketUser.first_name], [SL.middleName, ticketUser.middle_name],
									[SL.phone, ticketUser.phone], [SL.region, pick(regions.find((r) => r.id === parseInt(ticketUser.region, 10)), 'name')],
									[SL.school, ticketUser.school], [SL.grade, ticketUser.grade], [SL.birthDate, ticketUser.birth_date],
									[SL.teacherName, ticketUser.teacher_name], [SL.teacherPhone, ticketUser.teacher_phone],
								].map(([k, v]) => (
									<View key={k.en} style={styles.infoRow}><T v="small" style={{ width: 130 }}>{tx(k)}</T><T v="strong" style={{ flex: 1, fontSize: 14 }} selectable>{v || '—'}</T></View>
								))}
								<View style={styles.infoRow}>
									<T v="small" style={{ width: 130 }}>{tx(SL.password)}</T>
									<T v="strong" style={{ flex: 1, fontSize: 14 }} selectable>{showPassword ? ticketUser.password_text || '—' : '••••••••'}</T>
									{ticketUser.password_text ? <Tap onPress={() => setShowPassword((v) => !v)} hitSlop={8}>{showPassword ? <EyeOff size={16} color={colors.amber} /> : <Eye size={16} color={colors.muted} />}</Tap> : null}
								</View>
								<Button size="md" icon={Pencil} title={tx(SL.edit)} style={{ marginTop: 14 }} onPress={() => { setInfoOpen(false); router.push(`/admin/user/${ticketUser.id}`); }} />
							</>
						) : null}
					</View>
				</Sheet>
			) : null}

			<Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
				<Pressable style={styles.lightbox} onPress={() => setLightbox(null)}>
					{lightbox ? <Image source={{ uri: lightbox }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
				</Pressable>
			</Modal>
		</Canvas>
	);
}

const styles = StyleSheet.create({
	bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
	agent: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
	bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
	mine: { backgroundColor: colors.gold, borderBottomRightRadius: 6 },
	theirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.line, ...shadow(1) },
	msg: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
	msgImg: { width: 220, height: 160, borderRadius: 14, marginTop: 6 },
	closed: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 14, backgroundColor: colors.cardMuted, borderTopWidth: 1, borderTopColor: colors.line },
	composer: { paddingHorizontal: 12, paddingTop: 10, backgroundColor: 'rgba(255,249,238,0.98)', borderTopWidth: 1, borderTopColor: colors.line, gap: 8 },
	attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
	input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
	roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
	sendBtn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	staffBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
	preset: { paddingHorizontal: 12, height: 30, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', maxWidth: 240 },
	presetText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 },
	infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
	menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	lightbox: { flex: 1, backgroundColor: 'rgba(5,10,24,0.95)', alignItems: 'center', justifyContent: 'center', padding: 12 },
});
