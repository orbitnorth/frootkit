# FrootKit Routing Contract, Preact SSR & Hydration Architecture

FrootKit provides a zero-overhead, Next.js-compatible App Router engine built on top of high-speed monomorphic V8 dispatch and Preact. This document outlines the formal routing contracts, server data-loading lifecycle, state serialization, and client-side hydration.

---

## 1. The Routing Contract

FrootKit establishes a predictable file-system-based routing contract inside `src/app/`:

| File Convention | Route Role | Example Path | URL Match |
|---|---|---|---|
| `layout.tsx` | Nested UI Shell | `src/app/layout.tsx` | Root document shell for all child routes |
| `layout.tsx` | Segment UI Shell | `src/app/dashboard/layout.tsx` | Wraps `/dashboard/*` sub-routes |
| `page.tsx` | Route Leaf View | `src/app/page.tsx` | `/` |
| `page.tsx` | Dynamic Route | `src/app/blog/[slug]/page.tsx` | `/blog/:slug` (`params.slug`) |
| `page.tsx` | Catch-All Route | `src/app/docs/[...slug]/page.tsx` | `/docs/*` (`params.slug`) |
| `page.tsx` | Optional Catch-All | `src/app/shop/[[...filter]]/page.tsx` | `/shop` and `/shop/*` |
| `route.ts` | Backend API Route | `src/app/api/auth/route.ts` | `/api/auth` (zero SSR overhead) |
| `not-found.tsx` | 404 Error View | `src/app/not-found.tsx` | Custom 404 handler |
| `error.tsx` | Error Boundary | `src/app/error.tsx` | 500 Unhandled Exception boundary |

### Nested Layout Composition
Layouts inherit hierarchically from root to leaf:
```
RootLayout (src/app/layout.tsx)
  └── DashboardLayout (src/app/dashboard/layout.tsx)
        └── DashboardPage (src/app/dashboard/page.tsx)
```
- **Document Shell Safeguard**: Outer layouts check whether an inner tree already rendered a complete `<html>` document (via `isHtmlDocument()`). If so, outer layouts will not duplicate root HTML tags.
- **Layout Isolation**: Setting `export const isolate = true` in a child layout or page removes all ancestor layout wrappers, giving you complete control over the viewport.
- **Route Groups**: Folders named `(groupName)` (e.g., `(marketing)/about/page.tsx`) organize routes without affecting the public URL (`/about`).

### 404 Not Found Handling
Call `notFound()` from any page, loader, or server action:
```tsx
import { notFound } from 'frootkit';

export default async function ProductPage({ params }) {
  const product = await db.getProduct(params.id);
  if (!product) {
    notFound(); // Triggers status 404 and renders not-found.tsx
  }
  return <div>{product.name}</div>;
}
```

### Error Boundaries (`error.tsx`)
When an unhandled exception occurs during data fetching or SSR:
```tsx
export default function ErrorBoundary({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <div class="p-8 rounded-xl bg-[#0a0f18] border border-[#1a2333]">
      <h2 class="text-xl font-bold text-rose-400">Application Error</h2>
      <p class="text-slate-300 text-sm mt-2">{error.message}</p>
      {reset && (
        <button onClick={reset} class="mt-4 px-4 py-2 bg-emerald-500 text-black font-semibold rounded-lg">
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

## 2. Server Functions & Data-Loading

FrootKit provides two complementary data-loading models:

### Model A: Async Page Components (Direct Server Execution)
In FrootKit, page components can be standard async functions:
```tsx
export default async function DashboardPage({ params, searchParams, c }) {
  const metrics = await db.queryMetrics();
  return <MetricsGrid metrics={metrics} />;
}
```

### Model B: Page `loader()` & Automatic Hydration
Export a `loader()` function when server state must be automatically passed to the client for Preact hydration:
```tsx
import type { LoaderContext, PageProps } from 'frootkit';

export async function loader({ params, request }: LoaderContext) {
  const users = await db.users.findMany();
  return { users };
}

export default function UsersPage({ data }: PageProps<never, { users: User[] }>) {
  return (
    <div>
      <h1>Active Users</h1>
      <ul>{data.users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
    </div>
  );
}
```
When `loader` is present:
1. FrootKit executes `loader()` prior to rendering.
2. The resolved data is passed directly into `Page({ data })`.
3. The data is safely serialized into `<script id="__FROOT_DATA__" type="application/json">` before `</body>`.

### Server Actions / Form Mutations (`action()`)
Export an `action()` function to handle `POST` mutations on the route:
```tsx
export async function action({ request }) {
  const formData = await request.formData();
  await db.createUser(formData.get('email'));
  return Response.redirect('/dashboard', 303);
}
```

---

## 3. Reliable Preact SSR & Hydration State Serialization

Preact supports rendering components to an HTML string on the server (`renderToString`) and mounting them in the browser via `hydrate(vnode, container)`.

### How State is Serialized
Direct string interpolation like `<script>window.__DATA__ = ${JSON.stringify(data)}</script>` is unsafe and vulnerable to Cross-Site Scripting (XSS) or parser breaks if the data contains `</script>`.

FrootKit utilizes strict JSON serialization via `serializeState(data)`:
```ts
export function serializeState(data: unknown): string {
  if (data === undefined) return 'null';
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
```

### The Injected Hydration Payload
The server outputs state inside a standard non-executable JSON script:
```html
<script id="__FROOT_DATA__" type="application/json">
  {"data":{"users":[{"id":1,"name":"Alice"}]},"params":{},"currentPath":"/users"}
</script>
</body>
```

### Client-Side Hydration
In your client entry point, read the serialized state and hydrate:
```tsx
import { hydrate } from 'preact';
import { getHydrationData } from 'frootkit';
import UsersPage from './UsersPage';

const hydrationState = getHydrationData();
const rootElement = document.getElementById('root');

if (rootElement) {
  hydrate(<UsersPage data={hydrationState?.data} />, rootElement);
}
```
Benefits of this design:
- **Zero Raw Script Injection**: Non-executable JSON MIME type ensures the browser engine treats the payload strictly as passive data.
- **Byte-Identical SSR DOM**: No hydration mismatch errors caused by character escaping differences.
- **Fast Startup**: Browsers parse `JSON.parse()` significantly faster than large executable JavaScript bundles.

