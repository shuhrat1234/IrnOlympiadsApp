# IrnOlympiadsApp

Мобильное приложение **IRN Olympiads** (iOS / Android) на Expo SDK 57 + expo-router.
Работает с тем же API, что и сайт (`https://x8k2m9f3.irnolympiad.uz/api/`), и повторяет его логику
(`irn-front-v2` / `irn-back-v2`) для двух ролей: ученик и учитель. Админ-панели для сотрудников в приложении нет —
аккаунты персонала при входе получают подсказку открыть сайт.

После входа каждая роль попадает в свою зону (`src/app/_layout.js`, `homeRouteFor` в `AuthContext`):

| Роль | Зона | Стартовый экран |
| --- | --- | --- |
| Ученик (`participant`) | `src/app/(tabs)` | Главная |
| Учитель (`teacher`) | `src/app/teacher` | Мои ученики |

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
| Книжный магазин: каталог (доступен и гостям), корзина, оформление заказа с пунктом BTS, способом оплаты доставки и чеком перевода | `books.js`, `checkout.js`, `utils/cart.js` | `/books`, `CartDrawer`, `BTSPointPicker` |
| «Кто твой учитель?»: учитель по математике и английскому (поиск, ручной ввод, «занимаюсь сам», подтверждение) | `src/components/SubjectTeachers.js` (главная и профиль) | `dashboard/page.tsx` |

## Учитель (`src/app/teacher`)

| Раздел | Файл | Как на сайте |
| --- | --- | --- |
| Регистрация учителя (ссылка на экране входа) | `src/app/register-teacher.js` | `/register-teacher` |
| Ученики: добавление, приглашение, запросы на привязку, регистрация на олимпиаду, сброс пароля, поиск и выбор | `teacher/index.js` | `/teacher` |
| Групповая оплата: распределение учеников по платным олимпиадам, один счёт Click / Payme, проверка статуса | `components/GroupPaySheet.js` | «Guruhli to'lov» |
| Монеты (Coin System v2.1): 4 счётчика по предметам, снятые и ожидающие начисления, заявки на проверку / поиск ученика, CSV, история | `teacher/coins.js` | `/teacher` |
| Рейтинг учителей: место по стране и региону, фильтры, правила начисления, режим техработ | `teacher/rating.js` | `/teacher/rating` |
| Меню: поддержка, язык, выход | `teacher/more.js` | — |

## Устройство

- API и токены: `src/api` (axios + обновление JWT, токены в `expo-secure-store`).
- Контексты: `src/context` (Auth, Language, Toast, Socket, Support, Olympiad).
- UI-кит: `src/components/ui.js`, `layout.js`, `form.js`.
- PDF (пропуск, допуск, сертификаты) — `expo-print`.
- Тексты на uz / ru / en — `src/i18n/strings.js` и словари `tx({ uz, ru, en })` в экранах учителя.
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
