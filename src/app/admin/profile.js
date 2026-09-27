import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SvgXml } from 'react-native-svg';
import { CheckCircle2, Copy, KeyRound, LogOut, Pencil, Phone, Save, ShieldCheck, User } from 'lucide-react-native';
import api, { errorMessage } from '../../api/client';
import E from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { LANGS, useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Screen, StackHeader } from '../../components/layout';
import { Avatar, Button, Card, Dialog, Field, Pill, Segmented, T, Tap } from '../../components/ui';
import { FormSection } from '../../components/form';
import { phoneMask } from '../../components/admin/userShared';
import { colors, fonts, radius } from '../../theme';
import { initialsOf } from '../../utils/format';

const L = {
	title: { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
	personal: { uz: "Shaxsiy ma'lumotlar", ru: 'Личные данные', en: 'Personal details' },
	firstName: { uz: 'Ism', ru: 'Имя', en: 'First name' },
	lastName: { uz: 'Familiya', ru: 'Фамилия', en: 'Last name' },
	middleName: { uz: 'Otasining ismi', ru: 'Отчество', en: 'Middle name' },
	phone: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
	username: { uz: 'Login', ru: 'Логин', en: 'Username' },
	edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
	save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
	cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
	saved: { uz: "Ma'lumotlar saqlandi", ru: 'Данные сохранены', en: 'Saved' },
	copied: { uz: 'Nusxalandi', ru: 'Скопировано', en: 'Copied' },
	language: { uz: 'Til', ru: 'Язык', en: 'Language' },
	logout: { uz: 'Chiqish', ru: 'Выйти', en: 'Log out' },
	twofa: { uz: 'Ikki faktorli autentifikatsiya', ru: 'Двухфакторная аутентификация', en: 'Two-factor authentication' },
	enabled: { uz: 'Yoqilgan', ru: 'Включена', en: 'Enabled' },
	enable: { uz: 'Yoqish', ru: 'Включить', en: 'Enable' },
	disable: { uz: "O'chirish", ru: 'Отключить', en: 'Disable' },
	twofaHint: { uz: 'Autentifikatsiya ilovasidagi kod yordamida qo\'shimcha himoya', ru: 'Дополнительная защита входа с помощью кода из приложения-аутентификатора', en: 'Extra login protection using a code from an authenticator app' },
	scan: { uz: 'QR-kodni autentifikatsiya ilovasida (Google Authenticator, Authy) skanerlang yoki kalitni qo\'lda kiriting, so\'ng kodni yozing', ru: 'Отсканируйте QR-код в приложении-аутентификаторе (Google Authenticator, Authy) или введите ключ вручную, затем введите код', en: 'Scan the QR code in an authenticator app (Google Authenticator, Authy) or enter the key manually, then type the code' },
	confirm: { uz: 'Tasdiqlash', ru: 'Подтвердить', en: 'Confirm' },
	setupErr: { uz: "Sozlashni boshlab bo'lmadi", ru: 'Не удалось начать настройку', en: 'Failed to start setup' },
	enabledOk: { uz: 'Ikki faktorli autentifikatsiya yoqildi', ru: 'Двухфакторная аутентификация включена', en: 'Two-factor authentication enabled' },
	badCode: { uz: "Kod noto'g'ri", ru: 'Неверный код', en: 'Invalid code' },
	disableTitle: { uz: "2FA o'chirilsinmi?", ru: 'Отключить 2FA?', en: 'Disable 2FA?' },
	disableMsg: { uz: 'Tasdiqlash uchun parolni kiriting', ru: 'Введите пароль для подтверждения', en: 'Enter your password to confirm' },
	disabledOk: { uz: "Ikki faktorli autentifikatsiya o'chirildi", ru: 'Двухфакторная аутентификация отключена', en: 'Two-factor authentication disabled' },
	badPassword: { uz: "Parol noto'g'ri", ru: 'Неверный пароль', en: 'Invalid password' },
	password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
	roles: { superadmin: { uz: 'Superadmin', ru: 'Суперадмин', en: 'Superadmin' }, admin: { uz: 'Administrator', ru: 'Администратор', en: 'Administrator' }, coordinator: { uz: 'Koordinator', ru: 'Координатор', en: 'Coordinator' }, teacher: { uz: "O'qituvchi", ru: 'Учитель', en: 'Teacher' } },
};

export default function StaffProfile() {
	const { currentUser, updateProfile, fetchMe, logout } = useAuth();
	const { tx, lang, changeLanguage } = useLanguage();
	const toast = useToast();
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [saving, setSaving] = useState(false);
	const [setup, setSetup] = useState(null);
	const [qr, setQr] = useState('');
	const [code, setCode] = useState('');
	const [busy, setBusy] = useState(null);
	const [disableOpen, setDisableOpen] = useState(false);
	const [password, setPassword] = useState('');
	const [logoutOpen, setLogoutOpen] = useState(false);

	useEffect(() => { fetchMe?.(); }, []);
	if (!currentUser) return null;

	const startEdit = () => {
		setForm({ first_name: currentUser.first_name || '', last_name: currentUser.last_name || '', middle_name: currentUser.middle_name || '', phone: currentUser.phone || '+998' });
		setEditing(true);
	};

	const save = async () => {
		setSaving(true);
		const res = await updateProfile(form);
		setSaving(false);
		if (res.success) {
			toast.success(tx(L.saved));
			setEditing(false);
		} else {
			toast.error(errorMessage({ response: { data: res.error } }));
		}
	};

	const startSetup = async () => {
		setBusy('setup');
		try {
			const res = await api.post(E.TWOFA_SETUP);
			setSetup(res.data);
			const QRCode = require('qrcode');
			setQr(await QRCode.toString(res.data.otpauth_url, { type: 'svg', margin: 1 }));
		} catch {
			toast.error(tx(L.setupErr));
		}
		setBusy(null);
	};

	const confirm2FA = async () => {
		if (code.length !== 6) return;
		setBusy('confirm');
		try {
			await api.post(E.TWOFA_CONFIRM, { code });
			toast.success(tx(L.enabledOk));
			setSetup(null);
			setQr('');
			setCode('');
			fetchMe();
		} catch {
			toast.error(tx(L.badCode));
		}
		setBusy(null);
	};

	const disable2FA = async () => {
		if (!password) return;
		setBusy('disable');
		try {
			await api.post(E.TWOFA_DISABLE, { password });
			toast.success(tx(L.disabledOk));
			setDisableOpen(false);
			setPassword('');
			fetchMe();
		} catch {
			toast.error(tx(L.badPassword));
		}
		setBusy(null);
	};

	const role = L.roles[currentUser.role];

	return (
		<Screen header={<StackHeader title={tx(L.title)} right={!editing ? <Tap onPress={startEdit} style={styles.editBtn}><Pencil size={16} color={colors.navyDeep} /></Tap> : null} />} onRefresh={fetchMe} keyboard>
			<Card style={styles.hero}>
				<Avatar initials={initialsOf(currentUser)} size={72} dark />
				<T v="h2" style={{ color: colors.white, textAlign: 'center', marginTop: 12 }}>{currentUser.last_name} {currentUser.first_name}</T>
				<View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
					{role ? <Pill label={tx(role)} color={colors.navyDeep} bg={colors.gold} /> : null}
					{currentUser.participant_id ? (
						<Tap onPress={async () => { await Clipboard.setStringAsync(String(currentUser.participant_id)); toast.info(tx(L.copied)); }} style={styles.idPill}>
							<T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.white }}>#{currentUser.participant_id}</T>
							<Copy size={12} color={colors.white} />
						</Tap>
					) : null}
				</View>
			</Card>

			<FormSection icon={User} title={tx(L.personal)}>
				{editing ? (
					<>
						<Field label={tx(L.lastName)} value={form.last_name} onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} />
						<Field label={tx(L.firstName)} value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} />
						<Field label={tx(L.middleName)} value={form.middle_name} onChangeText={(v) => setForm((f) => ({ ...f, middle_name: v }))} />
						<Field label={tx(L.phone)} icon={Phone} value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm((f) => ({ ...f, phone: phoneMask(v) }))} />
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.cancel)} onPress={() => setEditing(false)} />
							<Button style={{ flex: 1.4 }} size="md" icon={Save} title={tx(L.save)} loading={saving} onPress={save} />
						</View>
					</>
				) : (
					<Card style={{ padding: 0 }}>
						{[[L.lastName, currentUser.last_name], [L.firstName, currentUser.first_name], [L.middleName, currentUser.middle_name], [L.phone, currentUser.phone], [L.username, currentUser.username]].map(([k, v], i) => (
							<View key={k.en} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
								<T v="small" style={{ width: 110 }}>{tx(k)}</T>
								<T v="strong" style={{ flex: 1 }} selectable>{v || '—'}</T>
							</View>
						))}
					</Card>
				)}
			</FormSection>

			<FormSection icon={ShieldCheck} title={tx(L.twofa)}>
				{currentUser.totp_enabled ? (
					<View style={styles.enabled}>
						<CheckCircle2 size={18} color={colors.green} />
						<T v="strong" color={colors.green} style={{ flex: 1 }}>{tx(L.enabled)}</T>
						<Button size="sm" variant="light" title={tx(L.disable)} onPress={() => setDisableOpen(true)} />
					</View>
				) : setup ? (
					<View style={{ gap: 12 }}>
						<T v="small">{tx(L.scan)}</T>
						<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
							{qr ? <View style={styles.qr}><SvgXml xml={qr} width={130} height={130} /></View> : null}
							<Tap onPress={async () => { await Clipboard.setStringAsync(setup.secret); toast.info(tx(L.copied)); }} style={{ flex: 1, gap: 6 }}>
								<KeyRound size={16} color={colors.amber} />
								<T style={{ fontFamily: 'Menlo', fontSize: 12, color: colors.ink2 }} selectable>{setup.secret}</T>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Copy size={12} color={colors.amber} /><T v="strong" color={colors.amber} style={{ fontSize: 12 }}>Copy</T></View>
							</Tap>
						</View>
						<Field value={code} placeholder="000000" keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" onChangeText={(v) => setCode(v.replace(/\D/g, ''))} inputStyle={{ fontSize: 22, letterSpacing: 8, textAlign: 'center' }} />
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<Button style={{ flex: 1 }} size="md" variant="light" title={tx(L.cancel)} onPress={() => { setSetup(null); setQr(''); setCode(''); }} />
							<Button style={{ flex: 1.4 }} size="md" title={tx(L.confirm)} loading={busy === 'confirm'} disabled={code.length !== 6} onPress={confirm2FA} />
						</View>
					</View>
				) : (
					<View style={{ gap: 12 }}>
						<T v="small">{tx(L.twofaHint)}</T>
						<Button size="md" icon={ShieldCheck} title={tx(L.enable)} loading={busy === 'setup'} onPress={startSetup} />
					</View>
				)}
			</FormSection>

			<FormSection title={tx(L.language)}>
				<Segmented value={lang} onChange={changeLanguage} options={LANGS.map((l) => ({ value: l.code, label: l.short }))} />
			</FormSection>

			<Button variant="light" icon={LogOut} title={tx(L.logout)} onPress={() => setLogoutOpen(true)} />

			<Dialog
				visible={disableOpen}
				onClose={() => busy !== 'disable' && setDisableOpen(false)}
				icon={ShieldCheck}
				tone="red"
				title={tx(L.disableTitle)}
				message={tx(L.disableMsg)}
				actions={[{ title: tx(L.disable), variant: 'danger', loading: busy === 'disable', disabled: !password, onPress: disable2FA }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setDisableOpen(false) }]}
			>
				<Field value={password} placeholder={tx(L.password)} secure autoCapitalize="none" onChangeText={setPassword} style={{ marginBottom: 12 }} />
			</Dialog>

			<Dialog
				visible={logoutOpen}
				onClose={() => setLogoutOpen(false)}
				icon={LogOut}
				tone="red"
				title={tx(L.logout)}
				actions={[{ title: tx(L.logout), variant: 'danger', onPress: () => { setLogoutOpen(false); logout(); } }, { title: tx(L.cancel), variant: 'ghost', onPress: () => setLogoutOpen(false) }]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { alignItems: 'center', backgroundColor: colors.navy, borderWidth: 0, paddingVertical: 26, marginBottom: 6 },
	idPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
	editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
	enabled: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.greenSoft },
	qr: { padding: 8, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
});
