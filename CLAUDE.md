# PADA — Personal AI Delegation Assistant
## Claude Code Project Context

> Read this file completely before writing any code.
> This is the single source of truth for all conventions, architecture decisions, and working patterns.

---

## 1. What This Project Is

PADA is a personal AI delegation assistant. Users capture tasks (work, personal, email, code) by voice, text, or photo on iPhone, delegate them to people or apps, and track them from a Mac menu bar. Claude (Anthropic) is the AI backbone for task parsing, email summarisation, reply drafting, and daily briefings.

**Phase 1 MVP scope:** iOS capture app, Mac menu bar, CloudKit sync, AI task parsing, GitHub/Linear/Jira integration, VS Code/Cursor/Windsurf/Neovim extensions, Gmail integration, daily briefing.

---

## 2. Stack — Non-Negotiable

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Shared Types | `packages/types` — TypeScript interfaces, Zod schemas |
| Backend | Next.js 15 (App Router) on Vercel |
| AI | Vercel AI SDK 4.x + `@ai-sdk/anthropic` — model: `claude-sonnet-4-20250514` |
| Auth | Auth.js v5 (NextAuth) — Apple Sign In primary |
| Server DB | Neon Postgres + Drizzle ORM |
| Mobile | Expo SDK 52 + React Native 0.76 (New Architecture) |
| Mobile DB | expo-sqlite — offline-first |
| Sync | CloudKit Private Database (custom Expo Module) |
| Mac | Swift + AppKit (~500 lines) — NSStatusItem + NSPopover + WKWebView |
| IDE Extensions | TypeScript (VS Code API) for VS Code/Cursor/Windsurf; Kotlin (JetBrains); Lua (Neovim) |
| Cache | Vercel KV (Redis) |
| Storage | Vercel Blob |
| Webhooks | Cloudflare Workers |
| Analytics | PostHog (cloud) |
| Errors | Sentry |
| CI/CD | GitHub Actions + EAS Build + EAS Submit |

**Never suggest alternative technologies.** The stack is decided. If a package is missing, install it — don't replace it with something else.

---

## 3. Monorepo Structure

```
pada/
├── apps/
│   ├── web/                        # Next.js 15 backend + web
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── tasks/      # CRUD + IDE extension API
│   │   │   │   │   ├── ai/         # Claude proxy (parse, draft, briefing)
│   │   │   │   │   ├── webhook/    # GitHub, Linear, CI/CD ingest
│   │   │   │   │   └── oauth/      # GitHub, Gmail, Linear callbacks
│   │   │   │   └── auth/           # Auth.js route handler
│   │   │   ├── popover/            # Mac menu bar quick-add UI
│   │   │   └── (dashboard)/        # Web dashboard (Phase 2+)
│   │   ├── lib/
│   │   │   ├── ai/                 # Vercel AI SDK wrappers
│   │   │   ├── db/                 # Drizzle client + query helpers
│   │   │   ├── integrations/       # GitHub, Gmail, Linear API clients
│   │   │   └── auth.ts             # Auth.js config
│   │   └── middleware.ts           # Session guard + rate limit check
│   │
│   ├── mobile/                     # Expo + React Native
│   │   ├── app/                    # Expo Router screens
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx       # Inbox
│   │   │   │   └── capture.tsx     # Capture
│   │   │   ├── task/[id].tsx       # Task detail
│   │   │   └── settings/
│   │   ├── components/             # Shared RN components
│   │   ├── stores/                 # Zustand stores
│   │   │   └── taskStore.ts
│   │   ├── queries/                # TanStack Query hooks
│   │   ├── db/                     # expo-sqlite migrations + repositories
│   │   │   ├── migrate.ts
│   │   │   └── taskRepository.ts
│   │   ├── modules/                # Custom Expo Modules (Swift)
│   │   │   ├── CloudKit/
│   │   │   ├── ShareExtension/
│   │   │   └── SiriIntents/
│   │   └── constants/
│   │
│   └── mac-shell/                  # Swift — Mac menu bar only
│       └── PADAMenuBar/
│           ├── AppDelegate.swift
│           ├── StatusBarController.swift
│           ├── PopoverController.swift
│           └── ShortcutManager.swift
│
├── packages/
│   ├── types/                      # Shared TypeScript types + Zod schemas
│   │   └── src/
│   │       ├── task.ts
│   │       ├── user.ts
│   │       ├── integration.ts
│   │       └── index.ts
│   ├── ai-prompts/                 # Versioned prompt template functions
│   │   └── src/
│   │       ├── taskParse.ts        # taskParseV2(input: string): string
│   │       ├── emailDraft.ts
│   │       └── dailyBriefing.ts
│   ├── db/                         # Drizzle schema + migrations (Neon)
│   │   └── src/
│   │       ├── schema.ts
│   │       └── migrations/
│   └── ui/                         # Shared React components
│
└── extensions/
    ├── vscode/                     # VS Code / Cursor / Windsurf
    ├── zed/
    └── neovim/                     # Lua
```

