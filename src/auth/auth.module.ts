import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  providers: [AuthService],
  imports: [DatabaseModule],
  controllers: [AuthController],
})
export class AuthModule {}
