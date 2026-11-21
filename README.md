# Engine 1 - Data & Integrity

**Subject:** Database Management Systems
**Project:** GoldenHour - Severity Ranking and Hospital Readiness Matching System (Search and Ranking System)

## What you must be able to explain

- 11 tables (8 core + prebooking, campaign, campaign_read) defined in `schema.prisma` and 5 migrations.
- Integrity is enforced in the database, not the form: PK/FK, UNIQUE, NOT NULL, CHECK constraints, and indexes including the partial open-queue index.
- Role/link CHECK on users: PATIENT needs `patient_id` and no `hospital_id`; staff roles the reverse.
- Transactions: patient + request written together; hospital + first user; bulk dataset import replaces stock in one transaction; prebooking confirm reserves a bed, cancel returns it.
- Request IDs (`REQ-YYYY-NNNN`) are generated under a Postgres advisory lock, so two dispatchers never get the same ID.
- Demo: insert bad data directly (negative units, age 200, bad contact), show the CHECK rejecting it, then run `npm run db:report`.

## Files owned by this engine

- `server/prisma/schema.prisma`
- `server/prisma/migrations/` (5 migrations + `migration_lock.toml`)
- `server/prisma/seed.ts`, `seed-demo.ts`
- `server/scripts/db-report.ts`, `db.cjs`
- `server/src/db/pool.ts`, `prisma.ts`
- `server/src/services/`: `campaignService`, `databaseService`, `emergencyService`, `hospitalResourcesService`, `patientService`, `prebookingService`, `registrationService`

## Dependencies on other engines

- **Engine 2:** `dashboardService.ts`, `priorityQueue.ts`, `utils/geo.ts`
- **Engine 3:** `config/env.ts`, `validation/` (`emergency`, `hospitalDataset`, `hospitalResources`, `patient`, `registration`)
