import { ApiProperty } from '@nestjs/swagger';

export class TodayTaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  taskDefinitionId: string;

  @ApiProperty({ example: 'daily-commissions' })
  code: string;

  @ApiProperty({ example: 'Complete daily commissions' })
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ example: 4 })
  targetValue: number;

  @ApiProperty({ example: 'COMMISSIONS' })
  targetUnit: string;

  @ApiProperty({ example: '2026-09-09' })
  periodDate: string;

  @ApiProperty({ example: false })
  completed: boolean;

  @ApiProperty({ nullable: true, format: 'date-time' })
  completedAt: string | null;
}
