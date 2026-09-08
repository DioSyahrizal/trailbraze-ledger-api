import { NestFactory } from '@nestjs/core';

import { SeedModule } from './seed.module';
import { SeedService } from './seed/seed.service';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  try {
    const seedService = app.get(SeedService);
    await seedService.run();

    console.log('Database seed completed');
  } finally {
    await app.close();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Database seed failed', error);
  process.exitCode = 1;
});
