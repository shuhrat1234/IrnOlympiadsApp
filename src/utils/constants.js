export const FALLBACK_REGIONS = [
	{ id: 1, name_uz: 'Andijon', name_ru: 'Андижан', name_en: 'Andijan' },
	{ id: 2, name_uz: 'Buxoro', name_ru: 'Бухара', name_en: 'Bukhara' },
	{ id: 3, name_uz: "Farg'ona", name_ru: 'Фергана', name_en: 'Fergana' },
	{ id: 4, name_uz: 'Jizzax', name_ru: 'Джизак', name_en: 'Jizzakh' },
	{ id: 5, name_uz: 'Xorazm', name_ru: 'Хорезм', name_en: 'Khorezm' },
	{ id: 6, name_uz: 'Namangan', name_ru: 'Наманган', name_en: 'Namangan' },
	{ id: 7, name_uz: 'Navoiy', name_ru: 'Навои', name_en: 'Navoi' },
	{ id: 8, name_uz: 'Qashqadaryo', name_ru: 'Кашкадарья', name_en: 'Kashkadarya' },
	{ id: 9, name_uz: 'Samarqand', name_ru: 'Самарканд', name_en: 'Samarkand' },
	{ id: 10, name_uz: 'Sirdaryo', name_ru: 'Сырдарья', name_en: 'Syrdarya' },
	{ id: 11, name_uz: 'Surxondaryo', name_ru: 'Сурхандарья', name_en: 'Surkhandarya' },
	{ id: 12, name_uz: 'Toshkent viloyati', name_ru: 'Ташкентская область', name_en: 'Tashkent Region' },
	{ id: 13, name_uz: 'Toshkent shahri', name_ru: 'город Ташкент', name_en: 'Tashkent City' },
	{ id: 14, name_uz: "Qoraqalpog'iston", name_ru: 'Каракалпакстан', name_en: 'Karakalpakstan' },
];

export const GRADES = ['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '11+'];

export const LINKS = {
	bot: 'https://t.me/irnolympiad_bot',
	channel: 'https://t.me/IRN_Olympiads',
	coordinator: 'https://t.me/IRN_Coordinator_Main',
	site: 'https://irnolympiad.uz',
	books: 'https://irnolympiad.uz/books',
};

// Regional Telegram announcement groups (same mapping as the website).
export const REGION_GROUPS = [
	{ regionIds: [1, 2, 13], uz: 'Toshkent va Sirdaryo', ru: 'Ташкент и Сырдарья', en: 'Tashkent and Sirdaryo', url: 'https://t.me/Olympiads_Tashkent' },
	{ regionIds: [10, 14], uz: "Xorazm va Qoraqalpog'iston", ru: 'Хорезм и Каракалпакстан', en: 'Khorezm and Karakalpakstan', url: 'https://t.me/Khorezm_Karakalpakstan' },
	{ regionIds: [9, 8], uz: 'Surxondaryo va Qashqadaryo', ru: 'Сурхандарья и Кашкадарья', en: 'Surkhandarya and Kashkadarya', url: 'https://t.me/IRN_Surkhandarya_Kashkadarya' },
	{ regionIds: [12, 3], uz: 'Jizzax va Samarqand', ru: 'Джизак и Самарканд', en: 'Jizzakh and Samarkand', url: 'https://t.me/IRNJizzakh_Samarkand' },
	{ regionIds: [11, 4], uz: 'Navoiy va Buxoro', ru: 'Навои и Бухара', en: 'Navoi and Bukhara', url: 'https://t.me/IRN_Navoi_Bukhara' },
	{ regionIds: [6, 7, 5], uz: "Andijon, Namangan va Farg'ona", ru: 'Андижан, Наманган и Фергана', en: 'Andijan, Namangan and Fergana', url: 'https://t.me/Vodiy_IRN' },
];

export const REGION_GROUP_LINKS = {
	1: 'https://t.me/Olympiads_Tashkent', 2: 'https://t.me/Olympiads_Tashkent', 13: 'https://t.me/Olympiads_Tashkent',
	10: 'https://t.me/Khorezm_Karakalpakstan', 14: 'https://t.me/Khorezm_Karakalpakstan',
	9: 'https://t.me/IRN_Surkhandarya_Kashkadarya', 8: 'https://t.me/IRN_Surkhandarya_Kashkadarya',
	12: 'https://t.me/IRNJizzakh_Samarkand', 3: 'https://t.me/IRNJizzakh_Samarkand',
	11: 'https://t.me/IRN_Navoi_Bukhara', 4: 'https://t.me/IRN_Navoi_Bukhara',
	6: 'https://t.me/Vodiy_IRN', 7: 'https://t.me/Vodiy_IRN', 5: 'https://t.me/Vodiy_IRN',
};
