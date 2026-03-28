---
name: frontend
description: 'Build and refine frontend features in this Next.js App Router project. Use when working on React components, page composition, loading states, forms, client/server boundaries, Tailwind styling, responsive behavior, and frontend bug fixes.'
argument-hint: 'Describe the frontend task, screen, component, or bug to work on.'
user-invocable: true
---

# Frontend

## When to Use
- Build or update pages in `app/`
- Create or refactor React components in `components/`
- Improve state flow between server and client components
- Add forms, tables, filters, empty states, and loading states
- Fix responsive layout issues or visual regressions

## Project Context
- Framework: Next.js App Router with TypeScript
- UI stack: React 19 and Tailwind CSS 4
- Data flow: server components, route handlers, and server actions
- Current domain: inventory, products, staff, reports, authentication

## Procedure
1. Inspect the target page, nearby components, and existing visual patterns before changing code.
2. Preserve the App Router split: keep data fetching on the server unless interactivity requires a client component.
3. Reuse existing dashboard and product UI patterns before introducing new abstractions.
4. Keep component APIs narrow and explicit. Prefer passing concrete props over large configuration objects.
5. Handle all major UI states: loading, empty, error, success, disabled, and mobile layouts.
6. Use semantic HTML and accessible labels for forms, buttons, tables, and navigation.
7. Validate the edited files for TypeScript or lint errors after making changes.

## Implementation Rules
- Default to server components unless hooks, browser APIs, or client-side event handling are required.
- Minimize `use client` boundaries and keep them close to interactive leaves.
- Prefer small presentational components over deeply nested monoliths.
- Follow existing naming and folder conventions in `app/` and `components/`.
- Avoid introducing new UI libraries unless the task requires one and the repo does not already solve the problem.

## Output Expectations
- Deliver complete UI behavior, not only markup.
- Include sensible copy, placeholders, and empty-state messaging.
- Keep styling consistent with the existing project unless the task explicitly asks for a redesign.
