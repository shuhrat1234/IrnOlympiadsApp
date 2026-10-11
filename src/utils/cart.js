import { useSyncExternalStore } from 'react';
import { store } from '../api/storage';

// Book-shop cart shared by the catalog and the checkout screen
// (the website keeps the same list in localStorage under irn_book_cart).
const KEY = 'book_cart';
let items = []; // [{ book, quantity }]
const listeners = new Set();

const commit = (next) => {
	items = next;
	store.set(KEY, items);
	listeners.forEach((fn) => fn());
};

store.get(KEY, []).then((saved) => {
	if (Array.isArray(saved) && saved.length && !items.length) {
		items = saved;
		listeners.forEach((fn) => fn());
	}
});

const maxQty = (book, fallback) => (book.stock === null || book.stock === undefined ? fallback : Number(book.stock));

export const cart = {
	add(book) {
		const existing = items.find((i) => i.book.id === book.id);
		if (existing) commit(items.map((i) => (i.book.id === book.id ? { ...i, quantity: Math.min(maxQty(book, i.quantity + 1), i.quantity + 1) } : i)));
		else commit([...items, { book, quantity: 1 }]);
	},
	setQuantity(bookId, quantity) {
		commit(items.map((i) => (i.book.id === bookId ? { ...i, quantity: Math.max(1, Math.min(maxQty(i.book, quantity), quantity)) } : i)));
	},
	remove(bookId) {
		commit(items.filter((i) => i.book.id !== bookId));
	},
	clear() {
		commit([]);
	},
};

const subscribe = (fn) => {
	listeners.add(fn);
	return () => listeners.delete(fn);
};

export const useCart = () => {
	const list = useSyncExternalStore(subscribe, () => items);
	return {
		items: list,
		count: list.reduce((sum, i) => sum + i.quantity, 0),
		total: list.reduce((sum, i) => sum + (Number(i.book.price) || 0) * i.quantity, 0),
	};
};
