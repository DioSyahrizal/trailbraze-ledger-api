import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../database/database.module';
import { SeedService } from './seed/seed.service';

@Module({
  providers: [SeedService],
  imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true })],
})
export class SeedModule {}
