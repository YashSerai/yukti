# Yukti Initial Baseline

Date: `2026-07-31`
Status: `initial dual-baseline snapshot`

## 1. Purpose

This snapshot records the clean starting point for the hackathon build so later checks can distinguish approved requirements from implementation drift.

## 2. Workspace Structure

The workspace began with only a protected `.env.local` and `.gitignore`. There is no inherited application code or Pocket Secretary code in this project root.

## 3. Current Authority Surfaces

- User-provided product brief: `C:\Users\yashs\.codex\attachments\5352f6f6-b08c-4425-9924-cc3a58575a56\pasted-text.txt`
- Public Agentic Commerce Hackathon Builder Handbook
- Official sponsor documentation for Prava, Composio, Linq, and Senso
- `docs/aegis/specs/2026-07-31-yukti-design.md`
- User decisions in the active Codex task

## 4. Product / Requirement Baseline

### 4.1 Current Truth

Yukti turns upcoming calendar events into contextual preparation plans that can propose, obtain approval for, and complete commercial actions. The birthday scenario is the primary demonstration, but it must exercise a generalized event-to-action engine. The user has authorized local development and no-cost publishing, plus up to USD 20 of Gemini Flash inference.

### 4.2 Non-negotiables

1. Every purchase requires explicit, exact approval.
2. The Prava sandbox lifecycle must be consequential and demonstrable.
3. Seeded demo inputs may be deterministic; provider outcomes may not be falsely represented as real.
4. Personal claims require provenance.
5. Secrets never enter source control or client code.
6. Gemini 3.1 Pro must not be used.
7. No paid action outside the authorized Gemini cap may occur without permission.

### 4.3 Product Non-goals

- Production payments or unattended real purchases
- Native mobile applications
- Reading unrelated private iMessage history
- Multi-user enterprise administration
- NANDA before the main application is stable

## 5. Architecture / Runtime Boundary Baseline

### 5.1 Current Truth

The canonical product is one TypeScript application with isolated provider adapters, a database-backed event-action state machine, and server-only secrets. ChatGPT Sites is the required publishing surface. A separate HTTPS backend is allowed only when Sites cannot own required server execution, OAuth callbacks, webhooks, persistence, or background work.

### 5.2 Architecture Non-negotiables

1. Deterministic code owns authorization, money, state transitions, and idempotency.
2. The model proposes structured decisions but never executes a purchase directly.
3. Provider-specific behavior remains behind typed adapters.
4. Scoped payment credentials are transient, server-only, and never logged or persisted.
5. The seeded flow and connected flow share the same orchestration contracts.

### 5.3 Architecture Non-goals

- A general autonomous browser-shopping framework
- Multiple independent application backends
- Decorative sponsor calls without product impact

## 6. Ownership / Contract Snapshot

- Event interpretation and planning: agent orchestration domain
- State transitions and approval invariants: commerce domain
- Provider calls: individual provider adapters
- Persistence and provenance: data layer
- User-facing state and actions: web application
- Deployment and public callbacks: hosting boundary selected after Sites capability verification

## 7. Current State and Risks

All five sponsor credentials are saved and authenticated. Google OAuth, Senso knowledge ingestion, webhook URLs, full Prava card collection, merchant execution, and public deployment do not yet exist. The currently selected Google Cloud project belongs to Soulspace and is excluded from Yukti.

## 8. Alignment Use

Read the product baseline before changing user flows, approval semantics, demo claims, or sponsor roles. Read the architecture baseline before changing provider contracts, persistence, hosting, or execution boundaries. Report `scope: both` when a change affects product behavior and its canonical owner.

## 9. Compatibility Boundary

The build must remain runnable on Windows, must keep all provider keys server-side, must support deterministic seeded demonstration without pretending fixtures are provider results, and must remain portable between local development and the selected no-cost publishing architecture.

