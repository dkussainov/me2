# ME2 Agent Team — Orchestration Guide

> **Location:** `.claude/agents/` — Claude Code discovers these automatically.
> **Project:** ME2 (PADA — Personal AI Delegation Assistant)
> **Owner:** Solo founder — you orchestrate. Agents execute.

---

## The Team

| Agent | File | Role |
|---|---|---|
| `me2-project-manager` | `me2-project-manager.md` | Plans sprints, writes tickets, sequences work |
| `me2-code-engineer` | `me2-code-engineer.md` | Implements features end-to-end |
| `me2-code-designer` | `me2-code-designer.md` | Designs screens with Stitch, writes component specs |
| `me2-design-reviewer` | `me2-design-reviewer.md` | Reviews designs and implemented screens for quality |
| `me2-code-tester` | `me2-code-tester.md` | Writes automated tests, runs AC scenario walkthroughs |
| `me2-tester` | `me2-tester.md` | Manual device testing, E2E regression suite |
| `me2-code-build-verificator` | `me2-code-build-verificator.md` | Pre-merge gatekeeper — all 5 gates must pass |

---

## Standard Ticket Flow

This is the flow for a typical feature ticket. You control each handoff.

```
You (owner)
  │
  ▼
me2-project-manager      → Writes the ticket (context, approach, AC refs, points)
  │
  ├─ Needs design? ──────→ me2-code-designer   → Generates Stitch mockup + spec
  │                              │
  │                              ▼
  │                        me2-design-reviewer  → Approves or returns with feedback
  │                              │
  ▼                              ▼
me2-code-engineer         ←──── Gets ticket + design spec (if applicable)
  │                             Implements: API routes, mobile screens, sync, AI
  │
  ▼
me2-code-tester           → Writes tests, runs AC scenarios, files bugs if found
  │                           ↑ (bugs return to me2-code-engineer)
  ▼
me2-tester                → Manual device testing, E2E flows, VoiceOver
  │                           ↑ (bugs return to me2-code-engineer)
  ▼
me2-code-build-verificator → Runs all 5 gates: build + QA + security + perf + DoD
  │                           ↑ (failures return to me2-code-engineer)
  ▼
You (owner)               → Review diff, approve PR, squash merge to main
                            Vercel auto-deploys. EAS Update ships to TestFlight.
```

---

## Simplified Flow (Small Tickets ≤ 2pts)

For simple schema changes, config tweaks, or copy changes:

```
me2-project-manager → me2-code-engineer → me2-code-build-verificator → You merge
```

Skip design and manual testing for non-UI, non-sync tickets.

---

## How to Invoke an Agent in Claude Code

Start a new Claude Code session for each ticket. Point it at the right agent:

```bash
# In the ME2 repo root
claude

# Then in the session:
> Use the me2-code-engineer agent. Implement ticket S1-06: POST /api/v1/tasks.
> AC refs: AC-001, AC-003. See CLAUDE.md for conventions.
```

Claude Code reads `CLAUDE.md` and `.claude/agents/me2-code-engineer.md` automatically.

**One session per ticket.** Start a fresh session for each new agent handoff. Don't chain multiple tickets in one session — context window fills and quality drops.

---

## Handoff Phrases

Each agent ends its output with a standard handoff phrase. Use these as your signal to start the next session:

| From | Phrase | Your action |
|---|---|---|
| `me2-project-manager` | "Ticket ready. Hand to **me2-code-engineer**." | Start engineer session |
| `me2-project-manager` | "Needs design. Hand to **me2-code-designer** first." | Start designer session |
| `me2-code-designer` | "Design complete. Hand to **me2-design-reviewer**." | Start reviewer session |
| `me2-design-reviewer` | "APPROVED. Hand to **me2-code-engineer**." | Start engineer session |
| `me2-design-reviewer` | "CHANGES REQUIRED. Return to **me2-code-designer**." | Re-open designer session |
| `me2-code-engineer` | "Implementation complete. Ready for **me2-code-tester**." | Start tester session |
| `me2-code-tester` | "QA complete. Ready for **me2-tester**." | Run manual device tests |
| `me2-tester` | "Manual QA complete. Ready for **me2-code-build-verificator**." | Start verificator session |
| `me2-code-build-verificator` | "APPROVED — Ready to merge." | Review diff and merge |
| Any agent | "BLOCKED — returning to **me2-code-engineer**." | Re-open engineer session with bug report |

---

## Sprint Rhythm (Solo + Agents)

### Daily
```
Morning:  Review what's in progress. Pick the next ticket from the sprint board.
          Start one Claude Code session. Hand ticket to me2-project-manager to confirm scope.
          Hand to me2-code-engineer to implement.

Afternoon: Review the implementation diff. Start me2-code-tester session.
           Run manual device tests with me2-tester guidance.

Evening:  me2-code-build-verificator sign-off. Merge if green. Move to next ticket.
```

### End of Sprint
```
1. Run full E2E regression with me2-tester
2. me2-code-build-verificator full audit on the sprint branch
3. EAS Submit → TestFlight
4. me2-project-manager sprint retrospective
5. me2-project-manager plans next sprint
```

---

## Agent Boundaries — What Each Agent Can Touch

| Agent | Can modify | Cannot modify |
|---|---|---|
| `me2-project-manager` | GitHub Issues, sprint plan | Source code, design files |
| `me2-code-engineer` | `apps/`, `packages/`, `extensions/` source files | Agent files, CLAUDE.md (without owner approval) |
| `me2-code-designer` | Stitch projects, design specs in `docs/design/` | Source code |
| `me2-design-reviewer` | Review comments only | Source code, design files |
| `me2-code-tester` | `*.test.ts` files, `*.spec.ts` files, `maestro/` flows | Implementation source files |
| `me2-tester` | Bug reports, test reports | Source code, test files |
| `me2-code-build-verificator` | Verification reports | Source code |

---

## Updating Agent Files

Agent files evolve as the project grows. Update them when:
- A new convention is established (add it to `me2-code-engineer.md`)
- A new screen pattern emerges (add it to `me2-code-designer.md`)
- A new security rule is needed (add it to `me2-code-build-verificator.md`)
- The sprint plan changes significantly (update `me2-project-manager.md`)

**Always** update `CLAUDE.md` in sync with agent files — they must never contradict each other.

Ticket S4-14 in the sprint plan explicitly schedules an agent + CLAUDE.md update at end of Phase 1.

---

## Key Files Reference

| File | Location | Purpose |
|---|---|---|
| `CLAUDE.md` | repo root | Master project context — read by all agents |
| Agent files | `.claude/agents/` | Individual agent instructions |
| Sprint plan | `docs/PADA_SprintPlan_Phase1.docx` | Ticket backlog and sequence |
| AC doc | `docs/PADA_AcceptanceCriteria_v2.docx` | Scenario reference for all agents |
| PRD | `docs/PADA_PRD_v2.docx` | Product requirements |
| Tech arch | `docs/PADA_TechnicalArchitecture_v2.docx` | Architecture reference |
| Data model | `docs/PADA_DataModel_v2.docx` | Schema reference |

---

*ME2 Agent Team — v1.0 — April 2026*