---

## 4. Shared Types — Always Import From `packages/types`

**Never redefine types locally.** Always import from `@pada/types`.

```typescript
// ✅ Correct
import { Task, TaskStatus, TaskPriority, CreateTaskInput } from '@pada/types';

// ❌ Wrong — never do this
interface Task { title: string; ... }
```

The canonical Task type:

```typescript
export const TaskStatus   = ['open', 'in_progress', 'done', 'cancelled'] as const;
export const TaskPriority = ['P1', 'P2', 'P3', 'P4'] as const;
export const TaskCategory = ['Work', 'Personal', 'Email', 'Errands', 'Finance', 'Health', 'Code'] as const;
export const TaskSource   = ['manual', 'voice', 'photo', 'share_sheet', 'github', 'linear',
                             'jira', 'email', 'vscode', 'cursor', 'cli', 'ci_cd'] as const;

export interface Task {
  id:              string;           // UUID v4 — client-generated
  title:           string;           // max 500 chars
  notes?:          string;
  status:          typeof TaskStatus[number];
  priority?:       typeof TaskPriority[number];
  category?:       typeof TaskCategory[number];
  due_date?:       string;           // ISO 8601 UTC
  reminder_date?:  string;
  recurrence_rule?: string;          // RFC 5545 RRULE
  source:          typeof TaskSource[number];
  source_url?:     string;
  assignee_name?:  string;
  routed_to?:      'reminders' | 'things3' | 'notion';
  ai_confidence?:  number;           // 0.0–1.0
  created_at:      string;           // ISO 8601 UTC
  updated_at:      string;
  completed_at?:   string;
  deleted_at?:     string;           // soft delete
}
```

---

## 5. AI Rules — Critical

### Always use `generateObject` for structured data extraction

```typescript
// ✅ Correct — always use Zod schema
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { taskParseV2 } from '@pada/ai-prompts';
import { TaskParseSchema } from '@pada/types';

const { object } = await generateObject({
  model: anthropic('claude-sonnet-4-20250514'),
  schema: TaskParseSchema,  // Zod schema from packages/types
  prompt: taskParseV2(userInput),
});

// ❌ Wrong — never parse text with regex or JSON.parse
const result = await generateText({ ... });
const parsed = JSON.parse(result.text); // Never do this
```

### Always stream user-facing text responses

```typescript
// ✅ Correct — streaming reply draft
import { streamText } from 'ai';

const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: emailDraftV1(thread, bullets),
});
return result.toDataStreamResponse();
```

### Use tool use for multi-step flows (delegation)

```typescript
// ✅ Correct — delegation flow uses Claude tool use
const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  tools: { create_followup, draft_message, find_contact },
  prompt: delegationPromptV1(task, assignee),
});
```

### Prompt versioning rules

