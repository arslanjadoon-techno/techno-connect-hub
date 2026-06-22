# Migration Plan: TanStack Start → Vite + React + React Router DOM

## Goal
Convert this project from TanStack Start (SSR + file-based routing) to a plain **client-side Vite + React SPA** using **react-router-dom**, keeping all current UI/UX and pages intact. Reorganize code into portal-based folders for maintainability.

## Why
User wants to run/deploy this as a standard CSR React app (easier local run, no SSR/server-functions/Cloudflare worker complexity). All current backend calls already go through `src/lib/api/client.ts` (REST) — no server functions are actually needed.

---

## 1. New Folder Structure

```text
src/
  main.tsx                  # Vite entry (ReactDOM.createRoot)
  App.tsx                   # <BrowserRouter> + providers + <AppRoutes/>
  routes.tsx                # All route definitions (react-router v6 nested routes)
  styles.css                # unchanged (Tailwind v4)

  components/               # unchanged (ui/, app-sidebar, data-table, crud-page)
  hooks/                    # unchanged
  lib/                      # auth, theme, data-store, api, types, utils, permissions, role-label, mock
    api/client.ts           # unchanged
    (remove) config.server.ts, error-capture.ts, error-page.ts, lovable-error-reporting.ts

  portals/
    auth/                   # login, forgot-password, reset-password
      LoginPage.tsx
      ForgotPasswordPage.tsx
      ResetPasswordPage.tsx
    shell/                  # _app layout + shared shell pieces
      AppLayout.tsx         # sidebar + header + <Outlet/>
    ai-chat/
      AiChatPage.tsx
    team-chat/
      TeamChatPage.tsx
    settings/
      SettingsPage.tsx
    ticketing/
      DashboardPage.tsx
      TicketsPage.tsx
      TicketDetailPage.tsx
    commission/
      DashboardPage.tsx
    admin/                  # User Manager portal
      UsersPage.tsx
      DepartmentsPage.tsx
      DistrictsPage.tsx
      StatesPage.tsx
      MarketsPage.tsx
      HousesPage.tsx
      StoresPage.tsx
      ExternalPage.tsx
```

Each portal folder owns its pages so future portals (and per-portal components/hooks/api) can sit beside their routes.

## 2. Tooling Changes

**Remove (package.json):**
- `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-router-devtools`, `@tanstack/router-plugin`
- `@lovable.dev/vite-tanstack-config`, `nitro`, Cloudflare worker config
- `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/routes/**`
- `src/lib/config.server.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`

**Add:**
- `react-router-dom@^6`
- `vite.config.ts` → plain `@vitejs/plugin-react` + `@tailwindcss/vite` + path alias `@`
- `index.html` (root) with `<div id="root">` and `<script type="module" src="/src/main.tsx">`

**Keep:** React 19, Tailwind v4, shadcn ui, TanStack Query (still used for data fetching), Zod, lucide-react, recharts, sonner, fonts via `<link>` in `index.html`.

## 3. Routing Map (react-router-dom v6)

```text
/                       → redirect to /ai-chat
/login                  → LoginPage
/forgot-password        → ForgotPasswordPage
/reset-password         → ResetPasswordPage

/  (AppLayout, requires auth)
  /ai-chat              → AiChatPage
  /chat                 → TeamChatPage
  /settings             → SettingsPage
  /ticketing/dashboard  → Ticketing/DashboardPage
  /ticketing/tickets    → Ticketing/TicketsPage
  /ticketing/tickets/:id→ Ticketing/TicketDetailPage
  /commission/dashboard → Commission/DashboardPage
  /admin/users          → Admin/UsersPage
  /admin/departments    → Admin/DepartmentsPage
  /admin/districts      → Admin/DistrictsPage
  /admin/states         → Admin/StatesPage
  /admin/markets        → Admin/MarketsPage
  /admin/houses         → Admin/HousesPage
  /admin/stores         → Admin/StoresPage
  /admin/external       → Admin/ExternalPage
* (404)                 → NotFoundPage
```

Auth gating: `<ProtectedRoute>` wrapper reading from `useAuth()`; redirect to `/login` when unauthenticated.

## 4. Code Translation Rules

| TanStack Start | React Router DOM v6 |
|---|---|
| `createFileRoute(...)({ component })` | `<Route element={<Component/>} />` in `routes.tsx` |
| `<Link to="/x" params={{id}}/>` | `<Link to={`/x/${id}`}/>` |
| `useNavigate()` from `@tanstack/react-router` | `useNavigate()` from `react-router-dom` |
| `useParams()` | same name, from `react-router-dom` |
| `redirect({to})` in beforeLoad | `<Navigate to=... replace/>` |
| `Outlet` from `@tanstack/react-router` | `Outlet` from `react-router-dom` |
| `head()` meta | set `document.title` via small `usePageTitle` hook |
| `createServerFn` | not used — call API client directly (already does) |

## 5. App Shell

`AppLayout.tsx` becomes the page wrapper currently in `src/routes/_app.tsx`: sidebar + header + main `<Outlet/>`. Providers (`QueryClientProvider`, `ThemeProvider`, `AuthProvider`, `DataProvider`, `Toaster`) move into `App.tsx`.

## 6. What is NOT changing
- All UI styling, theme palettes, sidebar, login bubbles, modals — pixel identical.
- All page logic (tickets, chat, AI chat, settings, admin CRUD) — copy/paste with import path updates only.
- API client, auth context, theme context, data store, mock seed, permissions.
- Tailwind tokens in `styles.css`.

## 7. Migration Steps (execution order)
1. Update `package.json` (remove TanStack/Lovable Vite config, add react-router-dom, plain vite plugins). Add `index.html`, new `vite.config.ts`, new `src/main.tsx`, new `src/App.tsx`, new `src/routes.tsx`.
2. Create `src/portals/**` folders and move each route's page body into its new portal file, swapping imports (`@tanstack/react-router` → `react-router-dom`, removing `createFileRoute`, replacing `<Link to params>` with string paths).
3. Move `_app.tsx` shell into `portals/shell/AppLayout.tsx`; add `ProtectedRoute`.
4. Delete `src/routes/**`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`, `src/lib/config.server.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/lib/lovable-error-reporting.ts`.
5. Verify build & run.

## 8. Out of scope
- No backend / API behaviour changes.
- No visual redesign — UI must look identical.
- No new features.

---

⚠️ **Heads up:** This project's template is `tanstack_start_ts_2026-05-29` and the Lovable platform expects TanStack Start. After this migration:
- The Lovable preview/hosting may not auto-detect the new entry — the preview could break on Lovable until the platform template is switched.
- You'll lose SSR (fine, app is fully client-rendered anyway), server functions (not used), and the Lovable Cloud / server-side knowledge integrations tuned for TanStack Start.
- Running **locally** with `bun install && bun run dev` will work as a plain Vite SPA.

Confirm you want to proceed knowing the Lovable preview behaviour may change, and I'll execute the migration.
