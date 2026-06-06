# Project-wide modernization plan

Scope is big, so here's a clear breakdown. Existing features and API calls stay intact — only UI, layout, and a few small additions change.

## 1. Theme & global look
- Refresh `src/styles.css` tokens (new primary palette — modern indigo/violet + soft neutrals, keeping emerald as accent option) in both light and dark mode.
- Add smooth global transitions, refined shadows, subtle gradients, and reusable animation utilities (`fade-in`, `scale-in`, `hover-lift`).
- Buttons: add hover lift + glow, active scale, focus ring polish (in `button.tsx` variants).
- Cards/Tables: rounded-2xl, soft borders, hover row highlight, zebra rows, sticky headers, smooth sort/filter transitions.

## 2. Toast color contract
Configure `sonner` Toaster (`src/components/ui/sonner.tsx`) so:
- `toast.error` → red bg + white text
- `toast.success` → green bg + white text
- `toast()` / `toast.info` → white bg + dark text
Applied globally; no caller changes needed.

## 3. Login page (`src/routes/login.tsx`)
- Animated gradient hero side with floating blobs / subtle motion.
- Modern floating-label inputs with focus ring + icon prefixes.
- Password field: eye/eye-off toggle for show/hide.
- Move "Forgot password?" link from above the password field to **below** the password field, right-aligned.
- Form entrance animation (fade + slide).

## 4. Forgot password / OTP / Reset
- `forgot-password.tsx`: modern card + animation, matching style.
- `reset-password.tsx`: replace single OTP input with a 6-box OTP component (using existing `input-otp` UI primitive), animated focus, auto-advance, paste support. New password fields get the same show/hide eye toggle.

## 5. Top bar profile role label
In `src/components/app-sidebar.tsx` (or wherever profile/role is rendered), read user from localStorage and render role line as:
- `admin` → just "Admin" (no dot, no extra)
- `user` → `User • {departmentName}`
- `manager` → `Manager • {departmentName}`
- `state_manager` → `State Manager • {stateName}`
- `district_manager` → `District Manager • {districtName}`
- `market_manager` → `Market Manager • {marketName}`
- `store_manager` → `Store Manager • {storeName}`
Helper added in `src/lib/auth.tsx` or a small `roleLabel.ts` util.

## 6. Tickets page date filter
In `src/routes/_app.tickets.tsx`:
- Remove the preset time dropdown.
- Add a calendar date-range picker (same component/pattern as dashboard) supporting custom range.
- Filtering logic updated to use `from`/`to` dates; existing ticket fetching API untouched.

## 7. New AI Chat page
- New route `src/routes/_app.ai-chat.tsx` (sidebar entry placed under "Team Chat").
- Modern chat UI built from AI Elements primitives (`conversation`, `message`, `prompt-input`, `shimmer`) — install via `bun x ai-elements@latest add conversation message prompt-input shimmer`.
- Behavior: user sends a query → static assistant reply: *"We're still working on this feature — it'll be available soon."* → after that reply, the composer/input is disabled so no further queries can be sent (with a small "Coming soon" hint).
- No backend call, no persistence.

## 8. Settings page
In `src/routes/_app.settings.tsx`:
- Add a "Profile" section with editable: full name, phone, email, avatar image upload (preview + change/remove).
- Save updates the user object in localStorage (no API exists for this yet) and shows a green success toast.
- Keep all other current settings intact.

## 9. Mobile responsiveness pass
- Sidebar collapses to drawer on small screens (use existing `Sheet` pattern).
- Tables become horizontally scrollable with sticky first column where useful.
- Login / OTP / dashboard cards stack cleanly under `sm`.
- Header actions condense to icon buttons on mobile.

## 10. General polish across admin/dashboard/chat/tickets
- Apply new card, table, button, badge styles uniformly.
- Add page-enter `animate-fade-in` to route components.
- Status & priority badges get refined tones using the new tokens.

---

## Technical notes
- No new backend, no schema changes, no auth changes.
- All existing API calls (`src/lib/api/*`, server functions, data store) remain untouched.
- New deps: `ai-elements` primitives only (frontend). No payment, no cloud, no DB work.
- Files touched (high-level):
  - `src/styles.css`, `src/components/ui/{button,input,sonner,card,table}.tsx`
  - `src/routes/login.tsx`, `forgot-password.tsx`, `reset-password.tsx`
  - `src/components/app-sidebar.tsx`
  - `src/routes/_app.tickets.tsx`, `_app.settings.tsx`, `_app.chat.tsx`
  - New: `src/routes/_app.ai-chat.tsx`, `src/components/ai-elements/*`
  - Small util: `src/lib/role-label.ts`

## Out of scope (confirm if you want these too)
- Backend endpoint for saving profile edits (currently local only).
- Real AI integration for the AI chat (static placeholder for now, as requested).

Approve this and I'll start implementing in order: theme/toasts → login/OTP → sidebar role label → tickets calendar → settings → AI chat → mobile polish.
