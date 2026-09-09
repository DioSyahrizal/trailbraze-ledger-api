import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGameAccountDto } from './dto/create-game-account.dto';
import { GameAccountsService } from './game-accounts.service';

@ApiTags('game-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('game-accounts')
export class GameAccountsController {
  constructor(private readonly gameAccountsService: GameAccountsService) {}

  @Post()
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: CreateGameAccountDto,
  ) {
    return this.gameAccountsService.create(user.sub, body.gameCode);
  }

  @Get()
  async findAll(@CurrentUser() user: AccessTokenPayload) {
    return this.gameAccountsService.findAll(user.sub);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.gameAccountsService.findOne(user.sub, id);
  }
}
