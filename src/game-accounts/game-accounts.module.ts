import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { GameAccountsController } from './game-accounts.controller';
import { GameAccountsService } from './game-accounts.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [GameAccountsController],
  providers: [GameAccountsService],
})
export class GameAccountsModule {}
