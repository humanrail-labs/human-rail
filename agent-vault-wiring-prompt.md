# Agent Vault — Frontend Wiring & Vercel Deploy Readiness

> **Context:** Phase 1–6 implementation is complete. Now we need to wire everything together so the app builds cleanly, all routes are accessible, navigation works end-to-end, and Vercel auto-deploys on push without errors.

---

## RULES

1. **Do NOT build new features.** This prompt is ONLY about wiring, connecting, and fixing what already exists.
2. **Run `npm run build` after EVERY change.** If it fails, fix it before moving on. Vercel runs `next build` — if it fails locally, it fails on Vercel.
3. **Do NOT delete or rewrite existing working code.** Only add imports, fix references, connect routes, and resolve build errors.
4. **Work through each section in order.** Confirm each section passes build before moving to the next.

---

## SECTION 1: Fix All Build Errors

This is the highest priority. Nothing else matters if the build is broken.

```bash
npm run build 2>&1 | head -100
```

Read every error. Fix them one by one. Common issues to look for:

- **Missing imports** — Components created in Phase 1–6 that aren't imported where they're used
- **Type errors** — Props that don't match, missing type definitions, `any` types that TypeScript strict mode rejects
- **Module not found** — File paths that are wrong (case sensitivity matters on Linux/Vercel)
- **Missing dependencies** — If any new npm packages were used (recharts, date-fns, etc.), make sure they're in `package.json` dependencies (NOT devDependencies for runtime packages)
- **Server/Client component mismatches** — Next.js App Router requires `"use client"` directive on any component that uses hooks (`useState`, `useEffect`, `useWallet`, `useConnection`, etc.). If a page or component uses React hooks or browser APIs, it MUST have `"use client"` at the top.
- **Dynamic imports for wallet-dependent components** — Wallet adapter components must be dynamically imported with `{ ssr: false }` to avoid hydration mismatches.

Keep running `npm run build` until you get a clean build with **zero errors**.

```bash
# After fixing, confirm clean build
npm run build
echo $?  # Must be 0
```

**STOP. Confirm clean build before Section 2.**

---

## SECTION 2: Verify All Routes Are Accessible

Check that every route in the app renders without crashing. Run the dev server and test each route:

```bash
npm run dev &
sleep 5
```

Then verify each route returns a 200 (not 404, not 500):

```bash
# Core vault routes
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/identity
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/agents
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/agents/new
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/capabilities
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/payments
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/vault/activity

# Public routes
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/agent
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/human

# Old dashboard redirects (should 307/308 to /vault equivalents)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/identity
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/agents
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/delegation
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/payments
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/receipts
```

For any route returning 404 or 500:
- **404** → The page file is missing or in the wrong directory. Check `app/vault/` structure.
- **500** → There's a runtime error. Check the terminal output for the stack trace and fix the component.

For old `/dashboard` routes:
- If redirects weren't set up in Phase 1, add them now. Create `app/dashboard/page.tsx` (and each sub-route) with:

```typescript
import { redirect } from 'next/navigation';
export default function DashboardRedirect() {
  redirect('/vault');
}
```

Do the same for each sub-route mapping:
- `/dashboard/identity` → `/vault/identity`
- `/dashboard/agents` → `/vault/agents`
- `/dashboard/delegation` → `/vault/capabilities`
- `/dashboard/payments` → `/vault/payments`
- `/dashboard/receipts` → `/vault/activity`

**STOP. Confirm all routes return 200 (or proper redirects) before Section 3.**

---

## SECTION 3: Wire Navigation Links

Open the sidebar/navigation component (check `components/layout/` or `app/vault/layout.tsx`). Verify every navigation link points to the correct route and that clicking each one actually navigates there.

### Checklist:

1. **Sidebar nav items** — Each item's `href` must match the actual route:
   - Home → `/vault`
   - My Identity → `/vault/identity`
   - My Agents → `/vault/agents`
   - Capabilities → `/vault/capabilities`
   - Payments → `/vault/payments`
   - Activity Log → `/vault/activity`

