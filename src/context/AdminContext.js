import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import api from '../api/client';
import E from '../api/endpoints';
import { useAuth, isAdminRole } from './AuthContext';

const AdminContext = createContext({ pendingEditRequests: 0, pendingBookOrders: 0 });

const list = (data) => (Array.isArray(data) ? data : data?.results || []);

// Badges the website's AdminLayout polls every 30 s (admins only).
export const AdminProvider = ({ children }) => {
	const { currentUser } = useAuth();
	const [pendingEditRequests, setPendingEditRequests] = useState(0);
	const [pendingBookOrders, setPendingBookOrders] = useState(0);
	const admin = isAdminRole(currentUser);

	const refreshCounts = useCallback(async () => {
		if (!admin) return;
		const [edits, orders] = await Promise.allSettled([api.get(E.EDIT_REQUESTS), api.get(E.BOOK_ORDERS)]);
		if (edits.status === 'fulfilled') setPendingEditRequests(list(edits.value.data).filter((r) => r.status === 'pending').length);
		if (orders.status === 'fulfilled') setPendingBookOrders(list(orders.value.data).filter((o) => o.status === 'pending').length);
	}, [admin]);

	useEffect(() => {
		refreshCounts();
		const timer = setInterval(() => AppState.currentState === 'active' && refreshCounts(), 30000);
		return () => clearInterval(timer);
	}, [refreshCounts]);

	const value = useMemo(() => ({ pendingEditRequests, pendingBookOrders, refreshCounts, setPendingEditRequests, setPendingBookOrders }), [pendingEditRequests, pendingBookOrders, refreshCounts]);
	return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => useContext(AdminContext);
