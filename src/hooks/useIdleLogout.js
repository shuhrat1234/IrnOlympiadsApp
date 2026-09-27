import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

const IDLE_MS = 20 * 60 * 1000;

// Website parity: the student cabinet signs out after 20 minutes without
// interaction. Exams are exempt (reading a long question is not "idle").
// Returns a touch handler to attach to the root view.
export default function useIdleLogout() {
	const { isLoggedIn, logout } = useAuth();
	const { t } = useLanguage();
	const toast = useToast();
	const pathname = usePathname();
	const lastActive = useRef(Date.now());
	const timer = useRef(null);
	const inExam = pathname?.startsWith('/exam');

	const fire = useCallback(() => {
		logout();
		toast.info(t('loggedOut'));
	}, [logout, toast, t]);

	const arm = useCallback(() => {
		clearTimeout(timer.current);
		lastActive.current = Date.now();
		if (isLoggedIn && !inExam) timer.current = setTimeout(fire, IDLE_MS);
	}, [isLoggedIn, inExam, fire]);

	useEffect(() => {
		arm();
		return () => clearTimeout(timer.current);
	}, [arm]);

	// JS timers pause in the background, so check the wall clock on resume.
	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state !== 'active' || !isLoggedIn || inExam) return;
			if (Date.now() - lastActive.current >= IDLE_MS) fire();
			else arm();
		});
		return () => sub.remove();
	}, [isLoggedIn, inExam, fire, arm]);

	return arm;
}