2. **Active state highlighting** — The current route should be visually highlighted in the nav. Check that the active detection uses `usePathname()` from `next/navigation` and matches the route correctly. Watch for trailing slash issues.

3. **Internal links throughout the app** — Search for all `<Link>` and `href` references in the vault pages. Make sure they point to `/vault/...` routes, not old `/dashboard/...` routes:

```bash
# Find any lingering /dashboard links in vault pages
grep -r "/dashboard" app/vault/ --include="*.tsx" --include="*.ts"
grep -r "/dashboard" components/vault/ --include="*.tsx" --include="*.ts"
```

Replace any found with the correct `/vault/` equivalent.

4. **CTA buttons** — Verify these specific navigation flows work:
   - Home page "Deploy Your First Agent" → `/vault/agents/new`
   - Home page "Verify Your Identity" → `/vault/identity`
   - Agent list "View Details" → `/vault/agents/[agentId]`
   - Agent detail "Back to Agents" → `/vault/agents`
   - Wizard completion "View Agent" → `/vault/agents/[agentId]`
   - Landing page "Launch Vault" → `/vault`

5. **Mobile navigation** — If a bottom tab bar was implemented for mobile, verify it has the same links and active states as the sidebar.

**STOP. Confirm all navigation works before Section 4.**

---

## SECTION 4: Wire Data Flow — Hooks to Components

Verify that every component that displays on-chain data is actually connected to the correct hook and handles all states.

### 4.1 — Home Page Data (`/vault/page.tsx`)

Open the home page and verify:

- [ ] It imports and calls `useHumanProfile` (from `lib/hooks/`) to check identity status
- [ ] It imports and calls `useAgents` (or equivalent) to fetch agent list
- [ ] It imports and calls `useReceipts` (or equivalent) to fetch recent activity
- [ ] It imports `useWallet` from `@solana/wallet-adapter-react` for the connected wallet
- [ ] It imports `useConnection` from `@solana/wallet-adapter-react` for RPC calls
- [ ] When wallet is NOT connected: shows a connect prompt (not a crash, not a blank screen)
- [ ] When wallet IS connected but no profile: shows "Verify Your Identity" CTA
- [ ] When wallet IS connected and has profile: shows agent overview, stats, activity

If any hook is imported but not wired to the JSX, wire it. If any section shows hardcoded/placeholder data instead of hook data, replace with real hook calls.

### 4.2 — Agent List Page (`/vault/agents/page.tsx`)

- [ ] Fetches all agents for the connected wallet's human profile
- [ ] Each agent card links to `/vault/agents/[agent_pubkey]`
- [ ] "Register New Agent" / "Deploy Agent" button links to `/vault/agents/new`
- [ ] Empty state shows when no agents exist

### 4.3 — Agent Detail Page (`/vault/agents/[agentId]/page.tsx`)

- [ ] Reads `agentId` from route params
- [ ] Fetches the agent account from on-chain using the pubkey
- [ ] Action buttons (suspend, reactivate, revoke, freeze) call the correct hook mutations
- [ ] After a successful action, the page data refreshes (re-fetches the agent account)
- [ ] Capabilities tab fetches capabilities filtered by this agent
- [ ] Activity tab fetches receipts filtered by this agent
- [ ] Analytics tab computes data from receipts/capabilities (if using recharts, verify the chart renders)

### 4.4 — Agent Deployment Wizard (`/vault/agents/new/page.tsx`)

- [ ] Step 1 form state carries through to Step 4
- [ ] Step 4 "Deploy" button calls `register_agent` instruction (verify the correct hook/function is called)
- [ ] After agent registration, capability issuance uses the newly created agent PDA
- [ ] On success, redirects to `/vault/agents/[newAgentPubkey]`
- [ ] On error at any step, shows which step failed and allows retry

### 4.5 — Capabilities Page (`/vault/capabilities/page.tsx`)

