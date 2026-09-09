import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AccessTokenPayload,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { TodayTaskResponseDto } from './dto/today-task-response.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('game-accounts/:gameAccountId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOkResponse({
    type: [TodayTaskResponseDto],
  })
  @Get('today')
  async findTodayTasks(
    @CurrentUser() user: AccessTokenPayload,
    @Param('gameAccountId', new ParseUUIDPipe()) gameAccountId: string,
  ) {
    return await this.tasksService.findTodayTasks(user.sub, gameAccountId);
  }
}
