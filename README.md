# Nuvora

Nuvora is a mobile back office for small service businesses such as laundries, salons and repair shops. It covers customers, orders, payments, expenses, appointments, reports and team roles. The UI is built from the Figma file *ziahdesign → App Nuvora*.

**Stack:** Expo SDK 58 · React Native 0.88 · TypeScript (strict) · Expo Router · Supabase (Postgres, Auth, Storage, RLS) · TanStack Query · react-native-svg charts · zod · Jest.

## Screens

These are the **Figma design frames** (*ziahdesign → App Nuvora*), exported at 2× (780 × 1688). The app implements them; the README's last section lists where it differs.

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/03-01-01-welcome.png" width="200" alt="Welcome"><br><sub>Welcome</sub></td><td align="center" valign="top"><img src="docs/screenshots/04-01-dashboard.png" width="200" alt="Dashboard"><br><sub>Dashboard</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-01-18-order-list.png" width="200" alt="Order list"><br><sub>Order list</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-05-20b-create-order-order-details.png" width="200" alt="Create order order details"><br><sub>Create order order details</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/05-04-15-customer-profile.png" width="200" alt="Customer profile"><br><sub>Customer profile</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-01-24-finance-overview.png" width="200" alt="Finance overview"><br><sub>Finance overview</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-04-26-record-payment.png" width="200" alt="Record payment"><br><sub>Record payment</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-01-31-schedule-overview.png" width="200" alt="Schedule overview"><br><sub>Schedule overview</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/08-05-33b-create-appointment-conflict.png" width="200" alt="Create appointment conflict"><br><sub>Create appointment conflict</sub></td><td align="center" valign="top"><img src="docs/screenshots/09-01-36-business-performance.png" width="200" alt="Business performance"><br><sub>Business performance</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-02-41-notification-center.png" width="200" alt="Notification center"><br><sub>Notification center</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-06-43-team-roles.png" width="200" alt="Team roles"><br><sub>Team roles</sub></td></tr>
</table>

All 67 frames, grouped by section:

