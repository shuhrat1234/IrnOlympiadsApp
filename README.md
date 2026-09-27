# IrnOlympiadsApp

Мобильное приложение **IRN Olympiads** (iOS / Android) на Expo SDK 57 + expo-router.
Работает с тем же API, что и сайт (`https://x8k2m9f3.irnolympiad.uz/api/`), и повторяет его логику
(`Irn-olympiada-front`) для всех ролей: ученик, учитель, координатор, администратор / суперадмин.

После входа каждая роль попадает в свою зону (`src/app/_layout.js`, `homeRouteFor` в `AuthContext`):

| Роль | Зона | Стартовый экран |
| --- | --- | --- |
| Ученик (`participant`) | `src/app/(tabs)` | Главная |
| Учитель (`teacher`) | `src/app/teacher` | Мои ученики |
| Админ / суперадмин | `src/app/admin` | Дашборд |
| Координатор | `src/app/admin` (урезанное меню) | Пользователи |

## Ученик

| Раздел | Файл | Как на сайте |
| --- | --- | --- |
| Вход (телефон / ID, выбор аккаунта, 2FA, блокировка после 5 попыток, восстановление через бота) | `src/app/login.js` | `LoginPage` |
| Блокирующие окна: Telegram-бот → подтверждение класса → имя латиницей | `src/components/StudentGates.js` | `DashboardLayout` |
| Главная: ID, статистика, «идёт сейчас», таймеры оплаты, допуск к финалу, достижения | `src/app/(tabs)/index.js` | `ProfilePage` |
| Мои / доступные олимпиады, пропуск, сертификат, старт теста | `src/app/(tabs)/olympiads.js` | `MyOlympiadsPage`, `AvailableOlympiadsPage` |
| Экзамен: серверный таймер, автосохранение, 5 нарушений = автосдача, запрет скриншотов | `src/app/exam/[id].js` | `ExamPage` |
| Результаты и разбор ошибок | `(tabs)/results.js`, `analysis/[id].js` | `ResultsListPage`, `OlympiadAnalysisPage` |
| Каталог, регистрация (3 шага), оплата Payme / Click / координатор | `catalog.js`, `olympiad/[id].js`, `register/[id].js`, `payment/[id].js` | соответствующие страницы |
| Уведомления (WebSocket), история оплат, заказы книг, поддержка | `(tabs)/notifications.js`, `history.js`, `orders.js`, `support/*` | соответствующие страницы |

## Админ-панель (`src/app/admin`)

| Раздел | Файл |
| --- | --- |
| Дашборд, онлайн-пользователи, графики | `(tabs)/index.js` |
| Олимпиады: порядок, видимость, старт/финиш, сессии по классам, форма олимпиады с конструктором сертификата | `(tabs)/olympiads.js`, `olympiad-form.js` |
| Тесты и вопросы | `tests.js` |
| Пользователи (фильтры, Excel, создание), карточка пользователя, запросы координаторов на правку | `(tabs)/users.js`, `user/[id].js` |
| Результаты (Excel / PDF, добавление и правка ответов) | `(tabs)/results.js` |
| Массовый импорт Final Round (Excel / CSV / PDF, сопоставление, допуск) | `bulk-import.js`, `components/admin/BulkImportReview.js` |
| Аналитика | `analytics.js` |
| Сотрудники и запросы на правку | `employees.js` |
| Посещаемость (Telegram-бот, календарь, статистика, Excel) | `attendance.js` |
| Уведомления, SMS (шаблоны, рассылка, авто-напоминания), Telegram-бот (заказы, пользователи, рассылка) | `notifications.js`, `sms.js`, `telegram.js` |
| Книги и заказы, пункты BTS (карта Leaflet), бонусы | `books.js`, `bts-points.js`, `bonuses.js` |
| Виза / посольство: дашборд, участники, карточка, канбан, календарь, отчёты | `visa/*` |
| Профиль персонала и 2FA | `profile.js` |
| Поддержка для персонала (фильтр по ролям, закрытие тикета, быстрые ответы) | `src/app/support/*` |

## Учитель (`src/app/teacher`)

Ученики (добавление, приглашение, запросы на привязку, регистрация на олимпиаду, сброс пароля),
монеты и история начислений, поддержка.

## Устройство

- API и токены: `src/api` (axios + обновление JWT, токены в `expo-secure-store`).
- Контексты: `src/context` (Auth, Language, Toast, Socket, Support, Olympiad, Admin).
- UI-кит: `src/components/ui.js`, `layout.js`, `form.js`, `charts.js` (SVG-графики).
- PDF (пропуск, допуск, сертификаты) — `expo-print`, Excel — `xlsx`, ZIP — `jszip`.
- Разбор PDF-таблиц и сжатие картинок — скрытый WebView с pdf.js (`src/components/WebEngine.js`).
- Тексты на uz / ru / en — `src/i18n/strings.js` и словари `tx({ uz, ru, en })` в экранах админки.
- Бренд: `assets/brand/trophy.png`, загрузочный экран `src/components/BootLoader.js`.

## Запуск

```bash
npm install
npx expo start --dev-client
```

Путь к проекту с кириллицей ломает CocoaPods, поэтому нативную iOS-оболочку удобно собирать из копии с ASCII-путём:

```bash
rsync -a --delete --exclude /ios --exclude /android ./ ~/dev/irn-olym-native/
cd ~/dev/irn-olym-native && LANG=en_US.UTF-8 npx expo prebuild -p ios && npx expo run:ios --no-bundler
```

Пересобирать оболочку нужно только после добавления нативных библиотек или смены иконки / сплэша.
Для релизных сборок — EAS: `npx eas-cli@latest build`.

Другой API: `EXPO_PUBLIC_API_URL=https://…/api/ npx expo start`.
