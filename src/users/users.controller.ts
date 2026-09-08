import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import {
  AccessTokenPayload,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

export type RequestWithUser = Request & {
  user: AccessTokenPayload;
};

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getMe(@Req() request: RequestWithUser) {
    return this.userService.findById(request.user.sub);
  }
}
