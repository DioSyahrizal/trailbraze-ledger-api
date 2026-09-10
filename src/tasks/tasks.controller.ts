import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AccessTokenPayload,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  CompletedHistoryTaskResponseDto,
  TaskCompletionResponseDto,
  TodayTaskResponseDto,
} from './dto/today-task-response.dto';
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
  ): Promise<TodayTaskResponseDto[]> {
    return this.tasksService.findTodayTasks(user.sub, gameAccountId);
  }

  @ApiCreatedResponse({ type: TaskCompletionResponseDto })
  @Post(':taskDefinitionId/complete')
  async completeTodayTask(
    @CurrentUser() user: AccessTokenPayload,
    @Param('gameAccountId', new ParseUUIDPipe()) gameAccountId: string,
    @Param('taskDefinitionId', new ParseUUIDPipe()) taskId: string,
  ): Promise<TaskCompletionResponseDto> {
    return this.tasksService.completeTodayTask(user.sub, gameAccountId, taskId);
  }

  @ApiOkResponse({ type: [CompletedHistoryTaskResponseDto] })
  @Get('history')
  async findCompletionHistory(
    @CurrentUser() user: AccessTokenPayload,
    @Param('gameAccountId', new ParseUUIDPipe()) gameAccountId: string,
  ): Promise<CompletedHistoryTaskResponseDto[]> {
    return this.tasksService.findCompletionHistory(user.sub, gameAccountId);
  }
}