- All prompts live in `packages/ai-prompts/src/`
- Every prompt is a TypeScript function: `export function taskParseV2(input: string): string`
- Version in the function name — bump when changing prompt logic
- Never hardcode prompt text in route handlers
- If confidence < 0.7, flag task for user review — don't silently apply all AI fields

### API key — never in client code

The `ANTHROPIC_API_KEY` is a Vercel environment secret. It is only accessed in `apps/web/`. Never import or reference it in `apps/mobile/`, `apps/mac-shell/`, or `extensions/`.

---

## 6. Next.js API Conventions

### Route structure

All API routes live under `apps/web/app/api/v1/`. Every route handler:

1. Validates the Auth.js session first — return 401 if no session
2. Validates the request body with Zod
3. Runs the business logic
4. Returns typed JSON

```typescript
// apps/web/app/api/v1/tasks/route.ts
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { CreateTaskInputSchema } from '@pada/types';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTaskInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const task = await db.tasks.create({ ...parsed.data, userId: session.user.id });
  return NextResponse.json(task, { status: 201 });
}
```

### Rate limiting

AI endpoints must check rate limits via Vercel KV before calling Anthropic:

```typescript
import { rateLimit } from '@/lib/rateLimit';

const { success } = await rateLimit(session.user.id, 'ai', { limit: 60, window: '1h' });
if (!success) return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
```

### Error response format

```typescript
// Always return typed errors
{ error: string, code?: string, details?: unknown }
```

---

## 7. Database Conventions (Drizzle + Neon)

### Schema location

`packages/db/src/schema.ts` — the canonical Drizzle schema. Import `db` from `@pada/db` in `apps/web`.

### Migration rules

- Always use `pnpm drizzle-kit generate` to create migration files
- Never edit existing migration files — add a new one
- Run `pnpm drizzle-kit push` in dev, `pnpm drizzle-kit migrate` in prod CI

### Soft deletes

All entities use `deleted_at` for soft deletion. All queries must filter `WHERE deleted_at IS NULL` by default. Use the repository helpers — never write raw queries that skip this filter.

```typescript
// ✅ Correct — uses repository which filters deleted_at
const tasks = await taskRepo.listForUser(userId);

// ❌ Wrong — raw query might include deleted tasks
const tasks = await db.select().from(tasksTable);
```

---

## 8. Mobile (Expo) Conventions

### State management pattern

- **Zustand** for UI state (what's selected, what's loading, filter state)
- **TanStack Query** for server state (fetching, caching, background refresh)
- **expo-sqlite** for local persistence (source of truth offline)
- **Never** store task data only in Zustand — always persist to SQLite

### Offline-first rule

Every write must go to SQLite first, then sync:

```typescript
// ✅ Correct — optimistic local write, then sync
const createTask = async (input: CreateTaskInput) => {
  const task = buildTask(input);
  await taskRepo.insert(task);          // SQLite first
  taskStore.addTask(task);              // Zustand update (optimistic)
  syncQueue.enqueue({ op: 'insert', record: task }); // background sync
};
```

### expo-sqlite migrations

Migrations live in `apps/mobile/db/migrate.ts`. Each migration is a numbered function. Never edit existing migrations — add a new one with the next number.

### Custom Expo Modules (Swift)

The `apps/mobile/modules/` directory contains Swift Expo Modules for:
- `CloudKit/` — sync bridge between React Native and CloudKit APIs
- `ShareExtension/` — iOS Share Sheet capture
- `SiriIntents/` — AppIntents for Siri voice shortcuts

When modifying these modules, run `expo prebuild` and rebuild before testing. Changes here require a full EAS Build — they can't be OTA updated.

### Component conventions

- All components in `apps/mobile/components/` are React Native — never use HTML elements
- Use NativeWind utility classes for styling — never `StyleSheet.create`
- Every screen has a `<SafeAreaView>` wrapper
- Loading states use the shared `<LoadingSpinner />` component

