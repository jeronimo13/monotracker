# План реалізації потоку даних при додаванні Monobank токена

Статус: Draft, очікує підтвердження користувача  
Дата: 2026-02-08  
Власник: Coding agent

## 1. Мета

Реалізувати повний потік від "користувач додав токен" до "реальні транзакції та баланси з'явились у застосунку" з чіткою поведінкою для:

- онбордингу (`/setup`);
- налаштувань (`view=settings`);
- заміни демо-даних;
- вікна синхронізації "сьогодні та -30 днів";
- ліміту Monobank на 500 транзакцій за запит;
- рейт-ліміту 1 запит на 60 секунд;
- повідомлень у `TerminalStatusBar`.

## 2. As-Is (поточний стан коду)

- Токен валідується через `GET /personal/client-info`:
  - `src/pages/SetupPage.tsx` (debounce 500ms)
  - `src/components/ApiConfigPanel.tsx` (debounce 800ms)
- Реальний fetch транзакцій (`/personal/statement/...`) у коді відсутній.
- Прапорець `useRealData` вмикається після успішного `client-info`, навіть без завантаження транзакцій.
- Демо-транзакції генеруються за останні 30 днів (`DEMO_DAYS = 30`) у `src/data/generateDemoTransactions.ts`.
- `TerminalStatusBar` показує статуси валідації токена, але не статуси синхронізації транзакцій.
- У налаштуваннях показуються тип рахунку/маскований PAN, але не поточний баланс.

## 3. Target Behavior (цільова поведінка)

### 3.1 Додавання токена в онбордингу

1. Користувач вводить токен.
2. Токен валідується (`client-info`).
3. Після валідації токен зберігається в `monobankData`.
4. Після збереження автоматично запускається синхронізація транзакцій за вікно `[max(today-30d, lastTrxTimestampInDB), today]`.
5. У `TerminalStatusBar` видно початок/прогрес/завершення синхронізації.

### 3.2 Додавання/зміна токена в налаштуваннях

1. Користувач вставляє токен у `ApiConfigPanel`.
2. Після успішної валідації стартує синхронізація транзакцій за вікно `[max(today-30d, lastTrxTimestampInDB), today]`.
3. При невалідному токені зберігається помилка, синхронізація не запускається.

### 3.3 Політика демо-даних

- Якщо джерело даних `demo`: після першої успішної синхронізації демо-транзакції **перезаписуються** реальними.
- Якщо джерело даних `real`: робиться merge/оновлення по id (без повного скидання).
- Якщо джерело даних `imported`: тільки add-only режим, без replace/перезапису існуючих транзакцій.

### 3.4 Політика вікна синхронізації та рахунків

- Синхронізуємо всі рахунки, які повертає `client-info`.
- Старт вікна синхронізації:
  - `syncStart = max(today - 30 days, lastTrxTimestampInDB)`.
  - Якщо `lastTrxTimestampInDB` відсутній, то `syncStart = today - 30 days`.
- Кінець вікна: `syncEnd = today (now)`.
- Для кожного рахунку зберігаємо mapping `account -> source` (де він був доданий: `onboarding` або `settings`).

## 4. Технічний дизайн

### 4.1 Розширення типів та storage schema

Оновити `StoredData` у `src/types/index.ts`:

```ts
interface SyncState {
  status: "idle" | "syncing" | "cooldown" | "error";
  lastSyncStartedAt?: number;
  lastSyncFinishedAt?: number;
  lastSuccessfulSyncAt?: number;
  nextAllowedRequestAt?: number;
  lastError?: string;
  windowDays: number; // default 30
}

interface StoredData {
  token: string;
  transactions: Transaction[];
  timestamp: number;
  useRealData: boolean;
  categories: Record<string, string>;
  clientInfo?: ClientInfo | null;
  dataOrigin?: "demo" | "real" | "imported";
  accountSourceMap?: Record<string, { source: "onboarding" | "settings"; addedAt: number }>;
  sync?: SyncState;
}
```

Міграція:

- Якщо `dataOrigin` відсутній, ставимо:
  - `real`, якщо `useRealData === true`
  - `demo`, інакше.
- Якщо `sync` відсутній, ініціалізуємо з `windowDays = 30`, `status = "idle"`.

### 4.2 Сервіси

Додати нові модулі:

- `src/services/monobankApi.ts`
  - `fetchClientInfo(token)`
  - `fetchStatement(token, accountId, from, to)`
- `src/services/monobankRateLimiter.ts`
  - гарантує мінімум 60 секунд між запитами;
  - читає/пише `nextAllowedRequestAt` у storage.
- `src/services/monobankSync.ts`
  - оркестрація синхронізації за вікном 30 днів;
  - split-range для ліміту 500;
  - merge транзакцій.
- `src/utils/transactionMerge.ts`
  - дедуплікація/merge за стабільним ключем транзакції.

### 4.3 Алгоритм поваги до лімітів 500 і 60с

Для кожного рахунку:

