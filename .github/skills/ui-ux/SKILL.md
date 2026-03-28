---
name: ui-ux
description: 'Improve UI and UX quality for this web app. Use when redesigning screens, polishing visual hierarchy, refining copy, improving forms, accessibility, navigation, responsive behavior, empty states, feedback, and overall interaction quality.'
argument-hint: 'Describe the screen, workflow, usability problem, or redesign goal.'
user-invocable: true
---

# UI UX

## When to Use
- Redesign a page or workflow
- Improve readability, spacing, and visual hierarchy
- Refine forms, table interactions, and action clarity
- Improve accessibility and keyboard behavior
- Add empty states, feedback states, confirmations, and clearer microcopy

## Project Context
- Product type: internal inventory management system
- Primary users likely need speed, clarity, and low-friction task completion
- Existing screens cover dashboard, inventory, products, staff, users, and reports

## Procedure
1. Identify the primary user task on the target screen before changing layout or styling.
2. Reduce cognitive load: make the next action obvious, group related information, and remove decorative noise.
3. Strengthen hierarchy with spacing, scale, contrast, and label clarity.
4. Check workflow states: first use, empty data, validation errors, destructive actions, success feedback, and slow network cases.
5. Ensure interactive elements are reachable by keyboard and have visible focus states.
6. Test the design mentally at mobile and desktop widths before finalizing implementation.
7. Align copy with operational software: concise labels, direct actions, unambiguous status text.

## Design Rules
- Optimize for fast scanning and reliable task completion over novelty.
- Prefer fewer, clearer actions per screen.
- Keep destructive actions visually distinct and harder to trigger accidentally.
- Use consistent spacing and typography scales within a feature area.
- Avoid placeholder-only labels for important inputs.

## Output Expectations
- The result should improve both appearance and usability.
- UX changes should explain the intended user benefit through the structure of the UI, not added commentary.
- Accessibility and responsive behavior are part of the task, not optional follow-up work.
