# Engine 1 - Data & Integrity (DBMS) - Progress

Project: GoldenHour (checkpoint 13). Update dates come from the file modification dates in the checkpoint zip; edit them if your team's dates differ.

## Updates

### Update 1 - 15 Nov 2026: Schema foundation

- `20261115050816_init` creates the 8 core tables and their indexes.
- `20261115060000_integrity_constraints` adds the CHECK constraints (age, contact, coordinates, stock units, role/link rule, assignment checks) and the open-queue index.
- `db.cjs` (local Postgres cluster), `db-report.ts` and `seed-demo.ts` added.

### Update 2 - 20 Nov 2026: Patient portal data model

- `patient_role` and `patient_portal` migrations add the PATIENT role, nullable `users.patient_id`, and the `prebooking`, `campaign` and `campaign_read` tables.
- `seed.ts` reduced to the empty-system seed; demo data kept separate in `seed-demo.ts`.
- `campaignService.ts` and `emergencyService.ts` written/updated against the new tables.

### Update 3 - 21 Nov 2026: Pre-booking lifecycle

- `20261121050000_prebooking_lifecycle` migration added and `schema.prisma` updated to match.
- `prebookingService.ts`, `patientService.ts` and `hospitalResourcesService.ts` updated (confirm reserves a bed, cancel returns it; dataset import in one transaction).
- Current state: 11 tables, 5 migrations.
