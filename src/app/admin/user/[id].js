import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Calendar, Download, Edit2, Eye, EyeOff, GraduationCap, Key, Lock, MapPin, Phone, Plus, School, Send, Trash2, User, X } from 'lucide-react-native';
import api, { errorMessage } from '../../../api/client';
import { useAuth, isCoordinator } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useOlympiad } from '../../../context/OlympiadContext';
import { useToast } from '../../../context/ToastContext';
import { Screen, StackHeader } from '../../../components/layout';
import { Avatar, Button, Card, Dialog, Field, Loader, Pill, SelectField, Sheet, T, Tap } from '../../../components/ui';
import { ChoicePills, DateTimeField, TextArea } from '../../../components/form';
import TeacherSearch from '../../../components/TeacherSearch';
import { PermissionSheet } from '../../../components/DocumentSheets';
import { UL, phoneMask, payTone } from '../../../components/admin/userShared';
import { colors, radius } from '../../../theme';
import { GRADES } from '../../../utils/constants';
import { formatDate } from '../../../utils/format';

const STATUSES = ['paid', 'pending', 'free', 'expired'];

export default function AdminUserDetail() {
	const { id } = useLocalSearchParams();
	const { tx, lang, pick } = useLanguage();
	const { currentUser, regions, updateUser } = useAuth();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const coordinator = isCoordinator(currentUser);

	const [user, setUser] = useState(null);
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState({});
	const [showPass, setShowPass] = useState(false);
	const [confirm, setConfirm] = useState(null);
	const [resetOpen, setResetOpen] = useState(false);
	const [newPass, setNewPass] = useState('');
	const [busy, setBusy] = useState(null);
	const [olyToRegister, setOlyToRegister] = useState('');
	const [teacherSearch, setTeacherSearch] = useState(false);
	const [permission, setPermission] = useState(null);
	const [reqEdit, setReqEdit] = useState(null); // user edit request form
	const [reqPay, setReqPay] = useState(null); // { reg, status, reason }
	const [reqTeachers, setReqTeachers] = useState(null);

	const load = useCallback(async () => {
		try {
			const res = await api.get(`users/${id}/`);
			setUser(res.data);
		} catch (err) {
			toast.error(errorMessage(err));
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	if (!user) return <Screen header={<StackHeader />}><Loader /></Screen>;

	const regName = (rid) => pick(regions.find((r) => r.id === parseInt(rid, 10)), 'name') || rid || '—';
	const gradeText = (g) => (g === 'KG' ? tx(UL.kindergarten) : g ? `${g}` : '—');
	const statusLabel = (s) => ({ paid: tx(UL.paid), pending: tx(UL.pending), free: tx(UL.free), expired: tx(UL.expired) })[s] || s;
	const regOly = (reg) => {
		const oid = typeof reg?.olympiad === 'object' ? reg.olympiad?.id : reg?.olympiad;
		return olympiads.find((o) => String(o.id) === String(oid)) || (typeof reg?.olympiad === 'object' ? reg.olympiad : { id: oid, title_uz: reg.olympiad_title, title_ru: reg.olympiad_title, title_en: reg.olympiad_title });
	};
	const display = `${user.last_name} ${user.first_name} (ID: ${user.participant_id || user.id})`;

	const editRequest = async (targetType, targetId, targetDisplay, proposed, current, okMsg = UL.requestSent) => {
		await api.post('edit-requests/', { target_type: targetType, target_id: targetId, target_display: targetDisplay, proposed_changes: proposed, current_data: current });
		toast.success(tx(okMsg));
	};

	const fields = [
		{ key: 'last_name', label: UL.lastName, icon: User },
		{ key: 'first_name', label: UL.firstName, icon: User },
		{ key: 'middle_name', label: UL.middleName, icon: User },
		{ key: 'phone', label: UL.phone, icon: Phone, phone: true },
		{ key: 'region', label: UL.region, icon: MapPin, select: regions.map((r) => ({ value: r.id, label: pick(r, 'name') })), show: regName(user.region) },
		{ key: 'school', label: UL.school, icon: School },
		{ key: 'grade', label: UL.grade, icon: GraduationCap, select: GRADES.map((g) => ({ value: g, label: String(gradeText(g)) })), show: gradeText(user.grade) },
		{ key: 'birth_date', label: UL.birthDate, icon: Calendar, date: true },
		{ key: 'teacher_name', label: UL.teacherName, icon: User },
		{ key: 'teacher_phone', label: UL.teacherPhone, icon: Phone },
	];

	const saveEdit = async () => {
		setBusy('save');
		const res = await updateUser(user.id, form);
		setBusy(null);
		if (res.success) {
			toast.success(tx(UL.userUpdated));
			setUser({ ...user, ...form, ...(res.data || {}) });
			setEditing(false);
		} else toast.error(tx(UL.userUpdateErr));
	};

	const changeStatus = (reg, status) =>
		setConfirm({
			title: tx(UL.changeStatusTitle),
			message: statusLabel(status),
			onConfirm: async () => {
				const regId = reg.id || reg.registration_id || reg.pk;
				try {
					await api.patch(`registrations/${regId}/`, { payment_status: status });
					toast.success(tx(UL.statusUpdated));
					setUser((u) => ({ ...u, registrations: (u.registrations || []).map((r) => (String(r.id || r.registration_id || r.pk) === String(regId) ? { ...r, payment_status: status, transaction_id: 'manual' } : r)) }));
					load();
				} catch (err) {
					toast.error(err.response?.data?.payment_status?.[0] || errorMessage(err));
				}
			},
		});

	const unregister = (reg) =>
		setConfirm({
			title: tx(UL.unregisterTitle),
			message: tx(UL.unregisterMsg),
			tone: 'red',
			onConfirm: async () => {
				try {
					await api.delete(`registrations/${reg.id || reg.registration_id || reg.pk}/?user_id=${user.id}`);
					toast.success(tx(UL.unregister));
					load();
				} catch (err) {
					toast.error(errorMessage(err));
				}
			},
		});

	const registerToOly = async () => {
		if (!olyToRegister) return;
		setBusy('register');
		try {
			if (coordinator) {
				const oly = olympiads.find((o) => String(o.id) === String(olyToRegister));
				const title = oly ? pick(oly) : olyToRegister;
				await editRequest('registration', 0, `${user.last_name} ${user.first_name} — ${title}`, { _register_user_id: user.id, _register_olympiad_id: parseInt(olyToRegister, 10), register_olympiad_title: title, payment_status: 'pending' }, {});
			} else {
				await api.post(`olympiads/${olyToRegister}/register/`, { user_id: user.id });
				toast.success(tx(UL.regSuccess));
				load();
			}
			setOlyToRegister('');
		} catch (err) {
			toast.error(errorMessage(err, tx(UL.regError)));
		}
		setBusy(null);
	};

	const resetPassword = async () => {
		if (!newPass || newPass.length < 4) return toast.error(tx(UL.passShort));
		setBusy('reset');
		try {
			const res = await api.post(`users/${user.id}/reset_password/`, { new_password: newPass });
			if (res.data?.success !== false) {
				toast.success(tx(UL.passResetSuccess));
				setResetOpen(false);
				setNewPass('');
				load();
			}
		} catch (err) {
			toast.error(errorMessage(err, tx(UL.passResetErr)));
		}
		setBusy(null);
	};

	const submitUserRequest = async () => {
		const proposed = {};
		const current = {};
		['first_name', 'last_name', 'middle_name', 'phone', 'school', 'grade', 'birth_date', 'region'].forEach((f) => {
			if (String(reqEdit[f] ?? '') !== String(user[f] ?? '')) {
				proposed[f] = reqEdit[f];
				current[f] = user[f] || null;
			}
		});
		if (reqEdit.new_password?.trim().length >= 4) {
			proposed.new_password = reqEdit.new_password.trim();
			current.new_password = null;
		}
		if (!Object.keys(proposed).length) return toast.error(tx(UL.noChanges));
		if (reqEdit.reason) proposed._reason = reqEdit.reason;
		setBusy('req');
		try {
			await editRequest('user', user.id, display, proposed, current);
			setReqEdit(null);
		} catch {
			toast.error(tx(UL.requestErr));
		}
		setBusy(null);
	};

	const submitTeacherRequest = async () => {
		const proposed = {};
		const current = {};
		if (reqTeachers.teacher_name !== (user.teacher_name || '')) { proposed.teacher_name = reqTeachers.teacher_name; current.teacher_name = user.teacher_name || null; }
		if (reqTeachers.teacher_phone !== (user.teacher_phone || '')) { proposed.teacher_phone = reqTeachers.teacher_phone; current.teacher_phone = user.teacher_phone || null; }
		if (JSON.stringify(reqTeachers.teachers) !== JSON.stringify(user.teachers || [])) { proposed.teachers = reqTeachers.teachers; current.teachers = user.teachers || []; }
		if (!Object.keys(proposed).length) return toast.error(tx(UL.noChanges));
		if (reqTeachers.reason) proposed._reason = reqTeachers.reason;
		setBusy('reqT');
		try {
			await editRequest('user', user.id, display, proposed, current);
			setReqTeachers(null);
		} catch {
			toast.error(tx(UL.requestErr));
		}
		setBusy(null);
	};

	const submitPayRequest = async () => {
		const { reg, status, reason } = reqPay;
		const proposed = { payment_status: status };
		if (reason) proposed._reason = reason;
		setBusy('reqP');
		try {
			await editRequest('registration', reg.id || reg.registration_id || reg.pk, `${user.last_name} ${user.first_name} — ${pick(regOly(reg))}`, proposed, { payment_status: reg.payment_status });
			setReqPay(null);
		} catch {
			toast.error(tx(UL.requestErr));
		}
		setBusy(null);
	};

	const teachers = editing ? form.teachers || [] : user.teachers?.length ? user.teachers : user.teacher_name ? [{ name: user.teacher_name, phone: user.teacher_phone }] : [];
	const available = olympiads.filter((o) => !(user.registrations || []).some((r) => String(r.olympiad) === String(o.id)));

	return (
		<Screen
			header={
				<StackHeader
					title={`${user.last_name} ${user.first_name}`}
					subtitle={`ID: ${user.participant_id || user.id}`}
					right={!editing ? (coordinator ? <Button size="sm" variant="soft" icon={Edit2} title={tx(UL.requestEdit)} onPress={() => setReqEdit({ first_name: user.first_name || '', last_name: user.last_name || '', middle_name: user.middle_name || '', phone: user.phone || '', school: user.school || '', grade: user.grade || '', birth_date: user.birth_date || '', region: user.region || '', new_password: '', reason: '' })} /> : <Button size="sm" variant="soft" icon={Edit2} title={tx(UL.edit)} onPress={() => { setForm({ ...user, teachers: user.teachers?.length ? user.teachers : user.teacher_name ? [{ name: user.teacher_name, phone: user.teacher_phone || '+998' }] : [] }); setEditing(true); }} />) : null}
				/>
			}
			onRefresh={load}
			keyboard
		>
			<View style={{ alignItems: 'center', marginBottom: 16 }}>
				<Avatar initials={`${user.last_name?.[0] || ''}${user.first_name?.[0] || ''}`} size={74} />
				<T v="h2" style={{ marginTop: 10, textAlign: 'center' }}>{user.last_name} {user.first_name} {user.middle_name || ''}</T>
				<Pill label={user.role} style={{ alignSelf: 'center', marginTop: 6 }} />
			</View>

			<Card style={{ gap: editing ? 12 : 0, paddingVertical: editing ? 18 : 6 }}>
				<T v="h3" style={{ marginBottom: editing ? 4 : 6, marginTop: editing ? 0 : 10 }}>{tx(UL.personalInfo)}</T>
				{fields.map((f) =>
					editing ? (
						f.select ? (
							<SelectField key={f.key} label={tx(f.label)} icon={f.icon} value={form[f.key]} options={f.select} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))} />
						) : f.date ? (
							<DateTimeField key={f.key} mode="date" label={tx(f.label)} value={form[f.key] || ''} onChange={(v) => setForm((p) => ({ ...p, [f.key]: v ? v.slice(0, 10) : '' }))} />
						) : (
							<Field key={f.key} label={tx(f.label)} icon={f.icon} value={form[f.key] ? String(form[f.key]) : ''} keyboardType={f.phone ? 'phone-pad' : undefined} onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: f.phone ? phoneMask(v) : v }))} />
						)
					) : (
						<View key={f.key} style={styles.row}>
							<f.icon size={16} color={colors.faint} />
							<T v="small" style={{ width: 120 }}>{tx(f.label)}</T>
							<T v="strong" style={{ flex: 1, fontSize: 14 }} selectable>{f.show ?? (user[f.key] || '—')}</T>
						</View>
					)
				)}
				{!editing ? (
					<View style={styles.row}>
						<Lock size={16} color={colors.faint} />
						<T v="small" style={{ width: 120 }}>{tx(UL.password)}</T>
						<T v="strong" style={{ flex: 1, fontSize: 14 }} selectable>{showPass ? user.password_text || '—' : '••••••••'}</T>
						{user.password_text ? <Tap onPress={() => setShowPass((v) => !v)}>{showPass ? <EyeOff size={17} color={colors.muted} /> : <Eye size={17} color={colors.muted} />}</Tap> : null}
					</View>
				) : null}
			</Card>

			{!editing ? (
				<>
					{/* Telegram */}
					<Card style={{ marginTop: 12 }}>
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
							<Send size={17} color="#0088CC" />
							<T v="h3" style={{ flexGrow: 1, flexShrink: 1, minWidth: 120 }}>{tx(UL.telegram)}</T>
							<Pill dot label={tx(user.telegram_chat_id ? UL.linked : UL.notLinked)} color={user.telegram_chat_id ? colors.green : colors.red} bg={user.telegram_chat_id ? colors.greenSoft : colors.redSoft} />
						</View>
						{user.telegram_chat_id ? (
							<View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
								<Button style={{ flex: 1 }} size="sm" variant="light" icon={Send} title={String(user.telegram_chat_id)} onPress={() => Linking.openURL(`tg://user?id=${user.telegram_chat_id}`).catch(() => Clipboard.setStringAsync(String(user.telegram_chat_id)))} />
								<Button size="sm" variant="danger" icon={Trash2} title={tx(UL.reset)} onPress={() => setConfirm({ title: tx(UL.unlinkTitle), message: `${user.first_name} ${user.last_name}`, tone: 'red', onConfirm: async () => { const r = await updateUser(user.id, { telegram_chat_id: null }); if (r.success) { toast.success(tx(UL.unlinked)); setUser((u) => ({ ...u, telegram_chat_id: null })); } else toast.error(tx(UL.userUpdateErr)); } })} />
							</View>
						) : null}
					</Card>

					{/* Linked teacher account */}
					{user.role === 'participant' ? (
						<Card style={{ marginTop: 12 }}>
							<T v="h3" style={{ marginBottom: 10 }}>{tx(UL.linkedTeacher)}</T>
							{teacherSearch ? (
								<>
									<TeacherSearch onSelect={async (t) => { const r = await updateUser(user.id, { teacher: t.id }); if (r.success) { toast.success(tx(UL.teacherUpdated)); setUser(r.data || user); setTeacherSearch(false); } }} />
									<Button size="sm" variant="ghost" title={tx(UL.cancel)} onPress={() => setTeacherSearch(false)} style={{ marginTop: 6 }} />
								</>
							) : (
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
									<T v="strong" style={{ flex: 1 }}>{user.teacher_info?.full_name || tx(UL.noLinkedTeacher)}</T>
									{!coordinator ? <Button size="sm" variant="light" title={tx(UL.change)} onPress={() => setTeacherSearch(true)} /> : null}
								</View>
							)}
						</Card>
					) : null}

					{/* Registrations */}
					<Card style={{ marginTop: 12 }}>
						<T v="h3" style={{ marginBottom: 10 }}>{tx(UL.olympiad)}</T>
						{(user.registrations || []).map((reg, i) => {
							const [fg, bg] = payTone(reg.payment_status);
							const oly = regOly(reg);
							return (
								<View key={i} style={styles.reg}>
									<View style={{ flexDirection: 'row', gap: 8 }}>
										<View style={{ flex: 1 }}>
											<T v="strong" style={{ fontSize: 14 }}>{pick(oly)}</T>
											<T v="small" style={{ fontSize: 11.5 }}>{formatDate(reg.date_registered || reg.registered_at || reg.date || reg.created_at, lang)}</T>
										</View>
										{!coordinator ? <Tap onPress={() => unregister(reg)} style={styles.del}><Trash2 size={15} color={colors.red} /></Tap> : null}
									</View>
									{reg.payment_status ? (
										coordinator ? (
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
												<Pill label={statusLabel(reg.payment_status)} color={fg} bg={bg} />
												<Button size="sm" variant="light" icon={Edit2} title={tx(UL.requestPay)} onPress={() => setReqPay({ reg, status: reg.payment_status, reason: '' })} />
											</View>
										) : (
											<View style={{ marginTop: 10 }}>
												<ChoicePills value={reg.payment_status} onChange={(s) => s !== reg.payment_status && changeStatus(reg, s)} options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
											</View>
										)
									) : null}
									<View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
										{reg.transaction_id === 'manual' ? <Pill label={tx(UL.editedStatus)} color={colors.purple} bg={colors.purpleSoft} /> : null}
										{reg.unique_participant_id ? (
											<Tap onPress={() => setPermission({ reg, oly })}><Pill icon={Download} label={`${tx(UL.permission)} · ${reg.unique_participant_id}`} color={colors.navy} bg={colors.navySoft} /></Tap>
										) : null}
									</View>
								</View>
							);
						})}
						<T v="label" style={{ marginTop: 14, marginBottom: 8 }}>{tx(UL.registerToOly)}</T>
						<SelectField value={olyToRegister} onChange={setOlyToRegister} placeholder={tx(UL.selectOly)} options={available.map((o) => ({ value: String(o.id), label: pick(o) }))} title={tx(UL.selectOly)} />
						<Button size="md" icon={Plus} title={tx(coordinator ? UL.requestRegistration : UL.registerBtn)} disabled={!olyToRegister} loading={busy === 'register'} onPress={registerToOly} style={{ marginTop: 10 }} />
					</Card>
				</>
			) : null}

			{/* Teachers (free-text list) */}
			<Card style={{ marginTop: 12 }}>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
					<T v="h3" style={{ flexGrow: 1, flexShrink: 1, minWidth: 120 }}>{tx(UL.teachers)}</T>
					{editing ? <Button size="sm" variant="soft" icon={Plus} title={tx(UL.add)} onPress={() => setForm((p) => ({ ...p, teachers: [...(p.teachers || []), { name: '', phone: '+998' }] }))} /> : null}
					{!editing && coordinator ? <Button size="sm" variant="light" icon={Edit2} title={tx(UL.requestEdit)} onPress={() => setReqTeachers({ teacher_name: user.teacher_name || '', teacher_phone: user.teacher_phone || '', teachers: JSON.parse(JSON.stringify(user.teachers || [])), reason: '' })} /> : null}
				</View>
				{!teachers.length ? <T v="small">{tx(UL.noTeachers)}</T> : null}
				{teachers.map((tch, idx) =>
					editing ? (
						<View key={idx} style={[styles.reg, { gap: 8 }]}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<T v="strong" style={{ flex: 1 }}>{tch.name || '—'} {tch.phone ? `· ${tch.phone}` : ''}</T>
								<Tap onPress={() => setForm((p) => ({ ...p, teachers: p.teachers.filter((_, i) => i !== idx) }))} style={styles.del}><X size={15} color={colors.red} /></Tap>
							</View>
							<TeacherSearch onSelect={(t) => setForm((p) => ({ ...p, teachers: p.teachers.map((x, i) => (i === idx ? { name: t.full_name, phone: t.phone || '+998' } : x)) }))} />
						</View>
					) : (
						<View key={idx} style={styles.row}>
							<User size={16} color={colors.faint} />
							<T v="strong" style={{ flex: 1, fontSize: 14 }}>{tch.name || '—'}</T>
							<T v="small">{tch.phone || '—'}</T>
						</View>
					)
				)}
			</Card>

			{editing ? (
				<View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
					<Button style={{ flex: 1 }} variant="light" size="md" title={tx(UL.cancel)} onPress={() => setEditing(false)} />
					<Button style={{ flex: 1.4 }} size="md" title={tx(UL.save)} loading={busy === 'save'} onPress={saveEdit} />
				</View>
			) : !coordinator ? (
				<View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
					<Button style={{ flex: 1 }} variant="dark" size="md" icon={Key} title={tx(UL.resetPass)} onPress={() => setResetOpen(true)} />
					<Button size="md" variant="danger" icon={Trash2} title="" onPress={() => setConfirm({ title: tx(UL.deleteTitle), message: `${user.first_name} ${user.last_name}. ${tx(UL.deleteMsg)}`, tone: 'red', onConfirm: async () => { try { await api.delete(`users/${user.id}/`); toast.success(tx(UL.deleted)); router.back(); } catch (err) { toast.error(errorMessage(err)); } } })} />
				</View>
			) : null}

			<Sheet visible={resetOpen} onClose={() => setResetOpen(false)} title={tx(UL.resetPass)}>
				<Field label={tx(UL.newPass)} icon={Lock} value={newPass} onChangeText={setNewPass} autoCapitalize="none" autoCorrect={false} />
				<Button title={tx(UL.confirmReset)} loading={busy === 'reset'} disabled={!newPass} onPress={resetPassword} style={{ marginTop: 14 }} />
			</Sheet>

			<Sheet visible={!!reqEdit} onClose={() => setReqEdit(null)} title={tx(UL.requestEdit)} scroll maxHeight="94%">
				{reqEdit ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<T v="small">{tx(UL.requestEditDesc)}</T>
						{['last_name', 'first_name', 'middle_name'].map((k) => (
							<Field key={k} label={tx(UL[{ last_name: 'lastName', first_name: 'firstName', middle_name: 'middleName' }[k]])} value={reqEdit[k]} onChangeText={(v) => setReqEdit((p) => ({ ...p, [k]: v }))} />
						))}
						<Field label={tx(UL.phone)} value={reqEdit.phone} keyboardType="phone-pad" onChangeText={(v) => setReqEdit((p) => ({ ...p, phone: phoneMask(v) }))} />
						<SelectField label={tx(UL.region)} value={String(reqEdit.region || '')} options={regions.map((r) => ({ value: String(r.id), label: pick(r, 'name') }))} onChange={(v) => setReqEdit((p) => ({ ...p, region: v }))} placeholder={tx(UL.selectRegion)} />
						<Field label={tx(UL.school)} value={reqEdit.school} onChangeText={(v) => setReqEdit((p) => ({ ...p, school: v }))} />
						<SelectField label={tx(UL.grade)} value={String(reqEdit.grade || '')} options={GRADES.map((g) => ({ value: String(g), label: String(gradeText(g)) }))} onChange={(v) => setReqEdit((p) => ({ ...p, grade: v }))} placeholder={tx(UL.selectGrade)} />
						<DateTimeField mode="date" label={tx(UL.birthDate)} value={reqEdit.birth_date} onChange={(v) => setReqEdit((p) => ({ ...p, birth_date: v ? v.slice(0, 10) : '' }))} />
						<Field label={tx(UL.newPassRequest)} value={reqEdit.new_password} onChangeText={(v) => setReqEdit((p) => ({ ...p, new_password: v }))} autoCapitalize="none" />
						<TextArea rows={3} label={tx(UL.reason)} value={reqEdit.reason} onChangeText={(v) => setReqEdit((p) => ({ ...p, reason: v }))} />
						<Button title={tx(UL.submitRequest)} loading={busy === 'req'} onPress={submitUserRequest} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!reqPay} onClose={() => setReqPay(null)} title={tx(UL.requestPay)}>
				{reqPay ? (
					<View style={{ gap: 12 }}>
						<ChoicePills value={reqPay.status} onChange={(s) => setReqPay((p) => ({ ...p, status: s }))} options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
						<TextArea rows={3} label={tx(UL.reason)} value={reqPay.reason} onChangeText={(v) => setReqPay((p) => ({ ...p, reason: v }))} />
						<Button title={tx(UL.submitRequest)} loading={busy === 'reqP'} onPress={submitPayRequest} />
					</View>
				) : null}
			</Sheet>

			<Sheet visible={!!reqTeachers} onClose={() => setReqTeachers(null)} title={tx(UL.requestTeachers)} scroll maxHeight="94%">
				{reqTeachers ? (
					<View style={{ gap: 12, paddingBottom: 10 }}>
						<Field label={tx(UL.teacherName)} value={reqTeachers.teacher_name} onChangeText={(v) => setReqTeachers((p) => ({ ...p, teacher_name: v }))} />
						<Field label={tx(UL.teacherPhone)} value={reqTeachers.teacher_phone} keyboardType="phone-pad" onChangeText={(v) => setReqTeachers((p) => ({ ...p, teacher_phone: phoneMask(v) }))} />
						<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
							<T v="h3" style={{ flexGrow: 1, flexShrink: 1, minWidth: 120 }}>{tx(UL.teachers)}</T>
							<Button size="sm" variant="soft" icon={Plus} title={tx(UL.add)} onPress={() => setReqTeachers((p) => ({ ...p, teachers: [...p.teachers, { name: '', phone: '+998' }] }))} />
						</View>
						{reqTeachers.teachers.map((tch, idx) => (
							<View key={idx} style={[styles.reg, { gap: 8 }]}>
								<View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
									<Tap onPress={() => setReqTeachers((p) => ({ ...p, teachers: p.teachers.filter((_, i) => i !== idx) }))} style={styles.del}><Trash2 size={14} color={colors.red} /></Tap>
								</View>
								<Field label={`${tx(UL.teacherName)} #${idx + 1}`} value={tch.name} onChangeText={(v) => setReqTeachers((p) => ({ ...p, teachers: p.teachers.map((x, i) => (i === idx ? { ...x, name: v } : x)) }))} />
								<Field label={`${tx(UL.teacherPhone)} #${idx + 1}`} value={tch.phone} keyboardType="phone-pad" onChangeText={(v) => setReqTeachers((p) => ({ ...p, teachers: p.teachers.map((x, i) => (i === idx ? { ...x, phone: phoneMask(v) } : x)) }))} />
							</View>
						))}
						<TextArea rows={3} label={tx(UL.reason)} value={reqTeachers.reason} onChangeText={(v) => setReqTeachers((p) => ({ ...p, reason: v }))} />
						<Button title={tx(UL.submitRequest)} loading={busy === 'reqT'} onPress={submitTeacherRequest} />
					</View>
				) : null}
			</Sheet>

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={confirm?.tone === 'red' ? Trash2 : Edit2}
				tone={confirm?.tone || 'gold'}
				title={confirm?.title}
				message={confirm?.message}
				actions={[
					{ title: tx(UL.yes), variant: confirm?.tone === 'red' ? 'danger' : 'primary', onPress: () => { const c = confirm; setConfirm(null); c.onConfirm(); } },
					{ title: tx(UL.cancel), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
			<PermissionSheet visible={!!permission} onClose={() => setPermission(null)} reg={permission?.reg} oly={permission?.oly} user={user} />
		</Screen>
	);
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
	reg: { padding: 12, borderRadius: radius.md, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line, marginBottom: 8 },
	del: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
});
