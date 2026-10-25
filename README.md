# Nuvora

Nuvora is a mobile back office for small service businesses such as laundries, salons and repair shops. It covers customers, orders, payments, expenses, appointments, reports and team roles. The UI is built from the Figma file *ziahdesign → App Nuvora*.

**Stack:** Expo SDK 58 · React Native 0.88 · TypeScript (strict) · Expo Router · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · react-native-svg charts · zod · Jest.

## Running it

```bash
npm install
npm start          # then press i / a, or scan the QR code with Expo Go
npm run web        # browser preview
```

### Demo mode (default)

If no Supabase variables are set, the app uses an **on-device demo backend**, which stores its data in AsyncStorage. This backend enforces the same rules as the database:

- membership checks;
- role checks;
- no overpayments;
- no edits that would drop an order's total below what has been paid;
- no payments on cancelled orders;
- order numbering.

The demo is seeded with the FreshFold Laundry dataset from the Figma file. The seed is generated relative to today, so the dashboard always shows "today".

- Demo login: `maya@freshfold.co` / `freshfold123` (owner)
- You can also sign up with any email. That creates a fresh, empty business, isolated from FreshFold.
- To test the staff role, invite an email from **More → Team & roles**, sign out, then sign up with that email.

### Supabase mode

1. Create a Supabase project.
2. Apply the migration: `supabase db push`, or run `supabase/migrations/20261025000100_init.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   Only the public anon key belongs in the app. **Never put the service-role key in this project.** Everything privileged is enforced in Postgres through RLS, triggers and `security definer` helpers.
4. Restart `npm start`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm test` | Jest unit tests: money, finance metrics, reports, CSV, validation, demo backend rules |
| `npm run test:db` | pgTAP RLS and money tests in `supabase/tests` (needs the Supabase CLI and Docker) |

## Money and metrics

All amounts are **integer cents**. Floats are never used for money:

- Input strings are parsed straight to cents (`parseMoneyInput`).
- Quantities are whole numbers, and line totals are `quantity × unitPriceCents`.
- In Postgres the money columns are `bigint`, and `order_items.line_total_cents` is a generated column.

Definitions (`src/lib/finance.ts`, the single source used by every screen):

| Metric | Definition |
| --- | --- |
| Order total | Σ quantity × unit price of the order's items |
| Balance due | order total − payments on the order |
| Revenue recorded | Σ totals of non-cancelled orders **created** in the period |
| Money received | Σ payments **collected** (`paid_at`) in the period |
| Expenses | Σ expenses spent in the period |
| Profit | revenue recorded − expenses |
| Margin | profit ÷ revenue recorded |
| Outstanding | Σ balance due of non-cancelled orders, as of now |
| Overdue | an order with a balance due whose due date has passed |

## Security model

- Every table holding business data has RLS enabled. Access is scoped by `business_id` through `is_member`, `has_role` and `is_finance`.
- **Roles:**
  - Owner: everything.
  - Manager: everything except team management.
  - Staff: orders, customers and schedule. Staff can't record payments or expenses and can't see reports or expenses.
- The UI hides what a role can't use, but the database (and the demo backend) also **refuses** those actions. Hidden UI is not the protection.
- `save_order` is a `security invoker` RPC, so the order and its items are written in one transaction under the caller's RLS.
- Triggers handle:
  - order numbers;
  - total recomputation;
  - the overpayment guard (with a row lock);
  - payment notifications;
  - profile creation and invite linking for new users.
- Receipt photos go to a private `receipts` storage bucket, under `receipts/<business_id>/…`. Only that business's owners and managers can read or write them.

## Project layout

```
src/app/            Expo Router screens (auth, setup, (app)/(tabs), detail stacks)
src/components/     Design-system components (Text, Button, Fields, Feedback, Charts…)
src/features/       Larger shared pieces (order editor, schedule, forms)
src/data/           DataService interface + Supabase and local demo implementations
src/lib/            Pure logic: money, finance, reports, CSV, validation, dates
src/state/          Session, React Query workspace, selectors, permissions
src/theme/          Figma tokens and text styles
supabase/           Migration and pgTAP tests
```

## Known gaps

- Inviting a member does not send an email. The person signs up with the invited address and is linked automatically.
- SMS reminders and push notifications are not connected to a provider. "Send reminder" opens the device's SMS app with a pre-filled message, and the reminders in the notification feed are computed in the app.
- Language, date format and first day of week are shown but can't be changed (English and Monday only).
- The Account screen shows your details, sends a password-reset link and exports CSV. Changing your name or email, two-step verification, signed-in devices and account deletion are not implemented.