---

## 9. Mac Shell (Swift) Conventions

The Swift code in `apps/mac-shell/` is intentionally minimal. Keep it that way.

**What belongs in Swift:**
- NSStatusItem management (badge, icon)
- NSPopover lifecycle (open/close)
- WKWebView setup and navigation
- NSEvent global shortcut monitor
- WKScriptMessageHandler for Swift ↔ web bridge
- NSAppleScript for Reminders/Things routing
- SMAppService for launch-at-login

**What does NOT belong in Swift:**
- Business logic (task creation, parsing, sync decisions)
- UI layout (this lives in the Next.js /popover page)
- API calls (done from the web layer in WKWebView)

If you find yourself writing more than 50 lines of Swift for a new feature, it probably belongs in the Next.js /popover page instead.

The Swift ↔ web bridge:

```swift
// Swift → Web: post event
webView.evaluateJavaScript("window.padaBridge.onShortcutTriggered()")

// Web → Swift: receive message
func userContentController(_ controller: WKUserContentController,
                           didReceive message: WKScriptMessage) {
    if message.name == "taskSaved" { closePopover() }
}
```

```typescript
// Web side (apps/web/app/popover/page.tsx)
window.padaBridge = {
  onShortcutTriggered: () => { /* focus input */ }
};
// After save:
window.webkit.messageHandlers.taskSaved.postMessage({});
```

---

## 10. IDE Extension Conventions

All extensions POST to the same endpoint:

```
POST https://pada.app/api/v1/tasks
Authorization: Bearer <api_token>
Content-Type: application/json

{
  "title": string,
  "source": "vscode" | "cursor" | "windsurf" | "zed" | "neovim" | "cli",
  "context": {
    "file": string,
    "line": number,
    "repo": string,
    "branch": string,
    "snippet": string  // max 2000 chars
  }
}
```

Shared extension logic lives in `extensions/core/` (TypeScript). Platform-specific code (command registration, manifest) lives in `extensions/vscode/`, `extensions/zed/`.

The API token is stored in the system keychain via the VS Code `SecretStorage` API — never in `settings.json` or any file that could be committed.

---

## 11. Security Rules — Never Break These

1. **`ANTHROPIC_API_KEY`** — Vercel secret only. Never in `apps/mobile/`, `apps/mac-shell/`, `extensions/`, or any client bundle.
2. **OAuth tokens** — stored in iOS Keychain (`expo-secure-store`) and Mac Keychain (Swift Security framework). Never in AsyncStorage, SQLite, or any unencrypted store.
3. **No PII in analytics** — PostHog events contain: event name, timestamp, feature flags, device class. Never task title, email content, file path, or user name.
4. **No content in Sentry** — `beforeSend` hook must strip `task.title`, `email.body`, `context.snippet` from all error reports.
5. **Webhook HMAC validation** — every inbound webhook (GitHub, Linear, CI) must validate the HMAC signature before processing. Reject without logging the payload if invalid.
6. **SQL injection** — always use Drizzle parameterised queries. Never string-interpolate into SQL.

---

## 12. Testing Conventions

### What to test

- All business logic in `packages/*` — unit tests with Vitest, 80% coverage minimum
- All Next.js API route handlers — integration tests with Vitest + mock Drizzle
- Mobile screens — React Native Testing Library smoke tests
- AI routes — mock `@ai-sdk/anthropic` — never call real Anthropic in tests

### Running tests

```bash
pnpm test              # all packages
pnpm test --filter web # Next.js only
pnpm test --filter mobile # Expo only
```

### Test file convention

Co-locate tests with source: `task.ts` → `task.test.ts`. Never put tests in a separate `/tests` directory.

---

## 13. Acceptance Criteria Reference

Every ticket references AC scenario IDs from the Acceptance Criteria document (PADA_AcceptanceCriteria_v2.docx). Before marking a ticket done:

