---
name: architecture
description: 'Plan and evolve application architecture for this Next.js project. Use when designing feature structure, separating concerns, choosing server versus client boundaries, organizing modules, reducing coupling, planning data flows, and making maintainable technical decisions.'
argument-hint: 'Describe the feature, subsystem, refactor, or architectural decision to make.'
user-invocable: true
---

# Architecture

## When to Use
- Plan a new feature before implementation
- Refactor tangled code into clearer boundaries
- Decide where logic should live across pages, components, actions, APIs, and libraries
- Define data flow for a feature that crosses UI and backend layers
- Review maintainability, scalability, or coupling risks

## Project Context
- Application shape: Next.js App Router with feature pages in `app/`
- Shared UI lives in `components/`
- Shared logic can live in `lib/` and data-oriented modules
- Backend integrations currently center on Supabase

## Procedure
1. Start from the user-facing workflow and map the minimum end-to-end data path.
2. Separate responsibilities across presentation, orchestration, validation, and persistence.
3. Choose the narrowest boundary that keeps logic testable and understandable.
4. Prefer colocating feature-specific code until reuse is proven, then extract deliberately.
5. Keep cross-cutting concerns in stable shared modules, not scattered through pages.
6. Evaluate tradeoffs explicitly: speed of delivery, readability, future extension, and operational risk.
7. When refactoring, preserve behavior first and avoid broad rewrites unless the current structure blocks progress.

## Decision Heuristics
- Put data fetching and privileged logic on the server by default.
- Keep reusable domain helpers out of page files when they serve multiple entry points.
- Avoid abstractions that exist only to look clean; prefer concrete structures with clear ownership.
- A good boundary reduces duplication and confusion at the same time.
- If a module needs knowledge from too many layers, the design is probably leaking responsibilities.

## Output Expectations
- Provide a structure that supports current requirements without overengineering.
- Make tradeoffs explicit when there is no single correct design.
- Favor incremental architecture changes that can be implemented safely in this codebase.