import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AlertTriangle, CheckCircle, CreditCard, Info, Search, Send, Trophy, User, UserCheck, Users } from 'lucide-react-native';
import api from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader, LargeTitle } from '../../components/layout';
import { Button, Card, Dialog, Field, Pill, T, Tap } from '../../components/ui';
import { FormSection, TextArea } from '../../components/form';
import { colors, fonts, radius } from '../../theme';
import { formatShortDate } from '../../utils/format';

const LABELS = {
	uz: {
		title: 'Bildirishnomalar', subtitle: 'Foydalanuvchilarga bildirishnomalar va xabarlar yuborish',
		sendTo: 'Kimga', targetDesc: 'Auditoriyani tanlang', allUsers: 'Barcha foydalanuvchilar', specificUser: 'Foydalanuvchilarni tanlash',
		participants: 'Ishtirokchilar', finishers: 'Tugatganlar', selectOly: 'Olimpiadani tanlang', searchPlaceholder: 'Ism yoki ID...',
		selectedCount: 'tanlandi', notifType: 'Turi', notifTitle: 'Sarlavha', notifMessage: 'Xabar', send: 'Yuborish',
		successMsg: 'Muvaffaqiyatli yuborildi!', info: "Ma'lumot", success: 'Muvaffaqiyat', warning: 'Ogohlantirish', payment: "To'lov",
		content: 'Xabar mazmuni', contentDesc: "Xabarni 3 ta tilda to'ldiring", nothingFound: 'Hech narsa topilmadi',
		errorSelectUser: 'Foydalanuvchilarni tanlang', errorSelectOly: 'Olimpiadani tanlang', errorSend: 'Xatolik yuz berdi',
		fillBoth: 'Sarlavha va xabar matnini kiriting', recipients: 'Qabul qiluvchilar',
		confirmTitle: 'Yuborishni tasdiqlash', confirmMsg: 'Siz haqiqatdan ham ushbu bildirishnomani yubormoqchimisiz?', cancel: 'Bekor qilish',
	},
	ru: {
		title: 'Уведомления', subtitle: 'Отправка уведомлений и рассылка сообщений пользователям',
		sendTo: 'Кому', targetDesc: 'Выберите аудиторию', allUsers: 'Все пользователи', specificUser: 'Выбор пользователей',
		participants: 'Участники', finishers: 'Завершившие', selectOly: 'Выберите олимпиаду', searchPlaceholder: 'Имя или ID...',
		selectedCount: 'выбрано', notifType: 'Тип', notifTitle: 'Заголовок', notifMessage: 'Сообщение', send: 'Отправить',
		successMsg: 'Успешно отправлено!', info: 'Инфо', success: 'Успех', warning: 'Предупреждение', payment: 'Оплата',
		content: 'Содержание', contentDesc: 'Заполните сообщение на 3 языках', nothingFound: 'Ничего не найдено',
		errorSelectUser: 'Выберите пользователей', errorSelectOly: 'Выберите олимпиаду', errorSend: 'Ошибка при отправке',
		fillBoth: 'Заполните заголовок и текст сообщения', recipients: 'Получатели',
		confirmTitle: 'Подтверждение отправки', confirmMsg: 'Вы действительно хотите отправить это уведомление?', cancel: 'Отмена',
	},
	en: {
		title: 'Notifications', subtitle: 'Send notifications and messages to users',
		sendTo: 'Send To', targetDesc: 'Select audience', allUsers: 'All Users', specificUser: 'Select Users',
		participants: 'Participants', finishers: 'Finishers', selectOly: 'Select Olympiad', searchPlaceholder: 'Name or ID...',
		selectedCount: 'selected', notifType: 'Type', notifTitle: 'Title', notifMessage: 'Message', send: 'Send',
		successMsg: 'Sent successfully!', info: 'Info', success: 'Success', warning: 'Warning', payment: 'Payment',
		content: 'Content', contentDesc: 'Fill in 3 languages', nothingFound: 'Nothing found',
		errorSelectUser: 'Please select users', errorSelectOly: 'Please select an olympiad', errorSend: 'Failed to send',
		fillBoth: 'Please fill in title and message', recipients: 'Recipients',
		confirmTitle: 'Confirm Sending', confirmMsg: 'Are you sure you want to send this notification?', cancel: 'Cancel',
	},
};