1. Read the referenced AC scenarios
2. Manually run the Given/When/Then steps on a real device
3. All THEN conditions must be true
4. Definition of Done: AC passes + Sentry wired + PostHog event firing + syncs to both devices

**Key scenarios by area:**

| Area | AC IDs |
|---|---|
| Text capture | AC-001, AC-002, AC-003 |
| Voice | AC-004, AC-005 |
| Photo | AC-006, AC-007 |
| Share Extension | AC-008 |
| Categories & priority | AC-009, AC-010 |
| Sub-tasks | AC-011 |
| Due dates & recurrence | AC-012, AC-013 |
| Cross-device sync | AC-014, AC-015, AC-016, AC-017 |
| AI briefing | AC-018 |
| AI suggestions | AC-019, AC-020 |
| AI delegation | AC-021 |
| IDE extensions | AC-022, AC-023, AC-024 |
| GitHub | AC-025 |
| Linear | AC-026 |
| CLI | AC-027 |
| CI/CD | AC-028 |
| Gmail OAuth | AC-029 |
| Email extraction | AC-030 |
| Reply drafting | AC-031 |
| Onboarding | AC-032, AC-033 |
| Performance | AC-034, AC-035 |
| Security | AC-036 |
| Accessibility | AC-037 |

---

## 14. Git & PR Conventions

- **Branch naming:** `feature/S1-06-create-task-api`, `fix/S2-08-cloudkit-sync`, `chore/update-deps`
- **Commit format:** `feat(api): add POST /api/v1/tasks endpoint [S1-06]`
- **PRs:** squash merge only. PR title = ticket title. Link GitHub Issue in PR body.
- **main is always deployable.** Never commit broken builds to main.
- **No secrets in commits.** Use `.env.local` (gitignored) for local secrets.

---

## 15. Environment Variables

```bash
# apps/web/.env.local (never commit)
ANTHROPIC_API_KEY=sk-ant-...
NEON_DATABASE_URL=postgres://...
AUTH_SECRET=...
AUTH_APPLE_ID=...
AUTH_APPLE_SECRET=...
POSTHO_API_KEY=...
SENTRY_DSN=...
GITHUB_WEBHOOK_SECRET=...
VERCEL_KV_URL=...
VERCEL_BLOB_TOKEN=...

# apps/mobile/.env.local
EXPO_PUBLIC_API_URL=https://pada.app   # or http://localhost:3000 in dev
EXPO_PUBLIC_POSTHOG_KEY=...
SENTRY_DSN=...
```

`EXPO_PUBLIC_*` variables are bundled into the client — never put secrets here.

---

## 16. Key Commands

```bash
# Install all dependencies
pnpm install

# Start Next.js dev server
pnpm dev --filter web

# Start Expo dev server
pnpm dev --filter mobile

# Run all tests
pnpm test

# Type-check everything
pnpm typecheck

# Generate Drizzle migration
pnpm drizzle-kit generate --filter db

# Push schema to Neon dev branch
pnpm drizzle-kit push --filter db

# Build iOS via EAS
eas build --platform ios --profile preview

# Submit iOS to TestFlight
eas submit --platform ios

# Build Mac DMG (GitHub Actions handles this in CI)
xcodebuild archive -project PADAMenuBar.xcodeproj ...
```

---

## 17. When You're Unsure

1. **Check `packages/types/` first** — if a type or schema exists, use it
2. **Check existing route handlers** — follow the same pattern
3. **Check the AC doc** — if the feature has an AC scenario, the behaviour is specified
4. **Ask in the chat** — don't guess on security, sync, or AI behaviour
5. **Don't add new dependencies without checking** — the stack is decided; if a package is genuinely needed, add it with a comment explaining why

---

*Last updated: April 2026 — v2.0 Hybrid Stack*
*Companion docs: PRD v2, AC v2, Technical Architecture v2, Data Model v2, Stack Decision v1, Sprint Plan Phase 1*
