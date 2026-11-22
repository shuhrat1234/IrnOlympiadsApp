import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, BookOpen, Info, Search, Target } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOlympiad } from '../../context/OlympiadContext';
import { useToast } from '../../context/ToastContext';
import { Screen, LargeTitle } from '../../components/layout';
import { Button, Dialog, EmptyState, Segmented, SkeletonCard } from '../../components/ui';
import RegistrationCard from '../../components/RegistrationCard';
import OlympiadCard from '../../components/OlympiadCard';
import { CertificateSheet, PermissionSheet } from '../../components/DocumentSheets';
import { certificateData, olyIdOf, registrationStateFor } from '../../utils/olympiadLogic';
import { formatDate } from '../../utils/format';

export default function OlympiadsTab() {
	const params = useLocalSearchParams();
	const { currentUser, fetchMe } = useAuth();
	const { t, lang, pick } = useLanguage();
	const toast = useToast();
	const { olympiads, isLoaded, getOlympiad, fetchOlympiads, fetchUserRegistrations, userRegistrations, cancelRegistration, isRegistrationClosed } = useOlympiad();
	const [tab, setTab] = useState(params.tab === 'available' ? 'available' : 'mine');
	const [confirm, setConfirm] = useState(null);
	const [permission, setPermission] = useState(null);
	const [certificate, setCertificate] = useState(null);

	useEffect(() => {
		if (params.tab === 'available') setTab('available');
	}, [params.tab]);

	const refresh = useCallback(() => Promise.all([fetchMe(), fetchOlympiads(true), fetchUserRegistrations()]), [fetchMe, fetchOlympiads, fetchUserRegistrations]);

	const registrations = currentUser?.registrations?.length ? currentUser.registrations : userRegistrations;
	const allActive = olympiads.filter((o) => o.is_active !== false);

	const onAction = (action) => {
		if (action.direct) router.push(action.route);
		else setConfirm(action);
	};

	const runConfirm = async () => {
		const a = confirm;
		setConfirm(null);
		if (a.cancelRegId) {
			const res = await cancelRegistration(a.cancelRegId);
			if (!res.success) toast.error(res.error);
		} else if (a.route) {
			router.push(a.route);
		}
	};

	const openCertificate = (reg, oly, sub, result) => {
		const title = sub ? `${pick(oly)} - ${pick(sub)}`.trim() : pick(oly) || 'IRN Olympiad';
		setCertificate(certificateData({ user: currentUser, oly, reg, title, subTitle: sub ? pick(sub) : '', sessionResult: result, dateText: formatDate(oly.date || oly.start_datetime, lang, { time: false }) || '01.09.2026' }));
	};

	const loading = !isLoaded && olympiads.length === 0;

	return (
		<Screen onRefresh={refresh} tabBar>
			<LargeTitle title={tab === 'mine' ? t('myOlympiads') : t('availableTitle')} subtitle={tab === 'mine' ? t('myOlympiadsSub') : t('availableSub')} />
			<Segmented
				value={tab}
				onChange={setTab}
				style={{ marginBottom: 18 }}
				options={[
					{ value: 'mine', label: t('mine'), icon: BookOpen, badge: registrations.length || null },
					{ value: 'available', label: t('available'), icon: Search, badge: allActive.length || null },
				]}
			/>

			{loading ? (
				<View style={{ gap: 14 }}>
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</View>
			) : tab === 'mine' ? (
				registrations.length === 0 ? (
					<EmptyState icon={Target} title={t('noMyOlympiads')} text={t('noMyOlympiadsSub')} action={<Button title={t('browseOlympiads')} iconRight={ArrowRight} onPress={() => setTab('available')} />} />
				) : (
					registrations.map((reg, i) => {
						const oly = getOlympiad(olyIdOf(reg)) || (typeof reg.olympiad === 'object' ? reg.olympiad : null);
						if (!oly) return isLoaded ? null : <SkeletonCard key={i} />;
						return <RegistrationCard key={reg.id || i} reg={reg} oly={oly} onAction={onAction} onPermission={(r, o) => setPermission({ reg: r, oly: o })} onCertificate={openCertificate} />;
					})
				)
			) : allActive.length === 0 ? (
				<EmptyState icon={Search} title={t('noAvailable')} text={t('noAvailableSub')} />
			) : (
				allActive.map((oly) => {
					const st = currentUser ? registrationStateFor(currentUser, userRegistrations, oly) : {};
					return (
						<OlympiadCard
							key={oly.id}
							oly={oly}
							userGrade={currentUser?.grade}
							registered={st.isPaid}
							pendingPayment={st.isPendingPayment}
							closed={isRegistrationClosed(oly)}
						/>
					);
				})
			)}

			<Dialog
				visible={!!confirm}
				onClose={() => setConfirm(null)}
				icon={confirm?.icon || Info}
				tone={confirm?.tone || 'gold'}
				title={confirm?.title}
				message={confirm?.msg}
				actions={[
					{ title: confirm?.start ? t('yesStart') : confirm?.tone === 'red' ? t('yes') : t('confirm'), variant: confirm?.tone === 'red' ? 'danger' : 'primary', onPress: runConfirm },
					{ title: t('cancel'), variant: 'ghost', onPress: () => setConfirm(null) },
				]}
			/>
			<PermissionSheet visible={!!permission} onClose={() => setPermission(null)} reg={permission?.reg} oly={permission?.oly} user={currentUser} />
		</Screen>
	);
}
