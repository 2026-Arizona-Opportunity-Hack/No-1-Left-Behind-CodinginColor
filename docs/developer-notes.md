# Developer notes

Integration notes for the server functions behind the screens (moved from the README).

## Curriculum editor integration (#8)

`src/server/curriculum.ts` exposes the handoff's named functions for modules,
lessons, activities and pre/post assessments. All return `Result<T>` (`ok/data`
or `ok/error`). Import these from a Server Component or call them through a
`"use server"` action; they use the staff member's cookie session and RLS.
`getModuleTree` returns module fields plus `lessons`, each with `activities`.
`createLessonFromTemplate` returns the new lesson; reload its tree for the four
steps. Mutations return the saved row, reorder/delete return `null`, and
`saveAssessment` returns `{ id }`. Missing assessments return an error until saved.
Activity content types, Zod schemas and `emptyContent(type)` live in
`src/types/activity-content.ts`. Starters are structurally valid drafts for staff
editing. Saving an activity's validated `content` marks its AI draft reviewed;
a title-only change does not. Tests with existing student responses cannot be
replaced, to preserve learning results.

**Shrey must apply `20261115010000_curriculum_operations.sql` before wiring the
editor.** It adds atomic saves and enforces the publish rules in Postgres.
Do not push migrations from a developer session. The seed now publishes modules
after creating their lessons so it also satisfies that gate.

Run `npm test`, `npm run lint`, and `npm run build`. On a disposable migrated and
seeded Supabase/local Postgres database, run
`psql "$TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/curriculum.sql`.
The SQL tests use synthetic staff, run under `authenticated`, verify admin
publishing plus instructor/reviewer denial, and roll everything back. Never run
the seed against production to test a change: it resets the demo records.

## Class setup integration (#9)

`src/server/classes.ts` exposes `listMyClasses`, `createClass`, `addStudents`,
`resetJoinCode`, `assignModules`, `setSchedule`, and `getClassSetup`, all returning
`Result<T>`. `assignModules` and `setSchedule` return `null` on success.
`getClassSetup` returns `{ class, students, modules, sessions }`; modules contain
the module fields with their class-assigned `position` and `assigned_at`.
Student labels are derived in stable roster order and are display text only;
always use student IDs for identity. No read function returns personal-code hashes.

1. Parse the uploaded text using `parseRosterCsv` from `src/lib/roster-csv.ts`.
   Display its warnings and line-numbered errors. **Block import while any errors
   remain**, then preview its `rows` before calling `addStudents(classId, rows)`.
   Only name and optional school survive parsing or server validation.
2. Keep the successful `addStudents` / `resetJoinCode` response long enough to
   print personal join cards. Plain codes are returned only by that save, never
   stored. Reset a code if a card is lost; the old code stops working.
3. Call `assignModules` with published module IDs in the desired order, then
   `setSchedule` with `{ session_date: "YYYY-MM-DD", lesson_id }` entries.
   Assignment and schedule replacement are atomic. Scheduling uses Phoenix dates,
   preserves sessions before today, and permits only published lessons from
   assigned modules. Clear upcoming sessions before unassigning their module.
4. Build the shareable link with `classJoinUrl(origin, class_code)` from
   `src/lib/join-codes.ts`: `/join?class=MARY-P3`.

**Shrey must apply `20261115020000_class_setup.sql`.** It creates `class_modules`,
RLS and `configure_class`; seed additions assign all three modules to both demo
classes. Neither migration has been pushed to the live project. These functions
use the signed-in staff session, never a secret/service key. Classes allow at
most 200 students; failed roster batches save nothing.

For all database integration tests, use a **disposable**, migrated and seeded
database with Supabase's auth schema/default grants, then run:

```sh
TEST_DATABASE_URL=postgresql://... npm test
```

Without that variable, `npm test` runs unit/server-contract tests and skips the
four database tests. Database tests exercise RLS and all materialized seed content,
including the actual stored Jaylen join-code hash. `supabase/tests/classes.sql`
can also be run directly with `psql`, just like the curriculum SQL test above.
The database tests require a database-owner test connection to create synthetic
auth users and switch roles; their transactions always roll back. Never point
these tests at the live project.

## Mentor feedback follow-up (Nov 15)

Added configurable staff roles, capability-based navigation/actions and matching
RLS; atomic source imports with reviewed pre/post assessment pairs; safe removal
of unused curriculum; and an assigned student course path that always displays
pre-test, material and post-test, including locked stages. The Calm Mint CSS and
font configuration are unchanged. See README's mentor-feedback section for the
rollout order, required settings and remaining live rehearsal.

Database tests cover a fresh schema and an upgrade over existing demo data. The
upgrade adds quiz pairs only for the two known demo modules that lacked them;
it preserves all existing assessment questions, responses, events and progress.
Do not reseed the live project. The two new migrations have not been applied to
the shared database from this checkout.