- [ ] Fetches all capabilities for the connected human
- [ ] Issue/freeze/unfreeze/revoke actions use `useCapabilities` hook
- [ ] After mutations, list refreshes

### 4.6 — Activity Page (`/vault/activity/page.tsx`)

- [ ] Fetches all receipts for the connected human/agents
- [ ] Pagination or load-more works
- [ ] Each receipt links to Solana Explorer (correct explorer URL for devnet)

**STOP. Confirm all data flows work before Section 5.**

---

## SECTION 5: Wire the Wallet Provider

Verify the wallet provider wraps ALL vault routes properly.

### Check the provider chain:

1. Open `app/layout.tsx` (root layout). Verify it includes the Solana wallet providers. The provider chain should be:

```
ConnectionProvider → WalletProvider → WalletModalProvider → {children}
```

If the providers are in `lib/solana/` (e.g., `SolanaProvider` or `WalletContextProvider`), make sure the root layout uses them.

2. Verify the RPC endpoint is configured correctly:

```bash
grep -r "NEXT_PUBLIC_SOLANA_RPC_URL\|clusterApiUrl\|devnet" lib/solana/ app/layout.tsx --include="*.tsx" --include="*.ts"
```

The endpoint should use `process.env.NEXT_PUBLIC_SOLANA_RPC_URL` with a fallback to `clusterApiUrl('devnet')`.

3. Verify wallet adapters are configured. Check that Phantom and Solflare adapters are included (the existing codebase uses these):

```bash
grep -r "PhantomWalletAdapter\|SolflareWalletAdapter" lib/solana/ --include="*.tsx" --include="*.ts"
```

4. Make sure the vault layout does NOT create a second/nested wallet provider. There should be ONE wallet provider at the root level — not one in root AND another in `/vault/layout.tsx`.

---

## SECTION 6: Verify Middleware & Auth Gating

Open `middleware.ts` at the project root.

1. Check what routes are currently gated:

```bash
cat middleware.ts
```

2. The vault routes (`/vault/*`) should be included in the middleware matcher. If they're not, add them.

3. Public routes that should NOT be gated (no wallet required):
   - `/` (landing page)
   - `/agent/[agentId]` (public agent profile)
   - `/human/[humanId]` (public human profile)
   - `/vault` itself can be accessible but should show a "connect wallet" state

4. If the middleware checks for wallet connection via cookies or headers, make sure the wallet adapter sets those correctly. If the middleware was designed for `/dashboard` routes, update the path patterns to include `/vault`.

---

## SECTION 7: Verify Vercel Configuration

### 7.1 — Check next.config

```bash
cat next.config.ts  # or next.config.js / next.config.mjs
```

Look for:
- `output` setting — should NOT be `'export'` (we need server-side rendering for dynamic routes)
- `images` config — if using `next/image`, remote patterns should be configured
- Any rewrites or redirects that might conflict with new `/vault` routes
- `eslint.ignoreDuringBuilds` — if set to `true`, that's fine for now but note it

### 7.2 — Check for dynamic route issues

Vercel builds all pages at build time for static generation. Dynamic routes with `[agentId]` need `generateStaticParams` OR must be marked as dynamic:

Check if agent detail page has:
```typescript
export const dynamic = 'force-dynamic';
```

or a `generateStaticParams` function. Since we're reading from on-chain data that changes constantly, `force-dynamic` is the right choice. Add it to these pages if missing:

- `app/vault/agents/[agentId]/page.tsx`
- `app/agent/[agentId]/page.tsx` (if it exists)
- `app/human/[humanId]/page.tsx` (if it exists)

### 7.3 — Check for build-time environment variable access

Any component that accesses `process.env.NEXT_PUBLIC_*` at build time needs those vars set in Vercel. Verify `.env.example` lists everything needed:

```bash
grep -r "process.env" lib/ app/ components/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next" | sort -u
```

Make a list of every env var used. Ensure they're all in `.env.example` with descriptions.

### 7.4 — Check package.json build script

```bash
cat package.json | grep -A5 '"scripts"'
```

