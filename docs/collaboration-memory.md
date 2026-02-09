# Collaboration Memory

This file tracks assistant mistakes and user preferences for this repository.
Agents should keep it current without requiring repeated user reminders.

## Mistake Log

1. First sync fix targeted field-level overwrite, but it missed stale snapshot overwrite during sync completion; required switching to append-only merge + latest-state merge in `useAppData`.
2. Added MCC focus in click handler but missed existing auto-hide effect tied only to `filters.search`, so category input still disappeared immediately.
3. Posted a duplicate intermediary update instead of moving directly to the code change.

## What User Likes

- Keep a running mistake log and preference list maintained proactively.
- Show the exact offending code path/lines immediately when diagnosing a production bug.
- Clicking transaction description should immediately focus the category input (`Введіть назву категорії`).
- Пошук/клік по `MCC` також має відкривати і фокусувати поле `Введіть назву категорії`.
- Prefer no duplicate intermediary status messages; move straight to concrete edits.
- Налаштування формату списку транзакцій мають бути доступні в `Settings` (групувати по днях/місяцях/без групування).
- У заголовку групи транзакцій (коли групування увімкнене) показувати суму та кількість транзакцій.
- Коли користувач просить закомітити і запушити, завжди показувати message коміту у відповіді.