<details>
<summary><b>Onboarding</b> (7 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/03-01-01-welcome.png" width="180" alt="Welcome"><br><sub>Welcome</sub></td><td align="center" valign="top"><img src="docs/screenshots/03-02-02-create-account.png" width="180" alt="Create account"><br><sub>Create account</sub></td><td align="center" valign="top"><img src="docs/screenshots/03-03-02b-create-account-validation.png" width="180" alt="Create account validation"><br><sub>Create account validation</sub></td><td align="center" valign="top"><img src="docs/screenshots/03-04-03-sign-in.png" width="180" alt="Sign in"><br><sub>Sign in</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/03-05-04-forgot-password.png" width="180" alt="Forgot password"><br><sub>Forgot password</sub></td><td align="center" valign="top"><img src="docs/screenshots/03-06-05-business-setup.png" width="180" alt="Business setup"><br><sub>Business setup</sub></td><td align="center" valign="top"><img src="docs/screenshots/03-07-06-setup-complete.png" width="180" alt="Setup complete"><br><sub>Setup complete</sub></td></tr>
</table>

</details>

<details>
<summary><b>Home dashboard</b> (2 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/04-01-dashboard.png" width="180" alt="Dashboard"><br><sub>Dashboard</sub></td><td align="center" valign="top"><img src="docs/screenshots/04-02-todays-activity.png" width="180" alt="Todays activity"><br><sub>Todays activity</sub></td></tr>
</table>

</details>

<details>
<summary><b>Customers</b> (8 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/05-01-13-customer-list.png" width="180" alt="Customer list"><br><sub>Customer list</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-02-14-search-filter-results.png" width="180" alt="Search filter results"><br><sub>Search filter results</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-03-14b-filter-sheet.png" width="180" alt="Filter sheet"><br><sub>Filter sheet</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-04-15-customer-profile.png" width="180" alt="Customer profile"><br><sub>Customer profile</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/05-05-15b-customer-profile-new-customer-saved.png" width="180" alt="Customer profile new customer saved"><br><sub>Customer profile new customer saved</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-06-16-add-customer.png" width="180" alt="Add customer"><br><sub>Add customer</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-07-16b-add-customer-validation.png" width="180" alt="Add customer validation"><br><sub>Add customer validation</sub></td><td align="center" valign="top"><img src="docs/screenshots/05-08-17-edit-customer.png" width="180" alt="Edit customer"><br><sub>Edit customer</sub></td></tr>
</table>

</details>

<details>
<summary><b>Orders</b> (9 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/06-01-18-order-list.png" width="180" alt="Order list"><br><sub>Order list</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-02-18b-order-list-in-progress.png" width="180" alt="Order list in progress"><br><sub>Order list in progress</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-03-19-order-details.png" width="180" alt="Order details"><br><sub>Order details</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-04-20a-create-order-select-customer.png" width="180" alt="Create order select customer"><br><sub>Create order select customer</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/06-05-20b-create-order-order-details.png" width="180" alt="Create order order details"><br><sub>Create order order details</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-06-23-order-confirmation-nv-1052-created.png" width="180" alt="Order confirmation nv 1052 created"><br><sub>Order confirmation nv 1052 created</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-07-21-edit-order-nv-1050.png" width="180" alt="Edit order nv 1050"><br><sub>Edit order nv 1050</sub></td><td align="center" valign="top"><img src="docs/screenshots/06-08-22-update-order-status.png" width="180" alt="Update order status"><br><sub>Update order status</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/06-09-19b-order-details-paid-in-full.png" width="180" alt="Order details paid in full"><br><sub>Order details paid in full</sub></td></tr>
</table>

</details>

<details>
<summary><b>Finance</b> (9 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/07-01-24-finance-overview.png" width="180" alt="Finance overview"><br><sub>Finance overview</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-02-24b-finance-overview-after-expense-saved.png" width="180" alt="Finance overview after expense saved"><br><sub>Finance overview after expense saved</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-03-25-transaction-history.png" width="180" alt="Transaction history"><br><sub>Transaction history</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-04-26-record-payment.png" width="180" alt="Record payment"><br><sub>Record payment</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/07-05-26b-record-payment-validation.png" width="180" alt="Record payment validation"><br><sub>Record payment validation</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-06-27-add-expense.png" width="180" alt="Add expense"><br><sub>Add expense</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-07-28-transaction-details.png" width="180" alt="Transaction details"><br><sub>Transaction details</sub></td><td align="center" valign="top"><img src="docs/screenshots/07-08-29-outstanding-payments.png" width="180" alt="Outstanding payments"><br><sub>Outstanding payments</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/07-09-30-payment-confirmation.png" width="180" alt="Payment confirmation"><br><sub>Payment confirmation</sub></td></tr>
</table>

</details>

<details>
<summary><b>Appointments</b> (7 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/08-01-31-schedule-overview.png" width="180" alt="Schedule overview"><br><sub>Schedule overview</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-02-35b-appointment-created.png" width="180" alt="Appointment created"><br><sub>Appointment created</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-03-32-appointment-details.png" width="180" alt="Appointment details"><br><sub>Appointment details</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-04-33-create-appointment.png" width="180" alt="Create appointment"><br><sub>Create appointment</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/08-05-33b-create-appointment-conflict.png" width="180" alt="Create appointment conflict"><br><sub>Create appointment conflict</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-06-34-edit-appointment.png" width="180" alt="Edit appointment"><br><sub>Edit appointment</sub></td><td align="center" valign="top"><img src="docs/screenshots/08-07-35-upcoming-reminders.png" width="180" alt="Upcoming reminders"><br><sub>Upcoming reminders</sub></td></tr>
</table>

</details>

<details>
<summary><b>Reports</b> (5 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/09-01-36-business-performance.png" width="180" alt="Business performance"><br><sub>Business performance</sub></td><td align="center" valign="top"><img src="docs/screenshots/09-02-37-revenue-vs-expenses.png" width="180" alt="Revenue vs expenses"><br><sub>Revenue vs expenses</sub></td><td align="center" valign="top"><img src="docs/screenshots/09-03-38-order-performance.png" width="180" alt="Order performance"><br><sub>Order performance</sub></td><td align="center" valign="top"><img src="docs/screenshots/09-04-39-customer-insights.png" width="180" alt="Customer insights"><br><sub>Customer insights</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/09-05-40-date-range-filters.png" width="180" alt="Date range filters"><br><sub>Date range filters</sub></td></tr>
</table>

</details>

<details>
<summary><b>Notifications & settings</b> (9 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/10-01-menu.png" width="180" alt="Menu"><br><sub>Menu</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-02-41-notification-center.png" width="180" alt="Notification center"><br><sub>Notification center</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-03-42-business-profile.png" width="180" alt="Business profile"><br><sub>Business profile</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-04-42b-edit-business-details.png" width="180" alt="Edit business details"><br><sub>Edit business details</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/10-05-42c-business-profile-changes-saved.png" width="180" alt="Business profile changes saved"><br><sub>Business profile changes saved</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-06-43-team-roles.png" width="180" alt="Team roles"><br><sub>Team roles</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-07-44-preferences.png" width="180" alt="Preferences"><br><sub>Preferences</sub></td><td align="center" valign="top"><img src="docs/screenshots/10-08-45-account-settings.png" width="180" alt="Account settings"><br><sub>Account settings</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/10-09-46-sign-out-confirmation.png" width="180" alt="Sign out confirmation"><br><sub>Sign out confirmation</sub></td></tr>
</table>

</details>

<details>
<summary><b>Empty, loading & error states</b> (11 screens)</summary>

<table>
<tr><td align="center" valign="top"><img src="docs/screenshots/11-01-customers.png" width="180" alt="Customers"><br><sub>Customers</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-02-orders.png" width="180" alt="Orders"><br><sub>Orders</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-03-transactions.png" width="180" alt="Transactions"><br><sub>Transactions</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-04-appointments.png" width="180" alt="Appointments"><br><sub>Appointments</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/11-05-no-search-results.png" width="180" alt="No search results"><br><sub>No search results</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-06-loading-orders-skeleton.png" width="180" alt="Loading orders skeleton"><br><sub>Loading orders skeleton</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-07-loading-dashboard-skeleton.png" width="180" alt="Loading dashboard skeleton"><br><sub>Loading dashboard skeleton</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-08-network-error.png" width="180" alt="Network error"><br><sub>Network error</sub></td></tr>
<tr><td align="center" valign="top"><img src="docs/screenshots/11-09-data-load-error-inline.png" width="180" alt="Data load error inline"><br><sub>Data load error inline</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-10-delete-confirmation.png" width="180" alt="Delete confirmation"><br><sub>Delete confirmation</sub></td><td align="center" valign="top"><img src="docs/screenshots/11-11-feedback-status-patterns.png" width="180" alt="Feedback status patterns"><br><sub>Feedback status patterns</sub></td></tr>
</table>

</details>

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

## Architecture

### Overview

```mermaid
flowchart TB
  subgraph App["Expo app (React Native + TypeScript)"]
    direction TB
    R["Expo Router screens<br/>src/app"] --> C["UI components<br/>src/components · src/features"]
    R --> S["State<br/>React Query workspace · session · permissions<br/>src/state"]
    S --> L["Pure domain logic<br/>money · finance · reports · CSV · validation<br/>src/lib"]
    S --> API["DataService interface<br/>src/data/service.ts"]
    API --> SB["Supabase implementation<br/>src/data/supabase"]
    API --> LOC["Demo implementation<br/>AsyncStorage · src/data/local"]
  end
  SB -- "anon key + user JWT" --> PG
  subgraph Supabase["Supabase"]
    PG[("Postgres<br/>RLS · triggers · RPCs")]
    AU["Auth"]
    ST["Storage<br/>private receipts bucket"]
  end
  SB --> AU
  SB --> ST
```

The app has four layers, and each one only talks to the layer below it:

| Layer | Folder | Responsibility |
| --- | --- | --- |
| **Screens** | `src/app` | Expo Router file-based routes. They read the workspace, render it and call actions. They hold no business rules. |
| **Components** | `src/components`, `src/features` | Design-system pieces built from the Figma tokens (`src/theme`), plus larger shared pieces such as the order editor, appointment form and week strip. |
| **State** | `src/state` | `session.tsx` handles the auth session, the workspace query, the `useAction` mutation helper and `usePermissions`. `selectors.ts` derives views (order money, notification feed, transactions). |
| **Domain logic** | `src/lib` | Pure, unit-tested functions with no React or I/O: integer-cent money, metric definitions, report aggregations, CSV and zod schemas. |
| **Data** | `src/data` | One `DataService` interface with two implementations. `src/data/index.ts` picks Supabase when the `EXPO_PUBLIC_SUPABASE_*` variables are set, and the on-device demo backend otherwise. |

### Data flow

The app loads **one workspace per signed-in member**. `loadWorkspace()` returns the business, members, services, customers, orders and items, payments, expenses (finance roles only), appointments, notifications and preferences. React Query caches it under one key.

Every screen derives what it shows from that snapshot with the pure functions in `src/lib` and `src/state/selectors.ts`. That way the dashboard, finance tab and reports can never disagree about a number.

A write goes through `useAction`:

```mermaid
sequenceDiagram
  participant UI as Screen (Record payment)
  participant A as useAction
  participant D as DataService
  participant DB as Postgres
  UI->>A: run({ orderId, amountCents, method })
  A->>D: recordPayment(businessId, input)
  D->>DB: insert into payments
  DB->>DB: RLS: is_finance(business_id)?
  DB->>DB: trigger guard_payment: lock order, refuse amount > balance due
  DB->>DB: trigger notify_payment: insert notification
  DB-->>D: ok / error
  D-->>A: id or AppError (friendly message)
  A->>A: invalidate workspace query, show toast
  A-->>UI: refetched workspace, so every screen updates
```

The screen validates first (the zod schema, and `maxPayable` for the inline "more than balance due" error). The database checks again, so a modified client can't get around a rule.

### Navigation

```
src/app/_layout.tsx            fonts, providers, auth gate (Stack.Protected)
├── welcome · sign-in · sign-up · forgot-password     signed out
├── setup                                               signed in, no business yet
└── (app)/                                              signed in with a business
    ├── (tabs)/  index (Home) · orders · customers · finance · more
    │            custom tab bar with the floating "+" create sheet
    ├── order/      new · [id] · [id]/edit
    ├── customer/   new · [id] · [id]/edit
    ├── payment/    new · done · [id]
    ├── expense/    new · [id]
    ├── schedule/   index · new · upcoming · [id] · [id]/edit
    ├── settings/   business · business-edit · team · preferences · account
    └── activity · transactions · outstanding · reports · notifications · setup-complete
```

The root `Gate` picks a group from the session and the workspace. A signed-out user can't reach `(app)` routes at all, and a deep link lands on Welcome.

Screens for finance roles also check `usePermissions()` and show "Not available for your role" to staff. This is a UX guard only; the real enforcement is RLS.

### Database

```mermaid
erDiagram
  businesses ||--o{ business_members : has
  profiles   ||--o{ business_members : "is"
  businesses ||--o{ services : offers
  businesses ||--o{ customers : has
  customers  ||--o{ orders : places
  orders     ||--|{ order_items : contains
  services   ||--o{ order_items : "priced from"
  orders     ||--o{ payments : "paid by"
  businesses ||--o{ expenses : records
  customers  ||--o{ appointments : books
  orders     |o--o{ appointments : "linked to"
  businesses ||--o{ notifications : emits
```

Every business table carries `business_id`, and RLS isolates tenants through it. The schema is a single migration, `supabase/migrations/20261025000100_init.sql`:

- **Helpers** (`security definer`, `search_path` pinned):
  - `is_member(business)`;
  - `has_role(business, roles[])`;
  - `is_finance(business)` for owners and managers.
- **Triggers:**
  - `handle_new_user`: creates the profile and links any pending invite.
  - `assign_order_number`: per business, `#NV-1052` style.
  - `recompute_order_total`: deferred, so it sees the final items.
  - `guard_payment`: takes a row lock and refuses overpayments and payments on cancelled orders.
  - `notify_payment`.
  - Timestamp touch triggers.
- **RPCs:**
  - `create_business`: the business, the owner membership and service presets.
  - `invite_member`.
  - `save_order`: `security invoker`, writes the order and its items in one transaction.
- **Storage:** a private `receipts` bucket. Objects live at `receipts/<business_id>/…` and are readable and writable only by that business's finance roles.

The demo backend (`src/data/local/service.ts`) mirrors these rules: serialized writes, the same role checks and the same money guards. `src/data/__tests__/local-service.test.ts` covers them.

### Project layout

```
src/app/            Expo Router screens
src/components/     Design system: Text, Button, Fields, Badges, Layout, Feedback, Rows, Charts, TabBar
src/features/       Order editor, customer/appointment forms, schedule strip, date-range sheet
src/state/          Session + workspace query, selectors, option lists
src/lib/            money · finance · reports · csv · receipt · validation · dates (+ __tests__)
src/data/           DataService, Supabase client/service, local demo service + seed
src/theme/          Figma color tokens, gradients, shadows, typography
supabase/           migrations/ and tests/database (pgTAP)
docs/screenshots/   Figma frame exports used in this README
```

## Known gaps

- Inviting a member does not send an email. The person signs up with the invited address and is linked automatically.
- SMS reminders and push notifications are not connected to a provider. "Send reminder" opens the device's SMS app with a pre-filled message, and the reminders in the notification feed are computed in the app.
- Language, date format and first day of week are shown but can't be changed (English and Monday only).
- The Account screen shows your details, sends a password-reset link and exports CSV. Changing your name or email, two-step verification, signed-in devices and account deletion are not implemented.