Vercel runs the `build` script. It should be `next build`. If there are pre-build steps (generating types, etc.), they should be chained: `"build": "generate-types && next build"` or similar.

### 7.5 — Check for large dependencies

Vercel has a 250MB function size limit. Check the bundle:

```bash
npm run build 2>&1 | grep -i "size\|bundle\|warning"
```

If Three.js is included in vault pages (it shouldn't be — only the landing page), make sure it's dynamically imported:

```typescript
const ThreeScene = dynamic(() => import('@/components/three-scene'), { ssr: false });
```

---

## SECTION 8: Final Verification Checklist

Run these in sequence. ALL must pass.

```bash
# 1. Clean install (simulates Vercel's fresh install)
rm -rf node_modules .next
npm install

# 2. Lint (if Vercel runs lint)
npm run lint 2>&1 | tail -20

# 3. Build (this is what Vercel runs)
npm run build
echo "Build exit code: $?"

# 4. Start production server and test routes
npm run start &
sleep 5

# Test critical routes
for route in "/" "/vault" "/vault/identity" "/vault/agents" "/vault/agents/new" "/vault/capabilities" "/vault/payments" "/vault/activity"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$route")
  echo "$route → $code"
done

# 5. Kill the server
kill %1
```

Expected output: ALL routes return 200.

If any route returns 500, check `.next/server/app/` for the error. If lint has errors that Vercel treats as fatal, fix them or add `eslint.ignoreDuringBuilds: true` to `next.config`.

---

## SECTION 9: Git & Deploy

Once everything passes:

```bash
# 1. Check what files changed
git status
git diff --stat

# 2. Stage everything
git add -A

# 3. Commit with a clear message
git commit -m "feat: wire Agent Vault frontend — all routes, navigation, data flow, and Vercel deploy readiness"

# 4. Push (this triggers Vercel auto-deploy)
git push origin main
```

After push, watch the Vercel deployment dashboard. If the build fails on Vercel but passed locally, the most common causes are:

1. **Missing env vars on Vercel** — Go to Vercel project settings → Environment Variables and add all `NEXT_PUBLIC_*` vars
2. **Case sensitivity** — Vercel runs Linux. `import from './MyComponent'` won't find `./mycomponent.tsx`
3. **Node.js version mismatch** — Check Vercel's Node version matches your local (`node -v`). Set it in Vercel project settings or add `"engines": { "node": ">=20" }` to package.json

---

## QUICK REFERENCE: Files That Must Exist for Routes to Work

```
app/
├── page.tsx                           # Landing page (/)
├── layout.tsx                         # Root layout with wallet providers
├── vault/
│   ├── layout.tsx                     # Vault layout with sidebar nav
│   ├── page.tsx                       # Vault home (/vault)
│   ├── identity/
│   │   └── page.tsx                   # Identity management
│   ├── agents/
│   │   ├── page.tsx                   # Agent list
│   │   ├── new/
│   │   │   └── page.tsx              # Deploy wizard
│   │   └── [agentId]/
│   │       └── page.tsx              # Agent detail
│   ├── capabilities/
│   │   └── page.tsx                   # Capabilities management
│   ├── payments/
│   │   └── page.tsx                   # Payments
│   └── activity/
│       └── page.tsx                   # Activity log / receipts
├── agent/                             # Public agent profiles (existing)
├── human/                             # Public human profiles (existing)
├── dashboard/                         # Redirects to /vault (backward compat)
│   ├── page.tsx                       # redirect('/vault')
│   ├── identity/page.tsx             # redirect('/vault/identity')
│   ├── agents/page.tsx               # redirect('/vault/agents')
│   ├── delegation/page.tsx           # redirect('/vault/capabilities')
│   ├── payments/page.tsx             # redirect('/vault/payments')
│   └── receipts/page.tsx            # redirect('/vault/activity')
└── rails/                            # Public rails UIs (existing, keep as-is)
```

Verify each file in this tree exists. If any is missing, that route will 404.
