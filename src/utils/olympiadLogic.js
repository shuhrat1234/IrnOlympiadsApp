// Business rules ported 1:1 from the website's MyOlympiadsPage / OlympiadDetail.

export const olyIdOf = (reg) => (reg?.olympiad && typeof reg.olympiad === 'object' ? reg.olympiad.id : reg?.olympiad);

export const userSessionFor = (sub, user) => {
	const grade = String(user?.grade || '');
	return sub?.grade_sessions?.find((gs) => String(gs.grade).trim() === grade) || null;
};

export const resultForSession = (user, sessionId) =>
	user?.exam_results?.find((r) => String(r.sub_olympiad_grade) === String(sessionId)) || null;

export const resultForOlympiad = (user, olyId) =>
	user?.exam_results?.find((r) => String(r.olympiad) === String(olyId) && !r.sub_olympiad_grade) || null;

export const isPaidLike = (reg, oly) => reg?.payment_status === 'paid' || reg?.payment_status === 'free' || Number(oly?.price) === 0;

// 'completed' | 'expired' | 'active' | 'waiting'
export const registrationStatus = (reg, oly) => {
	if (reg.status === 'completed') return 'completed';
	if (reg.payment_status === 'expired') return 'expired';
	if (oly.is_started) return 'active';
	if (oly.is_completed) return 'completed';
	return 'waiting';
};

export const canStartExam = (user, reg, oly, session = null) => {
	if (!oly || oly.olympiad_type !== 'online') return false;
	if (reg.payment_status !== 'paid' && reg.payment_status !== 'free' && oly.price > 0) return false;
	if (oly.subs && oly.subs.length > 0) {
		if (!session) return false;
		const result = resultForSession(user, session.id);
		if (session.is_completed) return false;
		if (!session.is_started && !result) return false;
		if (result && result.completed_at) return false;
		return true;
	}
	if (reg.status === 'completed') return false;
	if (!oly.is_started || oly.is_completed) return false;
	const result = user?.exam_results?.find((r) => String(r.olympiad) === String(oly.id));
	return !(result && result.completed_at);
};

export const isMustaqillikOly = (oly) => {
	if (!oly) return false;
	const text = `${oly.title_uz || ''} ${oly.title_ru || ''} ${oly.title_en || ''} ${(oly.subs || [])
		.map((s) => `${s.title_uz || ''} ${s.title_ru || ''} ${s.title_en || ''}`)
		.join(' ')}`.toLowerCase();
	return text.includes('mustaqillik');
};

export const recipientMatch = (user, oly, reg) => {
	const recipients = oly?.certificate_config?.recipients;
	if (!Array.isArray(recipients) || recipients.length === 0) return null;
	const normalize = (v) => String(v || '').toLowerCase().replace(/[\s\-_]/g, '');
	const digits = (v) => String(v || '').replace(/\D/g, '');
	const rawIds = [reg?.unique_participant_id, reg?.id, user?.participant_id, user?.username, user?.id ? String(user.id) : null].filter(Boolean);
	const ids = rawIds.map(normalize);
	const digitIds = rawIds.map(digits).filter((d) => d.length >= 3);
	const names = [
		`${user?.last_name || ''} ${user?.first_name || ''}`,
		`${user?.first_name || ''} ${user?.last_name || ''}`,
		`${user?.last_name || ''} ${user?.first_name || ''} ${user?.middle_name || ''}`,
		user?.username,
	]
		.filter(Boolean)
		.map((n) => n.toLowerCase().trim());

	return (
		recipients.find((r) => {
			if (r.id_number) {
				const rId = normalize(r.id_number);
				const rDigits = digits(r.id_number);
				if (ids.some((id) => id === rId || (id.length >= 4 && rId.includes(id)) || (rId.length >= 4 && id.includes(rId)))) return true;
				if (rDigits && digitIds.some((d) => d === rDigits || (d.length >= 4 && rDigits.includes(d)) || (rDigits.length >= 4 && d.includes(rDigits)))) return true;
			}
			if (r.name) {
				const rName = r.name.toLowerCase().trim();
				if (names.some((n) => n === rName || (n.length > 4 && rName.includes(n)) || (rName.length > 4 && n.includes(rName)))) return true;
			}
			return false;
		}) || null
	);
};

const hasScore = (r) => r && r.score !== undefined && r.score !== null && r.score !== '';

export const olympiadScore = (user, reg, oly) => {
	if (hasScore(reg)) return reg.score;
	const direct = user?.exam_results?.find((r) => String(r.olympiad) === String(oly?.id));
	if (hasScore(direct)) return direct.score;
	const grade = String(user?.grade || '');
	for (const sub of oly?.subs || []) {
		const session = sub.grade_sessions?.find((gs) => String(gs.grade).trim() === grade);
		if (session) {
			const r = resultForSession(user, session.id);
			if (hasScore(r)) return r.score;
		}
		for (const gs of sub.grade_sessions || []) {
			const r = resultForSession(user, gs.id);
			if (hasScore(r)) return r.score;
		}
	}
	const any = user?.exam_results?.find((r) => String(r.olympiad) === String(oly?.id) || oly?.subs?.some((s) => s.grade_sessions?.some((gs) => String(gs.id) === String(r.sub_olympiad_grade))));
	if (hasScore(any)) return any.score;
	return '';
};

export const canShowCertificate = () => {
	// Certificate fully turned off
	return false;
};

// Registration state of the current user for a catalog olympiad (OlympiadDetail rules).
export const registrationStateFor = (user, userRegistrations, oly) => {
	const matches = (r) => String(r.olympiad?.id || r.olympiad) === String(oly?.id) && r.payment_status !== 'expired';
	const userReg = (userRegistrations || []).find(matches) || user?.registrations?.find(matches) || null;
	const registeredRaw = Boolean(oly?.is_registered || userReg);
	const paidOly = Number(oly?.price) > 0;
	const isPaid = paidOly ? userReg?.payment_status === 'paid' : Boolean(userReg) || registeredRaw;
	const isPendingPayment = paidOly && !isPaid && registeredRaw;
	return { userReg, isPaid, isPendingPayment, isRegistered: isPaid || isPendingPayment || registeredRaw };
};

// Builds the data object the certificate renderer expects.
export const certificateData = ({ user, oly, reg, title, subTitle, sessionResult, dateText }) => {
	const match = recipientMatch(user, oly, reg);
	return {
		name: match?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
		title,
		sub_title: subTitle || '',
		date: dateText,
		score: match?.score || sessionResult?.score || olympiadScore(user, reg, oly),
		grade: match?.grade || String(user?.grade || ''),
		award: match?.award || '',
		regId: reg?.unique_participant_id || match?.id_number,
		oly,
	};
};
