import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Linking, StyleSheet, View } from 'react-native';
import { Check, CheckCircle2, ExternalLink, RefreshCw, Wallet } from 'lucide-react-native';
import api, { errorMessage } from '../api/client';
import E from '../api/endpoints';
import { useLanguage } from '../context/LanguageContext';
import { useOlympiad } from '../context/OlympiadContext';
import { useToast } from '../context/ToastContext';
import { Button, EmptyState, Pill, Sheet, T, Tap } from './ui';
import { colors, fonts, radius } from '../theme';
import { formatMoney } from '../utils/format';

const L = {
	title: { uz: "O'quvchilar uchun to'lov", ru: 'Оплата за учеников', en: 'Pay for students' },
	subtitle: {
		uz: "O'quvchilaringizni olimpiadalarga taqsimlang va barchasi uchun bir martada to'lang.",
		ru: 'Распределите учеников по олимпиадам и оплатите всё одним платежом.',
		en: 'Assign your students to olympiads and pay for everyone at once.',
	},
	noPaid: { uz: "Hozircha to'lovli faol olimpiada yo'q", ru: 'Сейчас нет активных платных олимпиад', en: 'No active paid olympiads right now' },
	students: { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
	selectAll: { uz: 'Barchasini tanlash', ru: 'Выбрать всех', en: 'Select all' },
	clear: { uz: 'Tozalash', ru: 'Очистить', en: 'Clear' },
	alreadyPaid: { uz: "To'langan", ru: 'Оплачено', en: 'Paid' },
	perStudent: { uz: "Bitta o'quvchi", ru: 'За ученика', en: 'Per student' },
	package: { uz: 'Paket tarkibi', ru: 'Состав пакета', en: 'Package breakdown' },
	empty: { uz: "Hali hech qanday o'quvchi tanlanmadi", ru: 'Пока никто не выбран', en: 'No students selected yet' },
	total: { uz: "Jami to'lov summasi", ru: 'Итого к оплате', en: 'Total to pay' },
	method: { uz: "To'lov usulini tanlang", ru: 'Выберите способ оплаты', en: 'Choose payment method' },
	autoAccess: {
		uz: "To'lov tasdiqlanishi bilan tanlangan barcha o'quvchilarga ruxsat avtomatik ochiladi.",
		ru: 'После подтверждения оплаты доступ откроется всем выбранным ученикам автоматически.',
		en: 'Once the payment is confirmed, access opens automatically for all selected students.',
	},
	needItems: { uz: "Olimpiada va kamida bitta o'quvchini tanlang", ru: 'Выберите олимпиаду и хотя бы одного ученика', en: 'Select an olympiad and at least one student' },
	createdTitle: { uz: "To'lov yaratildi!", ru: 'Платёж создан!', en: 'Payment created!' },
	createdDesc: {
		uz: "To'lovni ilovada yakunlang. To'lov tasdiqlangach, barcha o'quvchilar uchun olimpiadaga kirish avtomatik ochiladi.",
		ru: 'Завершите оплату в приложении банка. После подтверждения доступ к олимпиаде откроется всем ученикам.',
		en: 'Finish the payment in the payment app. Access opens for all students once it is confirmed.',
	},
	openPay: { uz: "To'lov sahifasini ochish", ru: 'Открыть страницу оплаты', en: 'Open payment page' },
	check: { uz: "To'lov holatini tekshirish", ru: 'Проверить статус оплаты', en: 'Check payment status' },
	paidAll: { uz: "Barcha o'quvchilar uchun to'lov qabul qilindi!", ru: 'Оплата за всех учеников принята!', en: 'Payment received for all students!' },
	stillPending: { uz: "To'lov kutilmoqda. To'lagandan so'ng holatni tekshiring.", ru: 'Оплата ещё не поступила. После оплаты проверьте статус.', en: 'Payment is still pending. Check the status after paying.' },
	edit: { uz: 'Tahrirlash / Orqaga', ru: 'Изменить / Назад', en: 'Edit / Back' },
	regs: { uz: "ta ro'yxat", ru: 'регистраций', en: 'registrations' },
};

const regFor = (student, olyId) => (student.registrations || []).find((r) => String(r.olympiad_id || r.olympiad?.id || r.olympiad) === String(olyId));
const isPaid = (student, olyId) => ['paid', 'free'].includes(regFor(student, olyId)?.payment_status);

// Teacher's group payment (website "Guruhli to'lov"): students are assigned to one
// or several paid olympiads and everything is paid with a single Click/Payme invoice.
export default function GroupPaySheet({ visible, onClose, students, preselected, onPaid }) {
	const { tx, pick } = useLanguage();
	const { olympiads } = useOlympiad();
	const toast = useToast();
	const paidOlympiads = useMemo(() => olympiads.filter((o) => o.is_active && !o.is_free && (Number(o.price) || 0) > 0), [olympiads]);
	const [activeId, setActiveId] = useState(null);
	// { [olympiadId]: Set<studentId> } — students ticked in the list start on the first olympiad.
	// The parent remounts the sheet (key) on every open, so this runs once per opening.
	const [assign, setAssign] = useState(() => {
		const first = paidOlympiads[0];
		if (!first || !preselected?.size) return {};
		return { [first.id]: new Set(students.filter((s) => preselected.has(s.id) && !isPaid(s, first.id)).map((s) => s.id)) };
	});
	const [creating, setCreating] = useState(null);
	const [payment, setPayment] = useState(null);
	const [checking, setChecking] = useState(false);

	const active = paidOlympiads.find((o) => o.id === activeId) || paidOlympiads[0] || null;

	const breakdown = useMemo(
		() =>
			paidOlympiads
				.map((oly) => {
					const list = students.filter((s) => assign[oly.id]?.has(s.id) && !isPaid(s, oly.id));
					const price = Number(oly.price) || 0;
					return { oly, list, price, subtotal: list.length * price };
				})
				.filter((b) => b.list.length),
		[paidOlympiads, students, assign]
	);
	const total = breakdown.reduce((sum, b) => sum + b.subtotal, 0);
	const count = breakdown.reduce((sum, b) => sum + b.list.length, 0);

	const toggle = (studentId) =>
		setAssign((prev) => {
			const set = new Set(prev[active.id] || []);
			if (set.has(studentId)) set.delete(studentId);
			else set.add(studentId);
			return { ...prev, [active.id]: set };
		});
	const eligible = active ? students.filter((s) => !isPaid(s, active.id)) : [];
	const allOn = eligible.length > 0 && eligible.every((s) => assign[active.id]?.has(s.id));
	const toggleAll = () => setAssign((prev) => ({ ...prev, [active.id]: allOn ? new Set() : new Set(eligible.map((s) => s.id)) }));

	const create = async (method) => {
		if (!breakdown.length) {
			toast.error(tx(L.needItems));
			return;
		}
		setCreating(method);
		try {
			const res = await api.post(E.GROUP_PAYMENT_CREATE, {
				items: breakdown.map((b) => ({ olympiad_id: b.oly.id, student_ids: b.list.map((s) => s.id) })),
				payment_method: method,
			});
			setPayment(res.data);
			if (res.data?.link) Linking.openURL(res.data.link).catch(() => {});
		} catch (err) {
			toast.error(errorMessage(err, tx({ uz: 'Xatolik yuz berdi', ru: 'Произошла ошибка', en: 'Something went wrong' })));
		}
		setCreating(null);
	};

	const check = async (silent = false) => {
		if (!payment?.group_payment_id || checking) return;
		setChecking(true);
		try {
			const res = await api.get(E.GROUP_PAYMENT_STATUS(payment.group_payment_id));
			if (res.data?.is_paid) {
				toast.success(tx(L.paidAll));
				setPayment(null);
				onPaid?.();
				onClose?.();
			} else {
				setPayment((p) => (p ? { ...p, ...res.data, group_payment_id: p.group_payment_id, link: p.link } : p));
				if (!silent) toast.info(tx(L.stillPending));
			}
		} catch (err) {
			if (!silent) toast.error(errorMessage(err));
		}
		setChecking(false);
	};

	// Coming back from Click/Payme → re-check automatically.
	useEffect(() => {
		if (!visible || !payment?.group_payment_id) return;
		const sub = AppState.addEventListener('change', (s) => s === 'active' && check(true));
		return () => sub.remove();
	}, [visible, payment?.group_payment_id]);

	return (
		<Sheet visible={visible} onClose={() => !creating && onClose?.()} title={tx(L.title)} scroll maxHeight="94%">
			{payment ? (
				<View style={{ gap: 12, paddingBottom: 8, alignItems: 'stretch' }}>
					<View style={{ alignItems: 'center', gap: 8 }}>
						<View style={styles.okIcon}><CheckCircle2 size={30} color={colors.green} /></View>
						<T v="h2" style={{ textAlign: 'center' }}>{tx(L.createdTitle)}</T>
						<T v="small" style={{ textAlign: 'center' }}>{tx(L.createdDesc)}</T>
					</View>
					<View style={styles.summary}>
						{(payment.breakdown || []).map((b) => (
							<View key={b.olympiad_id} style={styles.sumRow}>
								<T v="small" style={{ flex: 1 }} numberOfLines={2}>{b.olympiad_title}</T>
								<T v="strong" style={{ fontSize: 13 }}>{b.count} × {formatMoney(b.price)}</T>
							</View>
						))}
						<View style={[styles.sumRow, styles.sumTotal]}>
							<T v="strong" style={{ flex: 1 }}>{tx(L.total)}</T>
							<T style={styles.totalValue}>{formatMoney(payment.total_amount)} UZS</T>
						</View>
					</View>
					{payment.link ? <Button icon={ExternalLink} title={tx(L.openPay)} onPress={() => Linking.openURL(payment.link).catch(() => {})} /> : null}
					<Button variant="dark" icon={RefreshCw} title={tx(L.check)} loading={checking} onPress={() => check()} />
					<Button variant="ghost" size="md" title={tx(L.edit)} onPress={() => setPayment(null)} />
				</View>
			) : !paidOlympiads.length ? (
				<EmptyState icon={Wallet} title={tx(L.noPaid)} />
			) : (
				<View style={{ gap: 12, paddingBottom: 8 }}>
					<T v="small">{tx(L.subtitle)}</T>

					<View style={{ gap: 8 }}>
						{paidOlympiads.map((oly) => {
							const on = active?.id === oly.id;
							const n = students.filter((s) => assign[oly.id]?.has(s.id) && !isPaid(s, oly.id)).length;
							return (
								<Tap key={oly.id} onPress={() => setActiveId(oly.id)} style={[styles.oly, on && styles.olyOn]}>
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 14 }} numberOfLines={2}>{pick(oly)}</T>
										<T v="small" style={{ fontSize: 12 }}>{tx(L.perStudent)}: {formatMoney(oly.price)} UZS</T>
									</View>
									{n ? <View style={styles.count}><T style={styles.countText}>{n}</T></View> : null}
								</Tap>
							);
						})}
					</View>

					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
						<T v="h3" style={{ flex: 1 }}>{tx(L.students)}</T>
						{eligible.length ? (
							<Tap onPress={toggleAll} hitSlop={8}><T v="strong" color={colors.amber} style={{ fontSize: 13 }}>{tx(allOn ? L.clear : L.selectAll)}</T></Tap>
						) : null}
					</View>
					<View style={{ gap: 6 }}>
						{students.map((s) => {
							const paid = isPaid(s, active.id);
							const on = !paid && !!assign[active.id]?.has(s.id);
							return (
								<Tap key={s.id} onPress={() => toggle(s.id)} disabled={paid} style={[styles.student, on && styles.studentOn, paid && { opacity: 0.6 }]}>
									<View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={14} color={colors.navyDeep} strokeWidth={3} /> : null}</View>
									<View style={{ flex: 1 }}>
										<T v="strong" style={{ fontSize: 14 }} numberOfLines={1}>{s.last_name} {s.first_name}</T>
										<T v="small" style={{ fontSize: 12 }}>{s.grade ? `${s.grade} · ` : ''}{s.phone}</T>
									</View>
									{paid ? <Pill label={tx(L.alreadyPaid)} color={colors.green} bg={colors.greenSoft} /> : null}
								</Tap>
							);
						})}
					</View>

					<View style={styles.summary}>
						<T v="label">{tx(L.package)}</T>
						{breakdown.length ? breakdown.map((b) => (
							<View key={b.oly.id} style={styles.sumRow}>
								<T v="small" style={{ flex: 1 }} numberOfLines={2}>{pick(b.oly)}</T>
								<T v="strong" style={{ fontSize: 13 }}>{b.list.length} × {formatMoney(b.price)}</T>
							</View>
						)) : <T v="small">{tx(L.empty)}</T>}
						<View style={[styles.sumRow, styles.sumTotal]}>
							<View style={{ flex: 1 }}>
								<T v="strong">{tx(L.total)}</T>
								<T v="small" style={{ fontSize: 12 }}>{count} {tx(L.regs)}</T>
							</View>
							<T style={styles.totalValue}>{formatMoney(total)} UZS</T>
						</View>
					</View>

					<T v="label" style={{ marginTop: 2 }}>{tx(L.method)}</T>
					<View style={{ flexDirection: 'row', gap: 10 }}>
						{[['payme', require('../../assets/brand/payme.png'), 'Payme'], ['click', require('../../assets/brand/click.png'), 'CLICK']].map(([method, logo, name]) => (
							<Tap key={method} onPress={() => create(method)} disabled={!!creating || !breakdown.length} containerStyle={{ flex: 1 }} style={[styles.method, (!!creating || !breakdown.length) && { opacity: 0.5 }]}>
								<Image source={logo} style={{ width: 34, height: 34, borderRadius: 9 }} resizeMode="contain" />
								<T v="strong" style={{ fontSize: 14 }}>{creating === method ? '…' : name}</T>
							</Tap>
						))}
					</View>
					<T v="small" style={{ fontSize: 12, textAlign: 'center' }}>{tx(L.autoAccess)}</T>
				</View>
			)}
		</Sheet>
	);
}

const styles = StyleSheet.create({
	okIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
	oly: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
	olyOn: { borderColor: colors.goldDeep, backgroundColor: colors.goldTint },
	count: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 7, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
	countText: { color: colors.white, fontFamily: fonts.extrabold, fontSize: 12 },
	student: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
	studentOn: { borderColor: colors.goldDeep, backgroundColor: '#FFFCF1' },
	box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
	boxOn: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
	summary: { gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.cardMuted },
	sumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	sumTotal: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
	totalValue: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
	method: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 58, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
});
