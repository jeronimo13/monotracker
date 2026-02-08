# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Verification Baseline

All statements below were verified from source code and commands on **February 8, 2026**.
If this file conflicts with `README.md`, trust `package.json`, config files, and `src/` code.

## Supported Commands (Current Reality)

- `npm run dev`
  - Script exists (`vite`).
  - In this sandbox it fails with `listen EPERM` when binding a port (`127.0.0.1`), so runtime startup could not be fully validated here.
- `npm run build`
  - Script exists (`tsc -b && vite build`).
  - **Passes** in current code state.
- `npm run lint`
  - Script exists (`eslint .`).
  - Currently fails with `10` issues (`8` errors, `2` warnings).
- `npm run test -- --runInBand`
  - Works and passes: `2` suites, `31` tests.
  - Suites:
    - `src/utils/__tests__/dateRangeParser.test.ts`
    - `src/services/__tests__/monobankSync.test.ts`
  - Emits `ts-jest` deprecation/config warnings, but tests are green.
- `npm run preview`
  - Script exists (`vite preview`).
  - In this sandbox it fails with `listen EPERM` when binding a port (`127.0.0.1`).
- `npm run type-check`
  - **Not supported**: no such script in `package.json`.

## Tech Stack (From `package.json`)

- React `19.1.1`
- React DOM `19.1.1`
- React Router DOM `7.8.2`
- TypeScript `~5.8.3`
- Vite `^7.1.2`
- ESLint `^9.33.0` + `typescript-eslint`
- Jest `^30.1.1` + `ts-jest`
- Tailwind CSS `^4.1.12` via `@tailwindcss/postcss`
- Chart.js `^4.5.0` + `react-chartjs-2`

## App Architecture (Current)

- Entry: `src/main.tsx`
- Root app/router: `src/App.tsx`
  - Uses `BrowserRouter` + routes: `/onboarding`, `/setup`, `/dashboard`
  - Wraps app in `DateRangeProvider`
  - Uses localStorage flags to decide onboarding redirect behavior
- Main pages:
  - `src/pages/OnboardingPage.tsx`
  - `src/pages/SetupPage.tsx`
  - `src/pages/DashboardPage.tsx`
- Scenes:
  - `src/scenes/StatisticsScene.tsx`
  - `src/scenes/CategoryBreakdownScene.tsx`
- Key hooks:
  - `src/hooks/useAppData.ts` (storage + sample data + import/export integration + Monobank sync orchestration)
  - `src/hooks/useFilters.ts` (filtering + facets + date range + URL sync)
  - `src/hooks/useRules.ts` (rule creation/preview/apply)
  - `src/hooks/useUrlFilters.ts` (query-param sync)
  - `src/hooks/useDateRange.ts` (context access)
- Services:
  - `src/services/monobankApi.ts` (`client-info` + `statement` API wrappers)
  - `src/services/monobankSync.ts` (sync window + 500 split strategy + 60s request pacing)
- Storage helpers:
  - `src/utils/storageData.ts` (normalized `StoredData` read/write/update)
- Context:
  - `src/contexts/DateRangeContext.tsx`
  - `src/contexts/ThemeContext.tsx`

## Data and Persistence

- Local storage keys in active use:
  - `monobankData`
  - `hasSeenOnboarding`
  - `onboarding-token`
- `StoredData` shape is defined in `src/types/index.ts`:
  - `token`, `transactions`, `timestamp`, `useRealData`, `categories`
  - `clientInfo`, `dataOrigin`, `accountSourceMap`, `sync`
- Default fallback data comes from `src/data/demo-transactions.json` via generator logic in `src/data/generateDemoTransactions.ts`.
- Stored data TTL logic is 24 hours in `useAppData`.

## API Behavior Actually Implemented

- Token validation in setup flow:
  - `GET https://api.monobank.ua/personal/client-info`
  - Implemented in `src/pages/SetupPage.tsx` with 500ms debounce
- Token verification in dashboard settings panel:
  - `GET https://api.monobank.ua/personal/client-info`
  - Implemented in `src/components/ApiConfigPanel.tsx` with 800ms debounce
- Transaction sync:
  - `GET https://api.monobank.ua/personal/statement/{account}/{from}/{to}`
  - Implemented in `src/services/monobankSync.ts` and triggered via `useAppData`.
  - Sync window: `from = max(today-30d, lastTrxTimestampInDB)` (for demo origin uses full last 30 days).
  - If response size is `500`, interval is split recursively.
  - Request pacing is enforced at `1` request per `60` seconds.
- Error handling explicitly covers:
  - `401` invalid token
  - `429` rate limit
- Not currently implemented in code:
  - Automated periodic/background resync scheduler (time-based cron/polling).
  - Manual "sync now" button in settings (sync currently starts on token connect/auto-initial sync).

## Known Gaps (Important For Agents)

- Lint is red (`8` errors, `2` warnings); build is green; tests are green.
- Sync pipeline is implemented, but there are no dedicated tests yet for:
  - split-range logic at 500 cap
  - add-only merge mode for imported snapshots
  - request pacing/cooldown behavior

## Active Planning Doc

- `docs/token-sync-implementation-plan.md`
  - Design + phased implementation plan for token-to-transaction sync pipeline.
  - Added on February 8, 2026; implementation is in progress.

## Working Guidance

- Before claiming a command/feature is supported, verify from code and run output.
- Keep `src/types/index.ts`, hooks, and consuming components synchronized when changing storage or sync logic.
- If implementing Monobank sync, coordinate changes across:
  - `src/pages/SetupPage.tsx`
  - `src/components/ApiConfigPanel.tsx`
  - `src/hooks/useAppData.ts`
  - `src/pages/DashboardPage.tsx`
- If you change scripts or toolchain behavior, update this file with confirmed command outcomes.
- Do not reintroduce `CLAUDE.md`; keep agent guidance in this `AGENTS.md`.

## Collaboration Memory (Persistent)

- Maintain `docs/collaboration-memory.md` on every relevant turn.
- Add new assistant mistakes to `## Mistake Log` as numbered items.
- Add user preferences to `## What User Likes` as bullet items.
- Keep the existing history intact unless the user explicitly asks to edit/remove entries.
