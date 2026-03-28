---
name: backend
description: 'Implement and debug backend workflows in this Next.js and Supabase project. Use when working on API route handlers, server actions, data validation, auth-aware operations, database writes, RLS issues, and server-side integrations.'
argument-hint: 'Describe the backend endpoint, action, data flow, or failure to work on.'
user-invocable: true
---

# Backend

## When to Use
- Add or modify route handlers in `app/api/`
- Create or update server actions in `app/**/actions.ts`
- Diagnose Supabase insert, update, select, or auth issues
- Add validation, error handling, or server-side business rules
- Trace a request from UI input to persisted data

## Project Context
- Runtime: Next.js App Router server environment
- Data layer: Supabase
- Important constraint: admin-style writes may require a service-role server client or explicit RLS coverage
- Existing backend touchpoints include products, zones, and login flows

## Procedure
1. Trace the full request path: UI trigger, server action or route handler, Supabase client, and response handling.
2. Verify which Supabase client is being used: browser, user-session server client, or service-role server client.
3. Add validation near the server boundary so malformed input never reaches the database.
4. Return structured success and failure results that the caller can render clearly.
5. Keep auth and authorization explicit. If an operation bypasses user session context, justify it and scope it tightly.
6. Check for root-cause issues such as RLS, missing environment variables, incorrect table names, or mismatched payload shapes.
7. Validate the affected files for TypeScript and lint issues after the change.

## Implementation Rules
- Keep secrets and privileged keys on the server only.
- Do not move protected logic into client components.
- Prefer fixing authorization and client selection issues at the source instead of adding brittle retries or silent fallbacks.
- Use clear error messages for expected failures and avoid leaking internal details to the client.
- Keep route handlers and actions focused; extract helper logic when the code starts mixing transport, validation, and persistence concerns.

## Output Expectations
- Complete the server-side path end to end, including validation and failure handling.
- Call out any schema or policy assumption that cannot be verified from code alone.
- If the issue is likely RLS-related, check the server client choice first.
