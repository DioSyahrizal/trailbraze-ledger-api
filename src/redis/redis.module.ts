import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  imports: [ConfigModule],
  exports: [RedisService],
})
export class RedisModule {}