1. Беремо `to = now (unix seconds)`.
2. Беремо `from = max(now - 30*86400, lastTrxTimestampInDB)`.
3. Якщо `lastTrxTimestampInDB` відсутній, беремо `from = now - 30*86400`.
4. Робимо запит `statement(accountId, from, to)` через rate limiter.
5. Якщо повернулось `< 500` транзакцій: приймаємо slice.
6. Якщо повернулось `=== 500`:
   - ділимо інтервал `from..to` на дві половини;
   - рекурсивно виконуємо `statement` для кожної половини;
   - збираємо всі slice.
7. Мерджимо результат по всіх рахунках, сортуємо за `time DESC`.
8. Для `dataOrigin=imported` застосовуємо add-only: додаємо лише відсутні записи (без delete/replace локальних записів).

Запроси до монобанк API робимо тільки 1 раз на 60 секунд, не частіше. 

Поведінка при `429`:

- встановлюємо cooldown `now + 60s`;
- показуємо статус "очікування рейт-ліміту";
- одноразовий retry після cooldown;
- після повторного `429` завершуємо з помилкою.

### 4.4 Інтеграція у UI

`src/pages/SetupPage.tsx`

- після успішної валідації та "Продовжити" ставити прапорець `sync.status = "idle"` для автозапуску в Dashboard;
- `Setup` може ініціювати синхронізацію одразу, але сама синхронізація має виконуватись у глобальному оркестраторі (`useAppData`/`monobankSync`) з single-flight (mutex), незалежно від роуту.

`src/components/ApiConfigPanel.tsx`

- після успішного `client-info` викликати `onTokenConnected(...)` (новий callback), а не працювати через спеціальні сигнали-масиви;
- при додаванні токена оновлювати `accountSourceMap` для рахунків із `source="settings"`;
- показувати баланси для кожного account:
  - `type`
  - `maskedPan`/`iban`
  - `balance` (форматована валюта)
  - `creditLimit` (за наявності)
  - `source` (onboarding/settings).

`src/pages/DashboardPage.tsx`

- додати керування синхронізацією (через `useAppData` або окремий hook) у background-режимі;
- оновлювати `TerminalStatusBar` статусами:
  - початок синхронізації;
  - прогрес по рахунках/інтервалах;
  - очікування через rate-limit;
  - успіх або помилка.

`src/hooks/useAppData.ts`

- зробити централізовані методи:
  - `saveTokenAndClientInfo(...)`
  - `startSyncLast30Days(...)`
  - `resolveSyncWindow(...)` (з урахуванням `max(today-30d, lastTrxTimestampInDB)`)
  - `updateAccountSourceMap(...)`
  - `replaceDemoWithReal(...)`
  - `mergeRealTransactions(...)`.

## 5. Статус-повідомлення (обов'язкові)

Мінімальний набір повідомлень у `TerminalStatusBar`:

- "Перевіряю токен Monobank..."
- "Починаю підгрузку транзакцій за останні 30 днів..."
- "Синхронізація: рахунок X, інтервал A..B"
- "Очікую N сек через ліміт Monobank (1 запит/60 сек)"
- "Синхронізацію завершено: нових N, оновлено M, всього T"
- "Помилка синхронізації: <текст>"

## 6. План реалізації (фази)

### Фаза 1: Модель даних і storage

- Розширити `StoredData`.
- Додати міграцію старих записів.
- Забрати неявні `any` сигнали для `onTokenUpdate`.

### Фаза 2: API + rate limiter + sync engine

- Додати сервіси `monobankApi`, `monobankRateLimiter`, `monobankSync`.
- Реалізувати split-range для `500`.
- Реалізувати cooldown/queue для `60s`.

### Фаза 3: UI та UX

- Інтегрувати автосинк після додавання токена.
- Додати статуси синку в `TerminalStatusBar`.
- Показати баланс/кредитний ліміт у налаштуваннях.
- Показати `source` для кожного рахунку у налаштуваннях.

### Фаза 4: Тести та стабілізація

- Unit-тести:
  - split-range алгоритм;
  - merge/dedup;
  - rate limiter (fake timers).
- Перевірка команд:
  - `npm run build`
  - `npm run lint`
  - `npm run test -- --runInBand`

## 7. Критерії приймання

- Після додавання валідного токена користувач бачить старт синхронізації в статус-барі.
- Завантажуються транзакції за вікно `[today-30d, today]`.
- Немає запитів частіше ніж 1/60s.
- При переповненні (`500`) алгоритм добирає дані через розбиття інтервалу.
- Демо-дані стираються повністю і записуються реальні (для `dataOrigin=demo`).
- Для `dataOrigin=imported` синхронізація працює у режимі add-only.
- У налаштуваннях видно баланс на кожному рахунку.
- У налаштуваннях видно `source` для кожного рахунку.

## 8. Ризики і відкриті питання

- Зафіксовано: `dataOrigin=imported` працює в add-only режимі.
- Зафіксовано: синхронізуються всі рахунки.
- Зафіксовано: синхронізація працює у background-режимі, а від дубльованого запуску захищає single-flight mutex.
