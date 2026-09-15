import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiNoContentResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';
import { removeAuthTokens, responseAuthTokens } from './utils/cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, ...resp } = await this.authService.login(
      body.email,
      body.password,
    );

    responseAuthTokens(response, accessToken, refreshToken);

    return resp;
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('refresh')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshTokenFromRequest = request.cookies?.['refresh_token'];

    if (
      typeof refreshTokenFromRequest !== 'string' ||
      refreshTokenFromRequest.length === 0
    ) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { accessToken, refreshToken, ...resp } =
      await this.authService.refreshToken(refreshTokenFromRequest);

    responseAuthTokens(response, accessToken, refreshToken);

    return resp;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies?.['refresh_token'];

    try {
      if (typeof refreshToken === 'string' && refreshToken.length > 0) {
        await this.authService.logout(refreshToken);
      }
    } finally {
      removeAuthTokens(response);
    }
  }
}
