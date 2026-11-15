import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Calendar, Check, Clock, Copy, GraduationCap, Mail, MapPin, Pencil, Phone, Save, School, ShieldCheck, User, XCircle } from 'lucide-react-native';
import api, { errorMessage } from '../api/client';
import E from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Screen, StackHeader } from '../components/layout';
import { Avatar, Button, Card, Dialog, Field, IconBadge, Segmented, SelectField, T, Tap } from '../components/ui';
import TeacherSearch from '../components/TeacherSearch';
import SubjectTeachers from '../components/SubjectTeachers';
import { colors, radius } from '../theme';
import { gradeLabel, initialsOf } from '../utils/format';

const EDIT_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '11+'];

export default function ProfileScreen() {
	const { currentUser, updateProfile, regions, fetchMe } = useAuth();
	const { t, pick } = useLanguage();
	const toast = useToast();
	const [section, setSection] = useState('personal');
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [confirmSave, setConfirmSave] = useState(false);
	const [saving, setSaving] = useState(false);
	const [sentRequest, setSentRequest] = useState(null);
	const [invite, setInvite] = useState(null);
	const [requestingId, setRequestingId] = useState(null);
	const [responding, setResponding] = useState(false);

	const loadTeacherLinks = async () => {
		try {
			const [sent, incoming] = await Promise.all([api.get(E.TEACHER_LINK_REQUESTS_SENT), api.get(E.TEACHER_LINK_REQUESTS_INCOMING)]);
			setSentRequest((sent.data.results || sent.data || [])[0] || null);
			setInvite((incoming.data.results || incoming.data || [])[0] || null);
		} catch {}
	};

	useEffect(() => {
		loadTeacherLinks();
	}, []);

	if (!currentUser) return null;
	const region = regions.find((r) => r.id === parseInt(currentUser.region, 10));

	const startEdit = () => {
		setForm({
			first_name: currentUser.first_name,
			last_name: currentUser.last_name,
			middle_name: currentUser.middle_name,
			birth_date: currentUser.birth_date,
			phone: currentUser.phone,
			username: currentUser.username,
			region: currentUser.region,
			school: currentUser.school,
			grade: currentUser.grade,
		});
		setEditing(true);
	};

	const save = async () => {
		setConfirmSave(false);
		setSaving(true);
		const data = { ...form };
		['birth_date', 'region', 'school'].forEach((k) => {
			if (data[k] === '') data[k] = null;
		});
		const res = await updateProfile(data);
		setSaving(false);
		if (res.success) {
			toast.success(t('profileSaved'));
			setEditing(false);
			return;
		}
		let msg = t('error');
		const err = res.error;
		if (err && typeof err === 'object') {
			const key = Object.keys(err)[0];
			if (Array.isArray(err[key])) msg = `${key}: ${err[key][0]}`;
			else if (typeof err[key] === 'string') msg = err[key];
		}
		toast.error(msg);
	};

	const requestTeacher = async (teacher) => {
		setRequestingId(teacher.id);
		try {
			const res = await api.post(E.TEACHER_LINK_REQUEST_REQUEST_TEACHER, { teacher: teacher.id });
			setSentRequest(res.data);
			toast.success(t('requestSent'));
		} catch (err) {
			toast.error(errorMessage(err, t('error')));
		}
		setRequestingId(null);
	};

	const respond = async (action) => {
		if (!invite) return;
		setResponding(true);
		try {
			await api.post(action === 'accept' ? E.TEACHER_LINK_REQUEST_ACCEPT(invite.id) : E.TEACHER_LINK_REQUEST_REJECT(invite.id));
			setInvite(null);
			toast.success(action === 'accept' ? t('accepted') : t('rejected'));
			await fetchMe();
			api.get(E.TEACHER_LINK_REQUEST_STUDENT_STATUS).then((r) => setSentRequest(r.data)).catch(() => {});
		} catch (err) {
			toast.error(errorMessage(err, t('error')));
		}
		setResponding(false);
	};

	const fields = {
		personal: [
			{ key: 'last_name', label: t('lastName'), icon: User, value: currentUser.last_name },
			{ key: 'first_name', label: t('firstName'), icon: User, value: currentUser.first_name },
			{ key: 'middle_name', label: t('middleName'), icon: User, value: currentUser.middle_name },
			{ key: 'birth_date', label: t('birthDate'), icon: Calendar, value: currentUser.birth_date, placeholder: 'YYYY-MM-DD' },
		],
		contact: [
			{ key: 'phone', label: t('phone'), icon: Phone, value: currentUser.phone, keyboard: 'phone-pad' },
			{ key: 'username', label: t('login'), icon: Mail, value: currentUser.username },
		],
		education: [
			{ key: 'region', label: t('region'), icon: MapPin, value: pick(region, 'name'), options: regions.map((r) => ({ value: r.id, label: pick(r, 'name') })) },
			{ key: 'school', label: t('school'), icon: School, value: currentUser.school },
			{ key: 'grade', label: t('grade'), icon: GraduationCap, value: gradeLabel(currentUser.grade, t), options: EDIT_GRADES.map((g) => ({ value: g, label: `${g}${t('gradeSuffix')}` })) },
		],
	}[section];

	return (
		<Screen header={<StackHeader title={t('profile')} right={!editing ? <Tap onPress={startEdit} style={styles.editBtn}><Pencil size={18} color={colors.navyDeep} /></Tap> : null} />} keyboard>
			<View style={{ alignItems: 'center', marginBottom: 20 }}>
				<Avatar initials={initialsOf(currentUser)} size={88} />
				<T v="h1" style={{ marginTop: 12, textAlign: 'center' }}>{currentUser.first_name} {currentUser.last_name}</T>
				<Tap
					onPress={async () => {
						await Clipboard.setStringAsync(String(currentUser.participant_id || ''));
						toast.success(t('idCopied'));
					}}
					style={styles.idChip}
				>
					<T v="mono" style={{ fontWeight: '800' }}>#{currentUser.participant_id}</T>
					<Copy size={14} color={colors.muted} />
				</Tap>
			</View>

			<Segmented
				value={section}
				onChange={setSection}
				options={[
					{ value: 'personal', label: t('personalInfo'), icon: User },
					{ value: 'contact', label: t('contactInfo'), icon: Phone },
					{ value: 'education', label: t('educationInfo'), icon: GraduationCap },
				]}
			/>

			<Card style={{ marginTop: 14, gap: editing ? 14 : 0, paddingVertical: editing ? 18 : 6 }}>
				{fields.map((f, i) =>
					editing ? (
						f.options ? (
							<SelectField key={f.key} label={f.label} icon={f.icon} value={form[f.key]} options={f.options} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
						) : (
							<Field key={f.key} label={f.label} icon={f.icon} value={form[f.key] ? String(form[f.key]) : ''} placeholder={f.placeholder} keyboardType={f.keyboard} onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))} autoCorrect={false} />
						)
					) : (
						<View key={f.key} style={[styles.row, i < fields.length - 1 && styles.rowBorder]}>
							<IconBadge icon={f.icon} size={38} />
							<View style={{ flex: 1 }}>
								<T v="label" style={{ fontSize: 10 }}>{f.label}</T>
								<T v="strong" style={{ marginTop: 2 }}>{f.value || '—'}</T>
							</View>
						</View>
					)
				)}
			</Card>

			{editing ? (
				<View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
					<Button title={t('cancel')} variant="light" size="md" style={{ flex: 1 }} onPress={() => setEditing(false)} />
					<Button title={t('save')} icon={Save} size="md" loading={saving} style={{ flex: 1.3 }} onPress={() => setConfirmSave(true)} />
				</View>
			) : null}

			{/* Subject teachers (math / english) */}
			<T v="h2" style={{ marginTop: 26, marginBottom: 12 }}>{t('subjectTeachersTitle')}</T>
			<SubjectTeachers variant="section" />

			{/* Linked teacher */}
			<T v="h2" style={{ marginTop: 16, marginBottom: 12 }}>{t('myTeacherTitle')}</T>
			{invite ? (
				<Card style={{ marginBottom: 12, backgroundColor: colors.goldTint, borderColor: colors.goldSoft }}>
					<T v="strong">{invite.teacher_name}</T>
					<T v="small" style={{ marginTop: 2 }}>{t('teacherInviteTitle')}</T>
					<View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
						<Button title={t('accept')} icon={Check} variant="success" size="sm" style={{ flex: 1 }} loading={responding} onPress={() => respond('accept')} />
						<Button title={t('reject')} icon={XCircle} variant="light" size="sm" style={{ flex: 1 }} disabled={responding} onPress={() => respond('reject')} />
					</View>
				</Card>
			) : null}
			{currentUser.teacher_info && (!invite || Number(currentUser.teacher_info.id) !== Number(invite.teacher)) ? (
				<Card style={styles.teacher}>
					<IconBadge icon={ShieldCheck} color={colors.green} bg={colors.greenSoft} />
					<View style={{ flex: 1 }}>
						<T v="strong">{currentUser.teacher_info.full_name}</T>
						<T v="small">{currentUser.teacher_info.phone}</T>
					</View>
				</Card>
			) : sentRequest ? (
				<Card style={styles.teacher}>
					<IconBadge icon={Clock} />
					<View style={{ flex: 1 }}>
						<T v="strong">{sentRequest.teacher_name}</T>
						<T v="small">{t('requestSent')} — {t('requestSentDesc')}</T>
					</View>
				</Card>
			) : (
				<TeacherSearch actionLabel={t('requestBtn')} busyId={requestingId} onSelect={requestTeacher} />
			)}

			<Dialog
				visible={confirmSave}
				onClose={() => setConfirmSave(false)}
				icon={Save}
				title={t('confirmSaveTitle')}
				message={t('confirmSaveMsg')}
				actions={[
					{ title: t('save'), onPress: save },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirmSave(false) },
				]}
			/>
		</Screen>
	);
}

const styles = StyleSheet.create({
	editBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
	idChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
	teacher: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

