import { PrismaClient } from '@prisma/client';

/**
 * The default database starts empty on purpose. Hospitals and dispatchers
 * register in the UI, and each hospital imports its own bed, blood and medicine
 * dataset. `npm run db:seed:demo` loads the old sample data for rehearsals only.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [users, hospitals, requests] = await Promise.all([
    prisma.user.count(),
    prisma.hospital.count(),
    prisma.emergencyRequest.count(),
  ]);

  console.log('[seed] no demo data is written');
  console.log(
    `[seed] database has ${users} users, ${hospitals} hospitals and ${requests} requests - register accounts in the UI`,
  );
  console.log('[seed] for the old presentation data: npm run db:seed:demo');
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
