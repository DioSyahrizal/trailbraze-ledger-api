import { createParamDecorator } from '@nestjs/common';

import type { AccessTokenPayload } from '../guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

export const CurrentUser = createParamDecorator(
  (_data, ctx): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