const TYPES = [
	{ id: 'info', icon: Info, color: colors.blue },
	{ id: 'success', icon: CheckCircle, color: colors.green },
	{ id: 'warning', icon: AlertTriangle, color: colors.amber },
	{ id: 'payment', icon: CreditCard, color: colors.red },
];
const LANG_TONE = { uz: [colors.amber, colors.goldTint], ru: [colors.blue, colors.blueSoft], en: [colors.green, colors.greenSoft] };
const empty = { uz: '', ru: '', en: '' };

export default function AdminNotifications() {
	const { lang, pick } = useLanguage();
	const l = LABELS[lang] || LABELS.en;
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const [target, setTarget] = useState('all');
	const [selectedUserIds, setSelectedUserIds] = useState([]);
	const [olympiadId, setOlympiadId] = useState('');
	const [type, setType] = useState('info');
	const [title, setTitle] = useState(empty);
	const [message, setMessage] = useState(empty);
	const [search, setSearch] = useState('');
	const [users, setUsers] = useState([]);
	const [totalUsers, setTotalUsers] = useState(0);
	const [searching, setSearching] = useState(false);
	const [sending, setSending] = useState(false);
	const [confirm, setConfirm] = useState(false);

	const searchUsers = async (text = search) => {
		setSearching(true);
		try {
			const res = await api.get('users/', { params: { search: text.trim() || undefined, page_size: 100 } });
			setUsers(res.data.results || res.data || []);
			if (!text.trim()) setTotalUsers(res.data.count ?? (res.data.results || []).length);
		} catch {
			toast.error(l.errorSend);
		}
		setSearching(false);
	};

	useEffect(() => {
		searchUsers('');
	}, []);

	const toggleUser = (id) => setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

	const recipients = useMemo(() => {
		if (target === 'all') return totalUsers;
		if (target === 'specific') return selectedUserIds.length;
		return olympiads.find((o) => String(o.id) === String(olympiadId))?.participants_count || 0;
	}, [target, totalUsers, selectedUserIds, olympiadId, olympiads]);

	const submit = () => {
		const hasTitle = title.uz.trim() || title.ru.trim() || title.en.trim();
		const hasMessage = message.uz.trim() || message.ru.trim() || message.en.trim();
		if (!hasTitle || !hasMessage) return toast.error(l.fillBoth);
		if (target === 'specific' && !selectedUserIds.length) return toast.error(l.errorSelectUser);
		if ((target === 'olympiad_participants' || target === 'olympiad_results') && !olympiadId) return toast.error(l.errorSelectOly);
		setConfirm(true);
	};

	const send = async () => {
		setConfirm(false);
		setSending(true);
		try {
			const dTitle = title.uz.trim() || title.ru.trim() || title.en.trim();
			const dMessage = message.uz.trim() || message.ru.trim() || message.en.trim();
			await api.post('notifications/send/', {
				target, user_ids: selectedUserIds, olympiad_id: olympiadId, type,
				title_uz: title.uz.trim() || dTitle, title_ru: title.ru.trim() || dTitle, title_en: title.en.trim() || dTitle,
				message_uz: message.uz.trim() || dMessage, message_ru: message.ru.trim() || dMessage, message_en: message.en.trim() || dMessage,
			});
			toast.success(l.successMsg);
			setTitle(empty);
			setMessage(empty);
			setSelectedUserIds([]);
			setOlympiadId('');
		} catch {
			toast.error(l.errorSend);
		}
		setSending(false);
	};

	const TARGETS = [
		{ id: 'all', icon: Users, label: l.allUsers },
		{ id: 'specific', icon: User, label: l.specificUser },
		{ id: 'olympiad_participants', icon: Trophy, label: l.participants },
		{ id: 'olympiad_results', icon: UserCheck, label: l.finishers },
	];

	return (
		<Screen header={<StackHeader />} keyboard>
			<LargeTitle title={l.title} subtitle={l.subtitle} />

			<FormSection icon={Users} title={l.sendTo} right={<Pill label={`${l.recipients}: ${recipients}`} color={colors.amber} bg={colors.goldTint} />}>
				<View style={styles.grid}>
					{TARGETS.map((m) => {
						const on = target === m.id;
						return (
							<Tap key={m.id} onPress={() => setTarget(m.id)} containerStyle={{ width: '48%', flexGrow: 1 }} style={[styles.choice, on && styles.choiceOn]}>
								<View style={[styles.choiceIcon, on && { backgroundColor: colors.gold }]}><m.icon size={15} color={on ? colors.navyDeep : colors.muted} /></View>
								<T style={[styles.choiceText, on && { color: colors.ink }]} numberOfLines={2}>{m.label}</T>
							</Tap>
						);
					})}
				</View>

				{target === 'olympiad_participants' || target === 'olympiad_results' ? (
					<View style={{ gap: 8, marginTop: 12 }}>
						<T v="label">{l.selectOly}</T>
						{olympiads.map((o) => {
							const on = String(olympiadId) === String(o.id);
							return (
								<Tap key={o.id} onPress={() => setOlympiadId(String(o.id))} style={[styles.row, on && styles.rowOn]}>
									<View style={{ flex: 1 }}>
										<T v="strong" numberOfLines={1}>{pick(o, 'title')}</T>
										<T v="small" style={{ fontSize: 11.5 }}>{formatShortDate(o.date || o.start_datetime, lang)} · {o.participants_count || 0}</T>
									</View>
									{on ? <CheckCircle size={18} color={colors.amber} /> : null}
								</Tap>
							);
						})}
					</View>
				) : null}

				{target === 'specific' ? (
					<View style={{ gap: 8, marginTop: 12 }}>
						<Field icon={Search} value={search} onChangeText={setSearch} placeholder={l.searchPlaceholder} returnKeyType="search" onSubmitEditing={() => searchUsers()} right={searching ? <ActivityIndicator size="small" color={colors.goldDeep} /> : null} />
						{selectedUserIds.length ? <T v="small" color={colors.amber} style={{ fontFamily: fonts.bold }}>{selectedUserIds.length} {l.selectedCount}</T> : null}
						<View style={{ maxHeight: 360 }}>
							{!users.length ? <T v="small" style={{ textAlign: 'center', padding: 12 }}>{l.nothingFound}</T> : users.slice(0, 100).map((u) => {
								const on = selectedUserIds.includes(u.id);
								return (
									<Tap key={u.id} onPress={() => toggleUser(u.id)} style={[styles.row, on && styles.rowOn, { marginBottom: 6 }]}>
										<View style={[styles.initial, on && { backgroundColor: colors.gold }]}><T style={{ fontFamily: fonts.bold, fontSize: 12, color: on ? colors.navyDeep : colors.muted }}>{(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}</T></View>
										<View style={{ flex: 1 }}>
											<T v="strong" numberOfLines={1}>{u.last_name} {u.first_name}</T>
											<T v="small" style={{ fontSize: 11.5 }}>{u.participant_id || `@${u.username}`}</T>
										</View>
										{on ? <CheckCircle size={17} color={colors.amber} /> : null}
									</Tap>
								);
							})}
						</View>
					</View>
				) : null}
			</FormSection>

			<FormSection icon={Info} title={l.notifType}>
				<View style={styles.grid}>
					{TYPES.map((tp) => {
						const on = type === tp.id;
						return (
							<Tap key={tp.id} onPress={() => setType(tp.id)} containerStyle={{ width: '48%', flexGrow: 1 }} style={[styles.choice, on && styles.choiceOn, { justifyContent: 'center' }]}>
								<tp.icon size={15} color={tp.color} />
								<T style={[styles.choiceText, on && { color: colors.ink }]}>{l[tp.id]}</T>
							</Tap>
						);
					})}
				</View>
			</FormSection>

			<FormSection icon={Send} title={l.content}>
				<T v="small" style={{ marginBottom: 10 }}>{l.contentDesc}</T>
				{['uz', 'ru', 'en'].map((code) => (
					<Card key={code} style={{ marginBottom: 10, gap: 10, backgroundColor: colors.cardMuted }}>
						<Pill label={code.toUpperCase()} color={LANG_TONE[code][0]} bg={LANG_TONE[code][1]} style={{ alignSelf: 'flex-start' }} />
						<Field label={l.notifTitle} value={title[code]} onChangeText={(v) => setTitle((p) => ({ ...p, [code]: v }))} placeholder="..." />
						<TextArea label={l.notifMessage} rows={4} value={message[code]} onChangeText={(v) => setMessage((p) => ({ ...p, [code]: v }))} placeholder="..." />
					</Card>
				))}
			</FormSection>

			<Button title={l.send} icon={Send} loading={sending} onPress={submit} style={{ marginTop: 6 }} />

			<Dialog
				visible={confirm}
				onClose={() => setConfirm(false)}
				icon={Send}
				title={l.confirmTitle}
				message={l.confirmMsg}
				actions={[{ title: l.send, onPress: send }, { title: l.cancel, variant: 'ghost', onPress: () => setConfirm(false) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	choice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.cardMuted, minHeight: 52 },
	choiceOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	choiceIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	choiceText: { flex: 1, fontFamily: fonts.bold, fontSize: 12.5, color: colors.muted },
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	rowOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	initial: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' },
});
