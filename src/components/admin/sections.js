import { Award, BarChart3, Bell, BookOpen, Clock, Coins, FileText, LayoutDashboard, MapPin, MessageCircle, MessageSquareMore, Plane, Send, Trophy, Upload, User, Users, UserCog } from 'lucide-react-native';
import { colors } from '../../theme';

// Admin navigation (website AdminLayout). `coordinator: true` = visible to coordinators.
export const ADMIN_SECTIONS = [
	{ key: 'dashboard', route: '/admin', icon: LayoutDashboard, tint: [colors.goldTint, colors.amber], label: { uz: 'Dashboard', ru: 'Дашборд', en: 'Dashboard' } },
	{ key: 'olympiads', route: '/admin/olympiads', icon: Trophy, tint: [colors.goldTint, colors.amber], label: { uz: 'Olimpiadalar', ru: 'Олимпиады', en: 'Olympiads' } },
	{ key: 'tests', route: '/admin/tests', icon: FileText, tint: [colors.blueSoft, colors.blue], label: { uz: 'Testlar', ru: 'Тесты', en: 'Tests' } },
	{ key: 'books', route: '/admin/books', icon: BookOpen, tint: [colors.purpleSoft, colors.purple], label: { uz: 'Kitoblar', ru: 'Книги', en: 'Books' }, badge: 'books' },
	{ key: 'bts', route: '/admin/bts-points', icon: MapPin, tint: [colors.greenSoft, colors.green], label: { uz: 'BTS punktlari', ru: 'Пункты BTS', en: 'BTS Points' } },
	{ key: 'bonuses', route: '/admin/bonuses', icon: Coins, tint: [colors.goldTint, colors.goldDeep], label: { uz: 'Bonuslar', ru: 'Бонусы', en: 'Bonuses' } },
	{ key: 'users', route: '/admin/users', icon: Users, tint: [colors.navySoft, colors.navy], label: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' }, coordinator: true },
	{ key: 'results', route: '/admin/results', icon: Award, tint: [colors.goldTint, colors.amber], label: { uz: 'Natijalar', ru: 'Результаты', en: 'Results' }, coordinator: true },
	{ key: 'bulk', route: '/admin/bulk-import', icon: Upload, tint: [colors.blueSoft, colors.blue], label: { uz: 'Ommaviy import', ru: 'Массовый импорт', en: 'Bulk Import' }, coordinator: true },
	{ key: 'analytics', route: '/admin/analytics', icon: BarChart3, tint: [colors.purpleSoft, colors.purple], label: { uz: 'Analitika', ru: 'Аналитика', en: 'Analytics' } },
	{ key: 'employees', route: '/admin/employees', icon: UserCog, tint: [colors.navySoft, colors.navy], label: { uz: 'Xodimlar', ru: 'Сотрудники', en: 'Employees' }, badge: 'edits', superOnly: false },
	{ key: 'attendance', route: '/admin/attendance', icon: Clock, tint: [colors.greenSoft, colors.green], label: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' } },
	{ key: 'notifications', route: '/admin/notifications', icon: Bell, tint: [colors.redSoft, colors.red], label: { uz: 'Bildirishnomalar', ru: 'Уведомления', en: 'Notifications' } },
	{ key: 'sms', route: '/admin/sms', icon: MessageSquareMore, tint: [colors.blueSoft, colors.blue], label: { uz: 'SMS Manager', ru: 'SMS Менеджер', en: 'SMS Manager' } },
	{ key: 'telegram', route: '/admin/telegram', icon: Send, tint: [colors.blueSoft, '#0088CC'], label: { uz: 'Telegram Bot', ru: 'Telegram Бот', en: 'Telegram Bot' } },
	{ key: 'visa', route: '/admin/visa', icon: Plane, tint: [colors.navySoft, colors.navy], label: { uz: 'Viza / Elchixona', ru: 'Виза / Посольство', en: 'Visa / Embassy' } },
	{ key: 'support', route: '/support', icon: MessageCircle, tint: [colors.greenSoft, colors.green], label: { uz: "Qo'llab-quvvatlash", ru: 'Поддержка', en: 'Support' }, badge: 'support', coordinator: true },
	{ key: 'profile', route: '/admin/profile', icon: User, tint: [colors.cardMuted, colors.ink2], label: { uz: 'Profil', ru: 'Профиль', en: 'Profile' }, coordinator: true },
];

export const sectionsFor = (user) => (user?.role === 'coordinator' ? ADMIN_SECTIONS.filter((s) => s.coordinator) : ADMIN_SECTIONS);
