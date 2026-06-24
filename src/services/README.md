# Services Layer

All HTTP/API calls go through this folder.

## Structure

- `http.ts` — shared `HttpClient`. Reads `VITE_API_BASE_URL` from `.env`.
  A single `http` instance is exported and reused by every service.
- `*.service.ts` — one class per domain (auth, users, states, …) exporting
  both the class and a ready-to-use singleton (`authService`, `usersService`, …).
- `index.ts` — barrel export. Always import from `@/services`.

## Usage

```ts
import { usersService } from "@/services";

const res = await usersService.getAll({ page: 0, size: 20 });
console.log(res.data);
```

## Changing the backend

Edit `.env`:

```
VITE_API_BASE_URL=https://api.example.com
```

That's it — every service picks it up automatically.

## Adding a new endpoint

1. Add the path to `src/lib/config.ts`.
2. Add a method to the relevant `*.service.ts` (or create a new one).
3. Export from `src/services/index.ts` if it's a new service.

The legacy `src/lib/api/client.ts` still works and is used internally for
shared types; new code should consume the service classes from `@/services`.
