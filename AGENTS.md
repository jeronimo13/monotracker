# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Verification Baseline

All statements below were verified from source code and commands on **February 7, 2026**.
If this file conflicts with `README.md`, trust `package.json`, config files, and `src/` code.

## Supported Commands (Current Reality)

- `npm run dev`
  - Script exists (`vite`).
  - In this sandbox it fails with `listen EPERM` when binding a port, so runtime startup could not be fully validated here.
- `npm run build`
  - Script exists (`tsc -b && vite build`).
  - Currently fails due TypeScript errors in app code (not missing tooling).
- `npm run lint`
  - Script exists (`eslint .`).
  - Currently fails with multiple lint errors/warnings.
- `npm run test -- --runInBand`
  - Works and passes: 1 suite, 26 tests (`src/utils/__tests__/dateRangeParser.test.ts`).
- `npm run preview`
  - Script exists (`vite preview`), but depends on successful `npm run build`.
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
  - `src/hooks/useAppData.ts` (storage + sample data + import/export integration)
  - `src/hooks/useFilters.ts` (filtering + facets + date range + URL sync)
  - `src/hooks/useRules.ts` (rule creation/preview/apply)
  - `src/hooks/useUrlFilters.ts` (query-param sync)
  - `src/hooks/useDateRange.ts` (context access)
- Context:
  - `src/contexts/DateRangeContext.tsx`

## Data and Persistence

- Local storage keys in active use:
  - `monobankData`
  - `hasSeenOnboarding`
  - `onboarding-token`
- `StoredData` shape is defined in `src/types/index.ts`:
  - `token`, `transactions`, `timestamp`, `useRealData`, `categories`
- Default fallback data comes from `src/data/demo-transactions.json` via generator logic in `src/data/generateDemoTransactions.ts`.
- Stored data TTL logic is 24 hours in `useAppData`.

## API Behavior Actually Implemented

- Token validation in setup flow:
  - `GET https://api.monobank.ua/personal/client-info`
  - Implemented in `src/pages/SetupPage.tsx` with 500ms debounce
- Transaction fetch in dashboard API panel:
  - `GET https://api.monobank.ua/personal/statement/0/{from}/{to}`
  - Pulls roughly last 30 days in `src/components/ApiConfigPanel.tsx`
- Error handling explicitly covers:
  - `401` invalid token
  - `429` rate limit
- Not currently implemented in code:
  - Year-long fetch workflow
  - Incremental merge strategy across repeated sync windows
  - Automatic retry/backoff pipeline

## Known Gaps (Important For Agents)

- `Filters` type in `src/types/index.ts` does not include `dateRange`.
- `useRules` in `src/hooks/useRules.ts` expects `filters.dateRange`.
- This mismatch is one direct cause of current build failure.
- Lint/build are currently red; tests are green.

## Working Guidance

- Before claiming a command/feature is supported, verify from code and run output.
- Keep `src/types/index.ts`, hooks, and consuming components synchronized when changing filter/rule logic.
- If you change scripts or toolchain behavior, update this file with confirmed command outcomes.
- Do not reintroduce `CLAUDE.md`; keep agent guidance in this `AGENTS.md`.
