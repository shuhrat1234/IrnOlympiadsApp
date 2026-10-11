import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { setSessionExpiredHandler } from '../api/client';
import E from '../api/endpoints';
import { store, tokens } from '../api/storage';
import { FALLBACK_REGIONS } from '../utils/constants';

const AuthContext = createContext(null);

export const STUDENT_ROLE = 'participant';
// The app serves students and teachers only — staff accounts use the website.
export const KNOWN_ROLES = [STUDENT_ROLE, 'teacher'];
export const isStudent = (user) => user?.role === STUDENT_ROLE;
export const isTeacher = (user) => user?.role === 'teacher';
const allowed = (user) => KNOWN_ROLES.includes(user?.role);

// Where each role lands after login.
export const homeRouteFor = (user) => (isTeacher(user) ? '/teacher' : '/');

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);
	const [booting, setBooting] = useState(true);
	const [regions, setRegions] = useState(FALLBACK_REGIONS);
	const userRef = useRef(null);
	userRef.current = currentUser;

	const persistUser = useCallback((user) => {
		setCurrentUser(user);
		if (user) store.set('user', user);
		else store.remove('user');
	}, []);

	const logout = useCallback(async () => {
		await tokens.clear();
		await store.remove('user');
		setCurrentUser(null);
	}, []);

	useEffect(() => {
		setSessionExpiredHandler(() => {
			store.remove('user');
			setCurrentUser(null);
		});
	}, []);

	const fetchRegions = useCallback(async () => {
		try {
			const res = await api.get(E.REGIONS);
			const data = res.data?.results || res.data;
			if (Array.isArray(data) && data.length > 0) setRegions(data);
		} catch {}
	}, []);

	const fetchMe = useCallback(async () => {
		if (!tokens.access) return null;
		try {
			const res = await api.get(E.PROFILE);
			if (!allowed(res.data)) {
				await logout();
				return null;
			}
			persistUser(res.data);
			return res.data;
		} catch (err) {
			if (err.response?.status === 401 || err.response?.status === 403) await logout();
			return null;
		}
	}, [logout, persistUser]);

	// Restore session: cached profile renders instantly, then refresh from the API.
	useEffect(() => {
		(async () => {
			const { access } = await tokens.load();
			if (access) {
				const cached = await store.get('user');
				if (allowed(cached)) setCurrentUser(cached);
				setBooting(false);
				fetchMe();
			} else {
				setBooting(false);
			}
			fetchRegions();
		})();
	}, []);

	const completeLogin = useCallback(
		async (data) => {
			// Same fallbacks as the website: tokens may come flat or nested.
			const user = data.user;
			const access = data.access || data.tokens?.access || data.token;
			const refresh = data.refresh || data.tokens?.refresh;
			if (!allowed(user)) {
				return { success: false, error: 'role', role: user?.role };
			}
			await tokens.set(access, refresh);
			persistUser(user);
			return { success: true, user };
		},
		[persistUser]
	);

	const login = useCallback(
		async (username, password) => {
			try {
				const res = await api.post(E.LOGIN, { phone_or_id: username, username, password });
				if (res.data.multiple_accounts) {
					return { success: false, multiple_accounts: true, accounts: res.data.accounts || [] };
				}
				if (res.data.requires_2fa) {
					return { success: false, requires_2fa: true, pre_auth_token: res.data.pre_auth_token };
				}
				return completeLogin(res.data);
			} catch (error) {
				const d = error.response?.data;
				return { success: false, error: d?.error || d?.detail || d?.message || (error.response ? 'login_failed' : 'network') };
			}
		},
		[completeLogin]
	);

	const verify2FA = useCallback(
		async (preAuthToken, code) => {
			try {
				const res = await api.post(E.TWOFA_VERIFY, { pre_auth_token: preAuthToken, code });
				return completeLogin(res.data);
			} catch (error) {
				return { success: false, error: error.response?.data?.error || 'invalid_code' };
			}
		},
		[completeLogin]
	);

	// Same payload the website's RegistrationPage sends (username = phone).
	const register = useCallback(
		async (form) => {
			try {
				let birth = form.birthDate;
				if (birth && birth.includes('.')) {
					const [d, m, y] = birth.split('.');
					birth = `${y}-${m}-${d}`;
				}
				const payload = {
					username: form.phone,
					password: form.password,
					first_name: form.firstName,
					last_name: form.lastName,
					middle_name: form.middleName,
					birth_date: birth,
					phone: form.phone,
					region: form.regionId,
					school: form.school,
					grade: form.grade,
					teacher_name: form.teacher_name,
					teacher_phone: form.teacher_phone,
					teacher: form.teacherId || null,
					teachers: [],
				};
				const res = await api.post(E.REGISTER, payload);
				const user = res.data.user;
				const access = res.data.access || res.data.tokens?.access || res.data.token;
				const refresh = res.data.refresh || res.data.tokens?.refresh;
				if (access && refresh) {
					await tokens.set(access, refresh);
					persistUser(user);
				}
				return { success: true, user };
			} catch (error) {
				return {
					success: false,
					error: error.response?.data?.error || (error.response ? 'registration_failed' : 'network'),
					fields: error.response?.data?.fields,
				};
			}
		},
		[persistUser]
	);

	const updateProfile = useCallback(
		async (data) => {
			try {
				const res = await api.patch(E.PROFILE, data);
				persistUser(res.data);
				return { success: true, data: res.data };
			} catch (err) {
				return { success: false, error: err.response?.data };
			}
		},
		[persistUser]
	);

	// Website's /register-teacher page (username = phone); the new teacher is signed in right away.
	const registerTeacher = useCallback(
		async (form) => {
			try {
				const res = await api.post(E.REGISTER_TEACHER, {
					username: form.phone,
					password: form.password,
					first_name: form.firstName,
					last_name: form.lastName,
					middle_name: form.middleName,
					phone: form.phone,
					region: form.regionId,
				});
				const d = res.data;
				const access = d.access || d.tokens?.access || d.token;
				const refresh = d.refresh || d.tokens?.refresh;
				if (access && refresh) {
					await tokens.set(access, refresh);
					persistUser(d.user);
				}
				return { success: true, user: d.user, loggedIn: !!(access && refresh) };
			} catch (error) {
				return { success: false, error: error.response?.data?.error || (error.response ? 'registration_failed' : 'network'), fields: error.response?.data };
			}
		},
		[persistUser]
	);

	const markNotificationAsRead = useCallback(async (id) => {
		try {
			await api.post(E.NOTIFICATION_MARK_READ(id));
			await fetchMe();
			return { success: true };
		} catch {
			return { success: false };
		}
	}, [fetchMe]);

	const markAllNotificationsAsRead = useCallback(async () => {
		try {
			await api.post(E.NOTIFICATIONS_MARK_ALL_READ);
			await fetchMe();
			return { success: true };
		} catch {
			return { success: false };
		}
	}, [fetchMe]);

	const deleteNotification = useCallback(async (id) => {
		const user = userRef.current;
		if (user) setCurrentUser({ ...user, notifications: (user.notifications || []).filter((n) => n.id !== id) });
		try {
			await api.delete(`${E.NOTIFICATIONS}${id}/`);
		} catch {}
		await fetchMe();
	}, [fetchMe]);

	const deleteAllNotifications = useCallback(async () => {
		const user = userRef.current;
		const list = user?.notifications || [];
		if (!list.length) return;
		setCurrentUser({ ...user, notifications: [] });
		// Sequential, like the website, so the backend isn't flooded.
		for (const n of list) {
			try {
				await api.delete(`${E.NOTIFICATIONS}${n.id}/`);
			} catch {}
		}
		await fetchMe();
	}, [fetchMe]);

	const value = useMemo(
		() => ({
			currentUser,
			isLoggedIn: !!currentUser,
			booting,
			regions,
			login,
			verify2FA,
			logout,
			register,
			registerTeacher,
			fetchMe,
			fetchRegions,
			updateProfile,
			setCurrentUser,
			markNotificationAsRead,
			markAllNotificationsAsRead,
			deleteNotification,
			deleteAllNotifications,
		}),
		[currentUser, booting, regions, login, verify2FA, logout, register, registerTeacher, fetchMe, fetchRegions, updateProfile, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
